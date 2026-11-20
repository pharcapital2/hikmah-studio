import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { seededRandom } from '../../shared/seededRandom';
import { useWorldAnimation } from '../../shared/useWorldTime';
import {
  buildPedestrianSimulation,
  sampleParkWalkerPose,
  sampleWalkerPose,
  type PedestrianPose,
} from './pedestrianSim';

interface CityPedestriansProps {
  time?: number;
}

type OutfitArchetype = 0 | 1 | 2 | 3; // 0: office, 1: casual, 2: modest, 3: vendor

const X_AXIS = new THREE.Vector3(1, 0, 0);

interface ColoredGeoPart {
  geo: THREE.BufferGeometry;
  color?: string;
}

const tintWhiteCacheKey = () => 'pedestrian-tint-white-only-v1';

/**
 * Only pure-white vertices (#ffffff) receive `instanceColor` tinting,
 * preserving crisp fixed accent colors (#f8fafc, #dc2626, #fef3c7, #f59e0b, etc.).
 */
function tintWhiteOnly(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.vertexShader = shader.vertexShader.replace(
    '#include <color_vertex>',
    `#if defined( USE_COLOR_ALPHA )
      vColor = vec4( 1.0 );
    #elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
      vColor = vec3( 1.0 );
    #endif
    #ifdef USE_COLOR
      vColor *= color;
    #endif
    #ifdef USE_INSTANCING_COLOR
      #ifdef USE_COLOR
        float tintMask = step(0.99, min(color.r, min(color.g, color.b)));
        vColor.xyz *= mix(vec3(1.0), instanceColor.xyz, tintMask);
      #else
        vColor.xyz *= instanceColor.xyz;
      #endif
    #endif
    #ifdef USE_BATCHING_COLOR
      vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
      vColor.xyz *= batchingColor.xyz;
    #endif`
  );
}

let cachedBatikTexture: THREE.CanvasTexture | null = null;

