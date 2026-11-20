import type { ProductionScene, ProductionStory, SceneDialogue } from './types';
import type { Shot } from '../cinematography/shotTypes';

const SPEEDLINE_COUNT = 32;

function pseudoUnit(index: number, tick: number): number {
  const x = Math.sin((index + 1) * 12.9898 + tick * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let line = words[0];
  for (let i = 1; i < words.length; i++) {
    const test = `${line} ${words[i]}`;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      lines.push(line);
      line = words[i];
    }
  }
  lines.push(line);
  return lines;
}

function drawSpeedlines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  currentTime: number
): void {
  const tick = Math.floor(currentTime * 18);
  const cx = width * 0.5;
  const cy = height * 0.46;
  const minDim = Math.min(width, height);

  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.lineCap = 'round';

  for (let i = 0; i < SPEEDLINE_COUNT; i++) {
    const baseAngle = (i / SPEEDLINE_COUNT) * Math.PI * 2;
    const angle = baseAngle + (pseudoUnit(i, tick) - 0.5) * 0.09;
    const r1 = (0.25 + pseudoUnit(i + 40, tick) * 0.15) * minDim;
    const r2 = 0.92 * height;
    ctx.lineWidth = (0.0025 + pseudoUnit(i + 90, tick) * 0.0055) * minDim;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHikmahCards(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: ProductionScene
): void {
  const cardW = width - 64;
  const cardX = 32;
  const padX = 28;
  const innerW = cardW - padX * 2;
  const lineH = 28;

  ctx.save();
  ctx.textBaseline = 'top';

  // Hitung tinggi total kartu untuk penempatan rata tengah vertikal
  let dalilH = 0;
  let arabicLines: string[] = [];
  let translitLines: string[] = [];
  let transLines: string[] = [];
  if (scene.dalilCard) {
    ctx.font = 'bold 34px Georgia, serif';
    arabicLines = wrapLines(ctx, scene.dalilCard.arabic, innerW);
    if (scene.dalilCard.transliteration) {
      ctx.font = 'italic 19px system-ui, -apple-system, sans-serif';
      translitLines = wrapLines(ctx, `"${scene.dalilCard.transliteration}"`, innerW);
    }
    ctx.font = '600 21px system-ui, -apple-system, sans-serif';
    transLines = wrapLines(ctx, `"${scene.dalilCard.translation}"`, innerW);
    dalilH =
      62 +
      arabicLines.length * 46 +
      14 +
      translitLines.length * 24 +
      (translitLines.length ? 8 : 0) +
      transLines.length * lineH +
      26;
  }

  let hikmahH = 0;
  const pointLinesList: string[][] = [];
  if (scene.hikmahCard) {
    ctx.font = '500 20px system-ui, -apple-system, sans-serif';
    for (const pt of scene.hikmahCard.points) {
      pointLinesList.push(wrapLines(ctx, pt, innerW - 42));
    }
    const ptsHeight = pointLinesList.reduce((acc, lines) => acc + lines.length * 25 + 12, 0);
    hikmahH = 58 + ptsHeight + 14;
  }

  const gap = scene.dalilCard && scene.hikmahCard ? 22 : 0;
  const totalH = dalilH + gap + hikmahH;
  let y = Math.max(48, (height - totalH) * 0.5);

  if (scene.dalilCard) {
    const grad = ctx.createLinearGradient(cardX, y, cardX, y + dalilH);
    grad.addColorStop(0, 'rgba(2, 6, 23, 0.94)');
    grad.addColorStop(0.6, 'rgba(15, 23, 42, 0.92)');
    grad.addColorStop(1, 'rgba(6, 78, 59, 0.88)');

    roundRectPath(ctx, cardX, y, cardW, dalilH, 24);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
    ctx.stroke();

    // Header kartu dalil
    ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#fcd34d';
    ctx.textAlign = 'left';
    ctx.fillText('HADITS PILIHAN', cardX + padX, y + 22);

    ctx.font = '600 15px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#fde68a';
    ctx.textAlign = 'right';
    ctx.fillText(scene.dalilCard.source, cardX + cardW - padX, y + 23);

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX + padX, y + 52);
    ctx.lineTo(cardX + cardW - padX, y + 52);
    ctx.stroke();

    let cy = y + 66;
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px Georgia, serif';
    ctx.fillStyle = '#fef3c7';
    for (const line of arabicLines) {
      ctx.fillText(line, width / 2, cy);
      cy += 46;
    }
    cy += 10;

    if (translitLines.length) {
      ctx.font = 'italic 19px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(253, 230, 138, 0.85)';
      for (const line of translitLines) {
        ctx.fillText(line, width / 2, cy);
        cy += 24;
      }
      cy += 8;
    }

    ctx.font = '600 21px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#e2e8f0';
    for (const line of transLines) {
      ctx.fillText(line, width / 2, cy);
      cy += lineH;
    }

    y += dalilH + gap;
  }

  if (scene.hikmahCard) {
    roundRectPath(ctx, cardX, y, cardW, hikmahH, 24);
    ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#6ee7b7';
    ctx.fillText(scene.hikmahCard.title.toUpperCase(), cardX + padX, y + 22);

    let cy = y + 58;
    for (let i = 0; i < pointLinesList.length; i++) {
      // Lingkaran nomor
      ctx.beginPath();
      ctx.arc(cardX + padX + 13, cy + 12, 13, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
      ctx.stroke();

      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#6ee7b7';
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), cardX + padX + 13, cy + 5);

      ctx.textAlign = 'left';
      ctx.font = '500 20px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#e2e8f0';
      for (const ln of pointLinesList[i]) {
        ctx.fillText(ln, cardX + padX + 38, cy);
        cy += 25;
      }
      cy += 12;
    }
  }

  ctx.restore();
}

