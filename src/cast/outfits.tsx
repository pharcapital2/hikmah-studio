import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { CastCostume, CostumePattern, OutfitStyle } from './characters';

export const OUTFIT_OUTLINE_MAT = new THREE.MeshBasicMaterial({
  color: '#111827',
  side: THREE.BackSide,
});

// Profil 2D bell standar (x = radius, y = ketinggian lokal)
const FULL_BELL_PROFILE: THREE.Vector2[] = [
  new THREE.Vector2(0.0, -0.28),
  new THREE.Vector2(0.17, -0.274),
  new THREE.Vector2(0.245, -0.235),
  new THREE.Vector2(0.242, -0.15),
  new THREE.Vector2(0.222, -0.04),
  new THREE.Vector2(0.195, 0.08),
  new THREE.Vector2(0.16, 0.2),
  new THREE.Vector2(0.105, 0.262),
  new THREE.Vector2(0.0, 0.28),
];

// Profil A-line melebar ke bawah (r_bottom ~ 0.285m) untuk gamis & jubah
const GAMIS_BELL_PROFILE: THREE.Vector2[] = [
  new THREE.Vector2(0.0, -0.28),
  new THREE.Vector2(0.22, -0.275),
  new THREE.Vector2(0.285, -0.245),
  new THREE.Vector2(0.272, -0.16),
  new THREE.Vector2(0.235, -0.05),
  new THREE.Vector2(0.198, 0.06),
  new THREE.Vector2(0.16, 0.19),
  new THREE.Vector2(0.105, 0.262),
  new THREE.Vector2(0.0, 0.28),
];

const UPPER_BELL_PROFILE: THREE.Vector2[] = [
  new THREE.Vector2(0.0, -0.165),
  new THREE.Vector2(0.214, -0.165),
  new THREE.Vector2(0.208, -0.095),
  new THREE.Vector2(0.186, 0.005),
  new THREE.Vector2(0.158, 0.095),
  new THREE.Vector2(0.105, 0.148),
  new THREE.Vector2(0.0, 0.165),
];

const LOWER_BELL_PROFILE: THREE.Vector2[] = [
  new THREE.Vector2(0.0, -0.13),
  new THREE.Vector2(0.17, -0.124),
  new THREE.Vector2(0.248, -0.082),
  new THREE.Vector2(0.244, 0.0),
  new THREE.Vector2(0.224, 0.108),
  new THREE.Vector2(0.212, 0.13),
  new THREE.Vector2(0.0, 0.13),
];

interface CenteredGeo {
  geo: THREE.BufferGeometry;
  yMid: number;
}

/** Interpolasi radius permukaan profil bell pada ketinggian lokal tertentu. */
function sampleProfileRadius(profile: THREE.Vector2[], y: number): number {
  const openPts = profile.slice(1, profile.length - 1);
  if (y <= openPts[0].y) return openPts[0].x;
  if (y >= openPts[openPts.length - 1].y) return openPts[openPts.length - 1].x;
  for (let i = 0; i < openPts.length - 1; i++) {
    const a = openPts[i];
    const b = openPts[i + 1];
    if (y >= a.y && y <= b.y) {
      const t = (y - a.y) / Math.max(1e-5, b.y - a.y);
      return a.x + (b.x - a.x) * t;
    }
  }
  return openPts[0].x;
}

/**
 * Membuat cangkang pakaian luar berdinding ganda terpusat di y=0 lokal
 * agar outline BackSide membesar merata ke atas, bawah, dan samping tanpa artefak hitam di bukaan depan.
 */
function createClosedShellArcGeometry(
  profile: THREE.Vector2[],
  yOffset: number,
  yMin: number,
  yMax: number,
  phiStart: number,
  phiLength: number,
  innerGap: number,
  outerGap: number,
  segments = 24
): CenteredGeo {
  const yMid = (yMin + yMax) * 0.5;
  const steps = 8;
  const outerPts: THREE.Vector2[] = [];
  const innerPts: THREE.Vector2[] = [];

  for (let i = 0; i <= steps; i++) {
    const worldY = yMin + ((yMax - yMin) * i) / steps;
    const baseR = sampleProfileRadius(profile, worldY - yOffset);
    outerPts.push(new THREE.Vector2(baseR + outerGap, worldY - yMid));
    innerPts.push(new THREE.Vector2(baseR + innerGap, worldY - yMid));
  }

  const loopPts: THREE.Vector2[] = [
    ...outerPts,
    ...innerPts.slice().reverse(),
    outerPts[0].clone(),
  ];

  return {
    geo: new THREE.LatheGeometry(loopPts, segments, phiStart, phiLength),
    yMid,
  };
}

/** Menghasilkan titik 3D tepat di atas permukaan bell tubuh pada sudut `phi` dan ketinggian `y`. */
function bellPoint(
  profile: THREE.Vector2[],
  yOffset: number,
  y: number,
  phi: number,
  radialOffset: number
): THREE.Vector3 {
  const r = sampleProfileRadius(profile, y - yOffset) + radialOffset;
  return new THREE.Vector3(r * Math.sin(phi), y, r * Math.cos(phi));
}

function createContourTrimGeometry(
  profile: THREE.Vector2[],
  yOffset: number,
  yMin: number,
  yMax: number,
  phi: number,
  radialOffset: number,
  tubeRadius: number
): CenteredGeo {
  const yMid = (yMin + yMax) * 0.5;
  const pts: THREE.Vector3[] = [];
  const steps = 7;
  for (let i = 0; i <= steps; i++) {
    const y = yMin + ((yMax - yMin) * i) / steps;
    const p = bellPoint(profile, yOffset, y, phi, radialOffset);
    pts.push(new THREE.Vector3(p.x, p.y - yMid, p.z));
  }
  return {
    geo: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, tubeRadius, 8, false),
    yMid,
  };
}

function centerTubePoints(pts: THREE.Vector3[], radius: number, segments = 24): CenteredGeo {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const yMid = (minY + maxY) * 0.5;
  const centered = pts.map((p) => new THREE.Vector3(p.x, p.y - yMid, p.z));
  return {
    geo: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(centered), segments, radius, 8, false),
    yMid,
  };
}

function createSashGeometry(): THREE.TubeGeometry {
  // Selendang diagonal melingkari permukaan torso bell tanpa menembus badan
  const pts: THREE.Vector3[] = [];
  const steps = 28;
  for (let i = 0; i < steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const y = 0.31 - 0.17 * Math.cos(theta);
    const r = 0.242 - 0.25 * (y - 0.14) + 0.015;
    pts.push(new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta)));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true);
  return new THREE.TubeGeometry(curve, 40, 0.022, 8, true);
}

function createTieBladeGeometry(): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.011, 0.085);
  s.lineTo(0.011, 0.085);
  s.lineTo(0.021, -0.055);
  s.lineTo(0.0, -0.09);
  s.lineTo(-0.021, -0.055);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, {
    depth: 0.009,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.002,
    bevelSegments: 1,
  });
}

function createLapelGeometry(side: 1 | -1): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  // Kerah V jas dengan lekukan notch klasik (titik 0,0 di pangkal kancing pinggang)
  s.moveTo(0, 0);
  s.lineTo(side * 0.044, 0.175);
  s.lineTo(side * 0.014, 0.185);
  s.lineTo(side * 0.008, 0.125);
  s.lineTo(side * 0.026, 0.115);
  s.lineTo(-side * 0.01, 0.004);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, {
    depth: 0.01,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.002,
    bevelSegments: 1,
  });
}

function createCollarWingGeometry(side: 1 | -1): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0.014);
  s.lineTo(side * 0.044, 0.006);
  s.lineTo(side * 0.028, -0.036);
  s.lineTo(-side * 0.005, -0.014);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, {
    depth: 0.008,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.002,
    bevelSegments: 1,
  });
}

