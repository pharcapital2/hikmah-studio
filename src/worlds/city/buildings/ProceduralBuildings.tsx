import { memo, useMemo } from 'react';
import * as THREE from 'three';
import { Instances, lightsOn, seededRandom, type InstanceData, type TimeOfDay, type Weather } from '../../shared';
import { lots, SIDEWALK_H, type Lot } from '../layout';
import { CITY_PALETTE } from '../palette';

interface Props {
  timeOfDay: TimeOfDay;
  weather: Weather;
}

const pick = <T,>(arr: readonly T[], r: () => number) => arr[Math.floor(r() * arr.length)];

export const ProceduralBuildings = memo(function ProceduralBuildings({ timeOfDay, weather }: Props) {
  const lit = lightsOn(timeOfDay, weather);

  const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const cylGeo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 8), []);

  const matBody = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: false, roughness: 0.78 }), []);
  const matDarkMetal = useMemo(() => new THREE.MeshStandardMaterial({ color: '#454e59', roughness: 0.55, metalness: 0.4 }), []);
  const matAwning = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.85 }), []);
  const matRoof = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.88 }), []);

  const matWinWarm = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: lit ? CITY_PALETTE.windowWarm : CITY_PALETTE.glassDay,
        emissive: lit ? '#ffbe55' : '#000000',
        emissiveIntensity: lit ? 1.35 : 0,
        roughness: 0.25,
        metalness: 0.35,
      }),
    [lit],
  );
  const matWinCool = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: lit ? CITY_PALETTE.windowCool : CITY_PALETTE.glassDay,
        emissive: lit ? '#68c8ff' : '#000000',
        emissiveIntensity: lit ? 1.15 : 0,
        roughness: 0.25,
        metalness: 0.35,
      }),
    [lit],
  );
  const matWinDark = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: lit ? CITY_PALETTE.glassDark : '#5889a8',
        roughness: 0.2,
        metalness: 0.45,
      }),
    [lit],
  );

  const { bodies, trims, roofs, awnings, spires, winWarm, winCool, winDark } = useMemo(() => {
    const b: InstanceData[] = [];
    const tr: InstanceData[] = [];
    const rf: InstanceData[] = [];
    const aw: InstanceData[] = [];
    const sp: InstanceData[] = [];
    const ww: InstanceData[] = [];
    const wc: InstanceData[] = [];
    const wd: InstanceData[] = [];

    const pushWin = (
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
      r: () => number,
      warmBias = 0.45,
    ) => {
      const p = r();
      const target = p < warmBias ? ww : p < warmBias + 0.24 ? wc : wd;
      target.push({ position: [x, y, z], scale: [sx, sy, sz] });
    };

    const proceduralLots = lots.filter(
      (l): l is Lot => l.kind === 'skyscraper' || l.kind === 'office' || l.kind === 'apartment' || l.kind === 'ruko',
    );

    for (const lot of proceduralLots) {
      const r = seededRandom(lot.seed + 91);
      const y0 = SIDEWALK_H;

      if (lot.kind === 'skyscraper') {
        const col = pick(CITY_PALETTE.skyscrapers, r);
        const h1 = Math.min(14, lot.h * 0.14); // podium
        const h2 = lot.h * 0.68;               // main tower
        const h3 = lot.h - h1 - h2;            // crown tier
        b.push({ position: [lot.x, y0 + h1 / 2, lot.z], scale: [lot.w, h1, lot.d], color: col });
        b.push({ position: [lot.x, y0 + h1 + h2 / 2, lot.z], scale: [lot.w * 0.82, h2, lot.d * 0.82], color: col });
        b.push({ position: [lot.x, y0 + h1 + h2 + h3 / 2, lot.z], scale: [lot.w * 0.62, h3, lot.d * 0.62], color: col });

        // Rooftop spire / antenna + HVAC
        if (r() > 0.25) {
          const spireH = 8 + r() * 14;
          sp.push({ position: [lot.x, y0 + lot.h + spireH / 2, lot.z], scale: [0.35, spireH, 0.35] });
        }
        tr.push({ position: [lot.x + 1.8, y0 + lot.h + 0.9, lot.z - 1.5], scale: [2.4, 1.8, 2.2] });

        // Window bands on main tower
        const tw = lot.w * 0.82;
        const td = lot.d * 0.82;
        const stepY = 4.2;
        for (let wy = y0 + h1 + 2.6; wy < y0 + h1 + h2 - 2; wy += stepY) {
          for (const side of [-1, 1] as const) {
            pushWin(lot.x, wy, lot.z + side * (td / 2 + 0.06), tw * 0.84, 1.9, 0.1, r, 0.35);
            pushWin(lot.x + side * (tw / 2 + 0.06), wy, lot.z, 0.1, 1.9, td * 0.84, r, 0.35);
          }
        }
      } else if (lot.kind === 'office') {
        const col = pick(CITY_PALETTE.offices, r);
        b.push({ position: [lot.x, y0 + lot.h / 2, lot.z], scale: [lot.w, lot.h, lot.d], color: col });
        // Roof parapet & AC unit
        tr.push({ position: [lot.x, y0 + lot.h + 0.4, lot.z], scale: [lot.w * 0.94, 0.8, lot.d * 0.94] });
        tr.push({ position: [lot.x - lot.w * 0.2, y0 + lot.h + 1.4, lot.z], scale: [2.6, 1.4, 2.6] });

        for (let wy = y0 + 3.8; wy < y0 + lot.h - 2; wy += 4.0) {
          for (const side of [-1, 1] as const) {
            pushWin(lot.x, wy, lot.z + side * (lot.d / 2 + 0.06), lot.w * 0.82, 1.7, 0.1, r, 0.38);
            pushWin(lot.x + side * (lot.w / 2 + 0.06), wy, lot.z, 0.1, 1.7, lot.d * 0.82, r, 0.38);
          }
        }
      } else if (lot.kind === 'apartment') {
        const col = pick(CITY_PALETTE.apartments, r);
        b.push({ position: [lot.x, y0 + lot.h / 2, lot.z], scale: [lot.w, lot.h, lot.d], color: col });
        tr.push({ position: [lot.x + 2, y0 + lot.h + 1.1, lot.z + 2], scale: [2.2, 2.2, 2.2] });

        for (let wy = y0 + 3.4; wy < y0 + lot.h - 1.8; wy += 3.5) {
          // Horizontal balcony ledges
          tr.push({ position: [lot.x, wy - 1.1, lot.z + lot.d / 2 + 0.45], scale: [lot.w * 0.78, 0.22, 0.9] });
          tr.push({ position: [lot.x, wy - 1.1, lot.z - lot.d / 2 - 0.45], scale: [lot.w * 0.78, 0.22, 0.9] });

          const cols = 3;
          for (let c = 0; c < cols; c++) {
            const ox = (c - 1) * (lot.w * 0.27);
            pushWin(lot.x + ox, wy, lot.z + lot.d / 2 + 0.06, 2.2, 1.5, 0.1, r, 0.62);
            pushWin(lot.x + ox, wy, lot.z - lot.d / 2 - 0.06, 2.2, 1.5, 0.1, r, 0.62);
          }
        }
      } else {
        // Ruko (2-3 story shophouse)
        const col = pick(CITY_PALETTE.rukoWalls, r);
        const roofCol = pick(CITY_PALETTE.rukoRoofs, r);
        const awnCol = pick(CITY_PALETTE.marketTents, r);
        b.push({ position: [lot.x, y0 + lot.h / 2, lot.z], scale: [lot.w, lot.h, lot.d], color: col });
        // Pitched/stepped roof cap
        rf.push({ position: [lot.x, y0 + lot.h + 0.65, lot.z], scale: [lot.w + 0.8, 1.3, lot.d + 0.8], color: roofCol });

        // Front awning & storefront glass
        const frontZ = lot.facing === 2 ? -lot.d / 2 - 0.85 : lot.d / 2 + 0.85;
        aw.push({ position: [lot.x, y0 + 3.4, lot.z + frontZ], scale: [lot.w * 0.92, 0.25, 1.7], color: awnCol });
        const glassZ = lot.facing === 2 ? -lot.d / 2 - 0.06 : lot.d / 2 + 0.06;
        ww.push({ position: [lot.x, y0 + 1.8, lot.z + glassZ], scale: [lot.w * 0.76, 2.4, 0.1] });

        for (let wy = y0 + 5.6; wy < y0 + lot.h - 1.2; wy += 3.4) {
          pushWin(lot.x - lot.w * 0.22, wy, lot.z + glassZ, 2.0, 1.5, 0.1, r, 0.58);
          pushWin(lot.x + lot.w * 0.22, wy, lot.z + glassZ, 2.0, 1.5, 0.1, r, 0.58);
        }
      }
    }

    return {
      bodies: b,
      trims: tr,
      roofs: rf,
      awnings: aw,
      spires: sp,
      winWarm: ww,
      winCool: wc,
      winDark: wd,
    };
  }, []);

  return (
    <group name="city-procedural-buildings">
      <Instances geometry={boxGeo} material={matBody} instances={bodies} castShadow receiveShadow />
      <Instances geometry={boxGeo} material={matDarkMetal} instances={trims} receiveShadow />
      <Instances geometry={boxGeo} material={matRoof} instances={roofs} castShadow />
      <Instances geometry={boxGeo} material={matAwning} instances={awnings} />
      <Instances geometry={cylGeo} material={matDarkMetal} instances={spires} />
      <Instances geometry={boxGeo} material={matWinWarm} instances={winWarm} />
      <Instances geometry={boxGeo} material={matWinCool} instances={winCool} />
      <Instances geometry={boxGeo} material={matWinDark} instances={winDark} />
    </group>
  );
});
