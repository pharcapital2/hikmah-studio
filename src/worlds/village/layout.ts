// Layout Desa. 1 unit = 1 meter. Dunia 400x400, pusat (0,0), x,z ∈ [-200,200].
// Utara = -z (gunung), Timur = +x (sawah bertingkat), Selatan = +z, sungai di z≈70.
// Pemilik: village-land. Agent lain HANYA membaca file ini.

export type V2 = [number, number];
export type V3 = [number, number, number];

export const WORLD_SIZE = 400;
export const WORLD_HALF = 200;

/** Sungai: polyline tengah (x,z), lebar, melintang barat→timur. */
export const RIVER = {
  width: 12,
  depth: 2.2,
  waterY: -1.1,
  path: [
    [-210, 62], [-150, 66], [-100, 74], [-50, 70], [0, 68], [50, 74], [100, 80], [150, 72], [210, 66],
  ] as V2[],
};

export function riverZ(x: number): number {
  const p = RIVER.path;
  if (x <= p[0][0]) return p[0][1];
  for (let i = 0; i < p.length - 1; i++) {
    const [x0, z0] = p[i];
    const [x1, z1] = p[i + 1];
    if (x <= x1) return z0 + ((x - x0) / (x1 - x0)) * (z1 - z0);
  }
  return p[p.length - 1][1];
}

/** Jembatan utama (menghubungkan jalan desa ke selatan) + jembatan bambu kecil. */
export const BRIDGES = [
  { id: 'bridge-main', position: [0, 0, 68] as V3, length: 22, width: 5, rotationY: Math.PI / 2 },
  { id: 'bridge-bamboo', position: [-95, 0, 74] as V3, length: 20, width: 1.6, rotationY: Math.PI / 2 },
];

/** Ketinggian dek jembatan tepat di (x, z) agar aktor & kendaraan melintas persis di atas papan jembatan. */
export function bridgeDeckY(x: number, z: number): number | null {
  const main = BRIDGES[0];
  const mainHalfL = main.length / 2;
  if (Math.abs(x - main.position[0]) <= main.width * 0.58 && Math.abs(z - main.position[2]) <= mainHalfL + 0.35) {
    const u = Math.max(-1, Math.min(1, (z - main.position[2]) / mainHalfL));
    return 0.14 + 1.35 * (1 - u * u);
  }
  const bam = BRIDGES[1];
  const bamHalfL = bam.length / 2;
  if (Math.abs(x - bam.position[0]) <= bam.width * 0.75 && Math.abs(z - bam.position[2]) <= bamHalfL + 0.35) {
    const u = Math.max(-1, Math.min(1, (z - bam.position[2]) / bamHalfL));
    return 0.14 + 0.45 * (1 - u * u);
  }
  return null;
}

/** Jalan tanah: polyline (x,z) + lebar. */
export const ROADS = [
  { id: 'road-main', width: 4, path: [[-200, 12], [-140, 10], [-80, 8], [-30, 6], [0, 5], [40, 6], [90, 0], [140, -20], [190, -40]] as V2[] },
  { id: 'road-bridge', width: 4, path: [[0, 5], [0, 30], [0, 68], [0, 120], [10, 200]] as V2[] },
  { id: 'road-north', width: 3, path: [[0, 5], [0, -45], [-12, -95], [-25, -150]] as V2[] },
  { id: 'road-rice', width: 3, path: [[90, 0], [96, -30], [100, -70], [104, -110]] as V2[] },
  { id: 'road-farm', width: 3, path: [[-90, 8.5], [-92, -12], [-94, -30]] as V2[] },
];

