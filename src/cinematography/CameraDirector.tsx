import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { surfaceYAt } from '../worlds/shared/spatial';
import type { CameraAnchor, CameraAnchors, ObstacleCircle, Vec3, WorldLocation } from '../worlds/shared/types';
import {
  SIZE_DISTANCE,
  easeInOut,
  lensToFov,
  type AnchorKey,
  type CameraMove,
  type Shot,
  type ShotSize,
} from './shotTypes';

export type AnchorInput = Partial<Record<AnchorKey, CameraAnchor | Vec3>>;

export interface DofSettings {
  enabled: boolean;
  /** Jarak fokus (meter) — dihitung otomatis ke subjek jika omitted */
  focusDistance?: number;
  /** F-stop lensa virtual (semakin kecil semakin dangkal DoF, mis. 2.8 untuk CU) */
  fStop?: number;
}

export interface CameraPose {
  pos: THREE.Vector3;
  aim: THREE.Vector3;
  rollRad: number;
  fov: number;
  focusDistance: number;
  fStop: number;
  dofEnabled: boolean;
  shot: Shot;
}

export interface CameraDirectorProps {
  shots: Shot[];
  /** Frame saat ini (Remotion). Jika omitted, gunakan R3F clock (hanya untuk preview live). */
  frame?: number;
  fps?: number;
  /** Sumber lokasi penuh dari registry Map (memakai location.cameraAnchors). */
  location?: WorldLocation;
  /** Alternatif langsung mengirim CameraAnchors. */
  anchors?: CameraAnchors | AnchorInput;
  /** Posisi dunia tiap karakter berdasarkan castId. */
  subjects?: Record<string, Vec3>;
  /** Posisi 3D titik pusat kepala/wajah tiap karakter untuk tracking wajah presisi. */
  subjectHeads?: Record<string, Vec3>;
  /** Arah hadap Y (radian) tiap karakter untuk lead/nose room. */
  subjectFacings?: Record<string, number>;
  /** Pasangan axis 180° [A, B]; kamera selalu berada di satu sisi garis ini. */
  axis?: [string, string];
  /** Halangan solid agar pose kamera tidak menembus tembok/pohon. */
  obstacles?: ObstacleCircle[];
  /** Intensitas handheld halus 0..1. */
  handheld?: number;
  /** DoF opsional (otomatis aktif saat CU/ECU bila true). */
  dof?: boolean | DofSettings;
  seed?: number;
  /** Callback opsional untuk meneruskan pose & data DoF ke pipeline post-processing. */
  onPose?: (pose: CameraPose) => void;
  /** Sisi kamera default terhadap garis axis 180° (+1 atau -1). */
  cameraSide?: 1 | -1;
  /** World ID opsional untuk elevasi terrain/dek; otomatis diinfer dari location bila omitted. */
  worldId?: 'village' | 'city';
  /** Nonaktifkan kontrol kamera otomatis (mis. saat Free-Cam aktif). */
  disabled?: boolean;
  /** Sampel subjek [awal, tengah, akhir] shot agar sudut kamera aman terkunci konstan di seluruh shot. */
  shotPathSamples?: Array<{
    sec: number;
    subjects: Record<string, Vec3>;
    subjectHeads: Record<string, Vec3>;
    subjectFacings: Record<string, number>;
  }>;
}

const DEFAULT_POS: Vec3 = [0, 5, 20];
const DEFAULT_TARGET: Vec3 = [0, 1.5, 0];

const toVec3 = (v: Vec3 | undefined, fallback: Vec3): THREE.Vector3 =>
  new THREE.Vector3(...(v ?? fallback));

function resolveAnchor(
  anchors: AnchorInput | undefined,
  key: AnchorKey
): { pos: THREE.Vector3; target: THREE.Vector3; fov?: number } {
  const entry = anchors?.[key] ?? anchors?.wide;
  if (!entry) {
    return { pos: toVec3(undefined, DEFAULT_POS), target: toVec3(undefined, DEFAULT_TARGET) };
  }
  if (Array.isArray(entry)) {
    return { pos: toVec3(entry, DEFAULT_POS), target: toVec3(undefined, DEFAULT_TARGET) };
  }
  return {
    pos: toVec3(entry.position, DEFAULT_POS),
    target: toVec3(entry.target, DEFAULT_TARGET),
    fov: entry.fov,
  };
}

/** Noise deterministik murni (dilarang Math.random di render). */
const deterministicNoise = (x: number, seed: number): number =>
  Math.sin(x * 1.7 + seed * 12.9898) * 0.5 +
  Math.sin(x * 2.9 + seed * 78.233) * 0.3 +
  Math.sin(x * 5.3 + seed * 3.1) * 0.2;

export function shotAt(shots: Shot[], sec: number): { shot: Shot; u: number } | undefined {
  if (!shots.length) return undefined;
  for (const s of shots) {
    if (sec >= s.startSec && sec < s.startSec + s.durSec) {
      return { shot: s, u: s.durSec > 0 ? (sec - s.startSec) / s.durSec : 0 };
    }
  }
  const last = shots[shots.length - 1];
  return { shot: last, u: sec < shots[0].startSec ? 0 : 1 };
}

const SINGLE_SHOT_DIST: Record<ShotSize, number> = {
  EWS: SIZE_DISTANCE.EWS,
  WS: 9.0,
  MS: 4.0,
  MCU: 2.85,
  CU: 1.95,
  ECU: 1.15,
};

const BASE_FRONT_ANGLE_DEG: Record<ShotSize, number> = {
  ECU: 20,
  CU: 26,
  MCU: 34,
  MS: 40,
  WS: 45,
  EWS: 45,
};

