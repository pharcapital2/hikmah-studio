import {
  FLYOVER,
  ROAD_LINES,
  ROAD_WIDTH,
  WORLD_SIZE,
  busStops,
  laneOffset,
  signalState,
} from '../layout';
import { seededRandom } from '../../shared/seededRandom';

export type VehicleKind =
  | 'sedan'
  | 'suv'
  | 'angkot'
  | 'bus'
  | 'truck'
  | 'taxi'
  | 'motorcycle'
  | 'bicycle';

export interface VehicleSpec {
  id: number;
  kind: VehicleKind;
  axis: 'x' | 'z';
  roadCoord: number;
  dir: 1 | -1;
  lane: 0 | 1;
  isFlyover: boolean;
  isBikeLane: boolean;
  lateralOffset: number;
  maxSpeed: number;
  length: number;
  width: number;
  height: number;
  wheelRadius: number;
  color: string;
  secondaryColor: string;
  initialU: number;
  laneIndex: number;
}

export interface TrafficSimData {
  vehicles: VehicleSpec[];
  dt: number;
  steps: number;
  duration: number;
  /** Flattened [step * count + i] buffers for O(1) deterministic lookup */
  uBuf: Float32Array;
  distBuf: Float32Array;
  speedBuf: Float32Array;
  brakeBuf: Uint8Array;
}

export interface VehicleFrameState {
  x: number;
  y: number;
  z: number;
  rotY: number;
  pitch: number;
  wheelAngle: number;
  braking: boolean;
  speed: number;
  visibleScale: number;
}

const SEDAN_COLORS = ['#dce2e8', '#2c3e50', '#7f1d1d', '#1e3a5f', '#4b5563', '#0f766e', '#9ca3af'];
const SUV_COLORS = ['#1f2937', '#e5e7eb', '#374151', '#3f6212', '#7c2d12', '#1e293b'];
const TRUCK_BOX_COLORS = ['#f3f4f6', '#e2e8f0', '#dbeafe', '#fef3c7'];
const TRUCK_CAB_COLORS = ['#ea580c', '#1d4ed8', '#047857', '#f8fafc', '#b91c1c'];
const MOTO_COLORS = ['#111827', '#dc2626', '#2563eb', '#e5e7eb', '#059669'];
const BIKE_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#6366f1'];

const VEHICLE_DIMS: Record<VehicleKind, { l: number; w: number; h: number; wr: number; v: [number, number] }> = {
  sedan: { l: 4.3, w: 1.75, h: 1.45, wr: 0.34, v: [11.5, 14.5] },
  taxi: { l: 4.3, w: 1.75, h: 1.48, wr: 0.34, v: [11.5, 14.0] },
  suv: { l: 4.6, w: 1.9, h: 1.75, wr: 0.39, v: [11.0, 14.0] },
  angkot: { l: 4.0, w: 1.7, h: 1.95, wr: 0.32, v: [9.5, 11.5] },
  bus: { l: 9.2, w: 2.4, h: 3.1, wr: 0.5, v: [8.5, 10.5] },
  truck: { l: 7.0, w: 2.3, h: 3.15, wr: 0.48, v: [8.0, 10.2] },
  motorcycle: { l: 2.0, w: 0.72, h: 1.15, wr: 0.28, v: [12.5, 15.5] },
  bicycle: { l: 1.75, w: 0.55, h: 1.05, wr: 0.33, v: [4.2, 5.6] },
};

const STOP_HALF = ROAD_WIDTH / 2 + 5.6; // 12.6m from intersection center (behind 12.2m stop line & 8.5m crosswalk)
const U_STOP_LINES = ROAD_LINES.map((c) => c + WORLD_SIZE / 2 - STOP_HALF); // [90.8, 190.8, 290.8, 390.8, 490.8]

/** Flyover elevation and slope pitch at world X (along z = FLYOVER.z).
 *  Matches RoadNetwork.tsx: flat deck across [-200, 200], sloped ramps [-295, -200] & [200, 295]. */
export function flyoverProfile(x: number): { y: number; slope: number } {
  const { x0, x1, deckY, rampLength } = FLYOVER;
  const deckStart = x0 + rampLength; // -200
  const deckEnd = x1 - rampLength;   // +200
  if (x <= x0 || x >= x1) return { y: 0, slope: 0 };
  if (x < deckStart) {
    const t = (x - x0) / rampLength;
    return { y: deckY * t, slope: Math.atan2(deckY, rampLength) };
  }
  if (x <= deckEnd) return { y: deckY, slope: 0 };
  const t = (x1 - x) / rampLength;
  return { y: deckY * t, slope: -Math.atan2(deckY, rampLength) };
}

