import {
  FLYOVER,
  MARKET,
  PARK,
  ROAD_LINES,
  ROAD_WIDTH,
  SIDEWALK_H,
  busStops,
  intersections,
} from '../layout';
import { seededRandom } from '../../shared/seededRandom';
import { flyoverProfile } from '../vehicles/trafficSim';

export interface PropTransform {
  x: number;
  y: number;
  z: number;
  rotY: number;
  scale?: number;
}

export interface SignTransform extends PropTransform {
  kind: 'warning' | 'noParking' | 'speed' | 'school' | 'hospital' | 'crosswalk';
}

export interface CableSegment {
  mx: number;
  my: number;
  mz: number;
  rotY: number;
  tiltX: number;
  length: number;
}

export interface CityPropsLayout {
  streetlights: PropTransform[];
  trashBins: PropTransform[];
  hydrants: PropTransform[];
  signs: SignTransform[];
  benches: PropTransform[];
  bollards: PropTransform[];
  planters: PropTransform[];
  powerPoles: PropTransform[];
  transformers: PropTransform[];
  cables: CableSegment[];
}

function nearIntersection(coord: number, pad = 13): boolean {
  return ROAD_LINES.some((rl) => Math.abs(coord - rl) < pad);
}

function nearBusStop(x: number, z: number): boolean {
  return busStops.some((bs) => Math.hypot(x - bs.x, z - bs.z) < 7);
}

