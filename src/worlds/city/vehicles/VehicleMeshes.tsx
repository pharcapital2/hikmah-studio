import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { TimeOfDay, Weather } from '../../shared/types';
import { lightsOn } from '../../shared/palette';
import { useWorldAnimation } from '../../shared/useWorldTime';
import {
  type TrafficSimData,
  type VehicleFrameState,
  type VehicleSpec,
  sampleVehicleState,
} from './trafficSim';

interface VehicleMeshesProps {
  sim: TrafficSimData;
  time?: number;
  timeOfDay: TimeOfDay;
  weather: Weather;
}

interface WheelMount {
  vehicleIdx: number;
  lx: number;
  ly: number;
  lz: number;
  radius: number;
  width: number;
}

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const COLOR_BRAKE = new THREE.Color('#ff3b30');
const COLOR_TAIL_NIGHT = new THREE.Color('#dc2626');
const COLOR_TAIL_DAY = new THREE.Color('#6b1414');

interface ColoredGeoPart {
  geo: THREE.BufferGeometry;
  color?: string;
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

function makeLimbSegment(
  a: [number, number, number],
  b: [number, number, number],
  rTop: number,
  rBot: number,
  radialSegs = 6
): THREE.CylinderGeometry {
  const pA = new THREE.Vector3(a[0], a[1], a[2]);
  const pB = new THREE.Vector3(b[0], b[1], b[2]);
  const dir = pB.clone().sub(pA);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(rTop, rBot, len, radialSegs);
  const mid = pA.addScaledVector(dir, 0.5);
  const quat = new THREE.Quaternion().setFromUnitVectors(Y_AXIS, dir.normalize());
  geo.applyQuaternion(quat);
  geo.translate(mid.x, mid.y, mid.z);
  return geo;
}

function getWheelMounts(vehicles: VehicleSpec[]): WheelMount[] {
  const mounts: WheelMount[] = [];
  vehicles.forEach((v, idx) => {
    const r = v.wheelRadius;
    if (v.kind === 'motorcycle' || v.kind === 'bicycle') {
      const zOff = v.length * 0.34;
      const w = v.kind === 'bicycle' ? 0.07 : 0.14;
      mounts.push(
        { vehicleIdx: idx, lx: 0, ly: r, lz: zOff, radius: r, width: w },
        { vehicleIdx: idx, lx: 0, ly: r, lz: -zOff, radius: r, width: w }
      );
      return;
    }
    const xOff = v.width * 0.48;
    const zFront = v.length * 0.31;
    const zRear = -v.length * 0.31;
    const w = v.kind === 'bus' || v.kind === 'truck' ? 0.28 : 0.22;
    mounts.push(
      { vehicleIdx: idx, lx: xOff, ly: r, lz: zFront, radius: r, width: w },
      { vehicleIdx: idx, lx: -xOff, ly: r, lz: zFront, radius: r, width: w },
      { vehicleIdx: idx, lx: xOff, ly: r, lz: zRear, radius: r, width: w },
      { vehicleIdx: idx, lx: -xOff, ly: r, lz: zRear, radius: r, width: w }
    );
  });
  return mounts;
}

export const VehicleMeshes = memo(function VehicleMeshes({
  sim,
  time,
  timeOfDay,
  weather,
}: VehicleMeshesProps) {
  const vehicles = sim.vehicles;
  const nightLights = lightsOn(timeOfDay, weather);

  const groups = useMemo(() => {
    const fourWheelers: number[] = [];
    const taxis: number[] = [];
    const angkots: number[] = [];
    const buses: number[] = [];
    const trucks: number[] = [];
    const motorcycles: number[] = [];
    const bicycles: number[] = [];

    vehicles.forEach((v, i) => {
      if (v.kind === 'taxi') taxis.push(i);
      else if (v.kind === 'angkot') angkots.push(i);
      else if (v.kind === 'bus') buses.push(i);
      else if (v.kind === 'truck') trucks.push(i);
      else if (v.kind === 'motorcycle') motorcycles.push(i);
      else if (v.kind === 'bicycle') bicycles.push(i);
      if (v.kind === 'sedan' || v.kind === 'suv' || v.kind === 'taxi') {
        fourWheelers.push(i);
      }
    });

    return {
      fourWheelers,
      taxis,
      angkots,
      buses,
      trucks,
      motorcycles,
      bicycles,
      wheels: getWheelMounts(vehicles),
      headlightVehicles: vehicles
        .map((v, i) => ({ v, i }))
        .filter(({ v }) => v.kind !== 'bicycle')
        .map(({ i }) => i),
    };
  }, [vehicles]);

  // Geometries (normalized 1x1x1 or unit primitives for clean instanced scaling)
  const geos = useMemo(() => {
    const wheel = new THREE.CylinderGeometry(1, 1, 1, 12);
    wheel.rotateZ(Math.PI / 2);
    const spoke = new THREE.BoxGeometry(1.06, 1.35, 0.22);
    const box = new THREE.BoxGeometry(1, 1, 1);
    const sphere = new THREE.SphereGeometry(0.5, 10, 8);

    // Low-poly chibi-stickman rider body (bell-dome torso + forward-reaching arms + seated legs)
    const riderPts: THREE.Vector2[] = [
      new THREE.Vector2(0.0, -0.25),
      new THREE.Vector2(0.15, -0.245),
      new THREE.Vector2(0.2, -0.2),
      new THREE.Vector2(0.195, -0.11),
      new THREE.Vector2(0.175, 0.0),
      new THREE.Vector2(0.15, 0.12),
      new THREE.Vector2(0.135, 0.2),
      new THREE.Vector2(0.085, 0.255),
      new THREE.Vector2(0.0, 0.28),
    ];
    const riderParts: ColoredGeoPart[] = [
      { geo: new THREE.LatheGeometry(riderPts, 12), color: '#ffffff' },
    ];
    for (const side of [-1, 1] as const) {
      // Forward-reaching stickman arm + round hand
      riderParts.push({
        geo: makeLimbSegment([side * 0.145, 0.18, 0.0], [side * 0.2, 0.04, 0.19], 0.022, 0.02, 6),
        color: '#111827',
      });
      riderParts.push({
        geo: makeLimbSegment([side * 0.2, 0.04, 0.19], [side * 0.21, 0.0, 0.42], 0.02, 0.018, 6),
        color: '#111827',
      });
      const hand = new THREE.SphereGeometry(0.038, 6, 5);
      hand.translate(side * 0.21, 0.0, 0.42);
      riderParts.push({ geo: hand, color: '#111827' });

      // Seated stickman leg + oval shoe
      riderParts.push({
        geo: makeLimbSegment([side * 0.12, -0.18, 0.0], [side * 0.22, -0.27, 0.22], 0.026, 0.023, 6),
        color: '#111827',
      });
      riderParts.push({
        geo: makeLimbSegment([side * 0.22, -0.27, 0.22], [side * 0.21, -0.58, 0.14], 0.023, 0.02, 6),
        color: '#111827',
      });
      const shoe = new THREE.SphereGeometry(0.042, 6, 5);
      shoe.scale(1.0, 0.55, 1.6);
      shoe.translate(side * 0.21, -0.59, 0.165);
      riderParts.push({ geo: shoe, color: '#111827' });
    }
    const riderBody = mergeColoredGeos(riderParts);

    return { wheel, spoke, box, sphere, riderBody };
  }, []);

  // Refs for instanced meshes
  const body4Ref = useRef<THREE.InstancedMesh>(null);
  const cabin4Ref = useRef<THREE.InstancedMesh>(null);
  const glass4Ref = useRef<THREE.InstancedMesh>(null);
  const taxiSignRef = useRef<THREE.InstancedMesh>(null);

  const angkotBodyRef = useRef<THREE.InstancedMesh>(null);
  const angkotRoofRef = useRef<THREE.InstancedMesh>(null);
  const angkotGlassRef = useRef<THREE.InstancedMesh>(null);

  const busBodyRef = useRef<THREE.InstancedMesh>(null);
  const busStripeRef = useRef<THREE.InstancedMesh>(null);
  const busGlassRef = useRef<THREE.InstancedMesh>(null);

  const truckCabRef = useRef<THREE.InstancedMesh>(null);
  const truckBoxRef = useRef<THREE.InstancedMesh>(null);
  const truckGlassRef = useRef<THREE.InstancedMesh>(null);

  const motoFrameRef = useRef<THREE.InstancedMesh>(null);
  const motoRiderRef = useRef<THREE.InstancedMesh>(null);
  const motoHelmetRef = useRef<THREE.InstancedMesh>(null);

  const bikeFrameRef = useRef<THREE.InstancedMesh>(null);
  const bikeRiderRef = useRef<THREE.InstancedMesh>(null);
  const bikeHeadRef = useRef<THREE.InstancedMesh>(null);

  const wheelRef = useRef<THREE.InstancedMesh>(null);
  const spokeRef = useRef<THREE.InstancedMesh>(null);
  const headlightRef = useRef<THREE.InstancedMesh>(null);
  const taillightRef = useRef<THREE.InstancedMesh>(null);

  const scratch = useMemo(
    () => ({
      obj: new THREE.Object3D(),
      euler: new THREE.Euler(0, 0, 0, 'YXZ'),
      qVeh: new THREE.Quaternion(),
      qWheel: new THREE.Quaternion(),
      qFinal: new THREE.Quaternion(),
      localPos: new THREE.Vector3(),
      color: new THREE.Color(),
    }),
    []
  );

  const states = useMemo<VehicleFrameState[]>(
    () =>
      vehicles.map(() => ({
        x: 0,
        y: 0,
        z: 0,
        rotY: 0,
        pitch: 0,
        wheelAngle: 0,
        braking: false,
        speed: 0,
        visibleScale: 1,
      })),
    [vehicles]
  );

  // Assign static colors once when vehicle list is ready
  useLayoutEffect(() => {
    const c = scratch.color;
    const setColors = (
      mesh: THREE.InstancedMesh | null,
      indices: number[],
      pickColor: (v: VehicleSpec) => string
    ) => {
      if (!mesh) return;
      indices.forEach((vi, slot) => {
        mesh.setColorAt(slot, c.set(pickColor(vehicles[vi])));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };

    setColors(body4Ref.current, groups.fourWheelers, (v) => v.color);
    setColors(angkotBodyRef.current, groups.angkots, (v) => v.color);
    setColors(busBodyRef.current, groups.buses, (v) => v.color);
    setColors(truckCabRef.current, groups.trucks, (v) => v.color);
    setColors(truckBoxRef.current, groups.trucks, (v) => v.secondaryColor);
    setColors(motoFrameRef.current, groups.motorcycles, (v) => v.color);
    setColors(motoRiderRef.current, groups.motorcycles, (v) => v.secondaryColor);
    setColors(bikeFrameRef.current, groups.bicycles, (v) => v.color);
    setColors(bikeRiderRef.current, groups.bicycles, (v) => v.secondaryColor);
  }, [groups, vehicles, scratch]);

  // Update transforms deterministically via `useWorldAnimation` (zero per-frame React re-renders)
  useWorldAnimation(
    time,
    (t) => {
      for (let i = 0; i < vehicles.length; i++) {
        sampleVehicleState(sim, i, t, states[i]);
      }
      const { obj, euler, qVeh, qWheel, qFinal, localPos } = scratch;

      const placePart = (
        mesh: THREE.InstancedMesh | null,
        slot: number,
        vIdx: number,
        lx: number,
        ly: number,
        lz: number,
        sx: number,
        sy: number,
        sz: number,
        extraPitch = 0
      ) => {
        if (!mesh) return;
        const st = states[vIdx];
        const sc = st.visibleScale;
        euler.set(st.pitch, st.rotY, 0, 'YXZ');
        qVeh.setFromEuler(euler);
        localPos.set(lx * sc, ly * sc, lz * sc).applyQuaternion(qVeh);
        obj.position.set(st.x + localPos.x, st.y + localPos.y, st.z + localPos.z);
        if (extraPitch !== 0) {
          qWheel.setFromAxisAngle(X_AXIS, extraPitch);
          qFinal.multiplyQuaternions(qVeh, qWheel);
          obj.quaternion.copy(qFinal);
        } else {
          obj.quaternion.copy(qVeh);
        }
        obj.scale.set(sx * sc, sy * sc, sz * sc);
        obj.updateMatrix();
        mesh.setMatrixAt(slot, obj.matrix);
      };

      // 1. Sedans / SUVs / Taxis
      for (let slot = 0; slot < groups.fourWheelers.length; slot++) {
        const vi = groups.fourWheelers[slot];
        const v = vehicles[vi];
        const bodyH = v.kind === 'suv' ? 0.68 : 0.54;
        const bodyY = v.wheelRadius + bodyH * 0.45;
        const cabH = v.kind === 'suv' ? 0.62 : 0.5;
        const cabL = v.kind === 'suv' ? v.length * 0.62 : v.length * 0.5;
        const cabZ = v.kind === 'suv' ? -0.22 : -0.18;
        placePart(body4Ref.current, slot, vi, 0, bodyY, 0, v.width, bodyH, v.length);
        placePart(
          cabin4Ref.current,
          slot,
          vi,
          0,
          bodyY + bodyH * 0.5 + cabH * 0.45,
          cabZ,
          v.width * 0.86,
          cabH,
          cabL
        );
        placePart(
          glass4Ref.current,
          slot,
          vi,
          0,
          bodyY + bodyH * 0.5 + cabH * 0.46,
          cabZ,
          v.width * 0.88,
          cabH * 0.72,
          cabL * 0.94
        );
      }
      if (body4Ref.current) body4Ref.current.instanceMatrix.needsUpdate = true;
      if (cabin4Ref.current) cabin4Ref.current.instanceMatrix.needsUpdate = true;
      if (glass4Ref.current) glass4Ref.current.instanceMatrix.needsUpdate = true;

      for (let slot = 0; slot < groups.taxis.length; slot++) {
        const vi = groups.taxis[slot];
        const v = vehicles[vi];
        placePart(taxiSignRef.current, slot, vi, 0, v.height * 0.95, 0.1, 0.5, 0.18, 0.22);
      }
      if (taxiSignRef.current) taxiSignRef.current.instanceMatrix.needsUpdate = true;

      // 2. Angkot
      for (let slot = 0; slot < groups.angkots.length; slot++) {
        const vi = groups.angkots[slot];
        const v = vehicles[vi];
        placePart(angkotBodyRef.current, slot, vi, 0, 0.92, 0, v.width, 1.15, v.length);
        placePart(angkotRoofRef.current, slot, vi, 0, 1.62, -0.05, v.width * 0.92, 0.35, v.length * 0.9);
        placePart(angkotGlassRef.current, slot, vi, 0, 1.28, 0.05, v.width * 1.02, 0.45, v.length * 0.84);
      }
      if (angkotBodyRef.current) angkotBodyRef.current.instanceMatrix.needsUpdate = true;
      if (angkotRoofRef.current) angkotRoofRef.current.instanceMatrix.needsUpdate = true;
      if (angkotGlassRef.current) angkotGlassRef.current.instanceMatrix.needsUpdate = true;

      // 3. City Bus
      for (let slot = 0; slot < groups.buses.length; slot++) {
        const vi = groups.buses[slot];
        const v = vehicles[vi];
        placePart(busBodyRef.current, slot, vi, 0, 1.75, 0, v.width, 2.55, v.length);
        placePart(busStripeRef.current, slot, vi, 0, 0.88, 0, v.width * 1.02, 0.45, v.length * 0.99);
        placePart(busGlassRef.current, slot, vi, 0, 2.02, 0.08, v.width * 1.02, 0.92, v.length * 0.92);
      }
      if (busBodyRef.current) busBodyRef.current.instanceMatrix.needsUpdate = true;
      if (busStripeRef.current) busStripeRef.current.instanceMatrix.needsUpdate = true;
      if (busGlassRef.current) busGlassRef.current.instanceMatrix.needsUpdate = true;

      // 4. Box Trucks
      for (let slot = 0; slot < groups.trucks.length; slot++) {
        const vi = groups.trucks[slot];
        const v = vehicles[vi];
        placePart(truckCabRef.current, slot, vi, 0, 1.35, v.length * 0.31, v.width * 0.92, 1.75, v.length * 0.28);
        placePart(truckGlassRef.current, slot, vi, 0, 1.68, v.length * 0.37, v.width * 0.86, 0.62, v.length * 0.18);
        placePart(truckBoxRef.current, slot, vi, 0, 1.85, -v.length * 0.15, v.width, 2.35, v.length * 0.66);
      }
      if (truckCabRef.current) truckCabRef.current.instanceMatrix.needsUpdate = true;
      if (truckGlassRef.current) truckGlassRef.current.instanceMatrix.needsUpdate = true;
      if (truckBoxRef.current) truckBoxRef.current.instanceMatrix.needsUpdate = true;

      // 5. Motorcycles + Riders
      for (let slot = 0; slot < groups.motorcycles.length; slot++) {
        const vi = groups.motorcycles[slot];
        const v = vehicles[vi];
        placePart(motoFrameRef.current, slot, vi, 0, 0.62, 0, 0.36, 0.52, v.length * 0.78);
        placePart(motoRiderRef.current, slot, vi, 0, 1.08, -0.1, 1.0, 1.0, 1.0, 0.15);
        placePart(motoHelmetRef.current, slot, vi, 0, 1.54, -0.02, 0.4, 0.39, 0.4);
      }
      if (motoFrameRef.current) motoFrameRef.current.instanceMatrix.needsUpdate = true;
      if (motoRiderRef.current) motoRiderRef.current.instanceMatrix.needsUpdate = true;
      if (motoHelmetRef.current) motoHelmetRef.current.instanceMatrix.needsUpdate = true;

      // 6. Bicycles + Riders
      for (let slot = 0; slot < groups.bicycles.length; slot++) {
        const vi = groups.bicycles[slot];
        const v = vehicles[vi];
        const pedalLean = Math.sin(states[vi].wheelAngle * 0.5) * 0.05;
        placePart(bikeFrameRef.current, slot, vi, 0, 0.62, 0, 0.12, 0.45, v.length * 0.72);
        placePart(bikeRiderRef.current, slot, vi, pedalLean, 1.05, -0.05, 0.92, 0.92, 0.92, 0.24);
        placePart(bikeHeadRef.current, slot, vi, pedalLean, 1.48, 0.05, 0.38, 0.37, 0.38);
      }
      if (bikeFrameRef.current) bikeFrameRef.current.instanceMatrix.needsUpdate = true;
      if (bikeRiderRef.current) bikeRiderRef.current.instanceMatrix.needsUpdate = true;
      if (bikeHeadRef.current) bikeHeadRef.current.instanceMatrix.needsUpdate = true;

      // 7. Spinning Wheels & Spokes
      for (let slot = 0; slot < groups.wheels.length; slot++) {
        const w = groups.wheels[slot];
        const st = states[w.vehicleIdx];
        placePart(
          wheelRef.current,
          slot,
          w.vehicleIdx,
          w.lx,
          w.ly,
          w.lz,
          w.width,
          w.radius,
          w.radius,
          st.wheelAngle
        );
        placePart(
          spokeRef.current,
          slot,
          w.vehicleIdx,
          w.lx,
          w.ly,
          w.lz,
          w.width,
          w.radius,
          w.radius,
          st.wheelAngle
        );
      }
      if (wheelRef.current) wheelRef.current.instanceMatrix.needsUpdate = true;
      if (spokeRef.current) spokeRef.current.instanceMatrix.needsUpdate = true;

      // 8. Headlights & Taillights/Brakelights (paired left+right per vehicle)
      for (let slot = 0; slot < groups.headlightVehicles.length; slot++) {
        const vi = groups.headlightVehicles[slot];
        const v = vehicles[vi];
        const st = states[vi];
        const hlSlot = slot * 2;
        const ly = v.kind === 'motorcycle' ? 0.85 : v.kind === 'bus' || v.kind === 'truck' ? 0.9 : 0.65;
        const lxOff = v.kind === 'motorcycle' ? 0 : v.width * 0.34;
        const hlScale = nightLights ? 1 : 0.6;
        const hlX = v.kind === 'motorcycle' ? 0.16 : 0.24;

        if (v.kind === 'motorcycle') {
          placePart(headlightRef.current, hlSlot, vi, 0, ly, v.length * 0.42, hlX * hlScale, 0.14 * hlScale, 0.08);
          placePart(headlightRef.current, hlSlot + 1, vi, 0, 0, 0, 0, 0, 0);
        } else {
          placePart(headlightRef.current, hlSlot, vi, -lxOff, ly, v.length * 0.5 + 0.01, hlX, 0.14, 0.06);
          placePart(headlightRef.current, hlSlot + 1, vi, lxOff, ly, v.length * 0.5 + 0.01, hlX, 0.14, 0.06);
        }

        // Brake / Tail lights
        const tlY = v.kind === 'motorcycle' ? 0.78 : v.kind === 'bus' || v.kind === 'truck' ? 1.0 : 0.72;
        const brakeBoost = st.braking ? 1.25 : 1.0;
        const tlColor = st.braking ? COLOR_BRAKE : nightLights ? COLOR_TAIL_NIGHT : COLOR_TAIL_DAY;
        if (v.kind === 'motorcycle') {
          placePart(taillightRef.current, hlSlot, vi, 0, tlY, -v.length * 0.42, 0.16 * brakeBoost, 0.12 * brakeBoost, 0.08);
          placePart(taillightRef.current, hlSlot + 1, vi, 0, 0, 0, 0, 0, 0);
        } else {
          placePart(taillightRef.current, hlSlot, vi, -lxOff, tlY, -v.length * 0.5 - 0.01, 0.26 * brakeBoost, 0.13 * brakeBoost, 0.06);
          placePart(taillightRef.current, hlSlot + 1, vi, lxOff, tlY, -v.length * 0.5 - 0.01, 0.26 * brakeBoost, 0.13 * brakeBoost, 0.06);
        }
        if (taillightRef.current) {
          taillightRef.current.setColorAt(hlSlot, tlColor);
          taillightRef.current.setColorAt(hlSlot + 1, tlColor);
        }
      }
      if (headlightRef.current) headlightRef.current.instanceMatrix.needsUpdate = true;
      if (taillightRef.current) {
        taillightRef.current.instanceMatrix.needsUpdate = true;
        if (taillightRef.current.instanceColor) taillightRef.current.instanceColor.needsUpdate = true;
      }
    },
    [groups, nightLights, scratch, sim, states, vehicles]
  );

  return (
    <group name="city-vehicles">
      {/* Sedans, SUVs, Taxis */}
      {groups.fourWheelers.length > 0 && (
        <>
          <instancedMesh
            key={`b4-${groups.fourWheelers.length}`}
            ref={body4Ref}
            args={[geos.box, undefined, groups.fourWheelers.length]}
            castShadow
            receiveShadow
            frustumCulled={false}
          >
            <meshStandardMaterial color="#ffffff" roughness={0.35} metalness={0.35} />
          </instancedMesh>
          <instancedMesh
            key={`c4-${groups.fourWheelers.length}`}
            ref={cabin4Ref}
            args={[geos.box, undefined, groups.fourWheelers.length]}
            frustumCulled={false}
          >
            <meshStandardMaterial color="#e2e8f0" roughness={0.4} metalness={0.25} />
          </instancedMesh>
          <instancedMesh
            key={`g4-${groups.fourWheelers.length}`}
            ref={glass4Ref}
            args={[geos.box, undefined, groups.fourWheelers.length]}
            frustumCulled={false}
          >
            <meshStandardMaterial color="#1e293b" roughness={0.15} metalness={0.7} />
          </instancedMesh>
        </>
      )}
      {groups.taxis.length > 0 && (
        <instancedMesh
          key={`tx-${groups.taxis.length}`}
          ref={taxiSignRef}
          args={[geos.box, undefined, groups.taxis.length]}
          frustumCulled={false}
        >
          <meshStandardMaterial
            color="#fef08a"
            emissive="#facc15"
            emissiveIntensity={nightLights ? 1.6 : 0.3}
          />
        </instancedMesh>
      )}

      {/* Angkot */}
      {groups.angkots.length > 0 && (
        <>
          <instancedMesh
            key={`ab-${groups.angkots.length}`}
            ref={angkotBodyRef}
            args={[geos.box, undefined, groups.angkots.length]}
            castShadow
            receiveShadow
            frustumCulled={false}
          >
            <meshStandardMaterial color="#ffffff" roughness={0.45} metalness={0.2} />
          </instancedMesh>
          <instancedMesh
            key={`ar-${groups.angkots.length}`}
            ref={angkotRoofRef}
            args={[geos.box, undefined, groups.angkots.length]}
            frustumCulled={false}
          >
            <meshStandardMaterial color="#f8fafc" roughness={0.5} />
          </instancedMesh>
          <instancedMesh
            key={`ag-${groups.angkots.length}`}
            ref={angkotGlassRef}
            args={[geos.box, undefined, groups.angkots.length]}
            frustumCulled={false}
          >
            <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.6} />
          </instancedMesh>
        </>
      )}

      {/* City Buses */}
      {groups.buses.length > 0 && (
        <>
          <instancedMesh
            key={`bb-${groups.buses.length}`}
            ref={busBodyRef}
            args={[geos.box, undefined, groups.buses.length]}
            castShadow
            receiveShadow
            frustumCulled={false}
          >
            <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.2} />
          </instancedMesh>
          <instancedMesh
            key={`bs-${groups.buses.length}`}
            ref={busStripeRef}
            args={[geos.box, undefined, groups.buses.length]}
            frustumCulled={false}
          >
            <meshStandardMaterial color="#f8fafc" roughness={0.45} />
          </instancedMesh>
          <instancedMesh
            key={`bg-${groups.buses.length}`}
            ref={busGlassRef}
            args={[geos.box, undefined, groups.buses.length]}
            frustumCulled={false}
          >
            <meshStandardMaterial color="#0f172a" roughness={0.15} metalness={0.65} />
          </instancedMesh>
        </>
      )}

      {/* Box Trucks */}
      {groups.trucks.length > 0 && (
        <>
          <instancedMesh
            key={`tc-${groups.trucks.length}`}
            ref={truckCabRef}
            args={[geos.box, undefined, groups.trucks.length]}
            castShadow
            receiveShadow
            frustumCulled={false}
          >
            <meshStandardMaterial color="#ffffff" roughness={0.45} metalness={0.25} />
          </instancedMesh>
          <instancedMesh
            key={`tb-${groups.trucks.length}`}
            ref={truckBoxRef}
            args={[geos.box, undefined, groups.trucks.length]}
            castShadow
            receiveShadow
            frustumCulled={false}
          >
            <meshStandardMaterial color="#ffffff" roughness={0.6} />
          </instancedMesh>
          <instancedMesh
            key={`tg-${groups.trucks.length}`}
            ref={truckGlassRef}
            args={[geos.box, undefined, groups.trucks.length]}
            frustumCulled={false}
          >
            <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.65} />
          </instancedMesh>
        </>
      )}

      {/* Motorcycles + Riders */}
      {groups.motorcycles.length > 0 && (
        <>
          <instancedMesh
            key={`mf-${groups.motorcycles.length}`}
            ref={motoFrameRef}
            args={[geos.box, undefined, groups.motorcycles.length]}
            castShadow
            frustumCulled={false}
          >
            <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.35} />
          </instancedMesh>
          <instancedMesh
            key={`mr-${groups.motorcycles.length}`}
            ref={motoRiderRef}
            args={[geos.riderBody, undefined, groups.motorcycles.length]}
            castShadow
            frustumCulled={false}
          >
            <meshStandardMaterial color="#ffffff" roughness={0.75} vertexColors />
          </instancedMesh>
          <instancedMesh
            key={`mh-${groups.motorcycles.length}`}
            ref={motoHelmetRef}
            args={[geos.sphere, undefined, groups.motorcycles.length]}
            frustumCulled={false}
          >
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.2} />
          </instancedMesh>
        </>
      )}