const HEADROOM_Y_SHIFT: Record<NonNullable<Shot['headroom']>, number> = {
  normal: 0,
  tight: -0.04,
  oppressive: -0.10,
  propTop: 0.06,
};

function resolveElevatedCamY(
  refHeadY: number,
  shot: Shot,
  defaultEyeOffset: number,
  defaultLowOffset: number,
  defaultHighOffset: number
): number {
  if (shot.elevation === 'wormEye') return refHeadY - 0.68;
  if (shot.elevation === 'low') return refHeadY - 0.40;
  if (shot.elevation === 'high') return refHeadY + 0.72;
  if (shot.elevation === 'eye') return refHeadY - 0.04;
  if (shot.angle === 'low') return refHeadY + defaultLowOffset;
  if (shot.angle === 'high') return refHeadY + defaultHighOffset;
  if (shot.angle === 'aerial') return refHeadY + 8.0;
  return refHeadY + defaultEyeOffset;
}

function applyCameraMove(
  pos: THREE.Vector3,
  aim: THREE.Vector3,
  effectiveMove: CameraMove,
  shot: Shot,
  e: number,
  u: number
): void {
  switch (effectiveMove) {
    case 'pushIn': {
      const toAim = aim.clone().sub(pos);
      const curDist = toAim.length();
      if (curDist > 0.6) {
        const dir3D = toAim.normalize();
        const maxTravel = Math.min(curDist * 0.30, 0.9);
        pos.addScaledVector(dir3D, maxTravel * (e - 0.5));
      }
      break;
    }
    case 'pullOut': {
      const toAim = aim.clone().sub(pos);
      const curDist = toAim.length();
      if (curDist > 0.6) {
        const dir3D = toAim.normalize();
        const maxTravel = Math.min(curDist * 0.30, 0.9);
        pos.addScaledVector(dir3D, -maxTravel * (e - 0.5));
      }
      break;
    }
    case 'microPush': {
      const toAim = aim.clone().sub(pos);
      const curDist = toAim.length();
      if (curDist > 0.6) {
        const dir3D = toAim.normalize();
        const maxTravel = Math.min(curDist * 0.10, 0.35);
        pos.addScaledVector(dir3D, maxTravel * (e - 0.5));
      }
      break;
    }
    case 'slowPull': {
      const toAim = aim.clone().sub(pos);
      const curDist = toAim.length();
      if (curDist > 0.6) {
        const dir3D = toAim.normalize();
        const maxTravel = Math.min(curDist * 0.22, 0.72);
        pos.addScaledVector(dir3D, -maxTravel * e);
      }
      break;
    }
    case 'dollyTrack': {
      const toAim = aim.clone().sub(pos);
      const curDist = toAim.length();
      const fwdXZ = toAim.clone().setY(0);
      if (fwdXZ.lengthSq() > 1e-6) {
        fwdXZ.normalize();
        const side = new THREE.Vector3(-fwdXZ.z, 0, fwdXZ.x);
        pos.addScaledVector(side, 1.35 * (e - 0.5));
        aim.addScaledVector(side, 0.45 * (e - 0.5));
      }
      if (curDist > 0.8) {
        const dir3D = toAim.normalize();
        const pushTravel = Math.min(curDist * 0.12, 0.45);
        pos.addScaledVector(dir3D, pushTravel * (e - 0.5));
      }
      break;
    }
    case 'pushTiltProp': {
      const toAim = aim.clone().sub(pos);
      const curDist = toAim.length();
      if (curDist > 0.8) {
        const dir3D = toAim.normalize();
        const maxTravel = Math.min(curDist * 0.20, 0.52);
        pos.addScaledVector(dir3D, maxTravel * e);
      }
      aim.y += 0.10 * e;
      break;
    }
    case 'axialPunch': {
      const toAim = aim.clone().sub(pos);
      const curDist = toAim.length();
      if (curDist > 1.55) {
        const dir3D = toAim.normalize();
        const progress = Math.min(1, Math.max(0, u / 0.16));
        const snap = 1 - Math.pow(1 - progress, 3);
        const maxTravel = Math.min(Math.max(0, curDist - 1.55), curDist * 0.24, 0.44);
        pos.addScaledVector(dir3D, maxTravel * snap);
      }
      break;
    }
    case 'craneBack': {
      const away = pos.clone().sub(aim).setY(0);
      if (away.lengthSq() > 1e-6) {
        away.normalize();
        pos.addScaledVector(away, 4.5 * e);
      }
      pos.y += 3.4 * e;
      aim.y += 0.9 * e;
      break;
    }
    case 'panL': {
      const fwd = aim.clone().sub(pos).setY(0).normalize();
      const side = new THREE.Vector3(-fwd.z, 0, fwd.x);
      aim.addScaledVector(side, 1.2 * (0.5 - e));
      break;
    }
    case 'panR': {
      const fwd = aim.clone().sub(pos).setY(0).normalize();
      const side = new THREE.Vector3(-fwd.z, 0, fwd.x);
      aim.addScaledVector(side, -1.2 * (0.5 - e));
      break;
    }
    case 'tilt': {
      aim.y += 0.8 * (e - 0.5);
      break;
    }
    case 'track': {
      const fwd = aim.clone().sub(pos).setY(0).normalize();
      const side = new THREE.Vector3(-fwd.z, 0, fwd.x);
      pos.addScaledVector(side, 2.5 * (e - 0.5));
      aim.addScaledVector(side, 2.5 * (e - 0.5));
      break;
    }
    case 'crane': {
      pos.y += (shot.angle === 'aerial' ? -1 : 1) * 4.0 * (e - 0.5);
      break;
    }
    case 'orbit': {
      const a = (e - 0.5) * 0.35;
      const rel = pos.clone().sub(aim);
      rel.applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
      pos.copy(aim).add(rel);
      break;
    }
    default:
      break;
  }
}