function createOverShoulderCurve(side: 1 | -1): CenteredGeo {
  return centerTubePoints(
    [
      bellPoint(UPPER_BELL_PROFILE, 0.405, 0.445, side * 0.48, 0.016),
      bellPoint(UPPER_BELL_PROFILE, 0.405, 0.505, side * 0.62, 0.018),
      bellPoint(UPPER_BELL_PROFILE, 0.405, 0.548, side * 1.45, 0.022),
      bellPoint(UPPER_BELL_PROFILE, 0.405, 0.455, side * 2.48, 0.016),
      bellPoint(UPPER_BELL_PROFILE, 0.405, 0.265, side * 2.65, 0.014),
    ],
    0.013,
    22
  );
}

function createBackpackStrapGeometry(side: 1 | -1): CenteredGeo {
  return centerTubePoints(
    [
      bellPoint(UPPER_BELL_PROFILE, 0.405, 0.465, side * 2.52, 0.015),
      bellPoint(UPPER_BELL_PROFILE, 0.405, 0.542, side * 1.48, 0.02),
      bellPoint(UPPER_BELL_PROFILE, 0.405, 0.44, side * 0.72, 0.015),
      bellPoint(UPPER_BELL_PROFILE, 0.405, 0.32, side * 1.25, 0.015),
      bellPoint(UPPER_BELL_PROFILE, 0.405, 0.255, side * 2.45, 0.016),
    ],
    0.012,
    24
  );
}

function createFarmerTowelGeometry(): CenteredGeo {
  return centerTubePoints(
    [
      bellPoint(UPPER_BELL_PROFILE, 0.405, 0.355, -0.68, 0.024),
      bellPoint(UPPER_BELL_PROFILE, 0.405, 0.455, -0.78, 0.026),
      bellPoint(UPPER_BELL_PROFILE, 0.405, 0.538, -1.25, 0.028),
      bellPoint(UPPER_BELL_PROFILE, 0.405, 0.552, Math.PI, 0.025),
      bellPoint(UPPER_BELL_PROFILE, 0.405, 0.538, 1.25, 0.028),
      bellPoint(UPPER_BELL_PROFILE, 0.405, 0.455, 0.78, 0.026),
      bellPoint(UPPER_BELL_PROFILE, 0.405, 0.355, 0.68, 0.024),
    ],
    0.021,
    34
  );
}

function createCloakClaspCordGeometry(): THREE.TubeGeometry {
  const pts = [
    bellPoint(GAMIS_BELL_PROFILE, 0.28, 0.495, -0.4, 0.022),
    bellPoint(GAMIS_BELL_PROFILE, 0.28, 0.483, -0.2, 0.022),
    bellPoint(GAMIS_BELL_PROFILE, 0.28, 0.478, 0, 0.022),
    bellPoint(GAMIS_BELL_PROFILE, 0.28, 0.483, 0.2, 0.022),
    bellPoint(GAMIS_BELL_PROFILE, 0.28, 0.495, 0.4, 0.022),
  ];
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.008, 8, false);
}

// Geometri bersama tingkat modul (mencegah alokasi ulang & mempertahankan 60 FPS)
export const BELL_FULL_GEO = new THREE.LatheGeometry(FULL_BELL_PROFILE, 24);
export const BELL_GAMIS_GEO = new THREE.LatheGeometry(GAMIS_BELL_PROFILE, 24);
export const BELL_UPPER_GEO = new THREE.LatheGeometry(UPPER_BELL_PROFILE, 24);
export const BELL_LOWER_GEO = new THREE.LatheGeometry(LOWER_BELL_PROFILE, 24);
export const SASH_GEO = createSashGeometry();

const CARDIGAN_SHELL = createClosedShellArcGeometry(
  GAMIS_BELL_PROFILE,
  0.28,
  0.11,
  0.542,
  0.3,
  Math.PI * 2 - 0.6,
  0.004,
  0.022,
  24
);
const CARDIGAN_EDGE_L = createContourTrimGeometry(
  GAMIS_BELL_PROFILE,
  0.28,
  0.115,
  0.54,
  0.3,
  0.014,
  0.013
);
const CARDIGAN_EDGE_R = createContourTrimGeometry(
  GAMIS_BELL_PROFILE,
  0.28,
  0.115,
  0.54,
  -0.3,
  0.014,
  0.013
);

const VEST_SHELL = createClosedShellArcGeometry(
  UPPER_BELL_PROFILE,
  0.405,
  0.255,
  0.545,
  0.28,
  Math.PI * 2 - 0.56,
  0.004,
  0.022,
  24
);
const VEST_EDGE_L = createContourTrimGeometry(
  UPPER_BELL_PROFILE,
  0.405,
  0.258,
  0.542,
  0.28,
  0.014,
  0.013
);
const VEST_EDGE_R = createContourTrimGeometry(
  UPPER_BELL_PROFILE,
  0.405,
  0.258,
  0.542,
  -0.28,
  0.014,
  0.013
);

const BIB_SHELL = createClosedShellArcGeometry(
  UPPER_BELL_PROFILE,
  0.405,
  0.25,
  0.455,
  -0.52,
  1.04,
  0.003,
  0.02,
  14
);
const BIB_EDGE_L = createContourTrimGeometry(
  UPPER_BELL_PROFILE,
  0.405,
  0.254,
  0.453,
  0.52,
  0.012,
  0.011
);
const BIB_EDGE_R = createContourTrimGeometry(
  UPPER_BELL_PROFILE,
  0.405,
  0.254,
  0.453,
  -0.52,
  0.012,
  0.011
);

const CLOAK_SHELL = createClosedShellArcGeometry(
  GAMIS_BELL_PROFILE,
  0.28,
  0.03,
  0.544,
  0.4,
  Math.PI * 2 - 0.8,
  0.005,
  0.025,
  24
);
const CLOAK_EDGE_L = createContourTrimGeometry(
  GAMIS_BELL_PROFILE,
  0.28,
  0.035,
  0.542,
  0.4,
  0.016,
  0.014
);
const CLOAK_EDGE_R = createContourTrimGeometry(
  GAMIS_BELL_PROFILE,
  0.28,
  0.035,
  0.542,
  -0.4,
  0.016,
  0.014
);
const CLOAK_CLASP_CORD_GEO = createCloakClaspCordGeometry();

const BLAZER_SHELL = createClosedShellArcGeometry(
  FULL_BELL_PROFILE,
  0.28,
  0.21,
  0.544,
  0.28,
  Math.PI * 2 - 0.56,
  0.004,
  0.022,
  24
);
const BLAZER_SKIRT_LAP = createClosedShellArcGeometry(
  FULL_BELL_PROFILE,
  0.28,
  0.21,
  0.33,
  -0.31,
  0.62,
  0.004,
  0.022,
  10
);
const BLAZER_EDGE_L = createContourTrimGeometry(
  FULL_BELL_PROFILE,
  0.28,
  0.33,
  0.542,
  0.28,
  0.014,
  0.012
);
const BLAZER_EDGE_R = createContourTrimGeometry(
  FULL_BELL_PROFILE,
  0.28,
  0.33,
  0.542,
  -0.28,
  0.014,
  0.012
);

const SUSPENDER_L = createOverShoulderCurve(1);
const SUSPENDER_R = createOverShoulderCurve(-1);
const BACKPACK_STRAP_L = createBackpackStrapGeometry(1);
const BACKPACK_STRAP_R = createBackpackStrapGeometry(-1);
const FARMER_TOWEL = createFarmerTowelGeometry();

const TIE_BLADE_GEO = createTieBladeGeometry();
const LAPEL_L_GEO = createLapelGeometry(1);
const LAPEL_R_GEO = createLapelGeometry(-1);
const COLLAR_WING_L_GEO = createCollarWingGeometry(1);
const COLLAR_WING_R_GEO = createCollarWingGeometry(-1);

const SLEEVE_SHORT_GEO = new THREE.CylinderGeometry(0.041, 0.047, 0.11, 14);
const SLEEVE_LONG_GEO = new THREE.CylinderGeometry(0.04, 0.036, 0.2, 14);
const SLEEVE_CAP_SPHERE_GEO = new THREE.SphereGeometry(0.041, 12, 10);
const UNIT_BOX_GEO = new THREE.BoxGeometry(1, 1, 1);
const UNIT_SPHERE_GEO = new THREE.SphereGeometry(1, 12, 10);

const outfitTextureCache = new Map<string, THREE.CanvasTexture>();