/** Cached procedural Batik Kawung / Modest Tunic texture (ivory-based for instanceColor tinting). */
function getBatikModestTexture(): THREE.CanvasTexture | null {
  if (cachedBatikTexture) return cachedBatikTexture;
  if (typeof document === 'undefined') return null;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Warm bright ivory base so multiplying by shirtColor yields rich tunic tones
    ctx.fillStyle = '#f8f5ee';
    ctx.fillRect(0, 0, size, size);

    // Repeating Batik Kawung 4-petal motif across upper/mid torso (y: 0..176)
    const step = 32;
    for (let row = 0; row < 6; row++) {
      const cy = row * step + step * 0.5;
      for (let col = 0; col < size / step; col++) {
        const cx = col * step + step * 0.5;

        for (let k = 0; k < 4; k++) {
          const angle = (k * Math.PI) / 2 + Math.PI / 4;
          const px = cx + Math.cos(angle) * 8.5;
          const py = cy + Math.sin(angle) * 8.5;

          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(angle);
          ctx.fillStyle = '#e2dcd0';
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.ellipse(0, 0, 7.6, 4.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(0, 0, 3.6, 1.8, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.arc(-2.2, 0, 0.9, 0, Math.PI * 2);
          ctx.arc(2.2, 0, 0.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Center rosette diamond
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(cx, cy, 2.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Darker patterned lower border (y: 174..256, aligns with lower bell skirt & hem)
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 174, size, size - 174);

    // Ornamental trim stripes + Tumpal sawtooth triangles along top of border
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 174, size, 4);
    ctx.fillRect(0, 194, size, 3);

    ctx.fillStyle = '#e2e8f0';
    for (let x = 0; x < size; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 194);
      ctx.lineTo(x + 8, 180);
      ctx.lineTo(x + 16, 194);
      ctx.closePath();
      ctx.fill();
    }

    // Fine vertical woven border accents in lower hem
    ctx.fillStyle = '#94a3b8';
    for (let x = 8; x < size; x += 16) {
      ctx.fillRect(x - 1, 200, 2, 56);
    }

    // Center front modest collar & button placket (u = 0.5 -> +Z front when phiStart = Math.PI)
    ctx.fillStyle = '#64748b';
    ctx.fillRect(size / 2 - 8, 22, 16, 8);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(size / 2 - 5, 30, 10, 84);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(size / 2 - 5, 30, 10, 84);

    ctx.fillStyle = '#334155';
    for (let b = 0; b < 4; b++) {
      ctx.beginPath();
      ctx.arc(size / 2, 44 + b * 18, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  cachedBatikTexture = tex;
  return tex;
}

function mergeColoredGeos(parts: ColoredGeoPart[]): THREE.BufferGeometry {
  const nonIndexed = parts.map((p) => {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    return { g, color: p.color ?? '#ffffff' };
  });

  let totalVerts = 0;
  for (const { g } of nonIndexed) {
    totalVerts += g.getAttribute('position').count;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const colors = new Float32Array(totalVerts * 3);
  const tmpColor = new THREE.Color();

  let offset = 0;
  for (const { g, color } of nonIndexed) {
    const pos = g.getAttribute('position');
    const norm = g.getAttribute('normal');
    tmpColor.set(color);

    for (let i = 0; i < pos.count; i++) {
      const base = (offset + i) * 3;
      positions[base] = pos.getX(i);
      positions[base + 1] = pos.getY(i);
      positions[base + 2] = pos.getZ(i);
      normals[base] = norm.getX(i);
      normals[base + 1] = norm.getY(i);
      normals[base + 2] = norm.getZ(i);
      colors[base] = tmpColor.r;
      colors[base + 1] = tmpColor.g;
      colors[base + 2] = tmpColor.b;
    }
    offset += pos.count;
    g.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  merged.computeBoundingSphere();
  return merged;
}

function makeLowerBandGeo(): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.0, -0.27),
    new THREE.Vector2(0.162, -0.264),
    new THREE.Vector2(0.212, -0.22),
    new THREE.Vector2(0.208, -0.165),
    new THREE.Vector2(0.0, -0.165),
  ];
  return new THREE.LatheGeometry(pts, 14);
}

function makeUpperBellGeo(hemRadius: number): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.0, -0.18),
    new THREE.Vector2(hemRadius, -0.18),
    new THREE.Vector2(0.218, -0.11),
    new THREE.Vector2(0.198, -0.01),
    new THREE.Vector2(0.176, 0.1),
    new THREE.Vector2(0.156, 0.195),
    new THREE.Vector2(0.095, 0.258),
    new THREE.Vector2(0.0, 0.27),
  ];
  return new THREE.LatheGeometry(pts, 14);
}

function makeShoulderCapParts(color = '#ffffff'): ColoredGeoPart[] {
  const parts: ColoredGeoPart[] = [];
  for (const side of [-1, 1] as const) {
    const cap = new THREE.SphereGeometry(0.055, 10, 8);
    cap.scale(0.95, 1.15, 0.95);
    cap.translate(side * 0.165, 0.195, 0);
    parts.push({ geo: cap, color });
  }
  return parts;
}

/** 0: Office Blazer & Necktie (Jas Kantor & Dasi) */
function buildOfficeTorsoGeo(): THREE.BufferGeometry {
  const parts: ColoredGeoPart[] = [
    { geo: makeUpperBellGeo(0.216), color: '#ffffff' },
    { geo: makeLowerBandGeo(), color: '#1e293b' },
    ...makeShoulderCapParts('#ffffff'),
  ];

  // Crisp white shirt collar ring + V-shirt chest insert
  const collarRing = new THREE.CylinderGeometry(0.094, 0.11, 0.042, 12);
  collarRing.translate(0, 0.246, 0);
  parts.push({ geo: collarRing, color: '#f8fafc' });

  const vShirt = new THREE.ConeGeometry(0.082, 0.22, 4);
  vShirt.rotateY(Math.PI / 4);
  vShirt.rotateZ(Math.PI);
  vShirt.scale(1.05, 1.0, 0.34);
  vShirt.rotateX(-0.34);
  vShirt.translate(0, 0.14, 0.155);
  parts.push({ geo: vShirt, color: '#f8fafc' });

  // Contrasting 3D necktie (knot, blade, diamond tip)
  const tieKnot = new THREE.BoxGeometry(0.03, 0.026, 0.026);
  tieKnot.rotateX(-0.34);
  tieKnot.translate(0, 0.215, 0.156);
  parts.push({ geo: tieKnot, color: '#dc2626' });

  const tieShaft = new THREE.BoxGeometry(0.025, 0.14, 0.018);
  tieShaft.rotateX(-0.34);
  tieShaft.translate(0, 0.135, 0.182);
  parts.push({ geo: tieShaft, color: '#dc2626' });

  const tieTip = new THREE.ConeGeometry(0.018, 0.032, 4);
  tieTip.rotateY(Math.PI / 4);
  tieTip.rotateZ(Math.PI);
  tieTip.scale(1.0, 1.0, 0.55);
  tieTip.rotateX(-0.34);
  tieTip.translate(0, 0.055, 0.205);
  parts.push({ geo: tieTip, color: '#dc2626' });

  // Angled blazer lapel flaps + back collar wrap
  for (const side of [-1, 1] as const) {
    const lapel = new THREE.BoxGeometry(0.042, 0.205, 0.028);
    lapel.rotateZ(side * 0.26);
    lapel.rotateX(-0.34);
    lapel.translate(side * 0.056, 0.138, 0.156);
    parts.push({ geo: lapel, color: '#ffffff' });
  }

  const blazerCollar = new THREE.TorusGeometry(0.104, 0.024, 6, 12, Math.PI * 1.25);
  blazerCollar.rotateZ(Math.PI * 0.875);
  blazerCollar.rotateX(Math.PI / 2 + 0.15);
  blazerCollar.translate(0, 0.242, -0.01);
  parts.push({ geo: blazerCollar, color: '#ffffff' });

  // Subtle dark blazer buttons below V-opening
  for (const by of [-0.02, -0.085]) {
    const btn = new THREE.CylinderGeometry(0.012, 0.012, 0.015, 8);
    btn.rotateX(Math.PI / 2);
    btn.translate(0, by, by === -0.02 ? 0.198 : 0.212);
    parts.push({ geo: btn, color: '#1e293b' });
  }

  return mergeColoredGeos(parts);
}

/** 1: Casual Hoodie & Backpack (Hoodie & Ransel) */
function buildCasualTorsoGeo(): THREE.BufferGeometry {
  const parts: ColoredGeoPart[] = [
    { geo: makeUpperBellGeo(0.222), color: '#ffffff' },
    { geo: makeLowerBandGeo(), color: '#1e3a8a' },
    ...makeShoulderCapParts('#ffffff'),
  ];

  // Subtle kangaroo pocket mound on front lower hoodie
  const pocket = new THREE.BoxGeometry(0.17, 0.088, 0.042);
  pocket.rotateX(-0.15);
  pocket.translate(0, -0.075, 0.195);
  parts.push({ geo: pocket, color: '#ffffff' });

  // 3D folded hood resting around collar & behind the neck
  const hoodCollar = new THREE.TorusGeometry(0.108, 0.036, 8, 14, Math.PI * 1.35);
  hoodCollar.rotateZ(Math.PI * 0.825);
  hoodCollar.rotateX(Math.PI / 2 + 0.22);
  hoodCollar.translate(0, 0.242, -0.025);
  parts.push({ geo: hoodCollar, color: '#ffffff' });

  const hoodFold = new THREE.SphereGeometry(0.082, 10, 8);
  hoodFold.scale(1.18, 0.56, 0.92);
  hoodFold.rotateX(0.32);
  hoodFold.translate(0, 0.218, -0.145);
  parts.push({ geo: hoodFold, color: '#ffffff' });

  // Two crisp white drawstring cords & aglet tips on chest
  for (const side of [-1, 1] as const) {
    const cord = new THREE.CylinderGeometry(0.0085, 0.0085, 0.105, 6);
    cord.rotateX(-0.34);
    cord.translate(side * 0.036, 0.175, 0.158);
    parts.push({ geo: cord, color: '#f8fafc' });

    const tip = new THREE.SphereGeometry(0.013, 6, 5);
    tip.translate(side * 0.036, 0.124, 0.176);
    parts.push({ geo: tip, color: '#f8fafc' });
  }

  // 3D Backpack (tas ransel) on back
  const packBody = new THREE.BoxGeometry(0.22, 0.25, 0.11);
  packBody.rotateX(0.08);
  packBody.translate(0, 0.025, -0.228);
  parts.push({ geo: packBody, color: '#334155' });

  const packTopDome = new THREE.SphereGeometry(0.11, 10, 8);
  packTopDome.scale(1.0, 0.45, 0.5);
  packTopDome.translate(0, 0.15, -0.218);
  parts.push({ geo: packTopDome, color: '#334155' });

  const packPocket = new THREE.BoxGeometry(0.165, 0.115, 0.034);
  packPocket.rotateX(0.08);
  packPocket.translate(0, -0.03, -0.285);
  parts.push({ geo: packPocket, color: '#f59e0b' });

  const packZipTrim = new THREE.BoxGeometry(0.15, 0.02, 0.02);
  packZipTrim.translate(0, 0.085, -0.276);
  parts.push({ geo: packZipTrim, color: '#f59e0b' });

  for (const side of [-1, 1] as const) {
    const frontStrap = new THREE.BoxGeometry(0.032, 0.23, 0.022);
    frontStrap.rotateX(-0.24);
    frontStrap.translate(side * 0.102, 0.072, 0.15);
    parts.push({ geo: frontStrap, color: '#1e293b' });

    const topStrap = new THREE.BoxGeometry(0.034, 0.024, 0.22);
    topStrap.rotateX(0.12);
    topStrap.translate(side * 0.102, 0.218, -0.025);
    parts.push({ geo: topStrap, color: '#1e293b' });
  }

  return mergeColoredGeos(parts);
}

/** 3: Street Vendor / Worker with Apron (Pekerja / Pedagang Bercelemek) */
function buildVendorTorsoGeo(): THREE.BufferGeometry {
  const parts: ColoredGeoPart[] = [
    { geo: makeUpperBellGeo(0.215), color: '#ffffff' },
    { geo: makeLowerBandGeo(), color: '#1e293b' },
    ...makeShoulderCapParts('#ffffff'),
  ];

  // Upper apron bib
  const apronBib = new THREE.BoxGeometry(0.155, 0.19, 0.026);
  apronBib.rotateX(-0.24);
  apronBib.translate(0, 0.105, 0.18);
  parts.push({ geo: apronBib, color: '#fef3c7' });

  // Curved wraparound lower apron skirt
  const apronShape = new THREE.Shape();
  const a0 = Math.PI / 2 - 0.82;
  const a1 = Math.PI / 2 + 0.82;
  apronShape.absarc(0, 0, 0.234, a0, a1, false);
  apronShape.absarc(0, 0, 0.188, a1, a0, true);
  apronShape.closePath();

  const apronSkirt = new THREE.ExtrudeGeometry(apronShape, {
    depth: 0.23,
    bevelEnabled: false,
    curveSegments: 10,
  });
  apronSkirt.rotateX(Math.PI / 2);
  apronSkirt.translate(0, 0.01, 0);
  parts.push({ geo: apronSkirt, color: '#fef3c7' });

  // Apron neck strap & waist tie band
  const neckStrap = new THREE.TorusGeometry(0.105, 0.016, 6, 14);
  neckStrap.rotateX(Math.PI / 2 + 0.22);
  neckStrap.translate(0, 0.225, 0.01);
  parts.push({ geo: neckStrap, color: '#fef3c7' });

  const waistBand = new THREE.CylinderGeometry(0.236, 0.238, 0.032, 16);
  waistBand.translate(0, 0.005, 0);
  parts.push({ geo: waistBand, color: '#fef3c7' });

  // Contrasting front apron pocket
  const apronPocket = new THREE.BoxGeometry(0.115, 0.085, 0.024);
  apronPocket.translate(0, -0.095, 0.232);
  parts.push({ geo: apronPocket, color: '#d97706' });

  return mergeColoredGeos(parts);
}

export const CityPedestrians = memo(function CityPedestrians({ time }: CityPedestriansProps) {
  const sim = useMemo(() => buildPedestrianSimulation(), []);
  const batikTex = useMemo(() => getBatikModestTexture(), []);

  // Total articulated humanoids: walkers + parkWalkers + commuters + vendors + customers
  const totalCustomers = useMemo(
    () => sim.vendors.reduce((acc, v) => acc + v.customerCount, 0),
    [sim]
  );
  const totalPeople =
    sim.walkers.length +
    sim.parkWalkers.length +
    sim.commuters.length +
    sim.vendors.length +
    totalCustomers;

  // Deterministic outfit archetype & slot assignment per pedestrian
  const { archetypes, slotIndices, archetypeCounts } = useMemo(() => {
    const rnd = seededRandom(77319);
    const archetypes = new Uint8Array(totalPeople);
    const slotIndices = new Uint16Array(totalPeople);
    const counts: [number, number, number, number] = [0, 0, 0, 0];

    const assign = (idx: number, arch: OutfitArchetype) => {
      archetypes[idx] = arch;
      slotIndices[idx] = counts[arch]++;
    };

    let idx = 0;

    // 1. Sidewalk walkers (~15% vendor/worker, ~30% office, ~30% casual, ~25% modest)
    for (let i = 0; i < sim.walkers.length; i++) {
      const r = rnd();
      const arch: OutfitArchetype = r < 0.15 ? 3 : r < 0.45 ? 0 : r < 0.75 ? 1 : 2;
      assign(idx++, arch);
    }

    // 2. Park strollers & joggers (joggers wear casual hoodies; strollers mix casual/modest/office)
    for (let i = 0; i < sim.parkWalkers.length; i++) {
      const pw = sim.parkWalkers[i];
      const r = rnd();
      const arch: OutfitArchetype = pw.speed > 2 ? 1 : r < 0.5 ? 1 : r < 0.8 ? 2 : 0;
      assign(idx++, arch);
    }

    // 3. Commuters waiting at bus stops (~15% worker/vendor, ~35% office, ~28% casual, ~22% modest)
    for (let i = 0; i < sim.commuters.length; i++) {
      const r = rnd();
      const arch: OutfitArchetype = r < 0.15 ? 3 : r < 0.5 ? 0 : r < 0.78 ? 1 : 2;
      assign(idx++, arch);
    }

    // 4. Street vendors (all get apron) & their customers (office/casual/modest)
    for (let i = 0; i < sim.vendors.length; i++) {
      const v = sim.vendors[i];
      assign(idx++, 3);
      for (let c = 0; c < v.customerCount; c++) {
        const r = rnd();
        const arch: OutfitArchetype = r < 0.34 ? 0 : r < 0.68 ? 1 : 2;
        assign(idx++, arch);
      }
    }

    return { archetypes, slotIndices, archetypeCounts: counts };
  }, [sim, totalPeople]);

  // Low-poly chibi-stickman geometries (4 outfit silhouettes, oversized head with baked eyes/brows, thin stick limbs)
  const geos = useMemo(() => {
    const modestPts: THREE.Vector2[] = [
      new THREE.Vector2(0.0, -0.27),
      new THREE.Vector2(0.165, -0.264),
      new THREE.Vector2(0.22, -0.215),
      new THREE.Vector2(0.215, -0.12),
      new THREE.Vector2(0.195, -0.01),
      new THREE.Vector2(0.172, 0.1),
      new THREE.Vector2(0.152, 0.195),
      new THREE.Vector2(0.09, 0.258),
      new THREE.Vector2(0.0, 0.27),
    ];
    // phiStart = Math.PI places UV seam at -Z back and center u=0.5 at +Z front
    const modestTorso = new THREE.LatheGeometry(modestPts, 16, Math.PI, Math.PI * 2);
    const officeTorso = buildOfficeTorsoGeo();
    const casualTorso = buildCasualTorsoGeo();
    const vendorTorso = buildVendorTorsoGeo();

    const headSphere = new THREE.SphereGeometry(0.23, 14, 10);
    headSphere.scale(1.04, 0.98, 0.96);
    const neckStub = new THREE.CylinderGeometry(0.055, 0.068, 0.06, 10);
    neckStub.translate(0, -0.22, 0);
    const eyeL = new THREE.SphereGeometry(0.023, 8, 6);
    eyeL.scale(0.88, 1.22, 0.72);
    eyeL.translate(-0.078, 0.02, 0.214);
    const eyeR = new THREE.SphereGeometry(0.023, 8, 6);
    eyeR.scale(0.88, 1.22, 0.72);
    eyeR.translate(0.078, 0.02, 0.214);
    const browL = new THREE.BoxGeometry(0.052, 0.013, 0.012);
    browL.rotateY(-0.24);
    browL.translate(-0.078, 0.072, 0.21);
    const browR = new THREE.BoxGeometry(0.052, 0.013, 0.012);
    browR.rotateY(0.24);
    browR.translate(0.078, 0.072, 0.21);
    const head = mergeColoredGeos([
      { geo: headSphere, color: '#f8fafc' },
      { geo: neckStub, color: '#f8fafc' },
      { geo: eyeL, color: '#0f172a' },
      { geo: eyeR, color: '#0f172a' },
      { geo: browL, color: '#0f172a' },
      { geo: browR, color: '#0f172a' },
    ]);

    const hair = new THREE.SphereGeometry(0.246, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56);
    hair.rotateX(-0.5);
    hair.scale(1.04, 1.0, 1.0);

    const legCyl = new THREE.CylinderGeometry(0.026, 0.023, 0.54, 8);
    legCyl.translate(0, -0.27, 0);
    const shoe = new THREE.SphereGeometry(0.045, 8, 6);
    shoe.scale(1.0, 0.55, 1.65);
    shoe.translate(0, -0.54, 0.025);
    const limbLeg = mergeColoredGeos([
      { geo: legCyl, color: '#ffffff' },
      { geo: shoe, color: '#ffffff' },
    ]);

    const armCyl = new THREE.CylinderGeometry(0.022, 0.02, 0.4, 8);
    armCyl.translate(0, -0.2, 0);
    const hand = new THREE.SphereGeometry(0.042, 8, 6);
    hand.translate(0, -0.41, 0);
    const limbArm = mergeColoredGeos([
      { geo: armCyl, color: '#ffffff' },
      { geo: hand, color: '#ffffff' },
    ]);

    const box = new THREE.BoxGeometry(1, 1, 1);
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 8);
    const cone = new THREE.ConeGeometry(1.15, 0.42, 8);
    return {
      officeTorso,
      casualTorso,
      modestTorso,
      vendorTorso,
      head,
      hair,
      limbLeg,
      limbArm,
      box,
      cyl,
      cone,
    };
  }, []);

  // Instanced refs for people (4 outfit torso meshes + shared head/hair/limb meshes)
  const officeTorsoRef = useRef<THREE.InstancedMesh>(null);
  const casualTorsoRef = useRef<THREE.InstancedMesh>(null);
  const modestTorsoRef = useRef<THREE.InstancedMesh>(null);
  const vendorTorsoRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const hairRef = useRef<THREE.InstancedMesh>(null);
  const legLRef = useRef<THREE.InstancedMesh>(null);
  const legRRef = useRef<THREE.InstancedMesh>(null);
  const armLRef = useRef<THREE.InstancedMesh>(null);
  const armRRef = useRef<THREE.InstancedMesh>(null);

  // Instanced refs for vendor stalls (gerobak + display + umbrella + pole + stools)
  const cartBodyRef = useRef<THREE.InstancedMesh>(null);
  const cartGlassRef = useRef<THREE.InstancedMesh>(null);
  const cartWheelRef = useRef<THREE.InstancedMesh>(null);
  const umbrellaPoleRef = useRef<THREE.InstancedMesh>(null);
  const umbrellaTopRef = useRef<THREE.InstancedMesh>(null);
  const stoolRef = useRef<THREE.InstancedMesh>(null);

  const scratch = useMemo(
    () => ({
      obj: new THREE.Object3D(),
      euler: new THREE.Euler(0, 0, 0, 'YXZ'),
      qBase: new THREE.Quaternion(),
      qSwing: new THREE.Quaternion(),
      qFinal: new THREE.Quaternion(),
      localPos: new THREE.Vector3(),
      color: new THREE.Color(),
      pose: { x: 0, y: 0, z: 0, rotY: 0, moving: false, scale: 1 } as PedestrianPose,
    }),
    []
  );

  // Place static vendor stalls once
  useLayoutEffect(() => {
    const { obj, color } = scratch;
    sim.vendors.forEach((v, i) => {
      const cos = Math.cos(v.rotY);
      const sin = Math.sin(v.rotY);
      const toWorld = (lx: number, ly: number, lz: number): [number, number, number] => [
        v.x + lx * cos + lz * sin,
        v.y + ly,
        v.z - lx * sin + lz * cos,
      ];

      // Cart lower body
      if (cartBodyRef.current) {
        obj.position.set(...toWorld(0, 0.58, 0));
        obj.rotation.set(0, v.rotY, 0);
        obj.scale.set(1.65, 0.78, 0.82);
        obj.updateMatrix();
        cartBodyRef.current.setMatrixAt(i, obj.matrix);
        cartBodyRef.current.setColorAt(i, color.set(v.cartColor));
      }

      // Glass food display cabinet on top of cart
      if (cartGlassRef.current) {
        obj.position.set(...toWorld(-0.18, 1.24, 0));
        obj.rotation.set(0, v.rotY, 0);
        obj.scale.set(1.05, 0.54, 0.72);
        obj.updateMatrix();
        cartGlassRef.current.setMatrixAt(i, obj.matrix);
      }

      // Two cart wheels
      if (cartWheelRef.current) {
        [-0.55, 0.55].forEach((wx, wi) => {
          obj.position.set(...toWorld(wx, 0.22, 0.42));
          obj.rotation.set(Math.PI / 2, v.rotY, 0);
          obj.scale.set(0.22, 0.08, 0.22);
          obj.updateMatrix();
          cartWheelRef.current!.setMatrixAt(i * 2 + wi, obj.matrix);
        });
      }

      // Umbrella pole & colorful canopy
      if (umbrellaPoleRef.current) {
        obj.position.set(...toWorld(0.45, 1.35, -0.35));
        obj.rotation.set(0, v.rotY, 0);
        obj.scale.set(0.04, 2.7, 0.04);
        obj.updateMatrix();
        umbrellaPoleRef.current.setMatrixAt(i, obj.matrix);
      }
      if (umbrellaTopRef.current) {
        obj.position.set(...toWorld(0.45, 2.65, -0.35));
        obj.rotation.set(0, v.rotY, 0);
        obj.scale.set(1.25, 1.0, 1.25);
        obj.updateMatrix();
        umbrellaTopRef.current.setMatrixAt(i, obj.matrix);
        umbrellaTopRef.current.setColorAt(i, color.set(v.umbrellaColor));
      }

      // Plastic stools in front of cart
      if (stoolRef.current) {
        [-0.45, 0.45].forEach((sx, si) => {
          obj.position.set(...toWorld(sx, 0.24, 0.95));
          obj.rotation.set(0, v.rotY, 0);
          obj.scale.set(0.22, 0.48, 0.22);
          obj.updateMatrix();
          stoolRef.current!.setMatrixAt(i * 2 + si, obj.matrix);
        });
      }
    });

    if (cartBodyRef.current) {
      cartBodyRef.current.instanceMatrix.needsUpdate = true;
      if (cartBodyRef.current.instanceColor) cartBodyRef.current.instanceColor.needsUpdate = true;
    }
    if (cartGlassRef.current) cartGlassRef.current.instanceMatrix.needsUpdate = true;
    if (cartWheelRef.current) cartWheelRef.current.instanceMatrix.needsUpdate = true;
    if (umbrellaPoleRef.current) umbrellaPoleRef.current.instanceMatrix.needsUpdate = true;
    if (umbrellaTopRef.current) {
      umbrellaTopRef.current.instanceMatrix.needsUpdate = true;
      if (umbrellaTopRef.current.instanceColor) umbrellaTopRef.current.instanceColor.needsUpdate = true;
    }
    if (stoolRef.current) stoolRef.current.instanceMatrix.needsUpdate = true;
  }, [scratch, sim]);

  // Assign static pedestrian limb & archetype torso colors once on mount (zero per-frame uploads)
  useLayoutEffect(() => {
    const color = new THREE.Color();
    const torsoRefs = [
      officeTorsoRef.current,
      casualTorsoRef.current,
      modestTorsoRef.current,
      vendorTorsoRef.current,
    ];

    const setPersonColors = (
      idx: number,
      shirt: string,
      hair: string,
      hasHijab: boolean
    ) => {
      const arch = archetypes[idx];
      const slot = slotIndices[idx];
      // Avoid white-on-white blazer vs crisp white V-shirt for office archetype
      const torsoColor = arch === 0 && shirt === '#f8fafc' ? '#334155' : shirt;
      const targetTorso = torsoRefs[arch];
      if (targetTorso) targetTorso.setColorAt(slot, color.set(torsoColor));
      if (headRef.current) headRef.current.setColorAt(idx, color.set('#ffffff'));
      if (hairRef.current) hairRef.current.setColorAt(idx, color.set(hasHijab ? torsoColor : hair));
      if (legLRef.current) legLRef.current.setColorAt(idx, color.set('#111827'));
      if (legRRef.current) legRRef.current.setColorAt(idx, color.set('#111827'));
      if (armLRef.current) armLRef.current.setColorAt(idx, color.set('#111827'));
      if (armRRef.current) armRRef.current.setColorAt(idx, color.set('#111827'));
    };

    let idx = 0;
    for (let i = 0; i < sim.walkers.length; i++) {
      const w = sim.walkers[i];
      setPersonColors(idx++, w.shirtColor, w.hairColor, w.hasHijab);
    }
    for (let i = 0; i < sim.parkWalkers.length; i++) {
      const pw = sim.parkWalkers[i];
      setPersonColors(idx++, pw.shirtColor, pw.hairColor, pw.hasHijab);
    }
    for (let i = 0; i < sim.commuters.length; i++) {
      const c = sim.commuters[i];
      setPersonColors(idx++, c.shirtColor, c.hairColor, c.hasHijab);
    }
    for (let i = 0; i < sim.vendors.length; i++) {
      const v = sim.vendors[i];
      setPersonColors(idx++, v.vendorShirt, '#18181b', v.hasHijab);
      for (let c = 0; c < v.customerCount; c++) {
        setPersonColors(
          idx++,
          c === 0 ? v.customerShirt : '#475569',
          '#27272a',
          c === 1
        );
      }
    }

    const syncColor = (m: THREE.InstancedMesh | null) => {
      if (m?.instanceColor) m.instanceColor.needsUpdate = true;
    };
    syncColor(officeTorsoRef.current);
    syncColor(casualTorsoRef.current);
    syncColor(modestTorsoRef.current);
    syncColor(vendorTorsoRef.current);
    syncColor(headRef.current);
    syncColor(hairRef.current);
    syncColor(legLRef.current);
    syncColor(legRRef.current);
    syncColor(armLRef.current);
    syncColor(armRRef.current);
  }, [sim, archetypes, slotIndices]);

  // Update all articulated humanoids deterministically via `useWorldAnimation` (zero allocations per frame)
  useWorldAnimation(
    time,
    (t) => {
      const { obj, euler, qBase, qSwing, qFinal, localPos, pose } = scratch;

      const setLimb = (
        mesh: THREE.InstancedMesh | null,
        i: number,
        px: number,
        py: number,
        pz: number,
        bob: number,
        sc: number,
        lx: number,
        ly: number,
        lz: number,
        swingAngle: number
      ) => {
        if (!mesh) return;
        localPos.set(lx * sc, (ly + bob) * sc, lz * sc).applyQuaternion(qBase);
        obj.position.set(px + localPos.x, py + localPos.y, pz + localPos.z);
        if (swingAngle !== 0) {
          qSwing.setFromAxisAngle(X_AXIS, swingAngle);
          qFinal.multiplyQuaternions(qBase, qSwing);
          obj.quaternion.copy(qFinal);
        } else {
          obj.quaternion.copy(qBase);
        }
        obj.updateMatrix();
        mesh.setMatrixAt(i, obj.matrix);
      };

      const placePerson = (
        i: number,
        px: number,
        py: number,
        pz: number,
        rotY: number,
        scale: number,
        heightScale: number,
        stride: number,
        bob: number
      ) => {
        const sc = scale * heightScale;
        euler.set(0, rotY, 0, 'YXZ');
        qBase.setFromEuler(euler);
        obj.scale.setScalar(sc);

        const arch = archetypes[i];
        const slot = slotIndices[i];
        const torsoMesh =
          arch === 0
            ? officeTorsoRef.current
            : arch === 1
              ? casualTorsoRef.current
              : arch === 2
                ? modestTorsoRef.current
                : vendorTorsoRef.current;

        setLimb(torsoMesh, slot, px, py, pz, bob, sc, 0, 0.82, 0, 0);
        setLimb(headRef.current, i, px, py, pz, bob, sc, 0, 1.32, 0, 0);
        setLimb(hairRef.current, i, px, py, pz, bob, sc, 0, 1.33, -0.025, 0);
        setLimb(legLRef.current, i, px, py, pz, bob, sc, -0.085, 0.55, 0, stride);
        setLimb(legRRef.current, i, px, py, pz, bob, sc, 0.085, 0.55, 0, -stride);
        setLimb(armLRef.current, i, px, py, pz, bob, sc, -0.175, 1.02, 0, -stride * 0.85);
        setLimb(armRRef.current, i, px, py, pz, bob, sc, 0.175, 1.02, 0, stride * 0.85);
      };

      let idx = 0;

      // 1. Sidewalk walkers
      for (let i = 0; i < sim.walkers.length; i++) {
        const w = sim.walkers[i];
        sampleWalkerPose(sim, i, t, pose);
        const stride = pose.moving ? Math.sin(t * w.speed * 4.8 + w.phase) * 0.55 : 0;
        const bob = pose.moving ? Math.abs(Math.sin(t * w.speed * 4.8 + w.phase)) * 0.04 : 0;
        placePerson(idx++, pose.x, pose.y, pose.z, pose.rotY, pose.scale, w.height / 1.7, stride, bob);
      }

      // 2. Park strollers & joggers
      for (let i = 0; i < sim.parkWalkers.length; i++) {
        const pw = sim.parkWalkers[i];
        sampleParkWalkerPose(pw, t, pose);
        const freq = pw.speed > 2 ? 7.2 : 4.8;
        const amp = pw.speed > 2 ? 0.78 : 0.52;
        const stride = Math.sin(t * freq + pw.phase) * amp;
        const bob = Math.abs(Math.sin(t * freq + pw.phase)) * (pw.speed > 2 ? 0.08 : 0.035);
        placePerson(idx++, pose.x, pose.y, pose.z, pose.rotY, pose.scale, pw.height / 1.7, stride, bob);
      }

      // 3. Commuters waiting at bus stops (gentle idle sway)
      for (let i = 0; i < sim.commuters.length; i++) {
        const c = sim.commuters[i];
        const sway = Math.sin(t * 1.4 + c.phase) * 0.06;
        placePerson(
          idx++,
          c.x,
          c.y,
          c.z,
          c.facing + sway,
          1,
          c.height / 1.7,
          Math.sin(t * 1.8 + c.phase) * 0.04,
          Math.sin(t * 2.2 + c.phase) * 0.008
        );
      }

      // 4. Street vendors & customers
      for (let i = 0; i < sim.vendors.length; i++) {
        const v = sim.vendors[i];
        const cos = Math.cos(v.rotY);
        const sin = Math.sin(v.rotY);

        // Vendor behind cart (lx = 0, lz = -0.78)
        const vx = v.x - 0.78 * sin;
        const vz = v.z - 0.78 * cos;
        placePerson(
          idx++,
          vx,
          v.y,
          vz,
          v.rotY,
          1,
          0.98,
          Math.sin(t * 2.4 + v.seed) * 0.14,
          Math.abs(Math.sin(t * 2.4 + v.seed)) * 0.015
        );

        // Customers in front of cart
        for (let c = 0; c < v.customerCount; c++) {
          const lx = c === 0 ? -0.42 : 0.48;
          const lz = 0.92;
          const cx = v.x + lx * cos + lz * sin;
          const cz = v.z - lx * sin + lz * cos;
          placePerson(
            idx++,
            cx,
            v.y,
            cz,
            v.rotY + Math.PI + (c === 0 ? 0.2 : -0.2),
            1,
            0.97 + c * 0.04,
            Math.sin(t * 1.6 + v.seed + c * 2) * 0.05,
            0
          );
        }
      }

      if (officeTorsoRef.current) officeTorsoRef.current.instanceMatrix.needsUpdate = true;
      if (casualTorsoRef.current) casualTorsoRef.current.instanceMatrix.needsUpdate = true;
      if (modestTorsoRef.current) modestTorsoRef.current.instanceMatrix.needsUpdate = true;
      if (vendorTorsoRef.current) vendorTorsoRef.current.instanceMatrix.needsUpdate = true;
      if (headRef.current) headRef.current.instanceMatrix.needsUpdate = true;
      if (hairRef.current) hairRef.current.instanceMatrix.needsUpdate = true;
      if (legLRef.current) legLRef.current.instanceMatrix.needsUpdate = true;
      if (legRRef.current) legRRef.current.instanceMatrix.needsUpdate = true;
      if (armLRef.current) armLRef.current.instanceMatrix.needsUpdate = true;
      if (armRRef.current) armRRef.current.instanceMatrix.needsUpdate = true;
    },
    [scratch, sim, archetypes, slotIndices]
  );

  return (
    <group name="city-pedestrians-and-vendors">
      {/* Articulated Pedestrians: 4 Urban Outfit Archetypes */}
      {archetypeCounts[0] > 0 && (
        <instancedMesh
          key={`pt-office-${archetypeCounts[0]}`}
          ref={officeTorsoRef}
          args={[geos.officeTorso, undefined, archetypeCounts[0]]}
          castShadow
          frustumCulled={false}
        >
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.85}
            vertexColors
            onBeforeCompile={tintWhiteOnly}
            customProgramCacheKey={tintWhiteCacheKey}
          />
        </instancedMesh>
      )}
      {archetypeCounts[1] > 0 && (
        <instancedMesh
          key={`pt-casual-${archetypeCounts[1]}`}
          ref={casualTorsoRef}
          args={[geos.casualTorso, undefined, archetypeCounts[1]]}
          castShadow
          frustumCulled={false}
        >
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.85}
            vertexColors
            onBeforeCompile={tintWhiteOnly}
            customProgramCacheKey={tintWhiteCacheKey}
          />
        </instancedMesh>
      )}
      {archetypeCounts[2] > 0 && (
        <instancedMesh
          key={`pt-modest-${archetypeCounts[2]}`}
          ref={modestTorsoRef}
          args={[geos.modestTorso, undefined, archetypeCounts[2]]}
          castShadow
          frustumCulled={false}
        >
          <meshStandardMaterial color="#ffffff" map={batikTex ?? undefined} roughness={0.85} />
        </instancedMesh>
      )}
      {archetypeCounts[3] > 0 && (
        <instancedMesh
          key={`pt-vendor-${archetypeCounts[3]}`}
          ref={vendorTorsoRef}
          args={[geos.vendorTorso, undefined, archetypeCounts[3]]}
          castShadow
          frustumCulled={false}
        >
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.85}
            vertexColors
            onBeforeCompile={tintWhiteOnly}
            customProgramCacheKey={tintWhiteCacheKey}
          />
        </instancedMesh>
      )}
      <instancedMesh
        key={`ph-${totalPeople}`}
        ref={headRef}
        args={[geos.head, undefined, totalPeople]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#ffffff" roughness={0.75} vertexColors />
      </instancedMesh>
      <instancedMesh
        key={`phr-${totalPeople}`}
        ref={hairRef}
        args={[geos.hair, undefined, totalPeople]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#ffffff" roughness={0.85} />
      </instancedMesh>
      <instancedMesh
        key={`pll-${totalPeople}`}
        ref={legLRef}
        args={[geos.limbLeg, undefined, totalPeople]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#ffffff" roughness={0.85} />
      </instancedMesh>
      <instancedMesh
        key={`plr-${totalPeople}`}
        ref={legRRef}
        args={[geos.limbLeg, undefined, totalPeople]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#ffffff" roughness={0.85} />
      </instancedMesh>
      <instancedMesh
        key={`pal-${totalPeople}`}
        ref={armLRef}
        args={[geos.limbArm, undefined, totalPeople]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#ffffff" roughness={0.85} />
      </instancedMesh>
      <instancedMesh
        key={`par-${totalPeople}`}
        ref={armRRef}
        args={[geos.limbArm, undefined, totalPeople]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#ffffff" roughness={0.85} />
      </instancedMesh>

      {/* Street Vendor Carts (Gerobak Kaki Lima) */}
      <instancedMesh
        key={`cb-${sim.vendors.length}`}
        ref={cartBodyRef}
        args={[geos.box, undefined, sim.vendors.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <meshStandardMaterial color="#ffffff" roughness={0.65} />
      </instancedMesh>
      <instancedMesh
        key={`cg-${sim.vendors.length}`}
        ref={cartGlassRef}
        args={[geos.box, undefined, sim.vendors.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#bae6fd" roughness={0.15} metalness={0.3} transparent opacity={0.75} />
      </instancedMesh>
      <instancedMesh
        key={`cw-${sim.vendors.length * 2}`}
        ref={cartWheelRef}
        args={[geos.cyl, undefined, sim.vendors.length * 2]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </instancedMesh>
      <instancedMesh
        key={`up-${sim.vendors.length}`}
        ref={umbrellaPoleRef}
        args={[geos.cyl, undefined, sim.vendors.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.4} />
      </instancedMesh>
      <instancedMesh
        key={`ut-${sim.vendors.length}`}
        ref={umbrellaTopRef}
        args={[geos.cone, undefined, sim.vendors.length]}
        castShadow
        frustumCulled={false}
      >
        <meshStandardMaterial color="#ffffff" roughness={0.75} />
      </instancedMesh>
      <instancedMesh
        key={`st-${sim.vendors.length * 2}`}
        ref={stoolRef}
        args={[geos.cyl, undefined, sim.vendors.length * 2]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#ef4444" roughness={0.6} />
      </instancedMesh>
    </group>
  );
});