/** Zona (kotak/lingkaran) — pusat & ukuran. Dipakai agent lain untuk menempatkan objek. */
export const ZONES = {
  center: { id: 'village-center', center: [0, -12] as V2, radius: 38 },
  houseWest: { id: 'houses-west', center: [-64, -52] as V2, size: [40, 32] as V2 },
  houseEast: { id: 'houses-east', center: [62, -28] as V2, size: [44, 34] as V2 },
  houseSouth: { id: 'houses-south', center: [-52, 114] as V2, size: [76, 56] as V2 },
  houseSoutheast: { id: 'houses-southeast', center: [48, 114] as V2, size: [52, 44] as V2 },
  riceTerraces: { id: 'rice-terraces', center: [135, -90] as V2, size: [110, 130] as V2 },
  farm: { id: 'livestock-farm', center: [-100, -45] as V2, size: [50, 40] as V2 },
  garden: { id: 'garden', center: [-36, -60] as V2, size: [32, 26] as V2 },
  field: { id: 'field', center: [45, 28] as V2, size: [50, 30] as V2 },
  forestWest: { id: 'forest-west', center: [-150, -20] as V2, size: [100, 340] as V2 },
  forestNorth: { id: 'forest-north', center: [0, -150] as V2, size: [260, 60] as V2 },
  mountain: { id: 'mountain', center: [0, -230] as V2, size: [460, 120] as V2 },
  riverside: { id: 'riverside', center: [0, 58] as V2, size: [400, 20] as V2 },
  cemetery: { id: 'cemetery', center: [-120, 100] as V2, size: [24, 20] as V2 },
};

/** Slot bangunan (posisi, rotasi Y radian, jenis, footprint). Dibaca @village-life. */
export type BuildingSlot = { id: string; kind: string; position: V3; rotationY: number; size: V2 };
export const BUILDING_SLOTS: BuildingSlot[] = [
  { id: 'masjid', kind: 'mosque', position: [-22, 0, -26], rotationY: 0, size: [20, 20] },
  { id: 'balai-desa', kind: 'hall', position: [26, 0, -22], rotationY: -0.15, size: [16, 10] },
  { id: 'sekolah', kind: 'school', position: [-62, 0, -22], rotationY: 0, size: [24, 12] },
  { id: 'warung-1', kind: 'warung', position: [14, 0, 16], rotationY: Math.PI, size: [6, 6] },
  { id: 'warung-2', kind: 'warung', position: [-14, 0, 16], rotationY: Math.PI, size: [6, 6] },
  { id: 'pasar', kind: 'market', position: [-26, 0, 32], rotationY: Math.PI, size: [26, 14] },
  { id: 'lumbung-1', kind: 'barn', position: [-84, 0, -62], rotationY: 0.2, size: [8, 6] },
  { id: 'lumbung-2', kind: 'barn', position: [72, 0, -48], rotationY: -0.2, size: [8, 6] },
  { id: 'musholla', kind: 'musholla', position: [-118, 0, 88], rotationY: 0, size: [8, 8] },
  { id: 'sumur-1', kind: 'well', position: [-10, 0, -4], rotationY: 0, size: [3, 3] },
  { id: 'sumur-2', kind: 'well', position: [-50, 0, -4], rotationY: 0, size: [3, 3] },
  { id: 'saung-1', kind: 'gazebo', position: [116, 0, -60], rotationY: 0.4, size: [5, 5] },
  { id: 'saung-2', kind: 'gazebo', position: [-36, 0, -78], rotationY: 0, size: [5, 5] },
  { id: 'saung-river', kind: 'gazebo', position: [30, -0.2, 58], rotationY: 0, size: [5, 5] },
  { id: 'kandang-sapi', kind: 'cowshed', position: [-114, 0, -52], rotationY: 0, size: [14, 8] },
  { id: 'kandang-kambing', kind: 'goatshed', position: [-96, 0, -46], rotationY: 0, size: [8, 6] },
  { id: 'kandang-ayam', kind: 'coop', position: [-104, 0, -20], rotationY: 0.3, size: [5, 4] },
  { id: 'kandang-bebek', kind: 'duckpen', position: [-60, 0, 54], rotationY: 0, size: [6, 4] },
];

