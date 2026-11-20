import {
  FLYOVER,
  MARKET,
  PARK,
  ROAD_LINES,
  ROAD_WIDTH,
  SIDEWALK_H,
  WORLD_SIZE,
  busStops,
  signalState,
} from '../layout';
import { seededRandom } from '../../shared/seededRandom';

export interface WalkerSpec {
  id: number;
  axis: 'x' | 'z';
  sidewalkCoord: number;
  dir: 1 | -1;
  speed: number;
  initialU: number;
  height: number;
  shirtColor: string;
  pantsColor: string;
  skinColor: string;
  hairColor: string;
  hasHijab: boolean;
  phase: number;
}

export interface ParkWalkerSpec {
  id: number;
  cx: number;
  cz: number;
  halfW: number;
  speed: number;
  offset: number;
  dir: 1 | -1;
  height: number;
  shirtColor: string;
  pantsColor: string;
  skinColor: string;
  hairColor: string;
  hasHijab: boolean;
  phase: number;
}

export interface VendorStallSpec {
  id: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  cartColor: string;
  umbrellaColor: string;
  vendorShirt: string;
  vendorSkin: string;
  hasHijab: boolean;
  customerCount: 1 | 2;
  customerShirt: string;
  seed: number;
}

export interface CommuterSpec {
  x: number;
  y: number;
  z: number;
  facing: number;
  height: number;
  shirtColor: string;
  pantsColor: string;
  skinColor: string;
  hairColor: string;
  hasHijab: boolean;
  phase: number;
}

export interface PedestrianSimData {
  walkers: WalkerSpec[];
  parkWalkers: ParkWalkerSpec[];
  commuters: CommuterSpec[];
  vendors: VendorStallSpec[];
  dt: number;
  steps: number;
  duration: number;
  walkerUBuf: Float32Array;
  walkerMovingBuf: Uint8Array;
}

const SHIRT_COLORS = [
  '#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed',
  '#0891b2', '#e11d48', '#f8fafc', '#334155', '#65a30d',
];
const PANTS_COLORS = ['#1e293b', '#334155', '#1f2937', '#3f2e21', '#475569'];
const SKIN_COLORS = ['#d8a47f', '#c98e63', '#e2b591', '#b77b52'];
const HAIR_COLORS = ['#18181b', '#27272a', '#3f2a1d', '#f1f5f9'];
const CART_COLORS = ['#0284c7', '#16a34a', '#dc2626', '#d97706', '#0f766e'];
const UMBRELLA_COLORS = ['#ef4444', '#2563eb', '#eab308', '#10b981', '#f97316'];

const CURB_STOP = ROAD_WIDTH / 2 + 1.0; // 8.0m from intersection center
const U_CROSS_STOPS = ROAD_LINES.map((c) => c + WORLD_SIZE / 2 - CURB_STOP);