function applyHandheldNoise(
  pos: THREE.Vector3,
  aim: THREE.Vector3,
  sec: number,
  seed: number,
  intensity: number
): void {
  pos.x += deterministicNoise(sec * 0.9, seed) * 0.03 * intensity;
  pos.y += deterministicNoise(sec * 1.1, seed + 1) * 0.025 * intensity;
  aim.x += deterministicNoise(sec * 1.3, seed + 2) * 0.04 * intensity;
  aim.y += deterministicNoise(sec * 1.2, seed + 3) * 0.03 * intensity;
}

const CITY_LOCATION_IDS = new Set([
  'central-crossroads',
  'downtown',
  'city-mall',
  'central-park',
  'street-market',
  'hospital',
  'grand-mosque',
  'station',
  'bus-stop',
  'flyover',
  'shop-street',
  'residential-tower',
  'avenue-east',
]);

const VILLAGE_LOCATION_IDS = new Set([
  'village-center',
  'mosque',
  'village-hall',
  'school',
  'market',
  'river-bridge',
  'bamboo-bridge',
  'rice-terraces',
  'livestock-farm',
  'garden',
  'village-field',
  'houses-west',
  'forest-edge',
  'mountain-view',
  'cemetery-musholla',
]);

function inferWorldId(loc: WorldLocation | undefined): 'village' | 'city' | undefined {
  if (!loc) return undefined;
  if (loc.id === 'school') return loc.position[0] < -100 ? 'city' : 'village';
  if (CITY_LOCATION_IDS.has(loc.id)) return 'city';
  if (VILLAGE_LOCATION_IDS.has(loc.id)) return 'village';
  return undefined;
}

function obstacleTopY(o: ObstacleCircle, floorY: number, worldId?: 'village' | 'city'): number | undefined {
  if (o.h === undefined) return undefined;
  const obsGroundY = worldId ? surfaceYAt(worldId, o.x, o.z) : floorY;
  return obsGroundY + o.h;
}

function countObstacleHits(
  candPos: THREE.Vector3,
  sightTargets: THREE.Vector3[],
  obstacles: ObstacleCircle[],
  floorY: number,
  worldId?: 'village' | 'city',
  otherHeads?: THREE.Vector3[],
  otsOverHead?: THREE.Vector3
): number {
  let hits = 0;

  if (otherHeads) {
    for (const oh of otherHeads) {
      if (candPos.distanceTo(oh) < 0.85) {
        hits++;
      }
      for (const target of sightTargets) {
        const viewDir = target.clone().sub(candPos).setY(0);
        const viewLenSq = viewDir.lengthSq();
        if (viewLenSq <= 0.25) continue;
        const t = Math.max(
          0.03,
          Math.min(0.97, ((oh.x - candPos.x) * viewDir.x + (oh.z - candPos.z) * viewDir.z) / viewLenSq)
        );
        const nearX = candPos.x + viewDir.x * t;
        const nearZ = candPos.z + viewDir.z * t;
        const rayY = candPos.y + (target.y - candPos.y) * t;
        if (rayY <= oh.y + 0.45 && Math.hypot(nearX - oh.x, nearZ - oh.z) < 0.50) {
          hits++;
          break;
        }
      }
    }
  }

  if (otsOverHead) {
    if (candPos.distanceTo(otsOverHead) < 0.60) {
      hits++;
    }
    for (const target of sightTargets) {
      const viewDir = target.clone().sub(candPos).setY(0);
      const viewLenSq = viewDir.lengthSq();
      if (viewLenSq <= 0.25) continue;
      const t = Math.max(
        0.03,
        Math.min(
          0.97,
          ((otsOverHead.x - candPos.x) * viewDir.x + (otsOverHead.z - candPos.z) * viewDir.z) / viewLenSq
        )
      );
      const nearX = candPos.x + viewDir.x * t;
      const nearZ = candPos.z + viewDir.z * t;
      const rayY = candPos.y + (target.y - candPos.y) * t;
      if (rayY <= otsOverHead.y + 0.40 && Math.hypot(nearX - otsOverHead.x, nearZ - otsOverHead.z) < 0.40) {
        hits += 2;
        break;
      }
    }
  }

  for (const o of obstacles) {
    const oTopY = obstacleTopY(o, floorY, worldId);
    if (oTopY === undefined || candPos.y < oTopY + 0.4) {
      if (Math.hypot(candPos.x - o.x, candPos.z - o.z) < o.r + 0.45) {
        hits++;
      }
    }
    for (const target of sightTargets) {
      const viewDir = target.clone().sub(candPos).setY(0);
      const viewLenSq = viewDir.lengthSq();
      if (viewLenSq > 0.25) {
        const toObs = new THREE.Vector3(o.x - candPos.x, 0, o.z - candPos.z);
        const t = Math.max(0.03, Math.min(0.97, toObs.dot(viewDir) / viewLenSq));
        const nearX = candPos.x + viewDir.x * t;
        const nearZ = candPos.z + viewDir.z * t;
        const rayY = candPos.y + (target.y - candPos.y) * t;
        if (
          (oTopY === undefined || rayY < oTopY + 0.25) &&
          Math.hypot(nearX - o.x, nearZ - o.z) < o.r + 0.40
        ) {
          hits++;
          break;
        }
      }
    }
  }
  return hits;
}

