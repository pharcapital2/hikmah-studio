import * as THREE from 'three';
import { CharacterExpression, CharacterProfile } from '../types/story';

const textureCache = new Map<string, THREE.CanvasTexture>();
let cachedClockTexture: THREE.CanvasTexture | null = null;

function drawBellTorsoPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  bottomY: number,
  topHalfW: number,
  botHalfW: number
) {
  ctx.beginPath();
  ctx.moveTo(cx - topHalfW * 0.45, topY);
  ctx.quadraticCurveTo(cx, topY - 12, cx + topHalfW * 0.45, topY);
  ctx.quadraticCurveTo(
    cx + topHalfW * 1.05,
    topY + 25,
    cx + botHalfW,
    bottomY - 26
  );
  ctx.quadraticCurveTo(cx + botHalfW, bottomY, cx + botHalfW - 22, bottomY);
  ctx.lineTo(cx - botHalfW + 22, bottomY);
  ctx.quadraticCurveTo(cx - botHalfW, bottomY, cx - botHalfW, bottomY - 26);
  ctx.quadraticCurveTo(
    cx - topHalfW * 1.05,
    topY + 25,
    cx - topHalfW * 0.45,
    topY
  );
  ctx.closePath();
}

export function getClock02Texture(): THREE.CanvasTexture {
  if (cachedClockTexture) return cachedClockTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const cx = 128;
  const cy = 128;

  ctx.clearRect(0, 0, 256, 256);

  // Outer frame
  ctx.fillStyle = '#e2e8f0';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, 108, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Inner dial
  ctx.fillStyle = '#f8fafc';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 94, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hour tick marks
  ctx.fillStyle = '#0f172a';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const rx = cx + Math.cos(a) * 80;
    const ry = cy + Math.sin(a) * 80;
    ctx.fillRect(rx - 3.5, ry - 3.5, 7, 7);
  }

  // Hands pointing to 02:00
  ctx.strokeStyle = '#0f172a';
  ctx.lineCap = 'round';
  // Minute hand (12)
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - 62);
  ctx.stroke();
  // Hour hand (2)
  const hourAngle = (2 / 12) * Math.PI * 2 - Math.PI / 2;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(hourAngle) * 44, cy + Math.sin(hourAngle) * 44);
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedClockTexture = tex;
  return tex;
}