function drawKaraokeSubtitles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dialogue: SceneDialogue,
  dialogueStartSec: number,
  currentTime: number
): void {
  const words = dialogue.text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return;

  const chunkSize = 4;
  const dur = Math.max(0.05, dialogue.durSec);
  const progress = Math.min(0.9999, Math.max(0, (currentTime - dialogueStartSec) / dur));
  const activeIdx = Math.min(words.length - 1, Math.floor(progress * words.length));
  const chunkStart = Math.floor(activeIdx / chunkSize) * chunkSize;
  const chunkWords = words.slice(chunkStart, chunkStart + chunkSize);
  const activeLocalIdx = activeIdx - chunkStart;

  ctx.save();
  ctx.font = '800 34px system-ui, -apple-system, sans-serif';
  ctx.textBaseline = 'middle';

  const padX = 12;
  const wordGap = 12;
  const maxRowW = width - 72;

  type Token = { text: string; active: boolean; w: number };
  const tokens: Token[] = chunkWords.map((w, idx) => {
    const active = idx === activeLocalIdx;
    const tw = ctx.measureText(w).width + (active ? padX * 2 : 0);
    return { text: w, active, w: tw };
  });

  // Bagi jadi baris bila lebar melebihi maxRowW
  const rows: Token[][] = [];
  let row: Token[] = [];
  let rowW = 0;
  for (const tok of tokens) {
    const nextW = row.length === 0 ? tok.w : rowW + wordGap + tok.w;
    if (row.length > 0 && nextW > maxRowW) {
      rows.push(row);
      row = [tok];
      rowW = tok.w;
    } else {
      row.push(tok);
      rowW = nextW;
    }
  }
  if (row.length > 0) rows.push(row);

  const rowH = 52;
  const baseY = height * 0.84 - ((rows.length - 1) * rowH) * 0.5;

  rows.forEach((r, rIdx) => {
    const totalRowW =
      r.reduce((acc, t) => acc + t.w, 0) + Math.max(0, r.length - 1) * wordGap;
    let x = (width - totalRowW) * 0.5;
    const y = baseY + rIdx * rowH;

    for (const tok of r) {
      if (tok.active) {
        roundRectPath(ctx, x, y - 22, tok.w, 44, 12);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#020617';
        ctx.fillText(tok.text, x + tok.w * 0.5, y + 1);
      } else {
        ctx.textAlign = 'left';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 8;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.94)';
        ctx.strokeText(tok.text, x, y + 1);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(tok.text, x, y + 1);
      }
      x += tok.w + wordGap;
    }
  });

  ctx.restore();
}