function buildVehicleSpecs(): VehicleSpec[] {
  const rnd = seededRandom(88421);
  const specs: VehicleSpec[] = [];
  let id = 0;
  let laneIndex = 0;

  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

  const addLaneVehicles = (
    axis: 'x' | 'z',
    roadCoord: number,
    dir: 1 | -1,
    lane: 0 | 1,
    count: number,
    kinds: VehicleKind[],
    opts?: { isFlyover?: boolean; isBikeLane?: boolean }
  ) => {
    const thisLane = laneIndex++;
    const stepU = WORLD_SIZE / count;
    for (let k = 0; k < count; k++) {
      const kind = pick(kinds);
      const d = VEHICLE_DIMS[kind];
      const maxSpeed = d.v[0] + rnd() * (d.v[1] - d.v[0]);
      const jitter = (rnd() - 0.5) * stepU * 0.45;
      const initialU = ((k * stepU + jitter + rnd() * 20) % WORLD_SIZE + WORLD_SIZE) % WORLD_SIZE;

      let color = '#e5e7eb';
      let secondaryColor = '#374151';
      if (kind === 'sedan') color = pick(SEDAN_COLORS);
      else if (kind === 'suv') color = pick(SUV_COLORS);
      else if (kind === 'taxi') {
        color = rnd() < 0.65 ? '#2563eb' : '#facc15';
        secondaryColor = '#fef08a';
      } else if (kind === 'angkot') {
        color = rnd() < 0.7 ? '#0d9488' : '#0284c7';
        secondaryColor = '#f8fafc';
      } else if (kind === 'bus') {
        color = rnd() < 0.6 ? '#1d4ed8' : '#ea580c';
        secondaryColor = '#f8fafc';
      } else if (kind === 'truck') {
        color = pick(TRUCK_CAB_COLORS);
        secondaryColor = pick(TRUCK_BOX_COLORS);
      } else if (kind === 'motorcycle') {
        color = pick(MOTO_COLORS);
        secondaryColor = pick(SEDAN_COLORS);
      } else {
        color = pick(BIKE_COLORS);
        secondaryColor = pick(SEDAN_COLORS);
      }

      const lateralOffset =
        kind === 'motorcycle' ? (rnd() - 0.5) * 0.9 : (rnd() - 0.5) * 0.25;

      specs.push({
        id: id++,
        kind,
        axis,
        roadCoord,
        dir,
        lane,
        isFlyover: Boolean(opts?.isFlyover),
        isBikeLane: Boolean(opts?.isBikeLane),
        lateralOffset,
        maxSpeed,
        length: d.l,
        width: d.w,
        height: d.h,
        wheelRadius: d.wr,
        color,
        secondaryColor,
        initialU,
        laneIndex: thisLane,
      });
    }
  };

  // Ground X-axis roads (skip z = -100 ground because flyover occupies center of z = -100)
  for (const rz of ROAD_LINES) {
    if (rz === FLYOVER.z) continue;
    const density = rz === 0 ? 5 : 3;
    for (const dir of [1, -1] as const) {
      addLaneVehicles('x', rz, dir, 0, density, ['sedan', 'taxi', 'suv', 'motorcycle']);
      addLaneVehicles('x', rz, dir, 1, density, ['angkot', 'bus', 'truck', 'sedan', 'motorcycle']);
      if (rz === 0 || rz === 100) {
        addLaneVehicles('x', rz, dir, 1, 2, ['bicycle'], { isBikeLane: true });
      }
    }
  }

  // Ground Z-axis roads (all 5 lines cross under flyover safely at 7.36m-9m clearance)
  for (const rx of ROAD_LINES) {
    const density = rx === 0 ? 5 : 3;
    for (const dir of [1, -1] as const) {
      addLaneVehicles('z', rx, dir, 0, density, ['sedan', 'taxi', 'suv', 'motorcycle']);
      addLaneVehicles('z', rx, dir, 1, density, ['angkot', 'bus', 'truck', 'sedan', 'motorcycle']);
      if (rx === 0 || rx === -100) {
        addLaneVehicles('z', rx, dir, 1, 2, ['bicycle'], { isBikeLane: true });
      }
    }
  }

  // Flyover lanes along X at z = FLYOVER.z
  for (const dir of [1, -1] as const) {
    addLaneVehicles('x', FLYOVER.z, dir, 0, 4, ['sedan', 'taxi', 'suv', 'bus', 'motorcycle'], {
      isFlyover: true,
    });
  }

  return specs;
}