export function getCharacterSpriteTexture(
  profile: CharacterProfile,
  expression: CharacterExpression,
  talkPhase: 0 | 1 = 0,
  facing: 'left' | 'right' | 'back' = 'right'
): THREE.CanvasTexture {
  const key = `${profile.id}:${profile.primaryColor}:${profile.secondaryColor}:${profile.headwear}:${Boolean(profile.sash)}:${expression}:${talkPhase}:${facing}`;
  const cached = textureCache.get(key);
  if (cached) {
    return cached;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    textureCache.set(key, fallback);
    return fallback;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  // Base orientation faces left-to-right; mirror when facing left
  if (facing === 'left') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }

  const outline = '#111827';
  const cx = 256;
  const isBackView = facing === 'back';

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // --- 1. Thin Black Stickman Legs & Feet (anchored near y=616) ---
  ctx.strokeStyle = outline;
  ctx.fillStyle = outline;
  ctx.lineWidth = 7.5;

  // Left Leg
  ctx.beginPath();
  ctx.moveTo(cx - 24, 514);
  ctx.lineTo(cx - 26, 610);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx - 18, 614, 15, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Right Leg
  ctx.beginPath();
  ctx.moveTo(cx + 24, 514);
  ctx.lineTo(cx + 26, 610);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx + 32, 614, 15, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- 2. Back-side Thin Stickman Arm ---
  if (!isBackView) {
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    if (expression === 'talking' || expression === 'angry') {
      // Gesturing / pointing arm extending forward
      ctx.moveTo(cx + 56, 365);
      ctx.quadraticCurveTo(cx + 106, 360, cx + 130, 344);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 132, 343, 6.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (expression === 'drinking') {
      // Arm raised with clay cup near mouth
      ctx.moveTo(cx + 54, 368);
      ctx.quadraticCurveTo(cx + 96, 336, cx + 80, 294);
      ctx.stroke();

      // Small cup
      ctx.fillStyle = '#b45309';
      ctx.strokeStyle = outline;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(cx + 66, 266, 24, 30, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(cx + 70, 270, 16, 6);
    } else if (expression === 'shocked') {
      ctx.moveTo(cx + 56, 365);
      ctx.quadraticCurveTo(cx + 102, 334, cx + 114, 304);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 115, 302, 6.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- 3. Bell-Shaped Torso (Baju Koko + Checkered Sarung + Diagonal Sash) ---
  const torsoTop = 324;
  const torsoBot = 524;
  const topHW = 54;
  const botHW = 88;

  ctx.save();
  drawBellTorsoPath(ctx, cx, torsoTop, torsoBot, topHW, botHW);
  ctx.fillStyle = profile.primaryColor;
  ctx.fill();
  ctx.clip();

  // Checkered Sarong on lower torso (from y=432 down to y=524)
  if (profile.headwear !== 'hijab') {
    const sarongY = 434;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - botHW - 10, sarongY, (botHW + 10) * 2, 100);

    // Checkered grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 3;
    for (let x = cx - 96; x <= cx + 96; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, sarongY);
      ctx.lineTo(x, torsoBot + 4);
      ctx.stroke();
    }
    for (let y = sarongY; y <= torsoBot; y += 16) {
      ctx.beginPath();
      ctx.moveTo(cx - botHW - 5, y);
      ctx.lineTo(cx + botHW + 5, y);
      ctx.stroke();
    }
    // Sarong waist band
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.fillRect(cx - botHW - 5, sarongY, (botHW + 5) * 2, 7);
  } else {
    // Polka-dot dress accent for female villager
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    for (let py = 355; py < torsoBot - 10; py += 26) {
      for (let px = cx - 64; px <= cx + 64; px += 26) {
        ctx.beginPath();
        ctx.arc(px + ((py % 52) === 0 ? 10 : 0), py, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Front buttons line (when facing front)
  if (!isBackView) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + 12, torsoTop + 6);
    ctx.lineTo(cx + 12, torsoTop + 72);
    ctx.stroke();
  }

  // Diagonal Sorban/Selendang Sash across chest
  if (profile.sash) {
    ctx.fillStyle = profile.secondaryColor;
    ctx.strokeStyle = 'rgba(15,23,42,0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 46, torsoTop + 2);
    ctx.lineTo(cx - 18, torsoTop + 2);
    ctx.lineTo(cx + 76, 444);
    ctx.lineTo(cx + 50, 456);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Soft 2.5D inner pillow shadow along right-bottom curve of torso
  const bodyGrad = ctx.createLinearGradient(cx - 70, torsoTop, cx + 80, torsoBot);
  bodyGrad.addColorStop(0, 'rgba(255,255,255,0.14)');
  bodyGrad.addColorStop(0.65, 'rgba(0,0,0,0)');
  bodyGrad.addColorStop(1, 'rgba(15,23,42,0.34)');
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(cx - botHW - 10, torsoTop - 10, (botHW + 10) * 2, 220);

  ctx.restore();

  // Torso outline
  drawBellTorsoPath(ctx, cx, torsoTop, torsoBot, topHW, botHW);
  ctx.strokeStyle = outline;
  ctx.lineWidth = 8;
  ctx.stroke();

  // --- 4. Near-side Stickman Arm (resting or curved) ---
  ctx.strokeStyle = outline;
  ctx.fillStyle = outline;
  ctx.lineWidth = 6.5;
  if (!isBackView) {
    ctx.beginPath();
    if (expression === 'angry') {
      ctx.moveTo(cx - 44, 365);
      ctx.quadraticCurveTo(cx - 86, 384, cx - 72, 422);
    } else {
      ctx.moveTo(cx - 42, 365);
      ctx.quadraticCurveTo(cx - 66, 405, cx - 52, 442);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(expression === 'angry' ? cx - 72 : cx - 52, expression === 'angry' ? 424 : 444, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- 5. Head (Pillowed White Circle) ---
  const headY = 238;
  const headR = 92;

  ctx.save();
  if (expression === 'drinking') {
    ctx.translate(cx, headY);
    ctx.rotate(-0.1);
    ctx.translate(-cx, -headY);
  }

  // Main Head Circle with 2.5D soft shading
  ctx.beginPath();
  ctx.arc(cx, headY, headR, 0, Math.PI * 2);
  if (isBackView && profile.headwear === 'hijab') {
    ctx.fillStyle = '#7e22ce';
  } else {
    const headGrad = ctx.createRadialGradient(
      cx - 26,
      headY - 28,
      18,
      cx + 12,
      headY + 14,
      headR + 12
    );
    headGrad.addColorStop(0, '#ffffff');
    headGrad.addColorStop(0.72, '#f1f5f9');
    headGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = headGrad;
  }
  ctx.fill();

  // Subtle gray hair tuft at side/back of head
  if (profile.headwear === 'peci-white' || profile.headwear === 'peci') {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, headY, headR, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = profile.headwear === 'peci-white' ? '#64748b' : '#334155';
    if (isBackView) {
      ctx.fillRect(cx - headR, headY - 46, headR * 2, headR + 50);
    } else {
      ctx.beginPath();
      ctx.ellipse(cx - 64, headY - 34, 48, 34, -0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Hijab back drape & polka dots
  if (isBackView && profile.headwear === 'hijab') {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, headY, headR, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    for (let hy = headY - 60; hy <= headY + 70; hy += 28) {
      for (let hx = cx - 70; hx <= cx + 70; hx += 28) {
        ctx.beginPath();
        ctx.arc(hx + ((hy % 56) === 0 ? 12 : 0), hy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Head Outline
  ctx.strokeStyle = outline;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, headY, headR, 0, Math.PI * 2);
  ctx.stroke();

  // --- 6. Minimalist High-Contrast Facial Expressions ---
  if (!isBackView) {
    ctx.strokeStyle = outline;
    ctx.fillStyle = outline;
    const fx = cx + 18; // Slight 3/4 look to the right like the reference

    if (expression === 'idle') {
      // Calm dot eyes
      ctx.beginPath();
      ctx.arc(fx - 18, headY - 2, 5.5, 0, Math.PI * 2);
      ctx.arc(fx + 22, headY - 2, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Flat calm brows
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      ctx.moveTo(fx - 32, headY - 22);
      ctx.lineTo(fx - 6, headY - 22);
      ctx.moveTo(fx + 10, headY - 22);
      ctx.lineTo(fx + 36, headY - 22);
      ctx.stroke();

      // Gentle small smile
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.arc(fx + 2, headY + 22, 13, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else if (expression === 'talking') {
      // Expressive dot eyes
      ctx.beginPath();
      ctx.arc(fx - 18, headY - 4, 6, 0, Math.PI * 2);
      ctx.arc(fx + 22, headY - 4, 6, 0, Math.PI * 2);
      ctx.fill();

      // Slightly angled brows
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      ctx.moveTo(fx - 32, headY - 24);
      ctx.lineTo(fx - 6, headY - 20);
      ctx.moveTo(fx + 10, headY - 20);
      ctx.lineTo(fx + 36, headY - 24);
      ctx.stroke();

      // Animated Mouth ONLY (talkPhase 0 vs 1)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = outline;
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      if (talkPhase === 0) {
        ctx.ellipse(fx + 2, headY + 28, 13, 15, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.ellipse(fx + 2, headY + 30, 8, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.ellipse(fx + 2, headY + 28, 10, 5.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#991b1b';
        ctx.fill();
        ctx.stroke();
      }
    } else if (expression === 'angry') {
      // Furrowed V-brows
      ctx.lineWidth = 7.5;
      ctx.beginPath();
      ctx.moveTo(fx - 34, headY - 26);
      ctx.lineTo(fx - 6, headY - 12);
      ctx.moveTo(fx + 36, headY - 26);
      ctx.lineTo(fx + 8, headY - 12);
      ctx.stroke();

      // Intense dot eyes
      ctx.beginPath();
      ctx.arc(fx - 18, headY - 1, 6, 0, Math.PI * 2);
      ctx.arc(fx + 22, headY - 1, 6, 0, Math.PI * 2);
      ctx.fill();

      // Animated angry mouth (talkPhase 0 vs 1)
      ctx.lineWidth = 5.5;
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      if (talkPhase === 0) {
        ctx.roundRect(fx - 18, headY + 18, 38, 22, 8);
      } else {
        ctx.roundRect(fx - 13, headY + 22, 28, 12, 6);
      }
      ctx.fill();
      ctx.stroke();
    } else if (expression === 'shocked') {
      // Raised brows
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(fx - 18, headY - 22, 12, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(fx + 22, headY - 22, 12, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      // Wide eyes
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(fx - 18, headY - 2, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(fx + 22, headY - 2, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = outline;
      ctx.beginPath();
      ctx.arc(fx - 17, headY - 2, 4.5, 0, Math.PI * 2);
      ctx.arc(fx + 23, headY - 2, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Animated O mouth (talkPhase 0 vs 1)
      ctx.fillStyle = '#991b1b';
      ctx.lineWidth = 5;
      ctx.beginPath();
      if (talkPhase === 0) {
        ctx.ellipse(fx + 2, headY + 30, 12, 15, 0, 0, Math.PI * 2);
      } else {
        ctx.ellipse(fx + 2, headY + 30, 8, 9, 0, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
    } else if (expression === 'drinking') {
      // Closed happy eyes
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(fx - 18, headY - 2, 10, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(fx + 22, headY - 2, 10, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      // Sipping mouth
      ctx.fillStyle = '#991b1b';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(fx + 14, headY + 28, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // --- 7. Headwear ---
  ctx.strokeStyle = outline;
  ctx.lineWidth = 8;

  if (profile.headwear === 'peci-white') {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(cx - 58, headY - 116, 116, 46, [14, 14, 6, 6]);
    ctx.fill();
    ctx.stroke();
  } else if (profile.headwear === 'peci') {
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(cx - 58, headY - 116, 116, 46, [14, 14, 6, 6]);
    ctx.fill();
    ctx.stroke();
  } else if (profile.headwear === 'sorban') {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(cx, headY - 82, 74, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.ellipse(cx, headY - 92, 48, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (profile.headwear === 'caping') {
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(cx - 108, headY - 56);
    ctx.lineTo(cx, headY - 134);
    ctx.lineTo(cx + 108, headY - 56);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

export function disposeCharacterTextureCache(): void {
  textureCache.forEach((tex) => tex.dispose());
  textureCache.clear();
  if (cachedClockTexture) {
    cachedClockTexture.dispose();
    cachedClockTexture = null;
  }
}