function drawDefaultSubtitles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dialogue: SceneDialogue
): void {
  ctx.save();
  ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
  const lines = wrapLines(ctx, dialogue.text, width - 88);
  const lineH = 34;
  const textBlockH = lines.length * lineH;
  const badgeH = 34;
  const startY = height - 88 - textBlockH - badgeH;

  // Speaker badge
  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  const badgeTextW = ctx.measureText(dialogue.speakerName).width;
  const badgeW = badgeTextW + 32;
  const badgeX = (width - badgeW) * 0.5;

  roundRectPath(ctx, badgeX, startY, badgeW, badgeH, 17);
  ctx.fillStyle =
    dialogue.speakerId === 'anak'
      ? 'rgba(245, 158, 11, 0.25)'
      : dialogue.speakerId === 'kakek'
        ? 'rgba(5, 150, 105, 0.28)'
        : 'rgba(30, 41, 59, 0.72)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle =
    dialogue.speakerId === 'anak'
      ? 'rgba(251, 191, 36, 0.5)'
      : dialogue.speakerId === 'kakek'
        ? 'rgba(52, 211, 153, 0.5)'
        : 'rgba(255, 255, 255, 0.25)';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle =
    dialogue.speakerId === 'anak'
      ? '#fde68a'
      : dialogue.speakerId === 'kakek'
        ? '#a7f3d0'
        : '#e2e8f0';
  ctx.fillText(dialogue.speakerName, width * 0.5, startY + badgeH * 0.5);

  // Teks subtitle dengan outline tebal
  ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
  ctx.lineJoin = 'round';
  let y = startY + badgeH + 26;
  for (const line of lines) {
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.92)';
    ctx.strokeText(line, width * 0.5, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, width * 0.5, y);
    y += lineH;
  }

  ctx.restore();
}

export function drawProductionOverlayToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  story: ProductionStory,
  currentTime: number
): void {
  const isDramaticShorts = story.cinematographyStyle === 'dramatic-shorts';

  let activeScene: ProductionScene = story.scenes[story.scenes.length - 1];
  for (const sc of story.scenes) {
    if (currentTime >= sc.startSec && currentTime < sc.startSec + sc.durationSec) {
      activeScene = sc;
      break;
    }
  }

  let activeShot: Shot | undefined = activeScene.shots[activeScene.shots.length - 1];
  for (const sh of activeScene.shots) {
    if (currentTime >= sh.startSec && currentTime < sh.startSec + sh.durSec) {
      activeShot = sh;
      break;
    }
  }

  let activeDialogueMatch: { dialogue: SceneDialogue; startSec: number } | undefined;
  for (const d of activeScene.dialogue) {
    const start =
      activeScene.startSec > 0 && d.startSec >= activeScene.startSec
        ? d.startSec
        : activeScene.startSec + d.startSec;
    if (currentTime >= start && currentTime < start + d.durSec) {
      activeDialogueMatch = { dialogue: d, startSec: start };
      break;
    }
  }

  const isHikmahCardActive = Boolean(
    (activeScene.dalilCard || activeScene.hikmahCard) &&
      currentTime >= activeScene.startSec + (activeScene.durationSec - 11.5)
  );

  if (isDramaticShorts && activeShot?.impactFx === 'speedlines') {
    drawSpeedlines(ctx, width, height, currentTime);
  }

  if (isHikmahCardActive && (activeScene.dalilCard || activeScene.hikmahCard)) {
    drawHikmahCards(ctx, width, height, activeScene);
  }

  if (activeDialogueMatch) {
    if (isDramaticShorts) {
      if (!isHikmahCardActive) {
        drawKaraokeSubtitles(
          ctx,
          width,
          height,
          activeDialogueMatch.dialogue,
          activeDialogueMatch.startSec,
          currentTime
        );
      }
    } else {
      drawDefaultSubtitles(ctx, width, height, activeDialogueMatch.dialogue);
    }
  }
}