/** Pre-compute deterministic traffic simulation over [0, 440s] (10 signal cycles). */
export function buildTrafficSimulation(): TrafficSimData {
  const vehicles = buildVehicleSpecs();
  const count = vehicles.length;
  const dt = 0.2;
  const duration = 440; // 10 * 44s signal cycles
  const steps = Math.floor(duration / dt) + 1;

  const uBuf = new Float32Array(steps * count);
  const distBuf = new Float32Array(steps * count);
  const speedBuf = new Float32Array(steps * count);
  const brakeBuf = new Uint8Array(steps * count);

  const curU = new Float64Array(count);
  const curDist = new Float64Array(count);
  const curV = new Float64Array(count);

  // Group vehicle indices by laneIndex
  const lanes: number[][] = [];
  vehicles.forEach((v, idx) => {
    curU[idx] = v.initialU;
    curV[idx] = v.isFlyover ? v.maxSpeed * 0.8 : v.maxSpeed * 0.5;
    if (!lanes[v.laneIndex]) lanes[v.laneIndex] = [];
    lanes[v.laneIndex].push(idx);
  });

  // Bus stop U coordinates along matching lanes
  const busStopUs = busStops.map((bs) => {
    const onX = Math.abs(bs.z) < 20; // halte-1, halte-2 on z=0; halte-3, halte-4 on x=0
    const axis: 'x' | 'z' = onX ? 'x' : 'z';
    const dir: 1 | -1 = onX ? (bs.z > 0 ? 1 : -1) : bs.x > 0 ? 1 : -1;
    const coord = onX ? bs.x : bs.z;
    const u = dir === 1 ? coord + WORLD_SIZE / 2 : WORLD_SIZE / 2 - coord;
    return { axis, dir, u };
  });

  const subDt = dt / 2;

  for (let s = 0; s < steps; s++) {
    const t = s * dt;
    const sig = signalState(t, 0);
    const base = s * count;

    for (let i = 0; i < count; i++) {
      uBuf[base + i] = curU[i];
      distBuf[base + i] = curDist[i];
      speedBuf[base + i] = curV[i];
    }

    if (s === steps - 1) break;

    for (let sub = 0; sub < 2; sub++) {
      const subT = t + sub * subDt;
      const subSig = sub === 0 ? sig : signalState(subT, 0);

      for (const laneIds of lanes) {
        // Sort vehicles in lane by u ascending to quickly locate leader ahead
        laneIds.sort((a, b) => curU[a] - curU[b]);
        const n = laneIds.length;

        for (let k = 0; k < n; k++) {
          const i = laneIds[k];
          const spec = vehicles[i];
          const leadIdx = laneIds[(k + 1) % n];

          let gapAhead = 999;
          let leadSpeed = spec.maxSpeed;
          if (n > 1) {
            const rawDiff = (curU[leadIdx] - curU[i] + WORLD_SIZE) % WORLD_SIZE;
            gapAhead = rawDiff - (vehicles[leadIdx].length + spec.length) * 0.5;
            leadSpeed = curV[leadIdx];
          }

          // Check red/yellow traffic light ahead (flyover skips ground signals)
          let stopGap = 999;
          if (!spec.isFlyover) {
            const phase = spec.axis === 'x' ? subSig.x : subSig.z;
            if (phase !== 'green') {
              const frontU = curU[i] + spec.length * 0.5;
              for (let m = 0; m < U_STOP_LINES.length; m++) {
                const d = (U_STOP_LINES[m] - frontU + WORLD_SIZE) % WORLD_SIZE;
                // Stop on red, or on yellow if there is comfortable stopping distance
                const shouldStop =
                  phase === 'red' ? d < 50 : d > Math.max(4, curV[i] * 1.1) && d < 45;
                if (shouldStop && d < stopGap) {
                  stopGap = d;
                }
              }
            }
          }

          // Optional brief bus/angkot dwell at bus stops
          let atStop = false;
          if ((spec.kind === 'bus' || spec.kind === 'angkot') && !spec.isFlyover) {
            for (const bs of busStopUs) {
              if (bs.axis === spec.axis && bs.dir === spec.dir) {
                const distToStop = Math.abs(curU[i] - bs.u);
                if (distToStop < 2.2) {
                  // Dwell periodically for 4s every 44s cycle window
                  const cycleMod = subT % 44;
                  if (cycleMod > 6 && cycleMod < 10) {
                    atStop = true;
                  }
                }
              }
            }
          }

          let effGap = gapAhead;
          let effLeadV = leadSpeed;
          if (stopGap < effGap) {
            effGap = stopGap;
            effLeadV = 0;
          }
          if (atStop) {
            effGap = Math.min(effGap, 0.3);
            effLeadV = 0;
          }

          // IDM-inspired smooth acceleration
          const v = curV[i];
          const v0 = spec.maxSpeed;
          const aMax = spec.kind === 'motorcycle' ? 3.4 : spec.kind === 'bus' || spec.kind === 'truck' ? 1.8 : 2.6;
          const bComf = 3.2;
          const minGap = 2.0;
          const headway = 1.1;
          const dv = v - effLeadV;
          const sStar = minGap + Math.max(0, v * headway + (v * dv) / (2 * Math.sqrt(aMax * bComf)));
          const safeGap = Math.max(0.08, effGap);
          let accel = aMax * (1 - Math.pow(v / v0, 4) - Math.pow(sStar / safeGap, 2));
          accel = Math.max(-6.5, Math.min(aMax, accel));

          const nextV = Math.max(0, Math.min(v0, v + accel * subDt));
          const stepDist = ((v + nextV) * 0.5) * subDt;

          curV[i] = nextV;
          curDist[i] += stepDist;
          curU[i] = (curU[i] + stepDist) % WORLD_SIZE;

          if (sub === 1) {
            brakeBuf[(s + 1) * count + i] = accel < -0.6 || (nextV < 0.4 && stopGap < 8) ? 1 : 0;
          }
        }
      }
    }
  }

  return { vehicles, dt, steps, duration, uBuf, distBuf, speedBuf, brakeBuf };
}