function finalizePose(
  pos: THREE.Vector3,
  aim: THREE.Vector3,
  fov: number,
  shot: Shot,
  dof: CameraDirectorProps['dof']
): CameraPose {
  const rollRad =
    shot.dutchDeg !== undefined
      ? THREE.MathUtils.degToRad(shot.dutchDeg)
      : shot.angle === 'dutch'
        ? THREE.MathUtils.degToRad(9)
        : 0;
  const autoFocus = pos.distanceTo(aim);
  const dofCfg = typeof dof === 'object' ? dof : undefined;
  const dofEnabled = shot.deepFocus
    ? false
    : typeof dof === 'boolean'
      ? dof
      : dofCfg?.enabled ?? (shot.size === 'CU' || shot.size === 'ECU');
  const focusDistance = dofCfg?.focusDistance ?? autoFocus;
  const fStop = dofCfg?.fStop ?? (shot.size === 'CU' || shot.size === 'ECU' ? 2.8 : 5.6);

  return { pos, aim, rollRad, fov, focusDistance, fStop, dofEnabled, shot };
}

interface RawShotPoseResult {
  pos: THREE.Vector3;
  aim: THREE.Vector3;
  fov: number;
  sightTargets: THREE.Vector3[];
  refFrontFwd?: THREE.Vector3;
  twoShotSpanVec?: THREE.Vector3;
  otherHeads: THREE.Vector3[];
  otsOverHeadRef?: THREE.Vector3;
  floorY: number;
  worldId?: 'village' | 'city';
  forceAnchor: boolean;
}

