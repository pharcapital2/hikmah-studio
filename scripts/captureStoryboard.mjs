import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = argv.slice(2).filter((a) => a !== '--');
  let url = null;
  let target = 'konten-2';
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--url' && args[i + 1]) {
      url = args[++i].replace(/\/+$/, '');
    } else if (!a.startsWith('--')) {
      target = a;
    }
  }
  const stories =
    target === 'all'
      ? ['konten-1', 'konten-2', 'konten-3']
      : target === 'konten-1' || target === 'konten-2' || target === 'konten-3'
        ? [target]
        : null;
  if (!stories) {
    throw new Error(`Invalid story argument '${target}'. Use konten-1, konten-2, konten-3, or all.`);
  }
  return { stories, url };
}

function findBrowserExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe')
      : null,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    `Could not find Chrome or Edge executable. Checked:\n${candidates.map((c) => `  - ${c}`).join('\n')}`
  );
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      server.close((err) => {
        if (err) reject(err);
        else resolve(port);
      });
    });
  });
}

function killProcessTree(proc) {
  if (!proc || proc.pid == null) return;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(proc.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } else {
      proc.kill('SIGKILL');
    }
  } catch {
    // ignore cleanup errors
  }
}

async function waitForHttpOk(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForPageTarget(cdpPort, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  const endpoint = `http://127.0.0.1:${cdpPort}/json/list`;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) {
        const targets = await res.json();
        const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
        if (page) return page.webSocketDebuggerUrl;
      }
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for CDP page target on port ${cdpPort}`);
}

async function createCdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', (err) => reject(new Error(`CDP WebSocket error: ${err.message ?? err}`)), {
      once: true,
    });
  });

  let nextId = 1;
  const pending = new Map();

  ws.addEventListener('message', (event) => {
    const raw = typeof event.data === 'string' ? event.data : String(event.data);
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg.id != null && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) {
        reject(new Error(`CDP ${msg.error.code}: ${msg.error.message}`));
      } else {
        resolve(msg.result);
      }
    }
  });

  ws.addEventListener('close', () => {
    for (const [, { reject }] of pending) {
      reject(new Error('CDP WebSocket closed unexpectedly'));
    }
    pending.clear();
  });

  function send(method, params = {}) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res?.exceptionDetails) {
      const desc =
        res.exceptionDetails.exception?.description ||
        res.exceptionDetails.text ||
        'Unknown evaluation error';
      throw new Error(`Page evaluation failed: ${desc}`);
    }
    return res?.result?.value;
  }

  return {
    send,
    evaluate,
    close: () => {
      try {
        ws.close();
      } catch {
        // ignore
      }
    },
  };
}

async function captureStory(cdp, baseUrl, key) {
  const targetUrl = `${baseUrl}/?story=${encodeURIComponent(key)}&paused=1&clean=1&audit=1`;
  console.log(`[storyboard] Navigating to ${targetUrl}`);
  await cdp.send('Page.navigate', { url: targetUrl });

  const deadline = Date.now() + 45000;
  let ready = false;
  while (Date.now() < deadline) {
    try {
      ready = await cdp.evaluate(
        `(() => {
          const qs = new URLSearchParams(window.location.search);
          return qs.get('story') === ${JSON.stringify(key)} && Boolean(window.__HIKMAH_STUDIO__?.isReady?.());
        })()`
      );
      if (ready) break;
    } catch {
      // ignore transient errors during navigation
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  if (!ready) {
    throw new Error(`Timed out (45s) waiting for window.__HIKMAH_STUDIO__.isReady() on ${key}`);
  }

  const info = await cdp.evaluate(`window.__HIKMAH_STUDIO__.getStoryInfo()`);
  if (!info || !Array.isArray(info.shots) || info.shots.length === 0) {
    throw new Error(`No shots returned by getStoryInfo() for ${key}`);
  }
  console.log(`[storyboard] Capturing ${info.shots.length} shots for "${info.title}" (${key})...`);

  const frames = [];
  for (let i = 0; i < info.shots.length; i++) {
    const shot = info.shots[i];
    const mid = shot.startSec + shot.durSec * 0.5;
    const dataUrl = await cdp.evaluate(
      `(async () => {
        window.__HIKMAH_STUDIO__.seek(${mid});
        const deadline = performance.now() + 5000;
        while (performance.now() < deadline) {
          await new Promise((r) => requestAnimationFrame(r));
          const pose = window.__HIKMAH_STUDIO__.getPose?.();
          const tNow = window.__HIKMAH_STUDIO__.getCurrentTime?.() ?? -1;
          if (pose?.shotId === ${JSON.stringify(shot.id)} && Math.abs(tNow - ${mid}) < 0.05) {
            break;
          }
        }
        for (let f = 0; f < 6; f++) {
          await new Promise((r) => requestAnimationFrame(r));
        }
        return window.__HIKMAH_STUDIO__.captureCanvasDataUrl();
      })()`
    );
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      throw new Error(`Empty/invalid canvas dataUrl for ${key} shot #${i + 1} (${shot.id})`);
    }
    frames.push({
      index: i + 1,
      id: shot.id,
      size: shot.size,
      angle: shot.angle,
      move: shot.move,
      target: shot.target,
      mid,
      dataUrl,
    });
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const sheetDataUrl = await cdp.evaluate(
    `(async () => {
      const frames = ${JSON.stringify(frames)};
      const title = ${JSON.stringify(info.title)};
      const key = ${JSON.stringify(key)};
      const totalDur = ${JSON.stringify(info.totalDurationSec)};
      const dateStr = ${JSON.stringify(dateStr)};

      const cols = 4;
      const tileW = 270;
      const headerH = 44;
      const imgH = 480;
      const tileH = headerH + imgH;
      const pad = 12;
      const bannerH = 72;
      const rows = Math.ceil(frames.length / cols);

      const canvas = document.createElement('canvas');
      canvas.width = cols * tileW + (cols + 1) * pad;
      canvas.height = bannerH + rows * tileH + (rows + 1) * pad;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('2D context unavailable');

      // Background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Top title banner
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, bannerH);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, bannerH - 2, canvas.width, 2);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 22px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillText(title + '  [' + key + ']', 20, 32);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px ui-monospace, SFMono-Regular, Consolas, monospace';
      ctx.fillText(frames.length + ' shots  |  ' + totalDur + 's  |  9:16 Storyboard  |  ' + dateStr, 20, 56);

      const loadImage = (src) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Failed to decode tile image'));
          img.src = src;
        });

      for (let i = 0; i < frames.length; i++) {
        const f = frames[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = pad + col * (tileW + pad);
        const y = bannerH + pad + row * (tileH + pad);

        // Tile card border
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y, tileW, headerH);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 10px ui-monospace, SFMono-Regular, Consolas, monospace';
        const num = String(f.index).padStart(2, '0');
        const line1 = '#' + num + ' | ' + f.id + ' | ' + f.size + '/' + f.angle + '/' + f.move;
        ctx.fillText(line1, x + 6, y + 17, tileW - 12);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '10px ui-monospace, SFMono-Regular, Consolas, monospace';
        const line2 = f.target + ' | t=' + f.mid.toFixed(1) + 's';
        ctx.fillText(line2, x + 6, y + 35, tileW - 12);

        const img = await loadImage(f.dataUrl);
        ctx.drawImage(img, x, y + headerH, tileW, imgH);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, tileW - 1, tileH - 1);
      }

      return canvas.toDataURL('image/png');
    })()`
  );

  if (typeof sheetDataUrl !== 'string' || !sheetDataUrl.startsWith('data:image/png;base64,')) {
    throw new Error(`Failed to composite PNG contact sheet for ${key}`);
  }

  const outDir = path.join(ROOT_DIR, 'output', 'storyboards');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${key}-contact-sheet.png`);
  const base64 = sheetDataUrl.slice('data:image/png;base64,'.length);
  fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
  console.log(`[storyboard] Saved ${outPath}`);
  return outPath;
}

async function main() {
  const { stories, url: existingUrl } = parseArgs(process.argv);
  const browserPath = findBrowserExecutable();
  const tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hikmah-cdp-'));

  let viteProc = null;
  let browserProc = null;
  let cdp = null;

  try {
    let baseUrl = existingUrl;
    if (!baseUrl) {
      const vitePort = await getFreePort();
      baseUrl = `http://127.0.0.1:${vitePort}`;
      console.log(`[storyboard] Starting Vite dev server on ${baseUrl}...`);
      const viteCmd = `npx vite --port ${vitePort} --strictPort --host 127.0.0.1`;
      viteProc =
        process.platform === 'win32'
          ? spawn(viteCmd, {
              cwd: ROOT_DIR,
              shell: true,
              stdio: 'ignore',
              windowsHide: true,
            })
          : spawn('npx', ['vite', '--port', String(vitePort), '--strictPort', '--host', '127.0.0.1'], {
              cwd: ROOT_DIR,
              stdio: 'ignore',
            });
      await waitForHttpOk(baseUrl, 30000);
    }

    const cdpPort = await getFreePort();
    console.log(`[storyboard] Launching headless browser (${path.basename(browserPath)}) on CDP :${cdpPort}...`);
    browserProc = spawn(
      browserPath,
      [
        '--headless=new',
        `--remote-debugging-port=${cdpPort}`,
        `--user-data-dir=${tempProfileDir}`,
        '--window-size=600,1000',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--no-sandbox',
        '--disable-gpu-sandbox',
        'about:blank',
      ],
      {
        stdio: 'ignore',
        windowsHide: true,
      }
    );

    const wsUrl = await waitForPageTarget(cdpPort, 20000);
    cdp = await createCdpClient(wsUrl);
    await cdp.send('Page.enable');

    for (const key of stories) {
      await captureStory(cdp, baseUrl, key);
    }
  } finally {
    if (cdp) cdp.close();
    killProcessTree(browserProc);
    killProcessTree(viteProc);
    try {
      fs.rmSync(tempProfileDir, { recursive: true, force: true });
    } catch {
      // ignore temp cleanup failure on locked files
    }
  }
}

main().catch((err) => {
  console.error('[storyboard] ERROR:', err?.stack || err?.message || err);
  process.exit(1);
});