export function buildPedestrianSimulation(): PedestrianSimData {
  const rnd = seededRandom(55109);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

  const walkers: WalkerSpec[] = [];
  let wid = 0;

  const sidewalkOffset = ROAD_WIDTH / 2 + 1.15; // 8.15m clear corridor between curb lights & outer trees/shelters
  for (const axis of ['x', 'z'] as const) {
    for (const rl of ROAD_LINES) {
      // Keep heavy concentration around central & market/station avenues
      const perSide = rl === 0 || rl === -100 || rl === 100 ? 4 : 2;
      for (const side of [-1, 1] as const) {
        const sidewalkCoord = rl + side * sidewalkOffset;
        for (let k = 0; k < perSide; k++) {
          const dir: 1 | -1 = rnd() < 0.5 ? 1 : -1;
          walkers.push({
            id: wid++,
            axis,
            sidewalkCoord,
            dir,
            speed: 1.25 + rnd() * 0.45,
            initialU: rnd() * WORLD_SIZE,
            height: 1.58 + rnd() * 0.2,
            shirtColor: pick(SHIRT_COLORS),
            pantsColor: pick(PANTS_COLORS),
            skinColor: pick(SKIN_COLORS),
            hairColor: pick(HAIR_COLORS),
            hasHijab: rnd() < 0.42,
            phase: rnd() * Math.PI * 2,
          });
        }
      }
    }
  }

  // Park strollers & joggers around central park outer perimeter path
  const parkWalkers: ParkWalkerSpec[] = [];
  for (let i = 0; i < 16; i++) {
    const isJogger = i % 4 === 0;
    parkWalkers.push({
      id: i,
      cx: PARK.x,
      cz: PARK.z,
      halfW: 31.6 + (i % 2) * 1.4,
      speed: isJogger ? 2.6 + rnd() * 0.6 : 1.15 + rnd() * 0.35,
      offset: rnd() * 140,
      dir: i % 2 === 0 ? 1 : -1,
      height: 1.58 + rnd() * 0.2,
      shirtColor: pick(SHIRT_COLORS),
      pantsColor: pick(PANTS_COLORS),
      skinColor: pick(SKIN_COLORS),
      hairColor: pick(HAIR_COLORS),
      hasHijab: rnd() < 0.4,
      phase: rnd() * Math.PI * 2,
    });
  }

  // Commuters waiting at bus stops
  const commuters: CommuterSpec[] = [];
  busStops.forEach((bs) => {
    const count = 4;
    const fx = Math.sin(bs.rotY);
    const fz = Math.cos(bs.rotY);
    const rx = fz;
    const rz = -fx;
    for (let i = 0; i < count; i++) {
      const side = (i - 1.5) * 1.15 + (rnd() - 0.5) * 0.25;
      const fwd = 0.52 + (rnd() - 0.5) * 0.25;
      commuters.push({
        x: bs.x + rx * side + fx * fwd,
        y: SIDEWALK_H + 0.24,
        z: bs.z + rz * side + fz * fwd,
        facing: bs.rotY + (rnd() - 0.5) * 0.4,
        height: 1.58 + rnd() * 0.18,
        shirtColor: pick(SHIRT_COLORS),
        pantsColor: pick(PANTS_COLORS),
        skinColor: pick(SKIN_COLORS),
        hairColor: pick(HAIR_COLORS),
        hasHijab: rnd() < 0.45,
        phase: rnd() * Math.PI * 2,
      });
    }
  });

  // Street vendors (Pedagang Kaki Lima) at market, station, school, mosque, park, shop-street
  const vendorSpots: Array<{ id: string; x: number; z: number; rotY: number }> = [
    // Pasar Kaki Lima (-150, 50) outer promenade around market tents
    { id: 'pkl-mkt-1', x: MARKET.x - 20, z: MARKET.z - 33, rotY: 0 },
    { id: 'pkl-mkt-2', x: MARKET.x - 5, z: MARKET.z - 33, rotY: 0 },
    { id: 'pkl-mkt-3', x: MARKET.x + 10, z: MARKET.z - 33, rotY: 0 },
    { id: 'pkl-mkt-4', x: MARKET.x + 22, z: MARKET.z + 33, rotY: Math.PI },
    { id: 'pkl-mkt-5', x: MARKET.x - 12, z: MARKET.z + 33, rotY: Math.PI },
    { id: 'pkl-mkt-6', x: MARKET.x + 33, z: MARKET.z + 4, rotY: -Math.PI / 2 },
    // Stasiun (-50, 150)
    { id: 'pkl-stn-1', x: -50 - 18, z: 150 - 38, rotY: 0 },
    { id: 'pkl-stn-2', x: -50 + 18, z: 150 - 38, rotY: 0 },
    // Sekolah (-150, -150)
    { id: 'pkl-sch-1', x: -150 - 14, z: -150 + 38, rotY: Math.PI },
    { id: 'pkl-sch-2', x: -150 + 14, z: -150 + 38, rotY: Math.PI },
    // Masjid Raya (50, -150)
    { id: 'pkl-msq-1', x: 50 - 20, z: -150 + 38, rotY: Math.PI },
    { id: 'pkl-msq-2', x: 50 + 20, z: -150 + 38, rotY: Math.PI },
    // Taman Kota (50, 50) corners
    { id: 'pkl-prk-1', x: PARK.x - 36, z: PARK.z - 36, rotY: Math.PI / 4 },
    { id: 'pkl-prk-2', x: PARK.x + 36, z: PARK.z + 36, rotY: -Math.PI * 0.75 },
    // Jalan Ruko & Apartemen (di tepi luar jalur pejalan kaki 8.15m)
    { id: 'pkl-ruk-1', x: 200 + 10.3, z: 140, rotY: -Math.PI / 2 },
    { id: 'pkl-apt-1', x: -200 - 10.3, z: -50, rotY: Math.PI / 2 },
  ];

  const vendors: VendorStallSpec[] = vendorSpots.map((sp, i) => ({
    id: sp.id,
    x: sp.x,
    y: SIDEWALK_H,
    z: sp.z,
    rotY: sp.rotY,
    cartColor: pick(CART_COLORS),
    umbrellaColor: pick(UMBRELLA_COLORS),
    vendorShirt: pick(SHIRT_COLORS),
    vendorSkin: pick(SKIN_COLORS),
    hasHijab: rnd() < 0.35,
    customerCount: i % 2 === 0 ? 2 : 1,
    customerShirt: pick(SHIRT_COLORS),
    seed: 900 + i * 17,
  }));

  // Precompute deterministic sidewalk walker positions with zebra crossing waits
  const dt = 0.25;
  const duration = 440;
  const steps = Math.floor(duration / dt) + 1;
  const count = walkers.length;
  const walkerUBuf = new Float32Array(steps * count);
  const walkerMovingBuf = new Uint8Array(steps * count);
  const curU = new Float64Array(count);
  walkers.forEach((w, i) => {
    curU[i] = w.initialU;
  });

  for (let s = 0; s < steps; s++) {
    const t = s * dt;
    const sig = signalState(t, 0);
    const base = s * count;

    for (let i = 0; i < count; i++) {
      walkerUBuf[base + i] = curU[i];
      if (s === steps - 1) continue;

      const w = walkers[i];
      // Walkers along X cross Z-roads: safe to cross when Z-road traffic is red
      // Walkers along Z cross X-roads: safe to cross when X-road traffic is red (and on z = -100 flyover is overhead, Z-road traffic still stops for crosswalks? Wait: flyover is along X at z=-100; ground X-road at z=-100 has no ground cars, only crosswalk!)
      const crossTrafficRed = w.axis === 'x' ? sig.z === 'red' : sig.x === 'red';

      let waitingAtCurb = false;
      if (!crossTrafficRed) {
        for (let m = 0; m < U_CROSS_STOPS.length; m++) {
          const d = (U_CROSS_STOPS[m] - curU[i] + WORLD_SIZE) % WORLD_SIZE;
          if (d >= 0 && d < 1.2) {
            waitingAtCurb = true;
            break;
          }
        }
      }

      // Avoid waiting directly under a ramp landing if any
      if (w.axis === 'z' && Math.abs(w.sidewalkCoord - FLYOVER.x0) < 2 && waitingAtCurb) {
        waitingAtCurb = false;
      }

      if (waitingAtCurb) {
        walkerMovingBuf[base + i] = 0;
      } else {
        walkerMovingBuf[base + i] = 1;
        curU[i] = (curU[i] + w.speed * dt) % WORLD_SIZE;
      }
    }
  }

  return {
    walkers,
    parkWalkers,
    commuters,
    vendors,
    dt,
    steps,
    duration,
    walkerUBuf,
    walkerMovingBuf,
  };
}