function rotateRelAroundY(pos: THREE.Vector3, aim: THREE.Vector3, deg: number): void {
  if (deg === 0) return;
  const rad = THREE.MathUtils.degToRad(deg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = pos.x - aim.x;
  const dz = pos.z - aim.z;
  pos.x = aim.x + dx * cos + dz * sin;
  pos.z = aim.z - dx * sin + dz * cos;
}

function computeBaseCameraPose(
  props: CameraDirectorProps,
  shot: Shot,
  sec: number,
  e: number,
  u: number,
  effectiveMove: CameraMove,
  subjects: Record<string, Vec3> | undefined,
  subjectHeads: Record<string, Vec3> | undefined,
  subjectFacings: Record<string, number> | undefined,
  orbitOffsetDeg: number,
  startOverHeadY?: number
): RawShotPoseResult {
  const anchors = props.location?.cameraAnchors ?? props.anchors;
  const anchor = resolveAnchor(anchors, shot.anchor ?? 'wide');

  const pos = anchor.pos.clone();
  const aim = anchor.target.clone();
  const fov = shot.lensMm ? lensToFov(shot.lensMm) : anchor.fov ?? 45;

  const side: 1 | -1 = shot.cameraSide ?? props.cameraSide ?? 1;
  const charAId = props.axis?.[0] ?? Object.keys(subjects ?? {})[0];
  const charBId = props.axis?.[1] ?? Object.keys(subjects ?? {})[1];

  const forceAnchor =
    shot.target === 'location' ||
    shot.angle === 'aerial' ||
    (shot.anchor === 'aerial' && !shot.twoShot);

  const isTwoShot = shot.twoShot || shot.target === 'both' || shot.target === 'two-shot';
  const subj = subjects?.[shot.target];

  let handledTwoShotCrane = false;
  let refFrontFwd: THREE.Vector3 | undefined;
  let twoShotSpanVec: THREE.Vector3 | undefined;
  let otsOverHeadRef: THREE.Vector3 | undefined;
  const worldId = props.worldId ?? inferWorldId(props.location);
  const sightTargets: THREE.Vector3[] = [aim];

  if (!forceAnchor && isTwoShot) {
    // ── TWO-SHOT FRAMING (Membidik KEDUA karakter bersama dalam 1 frame 9:16) ──
    if (charAId && charBId && subjects?.[charAId] && subjects?.[charBId]) {
      const posA = new THREE.Vector3(...subjects[charAId]);
      const posB = new THREE.Vector3(...subjects[charBId]);
      const headA = subjectHeads?.[charAId]
        ? new THREE.Vector3(...subjectHeads[charAId])
        : new THREE.Vector3(posA.x, posA.y + 1.40, posA.z);
      const headB = subjectHeads?.[charBId]
        ? new THREE.Vector3(...subjectHeads[charBId])
        : new THREE.Vector3(posB.x, posB.y + 1.40, posB.z);
      sightTargets.push(headA, headB);

      const midHead = headA.clone().add(headB).multiplyScalar(0.5);
      const distAB = Math.max(0.6, posA.distanceTo(posB));
      const spanVec = posB.clone().sub(posA).setY(0);
      twoShotSpanVec = spanVec;

      const axisDir = spanVec.clone();
      if (axisDir.lengthSq() > 1e-4) axisDir.normalize();
      else axisDir.set(1, 0, 0);

      const vFovRad = THREE.MathUtils.degToRad(fov);
      const hFovTan = Math.tan(vFovRad / 2) * (9 / 16);

      const fA = subjectFacings?.[charAId];
      const fB = subjectFacings?.[charBId];
      const fwdA = fA !== undefined ? new THREE.Vector3(Math.sin(fA), 0, Math.cos(fA)).normalize() : undefined;
      const fwdB = fB !== undefined ? new THREE.Vector3(Math.sin(fB), 0, Math.cos(fB)).normalize() : undefined;

      let camDir: THREE.Vector3;
      let twoShotDist: number;

      if (fwdA && fwdB && fwdA.dot(fwdB) > 0.35) {
        // Mode searah (jalan/berdoa berdampingan): tempatkan kamera di depan 3/4 agar wajah terlihat
        const avgFwd = fwdA.clone().add(fwdB).normalize();
        refFrontFwd = avgFwd;
        camDir = avgFwd
          .clone()
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), side * THREE.MathUtils.degToRad(32))
          .normalize();
        const camRight = new THREE.Vector3(-camDir.z, 0, camDir.x).normalize();
        const projSpan = Math.abs(spanVec.dot(camRight)) + 0.5;
        const distForWidth = Math.max(4.0, (projSpan * 0.5) / Math.max(1e-4, hFovTan * 0.68));

        if (shot.size === 'EWS') twoShotDist = Math.max(distForWidth * 1.8, 12.0);
        else if (shot.size === 'WS') twoShotDist = Math.max(distForWidth * 1.3, 7.0);
        else if (shot.size === 'MCU') twoShotDist = Math.max(distForWidth * 0.85, 3.6);
        else twoShotDist = distForWidth;
      } else {
        // Mode berhadapan: 3/4 depth staging di satu sisi axis 180°
        const az = THREE.MathUtils.degToRad(shot.azimuthDeg ?? 50);
        camDir = axisDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -side * az).normalize();
        const camRight = new THREE.Vector3(-camDir.z, 0, camDir.x).normalize();
        const projSpan = Math.abs(spanVec.dot(camRight));
        const distForWidth = Math.max(3.8, (projSpan * 0.5) / Math.max(1e-4, hFovTan * 0.68));

        if (shot.size === 'EWS') twoShotDist = Math.max(distForWidth * 1.8, distAB * 4.5, 12.0);
        else if (shot.size === 'WS') twoShotDist = Math.max(distForWidth * 1.25, distAB * 3.2, 7.0);
        else if (shot.size === 'MCU') twoShotDist = Math.max(distForWidth * 0.85, 3.2);
        else twoShotDist = distForWidth;
      }

      const headroomShift = shot.headroom ? HEADROOM_Y_SHIFT[shot.headroom] : 0;
      aim.set(midHead.x, midHead.y - 0.22 + headroomShift, midHead.z);
      const camY = resolveElevatedCamY(midHead.y, shot, -0.05, -0.4, 0.5);

      if (shot.twoShot && effectiveMove === 'craneBack') {
        twoShotDist = Math.max(twoShotDist, 6.2);
        pos.copy(aim).addScaledVector(camDir, twoShotDist).setY(camY);
        rotateRelAroundY(pos, aim, orbitOffsetDeg);
        const awayDir = pos.clone().sub(aim).setY(0);
        if (awayDir.lengthSq() > 1e-6) awayDir.normalize();
        else awayDir.copy(camDir);
        pos.addScaledVector(awayDir, 5.0 * e);
        pos.y += 3.8 * e;
        aim.y += 1.0 * e;
        handledTwoShotCrane = true;
      } else if (shot.twoShot && effectiveMove === 'crane' && (shot.anchor === 'aerial' || shot.size === 'WS')) {
        twoShotDist = Math.max(twoShotDist, 7.0);
        pos.copy(aim).addScaledVector(camDir, twoShotDist).setY(camY);
        rotateRelAroundY(pos, aim, orbitOffsetDeg);
        const awayDir = pos.clone().sub(aim).setY(0);
        if (awayDir.lengthSq() > 1e-6) awayDir.normalize();
        else awayDir.copy(camDir);
        pos.y += 4.5 * e;
        pos.addScaledVector(awayDir, 3.5 * e);
        aim.y += 1.8 * e;
        handledTwoShotCrane = true;
      } else {
        pos.copy(aim).addScaledVector(camDir, twoShotDist).setY(camY);
        rotateRelAroundY(pos, aim, orbitOffsetDeg);
      }
    }
  } else if (!forceAnchor && subj) {
    const subjPos = new THREE.Vector3(...subj);
    const headPos = subjectHeads?.[shot.target]
      ? new THREE.Vector3(...subjectHeads[shot.target])
      : new THREE.Vector3(subjPos.x, subjPos.y + 1.40, subjPos.z);
    sightTargets.push(headPos);

    const dist = SINGLE_SHOT_DIST[shot.size];

    const hasTwoSubjects = Boolean(
      charAId && charBId && charAId !== charBId && subjects?.[charAId] && subjects?.[charBId]
    );
    let axisDir = new THREE.Vector3(1, 0, 0);
    if (hasTwoSubjects) {
      axisDir = toVec3(subjects![charBId], [1, 0, 0])
        .sub(toVec3(subjects![charAId], [0, 0, 0]))
        .setY(0);
      if (axisDir.lengthSq() > 1e-6) axisDir.normalize();
      else axisDir.set(1, 0, 0);
    }

    const fSubj = subjectFacings?.[shot.target];
    const subjFwd =
      fSubj !== undefined
        ? new THREE.Vector3(Math.sin(fSubj), 0, Math.cos(fSubj)).normalize()
        : axisDir.clone().multiplyScalar(shot.target === charBId ? -1 : 1).normalize();
    refFrontFwd = subjFwd;

    // Vektor tegak lurus axis di sisi 180° yang konsisten
    const perpDir = hasTwoSubjects
      ? new THREE.Vector3(-axisDir.z, 0, axisDir.x).multiplyScalar(side).normalize()
      : new THREE.Vector3(subjFwd.z, 0, -subjFwd.x).multiplyScalar(side).normalize();

    let aimYOffset = -0.16;
    if (shot.size === 'ECU') aimYOffset = -0.06;
    else if (shot.size === 'MCU') aimYOffset = -0.26;
    else if (shot.size === 'MS') aimYOffset = -0.42;
    else if (shot.size === 'WS' || shot.size === 'EWS') aimYOffset = -0.65;
    if (shot.headroom) aimYOffset += HEADROOM_Y_SHIFT[shot.headroom];

    aim.set(headPos.x, headPos.y + aimYOffset, headPos.z);

    const camY = resolveElevatedCamY(headPos.y, shot, -0.04, -0.38, 0.40);

    let usedOts = false;
    if (shot.angle === 'ots' && shot.over && subjects?.[shot.over]) {
      const overSubjPos = new THREE.Vector3(...subjects[shot.over]);
      const overHead = subjectHeads?.[shot.over]
        ? new THREE.Vector3(...subjectHeads[shot.over])
        : new THREE.Vector3(overSubjPos.x, overSubjPos.y + 1.40, overSubjPos.z);

      const toSubj = headPos.clone().sub(overHead).setY(0);
      const len = toSubj.length();

      const fOver = subjectFacings?.[shot.over];
      const overFwd =
        fOver !== undefined
          ? new THREE.Vector3(Math.sin(fOver), 0, Math.cos(fOver)).normalize()
          : len > 1e-4
            ? toSubj.clone().normalize()
            : subjFwd.clone().negate();

      if (len >= 0.8 && len <= 4.5 && overFwd.dot(subjFwd) <= 0.5) {
        toSubj.normalize();
        const latDir = new THREE.Vector3(-toSubj.z, 0, toSubj.x).normalize();
        if (latDir.dot(perpDir) < 0) latDir.negate();

        pos
          .copy(overHead)
          .addScaledVector(toSubj, -0.55)
          .addScaledVector(latDir, 0.72);
        let otsY = overHead.y - 0.04;
        if (startOverHeadY !== undefined) {
          const baseY = startOverHeadY - 0.04;
          otsY = Math.max(baseY - 0.12, Math.min(baseY + 0.12, otsY));
        }
        pos.y = otsY;
        usedOts = true;
        otsOverHeadRef = overHead;
      }
    }

    if (!usedOts) {
      // Single Shot: unit camDir di depan-3/4 wajah subjek, konsisten pada sisi 180°
      const baseRad = THREE.MathUtils.degToRad(BASE_FRONT_ANGLE_DEG[shot.size]);
      const lat = perpDir.clone().addScaledVector(subjFwd, -perpDir.dot(subjFwd));
      if (lat.lengthSq() > 1e-4) {
        lat.normalize();
      } else {
        lat.set(subjFwd.z, 0, -subjFwd.x).multiplyScalar(side).normalize();
      }

      let camDir: THREE.Vector3;
      if (shot.azimuthDeg !== undefined && hasTwoSubjects) {
        const azRad = THREE.MathUtils.degToRad(shot.azimuthDeg);
        const cand = axisDir
          .clone()
          .multiplyScalar(Math.cos(azRad))
          .addScaledVector(perpDir, Math.sin(azRad))
          .normalize();

        // Jaga sisi 180° agar komponen lateral tetap sejajar perpDir
        if (cand.dot(perpDir) < 0 && lat.dot(perpDir) > 1e-4) {
          const projFwd = cand.dot(subjFwd);
          const projLat = Math.abs(cand.dot(lat));
          cand.copy(subjFwd).multiplyScalar(projFwd).addScaledVector(lat, projLat).normalize();
        }

        const rawFwdDot = cand.dot(subjFwd);
        const latVec = cand.clone().addScaledVector(subjFwd, -rawFwdDot);
        if (latVec.lengthSq() > 1e-6) {
          latVec.normalize();
          if (latVec.dot(perpDir) < 0 && lat.dot(perpDir) > 1e-4) {
            latVec.copy(lat);
          }
        } else {
          latVec.copy(lat);
        }

        if (rawFwdDot < 0.50) {
          const clampedFwd = rawFwdDot < 0 ? Math.cos(baseRad) : 0.55;
          const latComp = Math.sqrt(Math.max(0, 1 - clampedFwd * clampedFwd));
          camDir = subjFwd
            .clone()
            .multiplyScalar(clampedFwd)
            .addScaledVector(latVec, latComp)
            .normalize();
        } else {
          camDir = cand;
        }
      } else {
        camDir = subjFwd
          .clone()
          .multiplyScalar(Math.cos(baseRad))
          .addScaledVector(lat, Math.sin(baseRad))
          .normalize();
      }

      pos.copy(headPos).addScaledVector(camDir, dist);
      pos.y = camY;
    }

    // Lead / nose room: geser titik bidik halus ke arah pandang subjek
    if (shot.size !== 'EWS' && shot.size !== 'WS') {
      const maxOffset = shot.size === 'CU' || shot.size === 'ECU' ? 0.04 : 0.08;
      aim.addScaledVector(subjFwd, maxOffset);
    }

    rotateRelAroundY(pos, aim, orbitOffsetDeg);
  }

  // Gerak kamera bermotif (tanpa motif = static)
  if (!handledTwoShotCrane && effectiveMove !== 'static') {
    applyCameraMove(pos, aim, effectiveMove, shot, e, u);
  }

  // Handheld halus deterministik
  const hh = effectiveMove === 'handheld' ? 1 : (props.handheld ?? 0);
  if (hh > 0) {
    applyHandheldNoise(pos, aim, sec, (props.seed ?? 1) + shot.startSec, hh);
  }

  const fallbackSubjY =
    subj?.[1] ?? (charAId && subjects?.[charAId] ? subjects[charAId][1] : 0);
  const floorY = props.location?.groundY ?? fallbackSubjY;

  const otherHeads: THREE.Vector3[] = [];
  if (!forceAnchor && !isTwoShot && shot.angle !== 'ots' && subjectHeads) {
    for (const [otherId, otherHeadArr] of Object.entries(subjectHeads)) {
      if (otherId !== shot.target) {
        otherHeads.push(new THREE.Vector3(...otherHeadArr));
      }
    }
  }

  return {
    pos,
    aim,
    fov,
    sightTargets,
    refFrontFwd,
    twoShotSpanVec,
    otherHeads,
    otsOverHeadRef,
    floorY,
    worldId,
    forceAnchor,
  };
}