      {/* Bicycles + Riders */}
      {groups.bicycles.length > 0 && (
        <>
          <instancedMesh
            key={`bf-${groups.bicycles.length}`}
            ref={bikeFrameRef}
            args={[geos.box, undefined, groups.bicycles.length]}
            frustumCulled={false}
          >
            <meshStandardMaterial color="#ffffff" roughness={0.45} metalness={0.4} />
          </instancedMesh>
          <instancedMesh
            key={`br-${groups.bicycles.length}`}
            ref={bikeRiderRef}
            args={[geos.riderBody, undefined, groups.bicycles.length]}
            castShadow
            frustumCulled={false}
          >
            <meshStandardMaterial color="#ffffff" roughness={0.8} vertexColors />
          </instancedMesh>
          <instancedMesh
            key={`bh-${groups.bicycles.length}`}
            ref={bikeHeadRef}
            args={[geos.sphere, undefined, groups.bicycles.length]}
            frustumCulled={false}
          >
            <meshStandardMaterial color="#f8fafc" roughness={0.8} />
          </instancedMesh>
        </>
      )}

      {/* Shared Spinning Wheels & Spokes */}
      <instancedMesh
        key={`wh-${groups.wheels.length}`}
        ref={wheelRef}
        args={[geos.wheel, undefined, groups.wheels.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#181b20" roughness={0.85} />
      </instancedMesh>
      <instancedMesh
        key={`sp-${groups.wheels.length}`}
        ref={spokeRef}
        args={[geos.spoke, undefined, groups.wheels.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.5} />
      </instancedMesh>

      {/* Headlights & Taillights */}
      <instancedMesh
        key={`hl-${groups.headlightVehicles.length * 2}`}
        ref={headlightRef}
        args={[geos.box, undefined, groups.headlightVehicles.length * 2]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          color={nightLights ? '#fffbeb' : '#e2e8f0'}
          emissive="#fef3c7"
          emissiveIntensity={nightLights ? 2.4 : 0.15}
        />
      </instancedMesh>
      <instancedMesh
        key={`tl-${groups.headlightVehicles.length * 2}`}
        ref={taillightRef}
        args={[geos.box, undefined, groups.headlightVehicles.length * 2]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ef4444"
          emissiveIntensity={nightLights ? 1.5 : 0.75}
        />
      </instancedMesh>
    </group>
  );
});