function drawSarongPattern(
  ctx: CanvasRenderingContext2D,
  size: number,
  bottom: string,
  accent: string
): void {
  ctx.fillStyle = bottom;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.28;
  for (let x = 0; x < size; x += 32) {
    ctx.fillRect(x, 0, 8, size);
  }
  for (let y = 0; y < size; y += 32) {
    ctx.fillRect(0, y, size, 7);
  }

  ctx.strokeStyle = '#ffffff';
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 2;
  for (let x = 16; x < size; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = 16; y < size; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.42;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, size, 28);
  ctx.globalAlpha = 1;
}

function drawSongketPattern(
  ctx: CanvasRenderingContext2D,
  size: number,
  bottom: string,
  accent: string
): void {
  ctx.fillStyle = bottom;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, 8, size, 12);
  ctx.fillRect(0, size - 54, size, 14);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  for (let y = 40; y < size - 48; y += 32) {
    ctx.globalAlpha = 0.32;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();

    ctx.globalAlpha = 0.65;
    for (let x = 0; x < size; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x + 16, y - 9);
      ctx.lineTo(x + 25, y);
      ctx.lineTo(x + 16, y + 9);
      ctx.lineTo(x + 7, y);
      ctx.closePath();
      ctx.stroke();
    }
  }

  ctx.globalAlpha = 0.72;
  ctx.fillStyle = accent;
  for (let x = 0; x < size; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, size - 36);
    ctx.lineTo(x + 16, size - 58);
    ctx.lineTo(x + 32, size - 36);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPolkaPattern(
  ctx: CanvasRenderingContext2D,
  size: number,
  top: string,
  bottom: string,
  accent: string
): void {
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = bottom;
  ctx.fillRect(0, size - 62, size, 62);
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.75;
  ctx.fillRect(0, size - 66, size, 5);

  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.58;
  const step = 32;
  for (let row = 0; row < (size - 48) / step; row++) {
    const y = row * step + 16;
    const offsetX = row % 2 === 0 ? 0 : step / 2;
    for (let col = -1; col <= size / step + 1; col++) {
      const x = col * step + offsetX;
      ctx.beginPath();
      ctx.arc(x, y, 5.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawBatikPattern(
  ctx: CanvasRenderingContext2D,
  size: number,
  top: string,
  accent: string
): void {
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, size, size);

  // Motif Kawung Nusantara deterministik berulang per 64px (4 tile penuh per lingkar)
  const tile = 64;
  ctx.strokeStyle = accent;
  ctx.fillStyle = '#0f172a';
  for (let ty = 0; ty < size; ty += tile) {
    for (let tx = 0; tx < size; tx += tile) {
      const cx = tx + tile / 2;
      const cy = ty + tile / 2;

      ctx.globalAlpha = 0.24;
      for (let k = 0; k < 4; k++) {
        const ang = (k * Math.PI) / 2 + Math.PI / 4;
        ctx.save();
        ctx.translate(cx + Math.cos(ang) * 16, cy + Math.sin(ang) * 16);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) {
        const ang = (k * Math.PI) / 2 + Math.PI / 4;
        ctx.save();
        ctx.translate(cx + Math.cos(ang) * 16, cy + Math.sin(ang) * 16);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      ctx.arc(cx, cy, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
    }
  }
  ctx.globalAlpha = 1;
}

function drawFlannelPattern(
  ctx: CanvasRenderingContext2D,
  size: number,
  top: string,
  accent: string
): void {
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#0f172a';
  ctx.globalAlpha = 0.34;
  for (let x = 0; x < size; x += 32) {
    ctx.fillRect(x, 0, 11, size);
  }
  for (let y = 0; y < size; y += 32) {
    ctx.fillRect(0, y, size, 10);
  }

  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.36;
  for (let x = 16; x < size; x += 32) {
    ctx.fillRect(x, 0, 4, size);
  }
  for (let y = 16; y < size; y += 32) {
    ctx.fillRect(0, y, size, 4);
  }

  ctx.strokeStyle = '#ffffff';
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = 1.5;
  for (let x = 22; x < size; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawStripesPattern(
  ctx: CanvasRenderingContext2D,
  size: number,
  top: string,
  bottom: string,
  accent: string
): void {
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(0, 108, size, 18);

  ctx.fillStyle = '#f8fafc';
  ctx.globalAlpha = 0.9;
  ctx.fillRect(0, 132, size, 8);

  ctx.fillStyle = bottom;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(0, size - 28, size, 28);
  ctx.globalAlpha = 1;
}

function drawKokoEmbroideryPattern(
  ctx: CanvasRenderingContext2D,
  size: number,
  top: string,
  accent: string
): void {
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, size, size);

  const panelHalf = 18;
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, 0, panelHalf, size - 56);
  ctx.fillRect(size - panelHalf, 0, panelHalf, size - 56);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.85;
  for (let y = 20; y < size - 68; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(11, y + 10);
    ctx.lineTo(0, y + 20);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(size, y);
    ctx.lineTo(size - 11, y + 10);
    ctx.lineTo(size, y + 20);
    ctx.stroke();
  }

  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.72;
  ctx.fillRect(0, size - 64, size, 8);
  ctx.globalAlpha = 0.4;
  ctx.fillRect(0, size - 52, size, 6);
  ctx.globalAlpha = 1;
}

/**
 * Menghasilkan dan meng-cache CanvasTexture kain deterministik (tanpa Math.random)
 * untuk seluruh motif busana studio.
 */
export function getOutfitTexture(
  pattern: CostumePattern,
  top: string,
  bottom: string,
  accent: string
): THREE.CanvasTexture | null {
  if (pattern === 'plain' || typeof document === 'undefined') {
    return null;
  }

  const key = `${pattern}:${top}:${bottom}:${accent}`;
  const cached = outfitTextureCache.get(key);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    switch (pattern) {
      case 'sarong':
        drawSarongPattern(ctx, size, bottom, accent);
        break;
      case 'songket':
        drawSongketPattern(ctx, size, bottom, accent);
        break;
      case 'polka':
        drawPolkaPattern(ctx, size, top, bottom, accent);
        break;
      case 'batik':
        drawBatikPattern(ctx, size, top, accent);
        break;
      case 'flannel':
        drawFlannelPattern(ctx, size, top, accent);
        break;
      case 'stripes':
        drawStripesPattern(ctx, size, top, bottom, accent);
        break;
      case 'koko_embroidery':
        drawKokoEmbroideryPattern(ctx, size, top, accent);
        break;
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  outfitTextureCache.set(key, tex);
  return tex;
}

interface OutfitDefaults {
  pattern: CostumePattern;
  sleeveStyle: 'short' | 'long' | 'none';
}

const OUTFIT_DEFAULTS: Record<OutfitStyle, OutfitDefaults> = {
  koko_sarong: { pattern: 'sarong', sleeveStyle: 'short' },
  gamis_cardigan: { pattern: 'polka', sleeveStyle: 'long' },
  hoodie_backpack: { pattern: 'stripes', sleeveStyle: 'short' },
  koko_vest_sash: { pattern: 'songket', sleeveStyle: 'long' },
  farmer_overalls: { pattern: 'flannel', sleeveStyle: 'short' },
  jubbah_cloak: { pattern: 'koko_embroidery', sleeveStyle: 'long' },
  batik_formal: { pattern: 'batik', sleeveStyle: 'short' },
  blazer_tie: { pattern: 'plain', sleeveStyle: 'long' },
};

function resolveOutfitAppearance(costume: CastCostume, outfit: OutfitStyle) {
  const isNative = outfit === (costume.outfit ?? 'koko_sarong');
  const defaults = OUTFIT_DEFAULTS[outfit];
  return {
    pattern: isNative ? (costume.pattern ?? defaults.pattern) : defaults.pattern,
    sleeveStyle: isNative ? (costume.sleeveStyle ?? defaults.sleeveStyle) : defaults.sleeveStyle,
    outerColor: costume.outerColor ?? costume.top,
    accent: costume.accent ?? '#fde68a',
  };
}

/** Komponen render cangkang/pipa terpusat beserta outline simetris. */
const OutlinedShell: React.FC<{
  item: CenteredGeo;
  color: string;
  grad: THREE.DataTexture;
  outlineScale?: [number, number, number];
}> = ({ item, color, grad, outlineScale = [1.042, 1.03, 1.042] }) => (
  <group position={[0, item.yMid, 0]}>
    <mesh geometry={item.geo}>
      <meshToonMaterial color={color} gradientMap={grad} />
    </mesh>
    <mesh geometry={item.geo} scale={outlineScale} material={OUTFIT_OUTLINE_MAT} />
  </group>
);

/** Saku dada / saku tempel 3D yang menempel tangensial pada permukaan bell dada. */
const ChestPocket3D: React.FC<{
  profile?: THREE.Vector2[];
  yOffset?: number;
  y: number;
  phi: number;
  radialOffset?: number;
  color: string;
  trimColor?: string;
  width?: number;
  height?: number;
  tiltX?: number;
  grad: THREE.DataTexture;
}> = ({
  profile = UPPER_BELL_PROFILE,
  yOffset = 0.405,
  y,
  phi,
  radialOffset = 0.006,
  color,
  trimColor,
  width = 0.056,
  height = 0.058,
  tiltX = -0.22,
  grad,
}) => {
  const pos = bellPoint(profile, yOffset, y, phi, radialOffset);
  return (
    <group position={[pos.x, pos.y, pos.z]} rotation={[0, phi, 0]}>
      <group rotation={[tiltX, 0, 0]}>
        <mesh geometry={UNIT_BOX_GEO} scale={[width, height, 0.012]}>
          <meshToonMaterial color={color} gradientMap={grad} />
        </mesh>
        <mesh
          geometry={UNIT_BOX_GEO}
          scale={[width + 0.008, height + 0.008, 0.017]}
          material={OUTFIT_OUTLINE_MAT}
        />
        {trimColor && (
          <mesh
            geometry={UNIT_BOX_GEO}
            position={[0, height * 0.38, 0.002]}
            scale={[width + 0.003, 0.012, 0.013]}
          >
            <meshToonMaterial color={trimColor} gradientMap={grad} />
          </mesh>
        )}
      </group>
    </group>
  );
};

/** Kerah kemeja V-lipat 3D untuk batik_formal, farmer_overalls, dan blazer_tie. */
const FoldedShirtCollar3D: React.FC<{
  color: string;
  grad: THREE.DataTexture;
}> = ({ color, grad }) => (
  <group>
    <mesh position={[0, 0.546, -0.004]} rotation={[Math.PI / 2 + 0.08, 0, Math.PI * 0.16]}>
      <torusGeometry args={[0.095, 0.015, 8, 18, Math.PI * 1.68]} />
      <meshToonMaterial color={color} gradientMap={grad} />
    </mesh>
    {[
      { side: 1 as const, geo: COLLAR_WING_L_GEO },
      { side: -1 as const, geo: COLLAR_WING_R_GEO },
    ].map(({ side, geo }) => {
      const p = bellPoint(UPPER_BELL_PROFILE, 0.405, 0.538, side * 0.26, 0.009);
      return (
        <group
          key={`collar-wing-${side}`}
          position={[p.x, p.y, p.z]}
          rotation={[0, side * 0.26, 0]}
        >
          <group rotation={[-0.72, 0, 0]}>
            <mesh geometry={geo}>
              <meshToonMaterial color={color} gradientMap={grad} />
            </mesh>
            <mesh geometry={geo} scale={[1.1, 1.12, 1.25]} material={OUTFIT_OUTLINE_MAT} />
          </group>
        </group>
      );
    })}
  </group>
);

export interface CharacterOutfitProps {
  costume: CastCostume;
  outfit: OutfitStyle;
  grad: THREE.DataTexture;
}

/**
 * Merender siluet busana 3D berlapis (8 gaya outfit) dengan tekstur kain prosedural,
 * aksesori khas (ransel, cardigan, rompi, werpak, mantel bisht, dasi/jas), dan outline tinta.
 */
export const CharacterOutfit: React.FC<CharacterOutfitProps> = ({ costume, outfit, grad }) => {
  const { pattern, outerColor, accent } = resolveOutfitAppearance(costume, outfit);

  const fabricTex = useMemo(
    () => getOutfitTexture(pattern, costume.top, costume.bottom, accent),
    [pattern, costume.top, costume.bottom, accent]
  );
  const texKey = `${outfit}:${pattern}:${costume.top}:${costume.bottom}:${accent}`;

  // 1. KOKO & SARUNG (Ayah default)
  if (outfit === 'koko_sarong') {
    return (
      <group key={texKey}>
        <mesh geometry={BELL_UPPER_GEO} position={[0, 0.405, 0]}>
          <meshToonMaterial color={costume.top} gradientMap={grad} />
        </mesh>
        <mesh
          geometry={BELL_UPPER_GEO}
          position={[0, 0.405, 0]}
          scale={[1.055, 1.05, 1.055]}
          material={OUTFIT_OUTLINE_MAT}
        />

        <mesh geometry={BELL_LOWER_GEO} position={[0, 0.13, 0]}>
          {fabricTex ? (
            <meshToonMaterial key={`tex-${texKey}`} color="#ffffff" map={fabricTex} gradientMap={grad} />
          ) : (
            <meshToonMaterial key={`plain-${texKey}`} color={costume.bottom} gradientMap={grad} />
          )}
        </mesh>
        <mesh
          geometry={BELL_LOWER_GEO}
          position={[0, 0.13, 0]}
          scale={[1.05, 1.055, 1.05]}
          material={OUTFIT_OUTLINE_MAT}
        />

        {/* Lipatan pinggang sarung berlapis */}
        <mesh position={[0, 0.254, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.214, 0.015, 8, 24]} />
          <meshToonMaterial color={accent} gradientMap={grad} />
        </mesh>
        <mesh
          position={[0, 0.254, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[1.03, 1.03, 1.25]}
          material={OUTFIT_OUTLINE_MAT}
        >
          <torusGeometry args={[0.214, 0.015, 8, 24]} />
        </mesh>

        {/* Kerah shanghai / mandarin + plaket kancing bordir */}
        <mesh position={[0, 0.545, 0.005]} rotation={[Math.PI / 2 + 0.08, 0, 0]}>
          <torusGeometry args={[0.095, 0.015, 8, 18]} />
          <meshToonMaterial color="#f8fafc" gradientMap={grad} />
        </mesh>
        <group position={[0.012, 0.43, 0.184]} rotation={[-0.25, 0, 0]}>
          <mesh geometry={UNIT_BOX_GEO} scale={[0.026, 0.18, 0.01]}>
            <meshToonMaterial color="#f8fafc" gradientMap={grad} />
          </mesh>
          <mesh geometry={UNIT_BOX_GEO} position={[-0.017, 0, -0.001]} scale={[0.007, 0.18, 0.009]}>
            <meshToonMaterial color={accent} gradientMap={grad} />
          </mesh>
          {[0.055, 0.0, -0.055].map((by, idx) => (
            <mesh key={idx} position={[0, by, 0.006]}>
              <sphereGeometry args={[0.008, 8, 8]} />
              <meshBasicMaterial color="#1e293b" />
            </mesh>
          ))}
        </group>

        {/* Saku dada 3D di dada kiri */}
        <ChestPocket3D y={0.435} phi={0.48} color={costume.top} trimColor={accent} grad={grad} />

        {costume.sash && (
          <>
            <mesh geometry={SASH_GEO}>
              <meshToonMaterial color={accent} gradientMap={grad} />
            </mesh>
            <mesh geometry={SASH_GEO} scale={[1.03, 1.03, 1.03]} material={OUTFIT_OUTLINE_MAT} />
          </>
        )}
      </group>
    );
  }

  // 2. GAMIS CARDIGAN (Ibu default)
  if (outfit === 'gamis_cardigan') {
    const broochPos = bellPoint(GAMIS_BELL_PROFILE, 0.28, 0.455, 0.44, 0.025);
    return (
      <group key={texKey}>
        {/* Gamis A-line melebar dengan motif polkadot */}
        <mesh geometry={BELL_GAMIS_GEO} position={[0, 0.28, 0]}>
          {fabricTex ? (
            <meshToonMaterial key={`tex-${texKey}`} color="#ffffff" map={fabricTex} gradientMap={grad} />
          ) : (
            <meshToonMaterial key={`plain-${texKey}`} color={costume.top} gradientMap={grad} />
          )}
        </mesh>
        <mesh
          geometry={BELL_GAMIS_GEO}
          position={[0, 0.28, 0]}
          scale={[1.048, 1.032, 1.048]}
          material={OUTFIT_OUTLINE_MAT}
        />

        {/* Lapisan Cardigan terbuka bervolume di sisi kiri, kanan & punggung */}
        <OutlinedShell item={CARDIGAN_SHELL} color={outerColor} grad={grad} />
        <OutlinedShell
          item={CARDIGAN_EDGE_L}
          color={outerColor}
          grad={grad}
          outlineScale={[1.05, 1.025, 1.05]}
        />
        <OutlinedShell
          item={CARDIGAN_EDGE_R}
          color={outerColor}
          grad={grad}
          outlineScale={[1.05, 1.025, 1.05]}
        />

        {/* Saku kecil di kedua panel depan cardigan */}
        {[-1, 1].map((side) => (
          <ChestPocket3D
            key={`card-pocket-${side}`}
            profile={GAMIS_BELL_PROFILE}
            yOffset={0.28}
            y={0.23}
            phi={side * 0.52}
            radialOffset={0.024}
            color={outerColor}
            trimColor={accent}
            width={0.052}
            height={0.052}
            tiltX={0.24}
            grad={grad}
          />
        ))}

        {/* Kerah gamis & pita pinggang dengan simpul kupu-kupu 3D */}
        <mesh position={[0, 0.545, 0.005]} rotation={[Math.PI / 2 + 0.08, 0, 0]}>
          <torusGeometry args={[0.095, 0.015, 8, 18]} />
          <meshToonMaterial color={accent} gradientMap={grad} />
        </mesh>

        <mesh position={[0, 0.338, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.201, 0.011, 8, 24]} />
          <meshToonMaterial color={accent} gradientMap={grad} />
        </mesh>
        <group position={[0, 0.338, 0.208]} rotation={[-0.18, 0, 0]}>
          <mesh geometry={UNIT_SPHERE_GEO} scale={[0.016, 0.015, 0.013]}>
            <meshToonMaterial color={accent} gradientMap={grad} />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={`bow-${side}`}>
              <mesh
                position={[side * 0.024, 0.004, 0]}
                rotation={[0, 0, side * -0.25]}
                scale={[0.022, 0.014, 0.01]}
                geometry={UNIT_SPHERE_GEO}
              >
                <meshToonMaterial color={accent} gradientMap={grad} />
              </mesh>
              <mesh
                position={[side * 0.014, -0.026, 0.002]}
                rotation={[0, 0, side * 0.32]}
                scale={[0.01, 0.036, 0.006]}
                geometry={UNIT_BOX_GEO}
              >
                <meshToonMaterial color={accent} gradientMap={grad} />
              </mesh>
            </group>
          ))}
        </group>

        {/* Bros emas dada kiri */}
        <group position={[broochPos.x, broochPos.y, broochPos.z]} rotation={[0, 0.44, 0]}>
          <mesh scale={[0.018, 0.018, 0.008]} geometry={UNIT_SPHERE_GEO}>
            <meshToonMaterial color="#facc15" gradientMap={grad} />
          </mesh>
          <mesh position={[0, 0, 0.004]} scale={[0.009, 0.009, 0.006]} geometry={UNIT_SPHERE_GEO}>
            <meshToonMaterial color={accent} gradientMap={grad} />
          </mesh>
          <mesh
            scale={[0.022, 0.022, 0.01]}
            material={OUTFIT_OUTLINE_MAT}
            geometry={UNIT_SPHERE_GEO}
          />
        </group>
      </group>
    );
  }

  // 3. HOODIE & RANSEL (Adik Fajar default)
  if (outfit === 'hoodie_backpack') {
    return (
      <group key={texKey}>
        {/* Hoodie atas bergaris + celana bawah */}
        <mesh geometry={BELL_UPPER_GEO} position={[0, 0.405, 0]}>
          {fabricTex ? (
            <meshToonMaterial key={`tex-${texKey}`} color="#ffffff" map={fabricTex} gradientMap={grad} />
          ) : (
            <meshToonMaterial key={`plain-${texKey}`} color={costume.top} gradientMap={grad} />
          )}
        </mesh>
        <mesh
          geometry={BELL_UPPER_GEO}
          position={[0, 0.405, 0]}
          scale={[1.055, 1.05, 1.055]}
          material={OUTFIT_OUTLINE_MAT}
        />

        <mesh geometry={BELL_LOWER_GEO} position={[0, 0.13, 0]}>
          <meshToonMaterial color={costume.bottom} gradientMap={grad} />
        </mesh>
        <mesh
          geometry={BELL_LOWER_GEO}
          position={[0, 0.13, 0]}
          scale={[1.05, 1.055, 1.05]}
          material={OUTFIT_OUTLINE_MAT}
        />

        {/* Manset karet bawah hoodie */}
        <mesh position={[0, 0.252, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.214, 0.013, 8, 24]} />
          <meshToonMaterial color={costume.bottom} gradientMap={grad} />
        </mesh>

        {/* Tudung (hood) terlipat di belakang leher */}
        <group position={[0, 0.54, -0.02]}>
          <mesh rotation={[Math.PI / 2 + 0.35, 0, Math.PI * 0.85]}>
            <torusGeometry args={[0.105, 0.032, 10, 18, Math.PI * 1.3]} />
            <meshToonMaterial color={costume.top} gradientMap={grad} />
          </mesh>
          <mesh
            position={[0, -0.025, -0.105]}
            rotation={[-0.45, 0, 0]}
            scale={[0.135, 0.062, 0.082]}
            geometry={UNIT_SPHERE_GEO}
          >
            <meshToonMaterial color={costume.top} gradientMap={grad} />
          </mesh>
          <mesh
            position={[0, -0.025, -0.105]}
            rotation={[-0.45, 0, 0]}
            scale={[0.146, 0.072, 0.092]}
            material={OUTFIT_OUTLINE_MAT}
            geometry={UNIT_SPHERE_GEO}
          />
        </group>

        {/* 2 Tali serut hoodie putih dengan ujung aglet */}
        {[-1, 1].map((side) => (
          <group
            key={`drawstring-${side}`}
            position={[side * 0.034, 0.472, 0.168]}
            rotation={[-0.25, 0, side * 0.05]}
          >
            <mesh>
              <cylinderGeometry args={[0.005, 0.005, 0.092, 8]} />
              <meshToonMaterial color="#f8fafc" gradientMap={grad} />
            </mesh>
            <mesh position={[0, -0.048, 0]}>
              <cylinderGeometry args={[0.007, 0.007, 0.016, 8]} />
              <meshToonMaterial color={accent} gradientMap={grad} />
            </mesh>
          </group>
        ))}

        {/* Saku kanguru depan */}
        <group position={[0, 0.312, 0.205]} rotation={[-0.14, 0, 0]}>
          <mesh geometry={UNIT_BOX_GEO} scale={[0.17, 0.084, 0.024]}>
            <meshToonMaterial color={costume.top} gradientMap={grad} />
          </mesh>
          <mesh
            geometry={UNIT_BOX_GEO}
            scale={[0.18, 0.094, 0.032]}
            material={OUTFIT_OUTLINE_MAT}
          />
          {[-1, 1].map((side) => (
            <mesh
              key={`kanga-slit-${side}`}
              position={[side * 0.072, 0.01, 0.01]}
              rotation={[0, 0, side * -0.45]}
              geometry={UNIT_BOX_GEO}
              scale={[0.012, 0.055, 0.012]}
            >
              <meshBasicMaterial color="#0f172a" />
            </mesh>
          ))}
        </group>

        {/* Tali bahu ransel melingkari bahu ke punggung */}
        <OutlinedShell
          item={BACKPACK_STRAP_L}
          color={outerColor}
          grad={grad}
          outlineScale={[1.03, 1.025, 1.03]}
        />
        <OutlinedShell
          item={BACKPACK_STRAP_R}
          color={outerColor}
          grad={grad}
          outlineScale={[1.03, 1.025, 1.03]}
        />

        {/* Tas Ransel Anak 3D di punggung (z = -0.22) */}
        <group position={[0, 0.35, -0.22]}>
          <mesh geometry={UNIT_BOX_GEO} scale={[0.23, 0.26, 0.115]}>
            <meshToonMaterial color={outerColor} gradientMap={grad} />
          </mesh>
          <mesh
            geometry={UNIT_BOX_GEO}
            scale={[0.246, 0.276, 0.13]}
            material={OUTFIT_OUTLINE_MAT}
          />
          <mesh position={[0, 0.115, 0]} scale={[0.116, 0.055, 0.062]} geometry={UNIT_SPHERE_GEO}>
            <meshToonMaterial color={accent} gradientMap={grad} />
          </mesh>
          <mesh
            position={[0, 0.115, 0]}
            scale={[0.126, 0.064, 0.072]}
            material={OUTFIT_OUTLINE_MAT}
            geometry={UNIT_SPHERE_GEO}
          />
          <mesh position={[0, 0.17, 0]}>
            <torusGeometry args={[0.026, 0.008, 6, 12, Math.PI]} />
            <meshToonMaterial color="#1e293b" gradientMap={grad} />
          </mesh>
          <mesh position={[0, -0.045, -0.062]} geometry={UNIT_BOX_GEO} scale={[0.17, 0.11, 0.032]}>
            <meshToonMaterial color={accent} gradientMap={grad} />
          </mesh>
          <mesh
            position={[0, -0.045, -0.062]}
            geometry={UNIT_BOX_GEO}
            scale={[0.184, 0.124, 0.042]}
            material={OUTFIT_OUTLINE_MAT}
          />
          <mesh position={[0, -0.005, -0.08]} geometry={UNIT_BOX_GEO} scale={[0.13, 0.008, 0.008]}>
            <meshBasicMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0.03, -0.015, -0.083]} geometry={UNIT_BOX_GEO} scale={[0.014, 0.022, 0.01]}>
            <meshToonMaterial color="#facc15" gradientMap={grad} />
          </mesh>
        </group>
      </group>
    );
  }

  // 4. ROMPI TENUN & SELENDANG (Kakek Salman default)
  if (outfit === 'koko_vest_sash') {
    return (
      <group key={texKey}>
        <mesh geometry={BELL_UPPER_GEO} position={[0, 0.405, 0]}>
          <meshToonMaterial color={costume.top} gradientMap={grad} />
        </mesh>
        <mesh
          geometry={BELL_UPPER_GEO}
          position={[0, 0.405, 0]}
          scale={[1.055, 1.05, 1.055]}
          material={OUTFIT_OUTLINE_MAT}
        />

        {/* Sarung motif songket */}
        <mesh geometry={BELL_LOWER_GEO} position={[0, 0.13, 0]}>
          {fabricTex ? (
            <meshToonMaterial key={`tex-${texKey}`} color="#ffffff" map={fabricTex} gradientMap={grad} />
          ) : (
            <meshToonMaterial key={`plain-${texKey}`} color={costume.bottom} gradientMap={grad} />
          )}
        </mesh>
        <mesh
          geometry={BELL_LOWER_GEO}
          position={[0, 0.13, 0]}
          scale={[1.05, 1.055, 1.05]}
          material={OUTFIT_OUTLINE_MAT}
        />

        {/* Lipatan pinggang dekoratif sarung songket */}
        <mesh position={[0, 0.254, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.215, 0.015, 8, 24]} />
          <meshToonMaterial color={accent} gradientMap={grad} />
        </mesh>
        <mesh
          position={[0, 0.205, 0.232]}
          rotation={[-0.08, 0, 0]}
          geometry={UNIT_BOX_GEO}
          scale={[0.055, 0.08, 0.014]}
        >
          <meshToonMaterial color={accent} gradientMap={grad} />
        </mesh>

        {/* Kerah & plaket koko dalam */}
        <mesh position={[0, 0.545, 0.005]} rotation={[Math.PI / 2 + 0.08, 0, 0]}>
          <torusGeometry args={[0.095, 0.015, 8, 18]} />
          <meshToonMaterial color="#f8fafc" gradientMap={grad} />
        </mesh>
        <mesh
          position={[0, 0.43, 0.183]}
          rotation={[-0.25, 0, 0]}
          geometry={UNIT_BOX_GEO}
          scale={[0.022, 0.17, 0.01]}
        >
          <meshToonMaterial color="#f8fafc" gradientMap={grad} />
        </mesh>

        {/* Rompi Tenun 3D terbuka */}
        <OutlinedShell item={VEST_SHELL} color={outerColor} grad={grad} />
        <OutlinedShell
          item={VEST_EDGE_L}
          color={outerColor}
          grad={grad}
          outlineScale={[1.05, 1.025, 1.05]}
        />
        <OutlinedShell
          item={VEST_EDGE_R}
          color={outerColor}
          grad={grad}
          outlineScale={[1.05, 1.025, 1.05]}
        />

        {/* Kancing kuningan & saku kiri-kanan rompi */}
        {[0.44, 0.37, 0.3].map((by, idx) => {
          const bPos = bellPoint(UPPER_BELL_PROFILE, 0.405, by, 0.34, 0.024);
          return (
            <mesh key={`vest-btn-${idx}`} position={[bPos.x, bPos.y, bPos.z]}>
              <sphereGeometry args={[0.011, 8, 8]} />
              <meshToonMaterial color="#facc15" gradientMap={grad} />
            </mesh>
          );
        })}
        {[-1, 1].map((side) => (
          <ChestPocket3D
            key={`vest-pocket-${side}`}
            y={0.32}
            phi={side * 0.55}
            radialOffset={0.024}
            color={outerColor}
            trimColor={accent}
            width={0.052}
            height={0.05}
            tiltX={-0.16}
            grad={grad}
          />
        ))}

        {/* Selendang diagonal melintasi rompi */}
        <mesh geometry={SASH_GEO} scale={[1.055, 1.01, 1.055]}>
          <meshToonMaterial color={accent} gradientMap={grad} />
        </mesh>
        <mesh geometry={SASH_GEO} scale={[1.085, 1.035, 1.085]} material={OUTFIT_OUTLINE_MAT} />
      </group>
    );
  }

  // 5. WERPAK PETANI / FARMER OVERALLS (Pak Tani Sabar default)
  if (outfit === 'farmer_overalls') {
    return (
      <group key={texKey}>
        {/* Kemeja flannel kotak-kotak + celana kanvas werpak */}
        <mesh geometry={BELL_UPPER_GEO} position={[0, 0.405, 0]}>
          {fabricTex ? (
            <meshToonMaterial key={`tex-${texKey}`} color="#ffffff" map={fabricTex} gradientMap={grad} />
          ) : (
            <meshToonMaterial key={`plain-${texKey}`} color={costume.top} gradientMap={grad} />
          )}
        </mesh>
        <mesh
          geometry={BELL_UPPER_GEO}
          position={[0, 0.405, 0]}
          scale={[1.055, 1.05, 1.055]}
          material={OUTFIT_OUTLINE_MAT}
        />

        <mesh geometry={BELL_LOWER_GEO} position={[0, 0.13, 0]}>
          <meshToonMaterial color={outerColor} gradientMap={grad} />
        </mesh>
        <mesh
          geometry={BELL_LOWER_GEO}
          position={[0, 0.13, 0]}
          scale={[1.05, 1.055, 1.05]}
          material={OUTFIT_OUTLINE_MAT}
        />

        <FoldedShirtCollar3D color={costume.top} grad={grad} />

        {/* Panel dada werpak (overalls bib) */}
        <OutlinedShell item={BIB_SHELL} color={outerColor} grad={grad} />
        <OutlinedShell
          item={BIB_EDGE_L}
          color={outerColor}
          grad={grad}
          outlineScale={[1.05, 1.025, 1.05]}
        />
        <OutlinedShell
          item={BIB_EDGE_R}
          color={outerColor}
          grad={grad}
          outlineScale={[1.05, 1.025, 1.05]}
        />

        {/* Tali suspender bahu + kancing kuningan */}
        <OutlinedShell
          item={SUSPENDER_L}
          color={outerColor}
          grad={grad}
          outlineScale={[1.03, 1.025, 1.03]}
        />
        <OutlinedShell
          item={SUSPENDER_R}
          color={outerColor}
          grad={grad}
          outlineScale={[1.03, 1.025, 1.03]}
        />
        {[-1, 1].map((side) => {
          const btn = bellPoint(UPPER_BELL_PROFILE, 0.405, 0.44, side * 0.46, 0.024);
          return (
            <mesh key={`bib-btn-${side}`} position={[btn.x, btn.y, btn.z]}>
              <sphereGeometry args={[0.013, 8, 8]} />
              <meshToonMaterial color="#facc15" gradientMap={grad} />
            </mesh>
          );
        })}

        {/* Saku utilitas besar di dada werpak */}
        <ChestPocket3D
          y={0.355}
          phi={0}
          radialOffset={0.024}
          color={outerColor}
          trimColor={costume.bottom}
          width={0.11}
          height={0.072}
          tiltX={-0.21}
          grad={grad}
        />

        {/* Sabuk kulit, gesper logam, & kantong pinggang samping */}
        <mesh position={[0, 0.254, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.224, 0.015, 8, 24]} />
          <meshToonMaterial color="#451a03" gradientMap={grad} />
        </mesh>
        <group position={[0, 0.254, 0.238]}>
          <mesh geometry={UNIT_BOX_GEO} scale={[0.046, 0.036, 0.014]}>
            <meshToonMaterial color="#cbd5e1" gradientMap={grad} />
          </mesh>
          <mesh geometry={UNIT_BOX_GEO} position={[0, 0, 0.003]} scale={[0.024, 0.018, 0.012]}>
            <meshToonMaterial color="#451a03" gradientMap={grad} />
          </mesh>
        </group>
        <group position={[0.232, 0.225, 0.02]} rotation={[0, 0.1, -0.06]}>
          <mesh geometry={UNIT_BOX_GEO} scale={[0.046, 0.078, 0.068]}>
            <meshToonMaterial color="#78350f" gradientMap={grad} />
          </mesh>
          <mesh geometry={UNIT_BOX_GEO} scale={[0.056, 0.088, 0.078]} material={OUTFIT_OUTLINE_MAT} />
          <mesh position={[0.025, 0.016, 0]} scale={[0.008, 0.01, 0.01]}>
            <sphereGeometry args={[1, 6, 6]} />
            <meshToonMaterial color="#facc15" gradientMap={grad} />
          </mesh>
        </group>

        {/* Handuk petani putih terlipat melingkari leher & menjuntai di kedua bahu */}
        <OutlinedShell
          item={FARMER_TOWEL}
          color="#f8fafc"
          grad={grad}
          outlineScale={[1.045, 1.03, 1.045]}
        />
        {[-1, 1].map((side) => {
          const end = bellPoint(UPPER_BELL_PROFILE, 0.405, 0.355, side * 0.68, 0.024);
          return (
            <mesh
              key={`towel-tip-${side}`}
              position={[end.x, end.y, end.z]}
              rotation={[-0.22, side * 0.68, 0]}
              geometry={UNIT_BOX_GEO}
              scale={[0.042, 0.018, 0.036]}
            >
              <meshToonMaterial color={accent} gradientMap={grad} />
            </mesh>
          );
        })}
      </group>
    );
  }

  // 6. JUBAH & MANTEL BISHT (Ustadz Hakim default)
  if (outfit === 'jubbah_cloak') {
    return (
      <group key={texKey}>
        {/* Jubah panjang A-line dengan bordir emas di tengah depan */}
        <mesh geometry={BELL_GAMIS_GEO} position={[0, 0.28, 0]}>
          {fabricTex ? (
            <meshToonMaterial key={`tex-${texKey}`} color="#ffffff" map={fabricTex} gradientMap={grad} />
          ) : (
            <meshToonMaterial key={`plain-${texKey}`} color={costume.top} gradientMap={grad} />
          )}
        </mesh>
        <mesh
          geometry={BELL_GAMIS_GEO}
          position={[0, 0.28, 0]}
          scale={[1.048, 1.032, 1.048]}
          material={OUTFIT_OUTLINE_MAT}
        />

        {/* Plaket & kerah bordir emas */}
        <mesh position={[0, 0.545, 0.005]} rotation={[Math.PI / 2 + 0.08, 0, 0]}>
          <torusGeometry args={[0.095, 0.016, 8, 18]} />
          <meshToonMaterial color={accent} gradientMap={grad} />
        </mesh>
        <group position={[0, 0.415, 0.188]} rotation={[-0.24, 0, 0]}>
          <mesh geometry={UNIT_BOX_GEO} scale={[0.03, 0.21, 0.01]}>
            <meshToonMaterial color={accent} gradientMap={grad} />
          </mesh>
          <mesh geometry={UNIT_BOX_GEO} position={[0, 0, 0.002]} scale={[0.012, 0.19, 0.01]}>
            <meshToonMaterial color={costume.top} gradientMap={grad} />
          </mesh>
        </group>

        {/* Mantel luar Bisht terbuka dengan lis kerah emas */}
        <OutlinedShell item={CLOAK_SHELL} color={outerColor} grad={grad} />
        <OutlinedShell
          item={CLOAK_EDGE_L}
          color="#facc15"
          grad={grad}
          outlineScale={[1.045, 1.02, 1.045]}
        />
        <OutlinedShell
          item={CLOAK_EDGE_R}
          color="#facc15"
          grad={grad}
          outlineScale={[1.045, 1.02, 1.045]}
        />

        {/* Tali pengait emas dada (chest clasp cord) */}
        <mesh geometry={CLOAK_CLASP_CORD_GEO}>
          <meshToonMaterial color="#facc15" gradientMap={grad} />
        </mesh>
        {[-1, 1].map((side) => {
          const clasp = bellPoint(GAMIS_BELL_PROFILE, 0.28, 0.495, side * 0.4, 0.025);
          return (
            <mesh key={`clasp-${side}`} position={[clasp.x, clasp.y, clasp.z]}>
              <sphereGeometry args={[0.016, 10, 8]} />
              <meshToonMaterial color="#facc15" gradientMap={grad} />
            </mesh>
          );
        })}
      </group>
    );
  }

  // 7. KEMEJA BATIK FORMAL
  if (outfit === 'batik_formal') {
    return (
      <group key={texKey}>
        <mesh geometry={BELL_UPPER_GEO} position={[0, 0.405, 0]}>
          {fabricTex ? (
            <meshToonMaterial key={`tex-${texKey}`} color="#ffffff" map={fabricTex} gradientMap={grad} />
          ) : (
            <meshToonMaterial key={`plain-${texKey}`} color={costume.top} gradientMap={grad} />
          )}
        </mesh>
        <mesh
          geometry={BELL_UPPER_GEO}
          position={[0, 0.405, 0]}
          scale={[1.055, 1.05, 1.055]}
          material={OUTFIT_OUTLINE_MAT}
        />

        <mesh geometry={BELL_LOWER_GEO} position={[0, 0.13, 0]}>
          <meshToonMaterial color={costume.bottom} gradientMap={grad} />
        </mesh>
        <mesh
          geometry={BELL_LOWER_GEO}
          position={[0, 0.13, 0]}
          scale={[1.05, 1.055, 1.05]}
          material={OUTFIT_OUTLINE_MAT}
        />

        <FoldedShirtCollar3D color={costume.top} grad={grad} />

        {/* Strip kancing depan & saku batik dada kiri */}
        <group position={[0, 0.415, 0.186]} rotation={[-0.24, 0, 0]}>
          <mesh geometry={UNIT_BOX_GEO} scale={[0.022, 0.22, 0.01]}>
            <meshToonMaterial color={costume.top} gradientMap={grad} />
          </mesh>
          {[0.07, 0.02, -0.03, -0.08].map((by, idx) => (
            <mesh key={idx} position={[0, by, 0.006]}>
              <sphereGeometry args={[0.007, 8, 8]} />
              <meshToonMaterial color={accent} gradientMap={grad} />
            </mesh>
          ))}
        </group>

        <ChestPocket3D y={0.43} phi={0.48} color={costume.top} trimColor={accent} grad={grad} />

        {/* Sabuk kulit & gesper metalik */}
        <mesh position={[0, 0.252, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.215, 0.013, 8, 24]} />
          <meshToonMaterial color="#451a03" gradientMap={grad} />
        </mesh>
        <group position={[0, 0.252, 0.224]}>
          <mesh geometry={UNIT_BOX_GEO} scale={[0.044, 0.034, 0.013]}>
            <meshToonMaterial color="#e2e8f0" gradientMap={grad} />
          </mesh>
          <mesh geometry={UNIT_BOX_GEO} position={[0, 0, 0.003]} scale={[0.022, 0.016, 0.011]}>
            <meshToonMaterial color="#451a03" gradientMap={grad} />
          </mesh>
        </group>
      </group>
    );
  }

  // 8. JAS & DASI (blazer_tie)
  const blazerColor = outerColor;
  const pocketSquarePos = bellPoint(FULL_BELL_PROFILE, 0.28, 0.435, 0.52, 0.024);
  return (
    <group key={texKey}>
      {/* Kemeja dalam putih & celana bahan formal */}
      <mesh geometry={BELL_UPPER_GEO} position={[0, 0.405, 0]}>
        <meshToonMaterial color="#f8fafc" gradientMap={grad} />
      </mesh>
      <mesh
        geometry={BELL_UPPER_GEO}
        position={[0, 0.405, 0]}
        scale={[1.055, 1.05, 1.055]}
        material={OUTFIT_OUTLINE_MAT}
      />

      <mesh geometry={BELL_LOWER_GEO} position={[0, 0.13, 0]}>
        <meshToonMaterial color={costume.bottom} gradientMap={grad} />
      </mesh>
      <mesh
        geometry={BELL_LOWER_GEO}
        position={[0, 0.13, 0]}
        scale={[1.05, 1.055, 1.05]}
        material={OUTFIT_OUTLINE_MAT}
      />

      <FoldedShirtCollar3D color="#f8fafc" grad={grad} />

      {/* Dasi 3D (simpul & ujung lancip) */}
      <group position={[0, 0.512, 0.15]} rotation={[-0.36, 0, 0]}>
        <mesh geometry={UNIT_BOX_GEO} scale={[0.028, 0.028, 0.016]}>
          <meshToonMaterial color={accent} gradientMap={grad} />
        </mesh>
        <mesh
          geometry={UNIT_BOX_GEO}
          scale={[0.034, 0.034, 0.021]}
          material={OUTFIT_OUTLINE_MAT}
        />
      </group>
      <group position={[0, 0.415, 0.186]} rotation={[-0.28, 0, 0]}>
        <mesh geometry={TIE_BLADE_GEO}>
          <meshToonMaterial color={accent} gradientMap={grad} />
        </mesh>
        <mesh geometry={TIE_BLADE_GEO} scale={[1.12, 1.05, 1.25]} material={OUTFIT_OUTLINE_MAT} />
      </group>

      {/* Jas blazer 3D menyelimuti samping/belakang + tutup kancing bawah */}
      <OutlinedShell item={BLAZER_SHELL} color={blazerColor} grad={grad} />
      <OutlinedShell item={BLAZER_SKIRT_LAP} color={blazerColor} grad={grad} />
      <OutlinedShell
        item={BLAZER_EDGE_L}
        color={blazerColor}
        grad={grad}
        outlineScale={[1.045, 1.025, 1.045]}
      />
      <OutlinedShell
        item={BLAZER_EDGE_R}
        color={blazerColor}
        grad={grad}
        outlineScale={[1.045, 1.025, 1.045]}
      />

      {/* Kerah V-lapel blazer kiri & kanan */}
      {[
        { side: 1 as const, geo: LAPEL_L_GEO },
        { side: -1 as const, geo: LAPEL_R_GEO },
      ].map(({ side, geo }) => (
        <group
          key={`lapel-${side}`}
          position={[side * 0.018, 0.335, 0.214]}
          rotation={[-0.44, side * 0.14, 0]}
        >
          <mesh geometry={geo}>
            <meshToonMaterial color={blazerColor} gradientMap={grad} />
          </mesh>
          <mesh geometry={geo} scale={[1.08, 1.05, 1.2]} material={OUTFIT_OUTLINE_MAT} />
        </group>
      ))}

      {/* 2 Kancing emas jas */}
      {[0.305, 0.25].map((by, idx) => (
        <mesh key={`blazer-btn-${idx}`} position={[0, by, idx === 0 ? 0.231 : 0.244]}>
          <sphereGeometry args={[0.011, 8, 8]} />
          <meshToonMaterial color="#facc15" gradientMap={grad} />
        </mesh>
      ))}

      {/* Sapu tangan saku putih (pocket square) di dada kiri */}
      <group
        position={[pocketSquarePos.x, pocketSquarePos.y, pocketSquarePos.z]}
        rotation={[0, 0.52, 0]}
      >
        <group rotation={[-0.22, 0, 0]}>
          <mesh geometry={UNIT_BOX_GEO} scale={[0.048, 0.012, 0.012]}>
            <meshToonMaterial color={blazerColor} gradientMap={grad} />
          </mesh>
          <mesh position={[0, 0.012, 0.002]} rotation={[0, 0, 0.12]}>
            <coneGeometry args={[0.018, 0.026, 4]} />
            <meshToonMaterial color="#f8fafc" gradientMap={grad} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

export interface SleeveCapMeshProps {
  costume: CastCostume;
  outfit: OutfitStyle;
  grad: THREE.DataTexture;
}

/**
 * Lengan baju 3D pada segmen lengan atas stickman ('short' ~0.11m, 'long' ~0.20m, atau null untuk 'none').
 * Menempel langsung di grup bahu sehingga ikut berotasi halus di seluruh 10 animasi.
 */
export const SleeveCapMesh: React.FC<SleeveCapMeshProps> = ({ costume, outfit, grad }) => {
  const { sleeveStyle, outerColor, accent } = resolveOutfitAppearance(costume, outfit);

  if (sleeveStyle === 'none') {
    return null;
  }

  const isLong = sleeveStyle === 'long';
  const sleeveColor =
    outfit === 'gamis_cardigan' || outfit === 'jubbah_cloak' || outfit === 'blazer_tie'
      ? outerColor
      : costume.top;
  const cuffColor =
    outfit === 'blazer_tie'
      ? '#f8fafc'
      : outfit === 'jubbah_cloak'
        ? '#facc15'
        : accent;

  return (
    <group>
      {/* Tutup bahu bulat agar menyatu mulus dengan lengkung torso */}
      <mesh geometry={SLEEVE_CAP_SPHERE_GEO} position={[0, 0.002, 0]}>
        <meshToonMaterial color={sleeveColor} gradientMap={grad} />
      </mesh>
      <mesh
        geometry={SLEEVE_CAP_SPHERE_GEO}
        position={[0, 0.002, 0]}
        scale={1.14}
        material={OUTFIT_OUTLINE_MAT}
      />

      {/* Silinder lengan baju pendek/panjang */}
      <mesh
        geometry={isLong ? SLEEVE_LONG_GEO : SLEEVE_SHORT_GEO}
        position={[0, isLong ? -0.095 : -0.048, 0]}
      >
        <meshToonMaterial color={sleeveColor} gradientMap={grad} />
      </mesh>
      <mesh
        geometry={isLong ? SLEEVE_LONG_GEO : SLEEVE_SHORT_GEO}
        position={[0, isLong ? -0.095 : -0.048, 0]}
        scale={[1.14, 1.03, 1.14]}
        material={OUTFIT_OUTLINE_MAT}
      />

      {/* Manset ujung lengan */}
      <mesh position={[0, isLong ? -0.192 : -0.102, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[isLong ? 0.036 : 0.047, 0.0065, 6, 14]} />
        <meshToonMaterial color={cuffColor} gradientMap={grad} />
      </mesh>
    </group>
  );
};