const LOCKED_ORBIT_ANGLES = [
  0, 12, -12, 24, -24, 36, -36, 48, -48, 60, -60, 75, -75, 90, -90,
  110, -110, 130, -130, 150, -150, 170, -170,
] as const;

/**
 * Hitung pose kamera deterministik murni untuk detik `sec`.
 * Memakai `WorldLocation.cameraAnchors` sebagai jangkar ruang serta menerapkan:
 * - Aturan 180° axis
 * - Headroom & rule of thirds
 * - Lead / nose room ke arah pandang subjek
 * - Easing ease-in-out dan gerak bermotif
 * - Pemilihan sudut bebas halangan terkunci per-shot (tanpa loncatan/strobe antar-frame)
 */
export function computePose(props: CameraDirectorProps, sec: number): CameraPose | undefined {
  const hit = shotAt(props.shots, sec);
  if (!hit) return undefined;

  const { shot, u } = hit;
  const e = easeInOut(u);
  const effectiveMove: CameraMove = shot.motive?.trim() ? shot.move : 'static';

  // Override manual penuh (Free-Cam / author picked exact pose)
  if (shot.cameraOverride) {
    const pos = new THREE.Vector3(...shot.cameraOverride.position);
    const aim = new THREE.Vector3(...shot.cameraOverride.target);
    const fov = shot.cameraOverride.fov ?? (shot.lensMm ? lensToFov(shot.lensMm) : 45);

    if (effectiveMove !== 'static') {
      if (effectiveMove === 'handheld') {
        applyHandheldNoise(pos, aim, sec, (props.seed ?? 1) + shot.startSec, 1);
      } else {
        applyCameraMove(pos, aim, effectiveMove, shot, e, u);
      }
    }

    return finalizePose(pos, aim, fov, shot, props.dof);
  }

  const allObstacles = [...(props.obstacles ?? []), ...(props.location?.obstacles ?? [])];
  const edge = Math.min(0.05, Math.max(0.001, shot.durSec * 0.1));
  const evalSamples =
    props.shotPathSamples && props.shotPathSamples.length > 0
      ? props.shotPathSamples
      : [
          {
            sec: shot.startSec + edge,
            subjects: props.subjects ?? {},
            subjectHeads: props.subjectHeads ?? {},
            subjectFacings: props.subjectFacings ?? {},
          },
          {
            sec: shot.startSec + shot.durSec * 0.5,
            subjects: props.subjects ?? {},
            subjectHeads: props.subjectHeads ?? {},
            subjectFacings: props.subjectFacings ?? {},
          },
          {
            sec: shot.startSec + Math.max(edge, shot.durSec - edge),
            subjects: props.subjects ?? {},
            subjectHeads: props.subjectHeads ?? {},
            subjectFacings: props.subjectFacings ?? {},
          },
        ];

  const startOverHeadY =
    shot.angle === 'ots' && shot.over ? evalSamples[0]?.subjectHeads[shot.over]?.[1] : undefined;

  const probeBase = computeBaseCameraPose(
    props,
    shot,
    sec,
    e,
    u,
    effectiveMove,
    props.subjects,
    props.subjectHeads,
    props.subjectFacings,
    0,
    startOverHeadY
  );

  let lockedOrbitDeg = 0;
  if (
    !probeBase.forceAnchor &&
    (allObstacles.length > 0 || probeBase.otherHeads.length > 0 || probeBase.otsOverHeadRef)
  ) {
    const evaluateAngleAcrossSamples = (deg: number): number => {
      let totalScore = 0;
      for (const samp of evalSamples) {
        const sampU =
          shot.durSec > 0 ? Math.min(1, Math.max(0, (samp.sec - shot.startSec) / shot.durSec)) : 0;
        const sampE = easeInOut(sampU);
        const r = computeBaseCameraPose(
          props,
          shot,
          samp.sec,
          sampE,
          sampU,
          effectiveMove,
          samp.subjects,
          samp.subjectHeads,
          samp.subjectFacings,
          deg,
          startOverHeadY
        );
        if (r.worldId) {
          const sY = surfaceYAt(r.worldId, r.pos.x, r.pos.z, {
            preferFlyover: props.location?.id === 'flyover',
          });
          const minY = Math.max(r.floorY, sY) + 0.8;
          if (r.pos.y < minY) r.pos.y = minY;
        }
        const hits = countObstacleHits(
          r.pos,
          r.sightTargets,
          allObstacles,
          r.floorY,
          r.worldId,
          r.otherHeads,
          r.otsOverHeadRef
        );
        let penalty = 0;
        const dir = r.pos.clone().sub(r.aim).setY(0);
        const dLen = dir.length();
        if (dLen > 1e-4) {
          dir.divideScalar(dLen);
          if (r.refFrontFwd) {
            const dot = dir.dot(r.refFrontFwd);
            if (dot < 0.25) penalty += 1000 + (0.25 - dot) * 100;
          }
          if (r.twoShotSpanVec && r.twoShotSpanVec.lengthSq() > 0.25) {
            const candRight = new THREE.Vector3(-dir.z, 0, dir.x);
            const sepRatio = Math.abs(r.twoShotSpanVec.dot(candRight)) / r.twoShotSpanVec.length();
            if (sepRatio < 0.32) penalty += (0.32 - sepRatio) * 50;
          }
        }
        totalScore += hits * 100 + penalty;
      }
      return totalScore;
    };

    const score0 = evaluateAngleAcrossSamples(0);
    if (score0 > 0) {
      let bestDeg = 0;
      let bestScore = score0;
      for (const deg of LOCKED_ORBIT_ANGLES) {
        if (deg === 0) continue;
        const score = evaluateAngleAcrossSamples(deg) + Math.abs(deg) * 0.02;
        if (score < bestScore) {
          bestScore = score;
          bestDeg = deg;
        }
      }
      lockedOrbitDeg = bestDeg;
    }
  }

  const cur = computeBaseCameraPose(
    props,
    shot,
    sec,
    e,
    u,
    effectiveMove,
    props.subjects,
    props.subjectHeads,
    props.subjectFacings,
    lockedOrbitDeg,
    startOverHeadY
  );

  // Dorongan silinder radial halus & kontinu (tanpa loncatan binary sightline mid-shot)
  for (const o of allObstacles) {
    const oTopY = obstacleTopY(o, cur.floorY, cur.worldId);
    if (oTopY === undefined || cur.pos.y < oTopY + 0.4) {
      const dx = cur.pos.x - o.x;
      const dz = cur.pos.z - o.z;
      const d = Math.hypot(dx, dz);
      const minD = o.r + 0.45;
      if (d < minD) {
        const nx = d > 1e-4 ? dx / d : 0;
        const nz = d > 1e-4 ? dz / d : 1;
        cur.pos.x = o.x + nx * minD;
        cur.pos.z = o.z + nz * minD;
      }
    }
  }

  for (const otherHead of cur.otherHeads) {
    if (cur.pos.distanceTo(otherHead) < 0.85) {
      const away = cur.pos.clone().sub(otherHead).setY(0);
      if (away.lengthSq() > 1e-6) away.normalize();
      else away.set(0, 0, 1);
      cur.pos.x = otherHead.x + away.x * 0.88;
      cur.pos.z = otherHead.z + away.z * 0.88;
    }
  }

  // Ketinggian minimum terkunci per-shot agar kamera tidak loncat saat melintasi tepi dek
  let maxSampleSurfaceY = cur.floorY;
  if (cur.worldId) {
    const preferFlyover = props.location?.id === 'flyover';
    maxSampleSurfaceY = surfaceYAt(cur.worldId, cur.pos.x, cur.pos.z, { preferFlyover });
    for (const samp of evalSamples) {
      const sampU =
        shot.durSec > 0 ? Math.min(1, Math.max(0, (samp.sec - shot.startSec) / shot.durSec)) : 0;
      const sampE = easeInOut(sampU);
      const sr = computeBaseCameraPose(
        props,
        shot,
        samp.sec,
        sampE,
        sampU,
        effectiveMove,
        samp.subjects,
        samp.subjectHeads,
        samp.subjectFacings,
        lockedOrbitDeg,
        startOverHeadY
      );
      const sy = surfaceYAt(cur.worldId, sr.pos.x, sr.pos.z, { preferFlyover });
      if (sy > maxSampleSurfaceY) maxSampleSurfaceY = sy;
    }
  }
  const minCamY = Math.max(cur.floorY, maxSampleSurfaceY) + 0.8;
  if (cur.pos.y < minCamY) cur.pos.y = minCamY;

  return finalizePose(cur.pos, cur.aim, cur.fov, shot, props.dof);
}