export function buildCityPropsLayout(): CityPropsLayout {
  const rnd = seededRandom(73319);

  const streetlights: PropTransform[] = [];
  const trashBins: PropTransform[] = [];
  const hydrants: PropTransform[] = [];
  const signs: SignTransform[] = [];
  const benches: PropTransform[] = [];
  const bollards: PropTransform[] = [];
  const planters: PropTransform[] = [];
  const powerPoles: PropTransform[] = [];
  const transformers: PropTransform[] = [];
  const cables: CableSegment[] = [];

  const hr = ROAD_WIDTH / 2; // 7.0
  const curbEdge = hr + 0.45; // 7.45 (streetlights, signs, hydrants)
  const outerWalk = hr + 2.55; // 9.55 (trash bins, benches, planters, poles - keeps 8.15m walkway clear)

  // 1. Streetlights along ground avenues
  const lampSamples = [-275, -245, -218, -180, -150, -120, -80, -50, -20, 20, 50, 80, 120, 150, 180, 218, 245, 275];
  for (const rl of ROAD_LINES) {
    for (const s of lampSamples) {
      if (nearIntersection(s, 14)) continue;

      // X-axis roads (skip center of z = -100 where flyover runs)
      if (rl !== FLYOVER.z) {
        if (!nearBusStop(s, rl + curbEdge)) {
          streetlights.push({ x: s, y: SIDEWALK_H, z: rl + curbEdge, rotY: Math.PI });
        }
        if (!nearBusStop(s, rl - curbEdge)) {
          streetlights.push({ x: s, y: SIDEWALK_H, z: rl - curbEdge, rotY: 0 });
        }
      }

      // Z-axis roads (skip directly under flyover ramp landing around z=-100 if x=+-200)
      if (!(Math.abs(s - FLYOVER.z) < 8 && Math.abs(rl) >= 190)) {
        if (!nearBusStop(rl + curbEdge, s)) {
          streetlights.push({ x: rl + curbEdge, y: SIDEWALK_H, z: s, rotY: -Math.PI / 2 });
        }
        if (!nearBusStop(rl - curbEdge, s)) {
          streetlights.push({ x: rl - curbEdge, y: SIDEWALK_H, z: s, rotY: Math.PI / 2 });
        }
      }
    }
  }

  // Ramp lamps on flyover approaches (RoadNetwork already places flat-deck lamps on -180..180)
  for (const fx of [-270, -240, -210, 210, 240, 270]) {
    const prof = flyoverProfile(fx);
    const halfW = FLYOVER.width / 2 - 0.35;
    streetlights.push({ x: fx, y: prof.y, z: FLYOVER.z + halfW, rotY: Math.PI, scale: 0.85 });
    streetlights.push({ x: fx, y: prof.y, z: FLYOVER.z - halfW, rotY: 0, scale: 0.85 });
  }

  // 2. Intersection corners: bollards, hydrants, traffic signs, trash bins
  intersections.forEach(({ x, z }, idx) => {
    const cornerOff = hr + 0.6;
    // Bollards at central & commercial intersections
    if (Math.abs(x) <= 100 && Math.abs(z) <= 100) {
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          bollards.push({ x: x + sx * cornerOff, y: SIDEWALK_H, z: z + sz * cornerOff, rotY: 0 });
          bollards.push({ x: x + sx * (cornerOff + 1.1), y: SIDEWALK_H, z: z + sz * cornerOff, rotY: 0 });
          bollards.push({ x: x + sx * cornerOff, y: SIDEWALK_H, z: z + sz * (cornerOff + 1.1), rotY: 0 });
        }
      }
    }

    // Fire hydrants on alternating corners
    const hx = x + (idx % 2 === 0 ? 1 : -1) * (hr + 1.1);
    const hz = z + (idx % 3 === 0 ? 1 : -1) * (hr + 2.4);
    hydrants.push({ x: hx, y: SIDEWALK_H, z: hz, rotY: 0 });

    // Traffic signs approaching intersection
    signs.push({
      x: x - 14,
      y: SIDEWALK_H,
      z: z + curbEdge,
      rotY: -Math.PI / 2,
      kind: idx % 3 === 0 ? 'crosswalk' : idx % 2 === 0 ? 'speed' : 'warning',
    });
    signs.push({
      x: x + curbEdge,
      y: SIDEWALK_H,
      z: z + 14,
      rotY: 0,
      kind: idx % 2 === 0 ? 'noParking' : 'crosswalk',
    });

    // Trash bins near corners
    trashBins.push({
      x: x + (idx % 2 === 0 ? -12 : 12),
      y: SIDEWALK_H,
      z: z + outerWalk,
      rotY: Math.PI,
    });
  });

  // Special zone signs (School Zone, Hospital, Flyover clearance)
  signs.push(
    { x: -150, y: SIDEWALK_H, z: -100 - curbEdge, rotY: 0, kind: 'school' },
    { x: -100 - curbEdge, y: SIDEWALK_H, z: -150, rotY: Math.PI / 2, kind: 'school' },
    { x: 150, y: SIDEWALK_H, z: -100 + curbEdge, rotY: Math.PI, kind: 'hospital' },
    { x: 100 + curbEdge, y: SIDEWALK_H, z: -50, rotY: -Math.PI / 2, kind: 'hospital' },
    { x: FLYOVER.x0 - 6, y: SIDEWALK_H, z: FLYOVER.z + curbEdge, rotY: -Math.PI / 2, kind: 'warning' },
    { x: FLYOVER.x1 + 6, y: SIDEWALK_H, z: FLYOVER.z - curbEdge, rotY: Math.PI / 2, kind: 'warning' }
  );

  // 3. Bus stop trash bins (BusHalte in Landmarks already provides the shelter bench)
  busStops.forEach((bs) => {
    const fx = Math.sin(bs.rotY);
    const fz = Math.cos(bs.rotY);
    const rx = fz;
    const rz = -fx;
    trashBins.push({
      x: bs.x + rx * 4.4,
      y: SIDEWALK_H,
      z: bs.z + rz * 4.4,
      rotY: bs.rotY,
    });
  });

  // 4. Central Park (50, 50) perimeter benches, trash bins, hydrants
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    const off = i * 13;
    benches.push(
      { x: PARK.x + off, y: SIDEWALK_H, z: PARK.z - 36, rotY: 0 },
      { x: PARK.x + off, y: SIDEWALK_H, z: PARK.z + 36, rotY: Math.PI },
      { x: PARK.x - 36, y: SIDEWALK_H, z: PARK.z + off, rotY: Math.PI / 2 },
      { x: PARK.x + 36, y: SIDEWALK_H, z: PARK.z + off, rotY: -Math.PI / 2 }
    );
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      trashBins.push({ x: PARK.x + sx * 29, y: SIDEWALK_H, z: PARK.z + sz * 29, rotY: 0 });
      hydrants.push({ x: PARK.x + sx * 38, y: SIDEWALK_H, z: PARK.z + sz * 38, rotY: 0 });
    }
  }

  // Market (-150, 50) trash bins & bollards
  for (const sx of [-1, 1]) {
    trashBins.push({ x: MARKET.x + sx * 24, y: SIDEWALK_H, z: MARKET.z, rotY: sx > 0 ? -Math.PI / 2 : Math.PI / 2 });
    trashBins.push({ x: MARKET.x, y: SIDEWALK_H, z: MARKET.z + sx * 24, rotY: sx > 0 ? Math.PI : 0 });
  }

  // 5. Sidewalk benches & planters along main avenues (x=0, z=0, x=100, z=100)
  const walkSpots = [-260, -230, -170, -135, -65, -35, 35, 65, 135, 170, 230, 260];
  for (const rl of [-100, 0, 100]) {
    for (const s of walkSpots) {
      if (nearIntersection(s, 16)) continue;
      if (rl !== FLYOVER.z && rnd() < 0.65) {
        const side = rnd() < 0.5 ? 1 : -1;
        if (!nearBusStop(s, rl + side * outerWalk)) {
          planters.push({ x: s, y: SIDEWALK_H, z: rl + side * outerWalk, rotY: 0 });
        }
      }
      if (rnd() < 0.45 && !nearBusStop(rl + outerWalk, s)) {
        benches.push({
          x: rl + outerWalk,
          y: SIDEWALK_H,
          z: s,
          rotY: -Math.PI / 2,
        });
      }
    }
  }

  // 6. Power poles & sagging overhead cables along outer & secondary corridors
  const addPoleLine = (points: Array<[number, number]>, rotY: number) => {
    const wireOffsets = [-0.95, 0, 0.95];
    const poleTopY = SIDEWALK_H + 8.1;
    for (let i = 0; i < points.length; i++) {
      const [px, pz] = points[i];
      powerPoles.push({ x: px, y: SIDEWALK_H, z: pz, rotY });
      if (i % 4 === 1) {
        transformers.push({ x: px, y: SIDEWALK_H + 6.4, z: pz, rotY });
      }
      if (i < points.length - 1) {
        const [nx, nz] = points[i + 1];
        const dist = Math.hypot(nx - px, nz - pz);
        if (dist > 65) continue; // skip huge gaps across intersections if split
        // Skip cable span crossing FLYOVER.z (-100) so overhead wires never slice through flyover deck
        if (Math.abs(nx - px) < 1 && Math.min(pz, nz) <= FLYOVER.z + 10 && Math.max(pz, nz) >= FLYOVER.z - 10) {
          continue;
        }

        const dirAngle = Math.atan2(nx - px, nz - pz);
        const rx = Math.cos(rotY);
        const rz = -Math.sin(rotY);

        for (const wOff of wireOffsets) {
          const ax = px + rx * wOff;
          const az = pz + rz * wOff;
          const bx = nx + rx * wOff;
          const bz = nz + rz * wOff;
          const segs = 4;
          const sag = Math.min(0.85, dist * 0.022);
          for (let k = 0; k < segs; k++) {
            const t0 = k / segs;
            const t1 = (k + 1) / segs;
            const x0 = ax + (bx - ax) * t0;
            const z0 = az + (bz - az) * t0;
            const y0 = poleTopY - sag * 4 * t0 * (1 - t0);
            const x1 = ax + (bx - ax) * t1;
            const z1 = az + (bz - az) * t1;
            const y1 = poleTopY - sag * 4 * t1 * (1 - t1);

            const dx = x1 - x0;
            const dy = y1 - y0;
            const dz = z1 - z0;
            const len = Math.hypot(dx, dy, dz);
            const horiz = Math.hypot(dx, dz);
            cables.push({
              mx: (x0 + x1) * 0.5,
              my: (y0 + y1) * 0.5,
              mz: (z0 + z1) * 0.5,
              rotY: dirAngle,
              tiltX: -Math.atan2(dy, horiz),
              length: len,
            });
          }
        }
      }
    }
  };

  const poleCoords = [-280, -240, -175, -135, -75, -30, 30, 75, 135, 175, 240, 280];
  for (const rl of [-200, 200]) {
    addPoleLine(
      poleCoords.map((c) => [c, rl + outerWalk] as [number, number]),
      0
    );
    addPoleLine(
      poleCoords.map((c) => [rl - outerWalk, c] as [number, number]),
      Math.PI / 2
    );
  }
  // Secondary corridor along z = 100
  addPoleLine(
    poleCoords.map((c) => [c, 100 - outerWalk] as [number, number]),
    0
  );

  return {
    streetlights,
    trashBins,
    hydrants,
    signs,
    benches,
    bollards,
    planters,
    powerPoles,
    transformers,
    cables,
  };
}