export interface PedestrianPose {
  x: number;
  y: number;
  z: number;
  rotY: number;
  moving: boolean;
  scale: number;
}

export function sampleWalkerPose(
  sim: PedestrianSimData,
  idx: number,
  time: number,
  out?: PedestrianPose
): PedestrianPose {
  const { walkers, dt, steps, duration, walkerUBuf, walkerMovingBuf } = sim;
  const w = walkers[idx];
  const count = walkers.length;
  const wrappedT = ((time % duration) + duration) % duration;
  const fStep = wrappedT / dt;
  const s0 = Math.min(steps - 2, Math.floor(fStep));
  const s1 = s0 + 1;
  const alpha = fStep - s0;

  let u0 = walkerUBuf[s0 * count + idx];
  let u1 = walkerUBuf[s1 * count + idx];
  if (u1 - u0 < -WORLD_SIZE * 0.5) u1 += WORLD_SIZE;
  const u = (u0 + (u1 - u0) * alpha) % WORLD_SIZE;
  const moving = walkerMovingBuf[s0 * count + idx] === 1;

  const along = w.dir === 1 ? -WORLD_SIZE / 2 + u : WORLD_SIZE / 2 - u;
  const x = w.axis === 'x' ? along : w.sidewalkCoord;
  const z = w.axis === 'x' ? w.sidewalkCoord : along;
  const rotY = w.axis === 'x' ? (w.dir === 1 ? Math.PI / 2 : -Math.PI / 2) : w.dir === 1 ? 0 : Math.PI;
  const edge = WORLD_SIZE / 2 - Math.abs(along);
  const scale = edge < 2 ? Math.max(0, edge / 2) : 1;

  // Step down slightly onto asphalt on crosswalks
  let onRoad = false;
  for (let i = 0; i < ROAD_LINES.length; i++) {
    if (Math.abs(along - ROAD_LINES[i]) < ROAD_WIDTH / 2) {
      onRoad = true;
      break;
    }
  }
  const y = onRoad ? 0.02 : SIDEWALK_H;

  if (out) {
    out.x = x;
    out.y = y;
    out.z = z;
    out.rotY = rotY;
    out.moving = moving;
    out.scale = scale;
    return out;
  }

  return { x, y, z, rotY, moving, scale };
}

export function sampleParkWalkerPose(p: ParkWalkerSpec, time: number, out?: PedestrianPose): PedestrianPose {
  const side = p.halfW * 2;
  const perim = side * 4;
  const dist = ((time * p.speed * p.dir + p.offset) % perim + perim) % perim;
  const seg = Math.floor(dist / side);
  const t = dist - seg * side;
  let x = p.cx;
  let z = p.cz;
  let rotY = 0;

  if (seg === 0) {
    x = p.cx - p.halfW + t;
    z = p.cz - p.halfW;
    rotY = p.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
  } else if (seg === 1) {
    x = p.cx + p.halfW;
    z = p.cz - p.halfW + t;
    rotY = p.dir === 1 ? 0 : Math.PI;
  } else if (seg === 2) {
    x = p.cx + p.halfW - t;
    z = p.cz + p.halfW;
    rotY = p.dir === 1 ? -Math.PI / 2 : Math.PI / 2;
  } else {
    x = p.cx - p.halfW;
    z = p.cz + p.halfW - t;
    rotY = p.dir === 1 ? Math.PI : 0;
  }

  if (out) {
    out.x = x;
    out.y = SIDEWALK_H;
    out.z = z;
    out.rotY = rotY;
    out.moving = true;
    out.scale = 1;
    return out;
  }

  return { x, y: SIDEWALK_H, z, rotY, moving: true, scale: 1 };
}
