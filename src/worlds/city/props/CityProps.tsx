import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { TimeOfDay, Weather } from '../../shared/types';
import { lightsOn } from '../../shared/palette';
import { buildCityPropsLayout, type PropTransform, type SignTransform } from './streetFurniture';

export interface CityPropsComponentProps {
  time?: number;
  timeOfDay?: TimeOfDay;
  weather?: Weather;
}

const SIGN_COLORS: Record<SignTransform['kind'], string> = {
  warning: '#facc15',
  school: '#facc15',
  crosswalk: '#38bdf8',
  noParking: '#ef4444',
  speed: '#f8fafc',
  hospital: '#2563eb',
};

/**
 * Perlengkapan jalan & trotoar kota: lampu jalan, tempat sampah, hidran, rambu lalu lintas,
 * bangku taman/trotoar, bollard, pot tanaman, serta tiang & kabel listrik menggantung.
 */
export const CityProps = memo(function CityProps({
  timeOfDay = 'day',
  weather = 'clear',
}: CityPropsComponentProps) {
  const layout = useMemo(() => buildCityPropsLayout(), []);
  const nightGlow = lightsOn(timeOfDay, weather);

  const geos = useMemo(() => {
    const box = new THREE.BoxGeometry(1, 1, 1);
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 10);
    const sphere = new THREE.SphereGeometry(0.5, 10, 8);
    return { box, cyl, sphere };
  }, []);

  // Streetlight refs
  const lampPoleRef = useRef<THREE.InstancedMesh>(null);
  const lampArmRef = useRef<THREE.InstancedMesh>(null);
  const lampHeadRef = useRef<THREE.InstancedMesh>(null);
  const lampBulbRef = useRef<THREE.InstancedMesh>(null);

  // Trash bin refs
  const binStandRef = useRef<THREE.InstancedMesh>(null);
  const binGreenRef = useRef<THREE.InstancedMesh>(null);
  const binYellowRef = useRef<THREE.InstancedMesh>(null);

  // Hydrant refs
  const hydBodyRef = useRef<THREE.InstancedMesh>(null);
  const hydCapRef = useRef<THREE.InstancedMesh>(null);
  const hydNozzleRef = useRef<THREE.InstancedMesh>(null);

  // Sign refs
  const signPoleRef = useRef<THREE.InstancedMesh>(null);
  const signFaceRef = useRef<THREE.InstancedMesh>(null);

  // Bench refs
  const benchSeatRef = useRef<THREE.InstancedMesh>(null);
  const benchBackRef = useRef<THREE.InstancedMesh>(null);
  const benchLegsRef = useRef<THREE.InstancedMesh>(null);

  // Bollard & planter refs
  const bollardBodyRef = useRef<THREE.InstancedMesh>(null);
  const bollardBandRef = useRef<THREE.InstancedMesh>(null);
  const planterPotRef = useRef<THREE.InstancedMesh>(null);
  const planterBushRef = useRef<THREE.InstancedMesh>(null);

  // Power pole, transformer, cable refs
  const poleMastRef = useRef<THREE.InstancedMesh>(null);
  const poleArmRef = useRef<THREE.InstancedMesh>(null);
  const trafoRef = useRef<THREE.InstancedMesh>(null);
  const cableRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const obj = new THREE.Object3D();
    const color = new THREE.Color();

    const localPlace = (
      mesh: THREE.InstancedMesh | null,
      idx: number,
      p: PropTransform,
      lx: number,
      ly: number,
      lz: number,
      sx: number,
      sy: number,
      sz: number,
      rx = 0,
      rz = 0
    ) => {
      if (!mesh) return;
      const sc = p.scale ?? 1;
      const cos = Math.cos(p.rotY);
      const sin = Math.sin(p.rotY);
      obj.position.set(
        p.x + (lx * cos + lz * sin) * sc,
        p.y + ly * sc,
        p.z + (-lx * sin + lz * cos) * sc
      );
      obj.rotation.set(rx, p.rotY, rz, 'YXZ');
      obj.scale.set(sx * sc, sy * sc, sz * sc);
      obj.updateMatrix();
      mesh.setMatrixAt(idx, obj.matrix);
    };

    // 1. Streetlights
    layout.streetlights.forEach((p, i) => {
      localPlace(lampPoleRef.current, i, p, 0, 3.1, 0, 0.09, 6.2, 0.09);
      localPlace(lampArmRef.current, i, p, 0, 6.1, 0.65, 0.08, 0.08, 1.35);
      localPlace(lampHeadRef.current, i, p, 0, 6.08, 1.32, 0.34, 0.12, 0.56);
      localPlace(lampBulbRef.current, i, p, 0, 5.99, 1.32, 0.26, 0.06, 0.44);
    });

    // 2. Trash bins
    layout.trashBins.forEach((p, i) => {
      localPlace(binStandRef.current, i, p, 0, 0.48, 0, 0.96, 0.96, 0.08);
      localPlace(binGreenRef.current, i, p, -0.24, 0.56, 0.08, 0.34, 0.62, 0.34);
      localPlace(binYellowRef.current, i, p, 0.24, 0.56, 0.08, 0.34, 0.62, 0.34);
    });

    // 3. Fire hydrants
    layout.hydrants.forEach((p, i) => {
      localPlace(hydBodyRef.current, i, p, 0, 0.38, 0, 0.14, 0.76, 0.14);
      localPlace(hydCapRef.current, i, p, 0, 0.78, 0, 0.3, 0.22, 0.3);
      localPlace(hydNozzleRef.current, i, p, 0, 0.56, 0, 0.42, 0.09, 0.09);
    });

    // 4. Traffic signs
    layout.signs.forEach((p, i) => {
      localPlace(signPoleRef.current, i, p, 0, 1.35, 0, 0.04, 2.7, 0.04);
      const isDiamond = p.kind === 'warning' || p.kind === 'school';
      localPlace(signFaceRef.current, i, p, 0, 2.52, 0.05, 0.56, 0.56, 0.04, 0, isDiamond ? Math.PI / 4 : 0);
      if (signFaceRef.current) {
        signFaceRef.current.setColorAt(i, color.set(SIGN_COLORS[p.kind]));
      }
    });

    // 5. Benches
    layout.benches.forEach((p, i) => {
      localPlace(benchSeatRef.current, i, p, 0, 0.44, 0.04, 1.65, 0.08, 0.48);
      localPlace(benchBackRef.current, i, p, 0, 0.78, -0.18, 1.65, 0.4, 0.07, -0.14, 0);
      localPlace(benchLegsRef.current, i * 2, p, -0.68, 0.22, 0, 0.08, 0.44, 0.46);
      localPlace(benchLegsRef.current, i * 2 + 1, p, 0.68, 0.22, 0, 0.08, 0.44, 0.46);
    });

    // 6. Bollards
    layout.bollards.forEach((p, i) => {
      localPlace(bollardBodyRef.current, i, p, 0, 0.42, 0, 0.08, 0.84, 0.08);
      localPlace(bollardBandRef.current, i, p, 0, 0.74, 0, 0.086, 0.14, 0.086);
    });

    // 7. Planters
    layout.planters.forEach((p, i) => {
      localPlace(planterPotRef.current, i, p, 0, 0.34, 0, 0.85, 0.68, 0.85);
      localPlace(planterBushRef.current, i, p, 0, 0.86, 0, 0.95, 0.75, 0.95);
    });

    // 8. Power poles & crossarms
    layout.powerPoles.forEach((p, i) => {
      localPlace(poleMastRef.current, i, p, 0, 4.2, 0, 0.14, 8.4, 0.14);
      localPlace(poleArmRef.current, i * 2, p, 0, 8.0, 0, 2.2, 0.12, 0.12);
      localPlace(poleArmRef.current, i * 2 + 1, p, 0, 7.2, 0, 1.5, 0.1, 0.1);
    });

    // 9. Pole transformers
    layout.transformers.forEach((p, i) => {
      localPlace(trafoRef.current, i, p, 0, 0, 0.35, 0.36, 0.88, 0.36);
    });

    // 10. Overhead sagging cables
    if (cableRef.current) {
      layout.cables.forEach((c, i) => {
        obj.position.set(c.mx, c.my, c.mz);
        obj.rotation.set(c.tiltX + Math.PI / 2, c.rotY, 0, 'YXZ');
        obj.scale.set(0.022, c.length, 0.022);
        obj.updateMatrix();
        cableRef.current!.setMatrixAt(i, obj.matrix);
      });
    }

    const sync = (m: THREE.InstancedMesh | null) => {
      if (!m) return;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    };

    [
      lampPoleRef.current,
      lampArmRef.current,
      lampHeadRef.current,
      lampBulbRef.current,
      binStandRef.current,
      binGreenRef.current,
      binYellowRef.current,
      hydBodyRef.current,
      hydCapRef.current,
      hydNozzleRef.current,
      signPoleRef.current,
      signFaceRef.current,
      benchSeatRef.current,
      benchBackRef.current,
      benchLegsRef.current,
      bollardBodyRef.current,
      bollardBandRef.current,
      planterPotRef.current,
      planterBushRef.current,
      poleMastRef.current,
      poleArmRef.current,
      trafoRef.current,
      cableRef.current,
    ].forEach(sync);
  }, [layout]);

  return (
    <group name="city-props">
      {/* Streetlights */}
      <instancedMesh
        key={`lp-${layout.streetlights.length}`}
        ref={lampPoleRef}
        args={[geos.cyl, undefined, layout.streetlights.length]}
        castShadow
        frustumCulled={false}
      >
        <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.6} />
      </instancedMesh>
      <instancedMesh
        key={`la-${layout.streetlights.length}`}
        ref={lampArmRef}
        args={[geos.box, undefined, layout.streetlights.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.6} />
      </instancedMesh>
      <instancedMesh
        key={`lh-${layout.streetlights.length}`}
        ref={lampHeadRef}
        args={[geos.box, undefined, layout.streetlights.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.5} />
      </instancedMesh>
      <instancedMesh
        key={`lb-${layout.streetlights.length}`}
        ref={lampBulbRef}
        args={[geos.box, undefined, layout.streetlights.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          color={nightGlow ? '#fffbeb' : '#cbd5e1'}
          emissive="#fde68a"
          emissiveIntensity={nightGlow ? 2.6 : 0.05}
        />
      </instancedMesh>

      {/* Dual Trash Bins */}
      <instancedMesh
        key={`bs-${layout.trashBins.length}`}
        ref={binStandRef}
        args={[geos.box, undefined, layout.trashBins.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.4} />
      </instancedMesh>
      <instancedMesh
        key={`bg-${layout.trashBins.length}`}
        ref={binGreenRef}
        args={[geos.box, undefined, layout.trashBins.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#16a34a" roughness={0.65} />
      </instancedMesh>
      <instancedMesh
        key={`by-${layout.trashBins.length}`}
        ref={binYellowRef}
        args={[geos.box, undefined, layout.trashBins.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#eab308" roughness={0.65} />
      </instancedMesh>

      {/* Fire Hydrants */}
      <instancedMesh
        key={`hyb-${layout.hydrants.length}`}
        ref={hydBodyRef}
        args={[geos.cyl, undefined, layout.hydrants.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#dc2626" roughness={0.45} metalness={0.25} />
      </instancedMesh>
      <instancedMesh
        key={`hyc-${layout.hydrants.length}`}
        ref={hydCapRef}
        args={[geos.sphere, undefined, layout.hydrants.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#b91c1c" roughness={0.45} metalness={0.25} />
      </instancedMesh>
      <instancedMesh
        key={`hyn-${layout.hydrants.length}`}
        ref={hydNozzleRef}
        args={[geos.box, undefined, layout.hydrants.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#cbd5e1" roughness={0.35} metalness={0.65} />
      </instancedMesh>

      {/* Traffic Signs */}
      <instancedMesh
        key={`sp-${layout.signs.length}`}
        ref={signPoleRef}
        args={[geos.cyl, undefined, layout.signs.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#94a3b8" roughness={0.45} metalness={0.5} />
      </instancedMesh>
      <instancedMesh
        key={`sf-${layout.signs.length}`}
        ref={signFaceRef}
        args={[geos.box, undefined, layout.signs.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.4}
          emissive="#ffffff"
          emissiveIntensity={nightGlow ? 0.2 : 0}
        />
      </instancedMesh>

      {/* Park & Sidewalk Benches */}
      <instancedMesh
        key={`bns-${layout.benches.length}`}
        ref={benchSeatRef}
        args={[geos.box, undefined, layout.benches.length]}
        receiveShadow
        frustumCulled={false}
      >
        <meshStandardMaterial color="#8a5a33" roughness={0.8} />
      </instancedMesh>
      <instancedMesh
        key={`bnb-${layout.benches.length}`}
        ref={benchBackRef}
        args={[geos.box, undefined, layout.benches.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#8a5a33" roughness={0.8} />
      </instancedMesh>
      <instancedMesh
        key={`bnl-${layout.benches.length * 2}`}
        ref={benchLegsRef}
        args={[geos.box, undefined, layout.benches.length * 2]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.4} />
      </instancedMesh>

      {/* Corner Bollards */}
      <instancedMesh
        key={`blb-${layout.bollards.length}`}
        ref={bollardBodyRef}
        args={[geos.cyl, undefined, layout.bollards.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.4} />
      </instancedMesh>
      <instancedMesh
        key={`blt-${layout.bollards.length}`}
        ref={bollardBandRef}
        args={[geos.cyl, undefined, layout.bollards.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          color="#facc15"
          roughness={0.4}
          emissive="#facc15"
          emissiveIntensity={nightGlow ? 0.35 : 0}
        />
      </instancedMesh>

      {/* Sidewalk Planters */}
      <instancedMesh
        key={`plp-${layout.planters.length}`}
        ref={planterPotRef}
        args={[geos.box, undefined, layout.planters.length]}
        receiveShadow
        frustumCulled={false}
      >
        <meshStandardMaterial color="#94a3b8" roughness={0.85} />
      </instancedMesh>
      <instancedMesh
        key={`plb-${layout.planters.length}`}
        ref={planterBushRef}
        args={[geos.sphere, undefined, layout.planters.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#4d7c0f" roughness={0.9} />
      </instancedMesh>

      {/* Power Poles, Crossarms, Transformers, Cables */}
      <instancedMesh
        key={`pm-${layout.powerPoles.length}`}
        ref={poleMastRef}
        args={[geos.cyl, undefined, layout.powerPoles.length]}
        castShadow
        frustumCulled={false}
      >
        <meshStandardMaterial color="#6b7280" roughness={0.85} />
      </instancedMesh>
      <instancedMesh
        key={`pa-${layout.powerPoles.length * 2}`}
        ref={poleArmRef}
        args={[geos.box, undefined, layout.powerPoles.length * 2]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#374151" roughness={0.65} metalness={0.3} />
      </instancedMesh>
      {layout.transformers.length > 0 && (
        <instancedMesh
          key={`tr-${layout.transformers.length}`}
          ref={trafoRef}
          args={[geos.cyl, undefined, layout.transformers.length]}
          frustumCulled={false}
        >
          <meshStandardMaterial color="#64748b" roughness={0.55} metalness={0.4} />
        </instancedMesh>
      )}
      {layout.cables.length > 0 && (
        <instancedMesh
          key={`cb-${layout.cables.length}`}
          ref={cableRef}
          args={[geos.cyl, undefined, layout.cables.length]}
          frustumCulled={false}
        >
          <meshStandardMaterial color="#18181b" roughness={0.9} />
        </instancedMesh>
      )}
    </group>
  );
});

export default CityProps;

