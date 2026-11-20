import * as THREE from 'three';
import { computePose } from '../src/cinematography/CameraDirector';
import type { Shot } from '../src/cinematography/shotTypes';
import { PRODUCTION_STORIES, getStoryById, type StoryRegistryEntry } from '../src/scenes/registry';
import { evaluateSceneAtTime } from '../src/scenes/sceneState';
import type { ProductionScene, ProductionStory } from '../src/scenes/types';
import { resolveStagingPreset, surfaceYAt } from '../src/worlds/shared/spatial';

type Severity = 'PASS' | 'WARN' | 'FAIL';

interface Finding {
  check:
    | 'framing-9-16'
    | 'facing'
    | 'clipping'
    | 'obstacle-sightline'
    | 'ground-alignment'
    | 'timeline-continuity'
    | 'camera-continuity';
  severity: 'WARN' | 'FAIL';
  sampleTime?: number;
  message: string;
}

interface ShotAuditResult {
  shotId: string;
  sceneId: string;
  target: string;
  size: string;
  angle: string;
  move: string;
  startSec: number;
  durSec: number;
  status: Severity;
  findings: Finding[];
}

interface StoryAuditReport {
  key: string;
  id: string;
  title: string;
  summary: {
    totalShots: number;
    pass: number;
    warn: number;
    fail: number;
  };
  shots: ShotAuditResult[];
}

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const f of findings) {
    const key = `${f.severity}:${f.check}:${f.message}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(f);
    }
  }
  return out;
}

function computeShotSampleTimes(shot: Shot): number[] {
  const edgeOffset = Math.min(0.12, shot.durSec * 0.2);
  return [
    shot.startSec + edgeOffset,
    shot.startSec + shot.durSec * 0.5,
    shot.startSec + shot.durSec - edgeOffset,
  ];
}

function auditShotSamples(
  story: ProductionStory,
  scene: ProductionScene,
  shot: Shot
): Finding[] {
  const findings: Finding[] = [];
  if (shot.durSec <= 0) {
    findings.push({
      check: 'timeline-continuity',
      severity: 'FAIL',
      message: `Shot has non-positive duration (${shot.durSec}s)`,
    });
    return findings;
  }

  const samples = computeShotSampleTimes(shot);
  const cam = new THREE.PerspectiveCamera(45, 9 / 16, 0.1, 500);
  const castIds = scene.cast.map((c) => c.castId);
  const isTwoShot = Boolean(shot.twoShot || shot.target === 'both');
  const isSingleCharShot = !isTwoShot && shot.target !== 'location';

  for (const t of samples) {
    const evalFrame = evaluateSceneAtTime(story, t);
    const pose = computePose(
      {
        shots: scene.shots,
        location: evalFrame.activeLocation,
        worldId: scene.worldId,
        subjects: evalFrame.subjects,
        subjectHeads: evalFrame.subjectHeads,
        subjectFacings: evalFrame.subjectFacings,
        shotPathSamples: evalFrame.shotPathSamples,
        axis: scene.axis,
        obstacles: evalFrame.obstacles,
        cameraSide: evalFrame.cameraSide,
      },
      t
    );

    if (!pose) {
      findings.push({
        check: 'timeline-continuity',
        severity: 'FAIL',
        sampleTime: t,
        message: `computePose returned undefined at t=${t.toFixed(2)}s`,
      });
      continue;
    }

    cam.fov = pose.fov;
    cam.aspect = 9 / 16;
    cam.near = 0.1;
    cam.far = 500;
    cam.position.copy(pose.pos);
    cam.lookAt(pose.aim);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);

    // 1. 9:16 Screen Framing (NDC Projection)
    if (isSingleCharShot) {
      const head = evalFrame.subjectHeads[shot.target];
      if (!head) {
        findings.push({
          check: 'framing-9-16',
          severity: 'FAIL',
          sampleTime: t,
          message: `Missing subjectHeads entry for target '${shot.target}'`,
        });
      } else {
        const ndc = new THREE.Vector3(...head).project(cam);
        if (Math.abs(ndc.x) > 0.85 || ndc.y < -0.55 || ndc.y > 0.88 || ndc.z > 1) {
          findings.push({
            check: 'framing-9-16',
            severity: 'FAIL',
            sampleTime: t,
            message: `Single-shot target '${shot.target}' out of safe 9:16 NDC (${ndc.x.toFixed(2)}, ${ndc.y.toFixed(2)}, z=${ndc.z.toFixed(2)})`,
          });
        } else if (Math.abs(ndc.x) > 0.72 || ndc.y > 0.78) {
          findings.push({
            check: 'framing-9-16',
            severity: 'WARN',
            sampleTime: t,
            message: `Single-shot target '${shot.target}' near 9:16 edge NDC (${ndc.x.toFixed(2)}, ${ndc.y.toFixed(2)})`,
          });
        }
      }
    } else if (isTwoShot && castIds.length >= 2) {
      const headA = evalFrame.subjectHeads[castIds[0]];
      const headB = evalFrame.subjectHeads[castIds[1]];
      if (!headA || !headB) {
        findings.push({
          check: 'framing-9-16',
          severity: 'FAIL',
          sampleTime: t,
          message: `Missing subjectHeads for two-shot cast (${castIds[0]}, ${castIds[1]})`,
        });
      } else {
        const ndcA = new THREE.Vector3(...headA).project(cam);
        const ndcB = new THREE.Vector3(...headB).project(cam);
        if (
          Math.abs(ndcA.x) > 0.92 ||
          ndcA.z > 1 ||
          Math.abs(ndcB.x) > 0.92 ||
          ndcB.z > 1
        ) {
          findings.push({
            check: 'framing-9-16',
            severity: 'FAIL',
            sampleTime: t,
            message: `Two-shot cast clipped outside 9:16 NDC (A=${ndcA.x.toFixed(2)},z=${ndcA.z.toFixed(2)}; B=${ndcB.x.toFixed(2)},z=${ndcB.z.toFixed(2)})`,
          });
        } else {
          const sep = Math.abs(ndcA.x - ndcB.x);
          if (Math.abs(ndcA.x) > 0.82 || Math.abs(ndcB.x) > 0.82) {
            findings.push({
              check: 'framing-9-16',
              severity: 'WARN',
              sampleTime: t,
              message: `Two-shot cast near 9:16 edge NDC (A.x=${ndcA.x.toFixed(2)}, B.x=${ndcB.x.toFixed(2)})`,
            });
          }
          if (sep < 0.12) {
            findings.push({
              check: 'framing-9-16',
              severity: 'WARN',
              sampleTime: t,
              message: `Two-shot subjects nearly overlapping horizontally (|ndcA.x - ndcB.x|=${sep.toFixed(2)})`,
            });
          }
        }
      }
    }

    // 2. Facing / Back-of-Head Check
    if (
      isSingleCharShot &&
      shot.angle !== 'aerial' &&
      shot.size !== 'EWS' &&
      shot.size !== 'WS'
    ) {
      const facing = evalFrame.subjectFacings[shot.target];
      const pos = evalFrame.subjects[shot.target];
      if (facing !== undefined && pos) {
        const charFwd = new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing)).normalize();
        const toCam = new THREE.Vector3(pose.pos.x - pos[0], 0, pose.pos.z - pos[2]);
        if (toCam.lengthSq() > 1e-6) {
          toCam.normalize();
          const dot = charFwd.dot(toCam);
          if (dot < 0.0) {
            findings.push({
              check: 'facing',
              severity: 'FAIL',
              sampleTime: t,
              message: `Camera behind '${shot.target}' (charFwd·toCam=${dot.toFixed(2)})`,
            });
          } else if (dot < 0.25) {
            findings.push({
              check: 'facing',
              severity: 'WARN',
              sampleTime: t,
              message: `Sharp profile angle on '${shot.target}' (charFwd·toCam=${dot.toFixed(2)})`,
            });
          }
        }
      }
    } else if (isTwoShot && shot.angle !== 'aerial' && castIds.length >= 2) {
      const fA = evalFrame.subjectFacings[castIds[0]];
      const fB = evalFrame.subjectFacings[castIds[1]];
      const pA = evalFrame.subjects[castIds[0]];
      const pB = evalFrame.subjects[castIds[1]];
      if (fA !== undefined && fB !== undefined && pA && pB) {
        const fwdA = new THREE.Vector3(Math.sin(fA), 0, Math.cos(fA)).normalize();
        const fwdB = new THREE.Vector3(Math.sin(fB), 0, Math.cos(fB)).normalize();
        if (fwdA.dot(fwdB) > 0.35) {
          const avgFwd = fwdA.clone().add(fwdB).normalize();
          const midX = (pA[0] + pB[0]) * 0.5;
          const midZ = (pA[2] + pB[2]) * 0.5;
          const toCam = new THREE.Vector3(pose.pos.x - midX, 0, pose.pos.z - midZ);
          if (toCam.lengthSq() > 1e-6) {
            toCam.normalize();
            const dot = avgFwd.dot(toCam);
            if (dot < 0.0) {
              findings.push({
                check: 'facing',
                severity: 'FAIL',
                sampleTime: t,
                message: `Two-shot shooting backs during same-direction action (avgFwd·toCam=${dot.toFixed(2)})`,
              });
            }
          }
        }
      }
    }

    // 3. Distance / Clipping
    for (const [cid, headArr] of Object.entries(evalFrame.subjectHeads)) {
      const dist = pose.pos.distanceTo(new THREE.Vector3(...headArr));
      if (dist < 0.65) {
        findings.push({
          check: 'clipping',
          severity: 'FAIL',
          sampleTime: t,
          message: `Camera too close to '${cid}' head (${dist.toFixed(2)}m < 0.65m)`,
        });
      }
    }

    // 4. Obstacle Collision & 3D Sightline
    const targetHeads: Array<[string, [number, number, number]]> = [];
    if (isTwoShot) {
      for (const cid of castIds) {
        const h = evalFrame.subjectHeads[cid];
        if (h) targetHeads.push([cid, h]);
      }
    } else if (isSingleCharShot) {
      const h = evalFrame.subjectHeads[shot.target];
      if (h) targetHeads.push([shot.target, h]);
    }

    for (const o of evalFrame.obstacles) {
      const oGroundY = surfaceYAt(scene.worldId, o.x, o.z);
      const oTopY = oGroundY + (o.h ?? 5);
      const camDistXZ = Math.hypot(pose.pos.x - o.x, pose.pos.z - o.z);
      if (camDistXZ < o.r + 0.15 && pose.pos.y < oTopY) {
        findings.push({
          check: 'obstacle-sightline',
          severity: 'FAIL',
          sampleTime: t,
          message: `Camera inside obstacle at (${o.x.toFixed(1)}, ${o.z.toFixed(1)}) r=${o.r.toFixed(2)}`,
        });
      }

      for (const [cid, h] of targetHeads) {
        const abX = h[0] - pose.pos.x;
        const abZ = h[2] - pose.pos.z;
        const abLenSq = abX * abX + abZ * abZ;
        if (abLenSq <= 1e-6) continue;
        const tSeg = ((o.x - pose.pos.x) * abX + (o.z - pose.pos.z) * abZ) / abLenSq;
        if (tSeg <= 0.03 || tSeg >= 0.97) continue;
        const closestX = pose.pos.x + abX * tSeg;
        const closestZ = pose.pos.z + abZ * tSeg;
        const distRayXZ = Math.hypot(o.x - closestX, o.z - closestZ);
        const rayY = pose.pos.y + (h[1] - pose.pos.y) * tSeg;
        if (rayY < oTopY) {
          if (distRayXZ < o.r + 0.05) {
            findings.push({
              check: 'obstacle-sightline',
              severity: 'FAIL',
              sampleTime: t,
              message: `Sightline to '${cid}' blocked by obstacle at (${o.x.toFixed(1)}, ${o.z.toFixed(1)})`,
            });
          } else if (distRayXZ < o.r + 0.25) {
            findings.push({
              check: 'obstacle-sightline',
              severity: 'WARN',
              sampleTime: t,
              message: `Sightline to '${cid}' passes close to obstacle at (${o.x.toFixed(1)}, ${o.z.toFixed(1)})`,
            });
          }
        }
      }
    }

    // 5. Ground Clearance & Surface Alignment
    const camSurfaceY = surfaceYAt(scene.worldId, pose.pos.x, pose.pos.z);
    if (pose.pos.y < camSurfaceY + 0.5) {
      findings.push({
        check: 'ground-alignment',
        severity: 'FAIL',
        sampleTime: t,
        message: `Camera too low relative to surface (camY=${pose.pos.y.toFixed(2)} < surface+0.5=${(camSurfaceY + 0.5).toFixed(2)})`,
      });
    }

    const preset = resolveStagingPreset(evalFrame.activeLocation, scene.stagingPresetId);
    for (const c of evalFrame.charactersState) {
      const placement = scene.cast.find((p) => p.castId === c.castId);
      const slot = placement?.slotId
        ? preset?.slots.find((s) => s.id === placement.slotId)
        : undefined;
      const yOffset = placement?.yOffset ?? slot?.surfaceOffset ?? 0;
      const expectedY = surfaceYAt(scene.worldId, c.position[0], c.position[2]) + yOffset;
      const deltaY = Math.abs(c.position[1] - expectedY);
      if (deltaY > 0.35) {
        findings.push({
          check: 'ground-alignment',
          severity: 'WARN',
          sampleTime: t,
          message: `Character '${c.castId}' Y=${c.position[1].toFixed(2)} deviates ${deltaY.toFixed(2)}m from surface+yOffset (${expectedY.toFixed(2)})`,
        });
      }
    }
  }

  // 7. Temporal Camera Continuity (15 FPS intra-shot jump/strobe check)
  const dt = 1 / 15;
  let prevPos: THREE.Vector3 | null = null;
  for (let t = shot.startSec + 0.01; t < shot.startSec + shot.durSec - 0.01; t += dt) {
    const evalFrame = evaluateSceneAtTime(story, t);
    const pose = computePose(
      {
        shots: scene.shots,
        location: evalFrame.activeLocation,
        worldId: scene.worldId,
        subjects: evalFrame.subjects,
        subjectHeads: evalFrame.subjectHeads,
        subjectFacings: evalFrame.subjectFacings,
        shotPathSamples: evalFrame.shotPathSamples,
        axis: scene.axis,
        obstacles: evalFrame.obstacles,
        cameraSide: evalFrame.cameraSide,
      },
      t
    );
    if (!pose) continue;
    if (prevPos) {
      const inPunchSnap = shot.move === 'axialPunch' && t - shot.startSec <= 0.25;
      const dPos = pose.pos.distanceTo(prevPos);
      if (!inPunchSnap && dPos > 0.35) {
        findings.push({
          check: 'camera-continuity',
          severity: 'FAIL',
          sampleTime: t,
          message: `Intra-shot camera jump of ${dPos.toFixed(2)}m in 1/15s`,
        });
      }
    }
    prevPos = pose.pos.clone();
  }

  return findings;
}

function addSceneContinuityFindings(
  story: ProductionStory,
  scene: ProductionScene,
  shotFindingsMap: Map<string, Finding[]>
): void {
  const pushToShot = (shotId: string, f: Finding) => {
    const arr = shotFindingsMap.get(shotId);
    if (arr) arr.push(f);
  };

  // 6a. Shot timeline gaps/overlaps > 0.25s & Jump-cuts
  if (scene.shots.length > 0) {
    const first = scene.shots[0];
    const startGap = first.startSec - scene.startSec;
    if (Math.abs(startGap) > 0.25) {
      pushToShot(first.id, {
        check: 'timeline-continuity',
        severity: 'FAIL',
        message: `First shot starts at ${first.startSec.toFixed(2)}s vs scene.startSec ${scene.startSec.toFixed(2)}s`,
      });
    }
    const last = scene.shots[scene.shots.length - 1];
    const sceneEnd = scene.startSec + scene.durationSec;
    const endGap = sceneEnd - (last.startSec + last.durSec);
    if (Math.abs(endGap) > 0.25) {
      pushToShot(last.id, {
        check: 'timeline-continuity',
        severity: 'FAIL',
        message: `Last shot ends at ${(last.startSec + last.durSec).toFixed(2)}s vs scene end ${sceneEnd.toFixed(2)}s`,
      });
    }
  }

  for (let i = 1; i < scene.shots.length; i++) {
    const prev = scene.shots[i - 1];
    const curr = scene.shots[i];
    const gap = curr.startSec - (prev.startSec + prev.durSec);
    if (Math.abs(gap) > 0.25) {
      pushToShot(curr.id, {
        check: 'timeline-continuity',
        severity: 'FAIL',
        message: `Shot ${gap > 0 ? 'gap' : 'overlap'} of ${Math.abs(gap).toFixed(2)}s after '${prev.id}'`,
      });
    }

    if (
      prev.target === curr.target &&
      prev.target !== 'location' &&
      !prev.twoShot &&
      !curr.twoShot &&
      prev.size === curr.size &&
      prev.move === curr.move &&
      prev.angle === curr.angle
    ) {
      const cutT = curr.startSec + Math.min(0.05, curr.durSec * 0.1);
      const prevT = Math.max(prev.startSec, prev.startSec + prev.durSec - 0.05);
      const fPrev = evaluateSceneAtTime(story, prevT);
      const fCurr = evaluateSceneAtTime(story, cutT);
      const pPrev = computePose(
        {
          shots: scene.shots,
          location: fPrev.activeLocation,
          worldId: scene.worldId,
          subjects: fPrev.subjects,
          subjectHeads: fPrev.subjectHeads,
          subjectFacings: fPrev.subjectFacings,
          shotPathSamples: fPrev.shotPathSamples,
          axis: scene.axis,
          obstacles: fPrev.obstacles,
          cameraSide: fPrev.cameraSide,
        },
        prevT
      );
      const pCurr = computePose(
        {
          shots: scene.shots,
          location: fCurr.activeLocation,
          worldId: scene.worldId,
          subjects: fCurr.subjects,
          subjectHeads: fCurr.subjectHeads,
          subjectFacings: fCurr.subjectFacings,
          shotPathSamples: fCurr.shotPathSamples,
          axis: scene.axis,
          obstacles: fCurr.obstacles,
          cameraSide: fCurr.cameraSide,
        },
        cutT
      );
      const subj = fCurr.subjects[curr.target];
      if (pPrev && pCurr && subj) {
        const v1 = new THREE.Vector3(pPrev.pos.x - subj[0], 0, pPrev.pos.z - subj[2]);
        const v2 = new THREE.Vector3(pCurr.pos.x - subj[0], 0, pCurr.pos.z - subj[2]);
        if (v1.lengthSq() > 1e-6 && v2.lengthSq() > 1e-6) {
          v1.normalize();
          v2.normalize();
          const deg = (Math.acos(Math.min(1, Math.max(-1, v1.dot(v2)))) * 180) / Math.PI;
          if (deg < 30) {
            pushToShot(curr.id, {
              check: 'timeline-continuity',
              severity: 'WARN',
              message: `Jump-cut risk after '${prev.id}': same target/size/angle/move with ${deg.toFixed(1)}° delta`,
            });
          }
        }
      }
    }
  }

  // 6b. Dialogue lines missing listening: true on non-speaking character
  if (scene.cast.length >= 2) {
    for (const dlg of scene.dialogue) {
      const spk = dlg.speakerId.toLowerCase();
      if (spk === 'narator' || spk === 'narrator') continue;
      const mid = dlg.startSec + dlg.durSec * 0.5;
      const f = evaluateSceneAtTime(story, mid);
      const activeShot =
        scene.shots.find((s) => mid >= s.startSec && mid < s.startSec + s.durSec) ??
        scene.shots[0];
      if (!activeShot) continue;

      for (const ch of f.charactersState) {
        if (ch.castId !== dlg.speakerId && !ch.listening) {
          pushToShot(activeShot.id, {
            check: 'timeline-continuity',
            severity: 'WARN',
            sampleTime: mid,
            message: `Dialogue '${dlg.id}' (${dlg.speakerId} speaking at ${mid.toFixed(1)}s): '${ch.castId}' missing listening: true`,
          });
        }
      }
    }
  }
}

function auditStory(entry: StoryRegistryEntry): StoryAuditReport {
  const { key, story } = entry;
  const shotResults: ShotAuditResult[] = [];

  for (const scene of story.scenes) {
    const shotFindingsMap = new Map<string, Finding[]>();
    for (const shot of scene.shots) {
      shotFindingsMap.set(shot.id, auditShotSamples(story, scene, shot));
    }
    addSceneContinuityFindings(story, scene, shotFindingsMap);

    for (const shot of scene.shots) {
      const findings = dedupeFindings(shotFindingsMap.get(shot.id) ?? []);
      const hasFail = findings.some((f) => f.severity === 'FAIL');
      const hasWarn = findings.some((f) => f.severity === 'WARN');
      shotResults.push({
        shotId: shot.id,
        sceneId: scene.id,
        target: shot.target,
        size: shot.size,
        angle: shot.angle,
        move: shot.move,
        startSec: shot.startSec,
        durSec: shot.durSec,
        status: hasFail ? 'FAIL' : hasWarn ? 'WARN' : 'PASS',
        findings,
      });
    }
  }

  return {
    key,
    id: story.id,
    title: story.title,
    summary: {
      totalShots: shotResults.length,
      pass: shotResults.filter((s) => s.status === 'PASS').length,
      warn: shotResults.filter((s) => s.status === 'WARN').length,
      fail: shotResults.filter((s) => s.status === 'FAIL').length,
    },
    shots: shotResults,
  };
}

function main(): void {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const jsonFlag = args.includes('--json');
  const targetArg = args.find((a) => !a.startsWith('--')) ?? 'all';

  let entries: StoryRegistryEntry[];
  if (targetArg === 'all') {
    entries = PRODUCTION_STORIES;
  } else {
    const foundStory = getStoryById(targetArg);
    const foundEntry = PRODUCTION_STORIES.find(
      (e) => e.key === targetArg || e.story.id === targetArg || e.story === foundStory
    );
    if (!foundEntry) {
      console.error(`Unknown story '${targetArg}'. Available: ${PRODUCTION_STORIES.map((e) => e.key).join(', ')}, all`);
      process.exit(1);
    }
    entries = [foundEntry];
  }

  const reports = entries.map(auditStory);
  const totalFail = reports.reduce((acc, r) => acc + r.summary.fail, 0);
  const totalWarn = reports.reduce((acc, r) => acc + r.summary.warn, 0);
  const totalPass = reports.reduce((acc, r) => acc + r.summary.pass, 0);

  if (jsonFlag) {
    console.log(
      JSON.stringify(
        {
          summary: { pass: totalPass, warn: totalWarn, fail: totalFail },
          reports,
        },
        null,
        2
      )
    );
  } else {
    for (const r of reports) {
      console.log(`\n=== [${r.key}] ${r.title} (${r.id}) ===`);
      for (const s of r.shots) {
        const tag = s.status.padEnd(4);
        console.log(
          `  ${tag} | ${s.sceneId} | ${s.shotId.padEnd(18)} | ${s.size.padEnd(3)} ${s.angle.padEnd(6)} ${s.move.padEnd(8)} | ${s.target.padEnd(8)} | ${s.startSec.toFixed(2)}s+${s.durSec.toFixed(2)}s`
        );
        for (const f of s.findings) {
          const at = f.sampleTime !== undefined ? ` @t=${f.sampleTime.toFixed(2)}s` : '';
          console.log(`       [${f.severity}] (${f.check}${at}) ${f.message}`);
        }
      }
      console.log(
        `  Summary [${r.key}]: PASS=${r.summary.pass} WARN=${r.summary.warn} FAIL=${r.summary.fail} (Total=${r.summary.totalShots})`
      );
    }
    console.log(
      `\nTOTAL AUDIT: PASS=${totalPass} WARN=${totalWarn} FAIL=${totalFail}`
    );
  }

  process.exit(totalFail > 0 ? 1 : 0);
}

main();