/**
 * Komponen R3F: pasang di dalam <Canvas>.
 * Deterministik per frame (kompatibel Remotion).
 *
 * Prinsip Sinematografi:
 * - Hard Cut Instan antar-shot (tanpa warp/glide 12-frame yang memusingkan)
 * - Gerak kamera halus (pushIn, pullOut, pan, crane) terjadi di DALAM shot, bukan di potongan scene
 * - Handheld noise deterministik per detik
 */
export function CameraDirector(props: CameraDirectorProps) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const fps = props.fps ?? 30;

  useMemo(() => props.shots, [props.shots]);

  useFrame((state) => {
    if (props.disabled) return;

    const sec = props.frame !== undefined ? props.frame / fps : state.clock.elapsedTime;

    const pose = computePose(props, sec);
    if (!pose) return;

    // Hard cut instan pada setiap pergantian shot: posisi, bidikan, dan lensa langsung tepat
    camera.position.copy(pose.pos);
    camera.lookAt(pose.aim);
    if (pose.rollRad !== 0) {
      camera.rotateZ(pose.rollRad);
    }

    if (Math.abs(camera.fov - pose.fov) > 1e-4 || Math.abs(camera.focus - pose.focusDistance) > 1e-3) {
      camera.fov = pose.fov;
      camera.focus = pose.focusDistance;
      camera.updateProjectionMatrix();
    }

    camera.userData.cinematography = {
      shotId: pose.shot.id,
      size: pose.shot.size,
      lensMm: pose.shot.lensMm,
      focusDistance: pose.focusDistance,
      fStop: pose.fStop,
      dofEnabled: pose.dofEnabled,
    };

    props.onPose?.(pose);
  });

  return null;
}

export default CameraDirector;