/** Slot rumah: dihasilkan deterministik (grid berjitter) di zona rumah, dijauhkan dari jalan & bangunan. */
export type HouseSlot = { id: string; style: 'bamboo' | 'wood' | 'brick'; position: V3; rotationY: number; size: V2 };
function rnd(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function distToRoads(x: number, z: number): number {
  let best = Infinity;
  for (const r of ROADS) {
    for (let i = 0; i < r.path.length - 1; i++) {
      const [ax, az] = r.path[i];
      const [bx, bz] = r.path[i + 1];
      const dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      const d = Math.hypot(x - (ax + t * dx), z - (az + t * dz)) - r.width / 2;
      if (d < best) best = d;
    }
  }
  return best;
}

function nearBuilding(x: number, z: number, pad: number) {
  return BUILDING_SLOTS.some((b) => Math.abs(x - b.position[0]) < b.size[0] / 2 + pad && Math.abs(z - b.position[2]) < b.size[1] / 2 + pad);
}

function inBox(x: number, z: number, cx: number, cz: number, w: number, d: number, pad = 0) {
  return Math.abs(x - cx) < w / 2 + pad && Math.abs(z - cz) < d / 2 + pad;
}

function makeHouses(): HouseSlot[] {
  const out: HouseSlot[] = [];
  const r = rnd(1717);
  const zones = [ZONES.houseWest, ZONES.houseEast, ZONES.houseSouth, ZONES.houseSoutheast];
  let n = 0;
  for (const zn of zones) {
    const [cx, cz] = zn.center;
    const [w, d] = zn.size;
    const stepX = 18, stepZ = 18;
    for (let x = cx - w / 2 + 6; x <= cx + w / 2 - 4; x += stepX) {
      for (let z = cz - d / 2 + 6; z <= cz + d / 2 - 4; z += stepZ) {
        const px = x + (r() - 0.5) * 3, pz = z + (r() - 0.5) * 3;
        if (distToRoads(px, pz) < 11 || nearBuilding(px, pz, 10)) continue;
        if (px > -200 && Math.abs(pz - riverZ(px)) < 14) continue;
        if (inBox(px, pz, ZONES.garden.center[0], ZONES.garden.center[1], ZONES.garden.size[0], ZONES.garden.size[1], 6)) continue;
        if (inBox(px, pz, ZONES.field.center[0], ZONES.field.center[1], ZONES.field.size[0], ZONES.field.size[1], 6)) continue;
        if (inBox(px, pz, ZONES.cemetery.center[0], ZONES.cemetery.center[1], ZONES.cemetery.size[0], ZONES.cemetery.size[1], 6)) continue;
        if (inBox(px, pz, -110, -34, 26, 16, 4) || inBox(px, pz, -96, -62, 18, 14, 4)) continue;
        const roll = r();
        out.push({
          id: `house-${n++}`,
          style: roll < 0.35 ? 'bamboo' : roll < 0.7 ? 'wood' : 'brick',
          position: [px, 0, pz],
          rotationY: (Math.round(r() * 4) * Math.PI) / 2 + (r() - 0.5) * 0.3,
          size: [7 + r() * 2, 6 + r() * 2],
        });
      }
    }
  }
  return out;
}
export const HOUSE_SLOTS: HouseSlot[] = makeHouses();

/** Teras sawah: tiap teras = satu level datar di lereng timur-laut. */
export const RICE = {
  center: ZONES.riceTerraces.center,
  size: ZONES.riceTerraces.size,
  terraceCount: 8,
  terraceStepY: 1.4,
  baseY: 1.0,
};

/** Tiang listrik sepanjang jalan utama (untuk @village-life), dijaga aman dari seluruh badan jalan. */
export const POWER_POLES: V3[] = Array.from({ length: 14 }, (_, i) => {
  const x = -190 + i * 30;
  const roadZ = ROADS[0].path.reduce(
    (acc, p, k, a) => (k < a.length - 1 && x >= p[0] && x <= a[k + 1][0] ? p[1] + ((x - p[0]) / (a[k + 1][0] - p[0])) * (a[k + 1][1] - p[1]) : acc),
    10,
  );
  let px = x;
  let pz = roadZ - 4;
  if (distToRoads(px, pz) < 2) {
    pz = roadZ - 6;
    if (distToRoads(px, pz) < 2) px += 4;
  }
  return [px, 0, pz] as V3;
});

/** Titik jalan (waypoint) untuk hewan/orang/kendaraan (@village-actors). */
export const WAYPOINTS = {
  mainRoad: ROADS[0].path,
  loopCenter: [[-8, 6], [20, 6], [20, 23], [-8, 23]] as V2[],
  riverBank: [[-120, 48], [-60, 47], [-12, 48], [14, 49], [32, 50], [60, 54], [110, 58]] as V2[],
  pastureCow: { center: [-110, -30] as V2, radius: 14 },
  pastureGoat: { center: [-96, -62] as V2, radius: 10 },
  fieldPlay: { center: ZONES.field.center, radius: 18 },
};

// ---------- Tinggi terrain (dipakai semua agent: heightAt) ----------
function hash2(ix: number, iz: number) {
  let h = (ix * 374761393 + iz * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, z: number, oct = 4) {
  let s = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += amp * vnoise(x * f, z * f); f *= 2; amp *= 0.5; }
  return s;
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function heightAt(x: number, z: number): number {
  // dataran desa datar-landai
  let h = (fbm(x * 0.02, z * 0.02) - 0.5) * 2.0;
  // gunung utara
  const mt = smooth(-150, -230, z);
  const ridge = fbm(x * 0.012 + 10, z * 0.012, 5);
  h += mt * (40 + ridge * 90) * (0.6 + 0.4 * Math.cos(x * 0.008));
  // bukit timur (lereng sawah)
  const hill = smooth(70, 190, x) * smooth(20, -60, z);
  h += hill * 16;
  // hutan barat sedikit berbukit
  h += smooth(-110, -190, x) * (fbm(x * 0.03, z * 0.03) * 8);
  // lembah sungai
  const dz = Math.abs(z - riverZ(x));
  const bank = 1 - smooth(RIVER.width * 0.5, RIVER.width * 0.5 + 10, dz);
  h = h * (1 - bank * 0.9) - bank * (RIVER.depth * 1.1);
  // tanggul landai di ujung jembatan utama & jembatan bambu agar jalan menyambung rata ke dek
  const mainDistX = 1 - smooth(2.5, 5.5, Math.abs(x - BRIDGES[0].position[0]));
  if (mainDistX > 0) {
    const dzMain = Math.abs(z - BRIDGES[0].position[2]);
    const mainEnd = (1 - smooth(11, 18, dzMain)) * smooth(8.5, 10.6, dzMain);
    const abutMain = mainDistX * mainEnd;
    if (abutMain > 0) h = h * (1 - abutMain) + 0.06 * abutMain;
  }
  const bamDistX = 1 - smooth(1.2, 3.8, Math.abs(x - BRIDGES[1].position[0]));
  if (bamDistX > 0) {
    const dzBam = Math.abs(z - BRIDGES[1].position[2]);
    const bamEnd = (1 - smooth(10, 16, dzBam)) * smooth(7.5, 9.6, dzBam);
    const abutBam = bamDistX * bamEnd;
    if (abutBam > 0) h = h * (1 - abutBam) + 0.06 * abutBam;
  }
  // rata di pusat desa
  const flat = 1 - smooth(45, 85, Math.hypot(x, z + 10));
  h = h * (1 - flat * 0.85);
  // rata di lapangan bola
  const [fx, fz] = ZONES.field.center;
  const [fw, fd] = ZONES.field.size;
  const inField =
    (1 - smooth(fw / 2 - 4, fw / 2 + 6, Math.abs(x - fx))) *
    (1 - smooth(fd / 2 - 4, fd / 2 + 6, Math.abs(z - fz)));
  if (inField > 0) {
    h = h * (1 - inField);
  }
  // rata di kebun sayur agar bedengan tidak melayang
  const [gx, gz] = ZONES.garden.center;
  const [gw, gd] = ZONES.garden.size;
  const inGarden =
    (1 - smooth(gw / 2 - 3, gw / 2 + 5, Math.abs(x - gx))) *
    (1 - smooth(gd / 2 - 3, gd / 2 + 5, Math.abs(z - gz)));
  if (inGarden > 0) {
    h = h * (1 - inGarden);
  }
  // teras sawah: kuantisasi
  const rz = RICE.center[1], rx = RICE.center[0];
  const inRice = (1 - smooth(RICE.size[0] / 2 - 6, RICE.size[0] / 2 + 6, Math.abs(x - rx))) * (1 - smooth(RICE.size[1] / 2 - 6, RICE.size[1] / 2 + 6, Math.abs(z - rz)));
  if (inRice > 0) {
    const t = (RICE.size[1] / 2 - (z - rz)) / RICE.size[1]; // 0 selatan → 1 utara
    const level = Math.floor(Math.max(0, Math.min(0.999, t)) * RICE.terraceCount);
    const terrace = RICE.baseY + level * RICE.terraceStepY;
    h = h * (1 - inRice) + terrace * inRice;
  }
  return h;
}