/** Sample deterministic world transform & wheel rotation for vehicle `idx` at `time`. */
export function sampleVehicleState(
  sim: TrafficSimData,
  idx: number,
  time: number,
  out?: VehicleFrameState
): VehicleFrameState {
  const { vehicles, dt, steps, duration, uBuf, distBuf, speedBuf, brakeBuf } = sim;
  const spec = vehicles[idx];
  const count = vehicles.length;

  const wrappedT = ((time % duration) + duration) % duration;
  const fStep = wrappedT / dt;
  const s0 = Math.min(steps - 2, Math.floor(fStep));
  const s1 = s0 + 1;
  const alpha = fStep - s0;

  const i0 = s0 * count + idx;
  const i1 = s1 * count + idx;

  let u0 = uBuf[i0];
  let u1 = uBuf[i1];
  if (u1 - u0 < -WORLD_SIZE * 0.5) u1 += WORLD_SIZE;
  const u = (u0 + (u1 - u0) * alpha) % WORLD_SIZE;

  const dist = distBuf[i0] + (distBuf[i1] - distBuf[i0]) * alpha;
  const speed = speedBuf[i0] + (speedBuf[i1] - speedBuf[i0]) * alpha;
  const braking = brakeBuf[i0] === 1 || brakeBuf[i1] === 1;

  const along = spec.dir === 1 ? -WORLD_SIZE / 2 + u : WORLD_SIZE / 2 - u;
  const lat = spec.isFlyover
    ? spec.dir * 2.8 + spec.lateralOffset * 0.5
    : spec.isBikeLane
    ? laneOffset(1, spec.dir) + spec.dir * 1.35
    : spec.lane === 1
    ? laneOffset(1, spec.dir) - spec.dir * 0.45 + spec.lateralOffset * 0.6
    : laneOffset(spec.lane, spec.dir) + spec.lateralOffset;

  let x = 0;
  let z = 0;
  let rotY = 0;
  if (spec.axis === 'x') {
    x = along;
    z = spec.roadCoord + lat;
    rotY = spec.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    x = spec.roadCoord + lat;
    z = along;
    rotY = spec.dir === 1 ? 0 : Math.PI;
  }

  let y = 0;
  let pitch = 0;
  if (spec.isFlyover) {
    const prof = flyoverProfile(x);
    y = prof.y;
    // Vehicle local +Z faces forward; when dir = 1 (+X), positive pitch tilts nose down unless negated
    pitch = spec.dir === 1 ? -prof.slope : prof.slope;
  }

  // Smooth fade-out/in at world boundary +-300 so wrapping never pops in camera view
  const edgeDist = WORLD_SIZE / 2 - Math.abs(along);
  const visibleScale = edgeDist < 3 ? Math.max(0, edgeDist / 3) : 1;
  const wheelAngle = dist / spec.wheelRadius;

  if (out) {
    out.x = x;
    out.y = y;
    out.z = z;
    out.rotY = rotY;
    out.pitch = pitch;
    out.wheelAngle = wheelAngle;
    out.braking = braking;
    out.speed = speed;
    out.visibleScale = visibleScale;
    return out;
  }

  return {
    x,
    y,
    z,
    rotY,
    pitch,
    wheelAngle,
    braking,
    speed,
    visibleScale,
  };
}
