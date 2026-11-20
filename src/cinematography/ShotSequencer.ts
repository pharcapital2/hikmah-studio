/**
 * ShotSequencer.ts
 * "Otak sinematografi" — menghasilkan urutan shot otomatis yang natural dan sinematik
 * berdasarkan data dialogue, cast, dan durasi scene.
 *
 * Mengikuti 5 Hukum Shot Dialog:
 * 1. Establishing Rule  — selalu mulai dengan WS/EWS
 * 2. Entrance Rule      — karakter baru = WS sambil bergerak
 * 3. Two-Shot Rule      — awal dialog = two-shot sebelum OTS
 * 4. Reaction Rule      — pendengar juga ditampilkan (40% waktu)
 * 5. Climax Rule        — puncak emosi = CU + reaksi
 *
 * Output: Shot[] yang bisa langsung dipakai di ProductionScene.shots
 */

import type {
  Shot,
  ShotSize,
  ShotAngle,
  CameraMove,
  AnchorKey,
  HeadroomStyle,
  ShotElevation,
  ShotImpactFx,
} from './shotTypes';

export interface DialogueLine {
  id: string;
  speakerId: string;    // castId atau 'narator'
  startSec: number;
  durSec: number;
  emotion?: string;     // 'happy' | 'solemn' | 'thinking' | 'sad' | 'neutral'
}

export interface CastEntry {
  castId: string;
  defaultAction?: string;
}

export interface SequencerOptions {
  dialogue: DialogueLine[];
  cast: CastEntry[];
  sceneDurationSec: number;
  sceneStartSec?: number;
  axis?: [string, string];   // [charA, charB] — pasangan dialog utama
  style?: 'cinematic' | 'documentary' | 'dramatic' | 'dramatic-shorts';
  seed?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: beat types
// ─────────────────────────────────────────────────────────────────────────────

type BeatType =
  | 'establishing'   // EWS/WS — awal scene, perkenalkan dunia
  | 'entrance'       // WS/MS — karakter bergerak masuk frame
  | 'two-shot'       // MS — dua karakter dalam satu frame
  | 'ots-speaker'    // MCU — OTS dari sisi lawan, fokus ke pembicara
  | 'ots-listener'   // MCU — OTS dari sisi pembicara, fokus ke pendengar
  | 'reaction'       // MCU/MS — reaksi pendengar saat diam
  | 'cu-speaker'     // CU — puncak emosi / kata kunci
  | 'cu-reaction'    // CU — reaksi emosi kuat
  | 'wide-close'     // WS — breathing room setelah CU
  | 'crane-reveal';  // WS crane — closure scene

interface Beat {
  type: BeatType;
  startSec: number;
  durSec: number;
  targetId: string;      // castId atau 'location'
  otherTargetId?: string; // untuk OTS (the person in foreground)
}

// ─────────────────────────────────────────────────────────────────────────────
// Klasifikasi apakah sebuah dialogue line adalah "puncak emosi"
// ─────────────────────────────────────────────────────────────────────────────

function isClimaxBeat(line: DialogueLine): boolean {
  return (
    line.emotion === 'solemn' ||
    line.emotion === 'thinking' ||
    line.emotion === 'sad' ||
    line.durSec >= 4.0  // kalimat panjang = penting
  );
}

function isNarator(id: string): boolean {
  return id === 'narator' || id === 'narrator';
}

// ─────────────────────────────────────────────────────────────────────────────
// Konversi Beat ke Shot
// ─────────────────────────────────────────────────────────────────────────────

let _shotCounter = 0;

function beatToShot(beat: Beat, sceneId: string, lineIndex: number, isAxisA: boolean): Shot {
  _shotCounter++;
  const id = `${sceneId}-auto-${lineIndex}-${beat.type}`;

  const configs: Record<BeatType, {
    size: ShotSize;
    angle: ShotAngle;
    move: CameraMove;
    lensMm: number;
    anchor?: AnchorKey;
    azimuthDeg?: number;
    motive: string;
  }> = {
    'establishing': {
      size: 'EWS', angle: 'aerial', move: 'static', lensMm: 24,
      anchor: 'aerial',
      motive: 'Establishing shot — perkenalkan dunia dan suasana',
    },
    'entrance': {
      size: 'WS', angle: 'eye', move: 'panR', lensMm: 35,
      anchor: 'wide',
      motive: 'Karakter bergerak memasuki area — tampilkan dunia dan pergerakan',
    },
    'two-shot': {
      size: 'MS', angle: 'eye', move: 'static', lensMm: 40,
      anchor: 'medium',
      azimuthDeg: 50,
      motive: 'Two-shot sinematik 9:16 — framing 3/4 depth agar kedua karakter pas di layar vertikal',
    },
    'ots-speaker': {
      size: 'MCU', angle: 'ots', move: 'static', lensMm: 55,
      azimuthDeg: isAxisA ? 35 : 145,
      motive: 'OTS — perspektif dari sisi pendengar, pembicara jadi subject',
    },
    'ots-listener': {
      size: 'MCU', angle: 'ots', move: 'static', lensMm: 55,
      azimuthDeg: isAxisA ? 35 : 145,
      motive: 'OTS balik — perspektif dari sisi pembicara, pendengar di foreground',
    },
    'reaction': {
      size: 'MCU', angle: 'eye', move: 'static', lensMm: 50,
      azimuthDeg: isAxisA ? 35 : 145,
      motive: 'Reaction shot — tampilkan ekspresi pendengar saat diam menyimak',
    },
    'cu-speaker': {
      size: 'CU', angle: 'eye', move: 'pushIn', lensMm: 70,
      azimuthDeg: isAxisA ? 28 : 152,
      motive: 'Close-up puncak — kata paling penting / momen emosi tinggi',
    },
    'cu-reaction': {
      size: 'CU', angle: 'eye', move: 'static', lensMm: 70,
      azimuthDeg: isAxisA ? 28 : 152,
      motive: 'Reaction CU — ekspresi mendalam saat menerima hikmah / momen emosi',
    },
    'wide-close': {
      size: 'MS', angle: 'eye', move: 'static', lensMm: 40,
      anchor: 'medium',
      azimuthDeg: 50,
      motive: 'Breathing room — kembali ke two-shot setelah CU untuk closure emosi',
    },
    'crane-reveal': {
      size: 'WS', angle: 'low', move: 'crane', lensMm: 35,
      anchor: 'aerial',
      motive: 'Crane reveal — closure sinematik akhir scene',
    },
  };

  const cfg = configs[beat.type];

  const isTwoShotBeat =
    beat.type === 'two-shot' ||
    beat.type === 'wide-close' ||
    ((beat.type === 'entrance' || beat.type === 'crane-reveal') && beat.targetId === 'both');

  return {
    id,
    target: isTwoShotBeat ? 'both' : beat.targetId,
    over: beat.otherTargetId,
    size: cfg.size,
    angle: cfg.angle,
    move: cfg.move,
    lensMm: cfg.lensMm,
    startSec: beat.startSec,
    durSec: beat.durSec,
    motive: cfg.motive,
    anchor: cfg.anchor,
    azimuthDeg: cfg.azimuthDeg,
    twoShot: isTwoShotBeat,
  };
}

function generateNarrationSequence(
  sceneId: string,
  sceneStartSec: number,
  sceneDurationSec: number,
  axisA: string,
  axisB: string,
  hasTwo: boolean
): Shot[] {
  const specs: Array<Omit<Shot, 'startSec' | 'durSec'>> = [
    {
      id: `${sceneId}-auto-0-establishing`,
      target: 'location',
      size: 'WS',
      angle: 'eye',
      move: 'panR',
      lensMm: 35,
      anchor: 'wide',
      motive: 'Establishing lokasi — perkenalkan ruang dan suasana narasi',
    },
    {
      id: `${sceneId}-auto-1-two-shot`,
      target: hasTwo ? 'both' : axisA,
      twoShot: hasTwo,
      size: 'MS',
      angle: 'eye',
      move: 'static',
      lensMm: 40,
      anchor: 'medium',
      azimuthDeg: 50,
      motive: 'Two-shot narasi — tampilkan subjek dalam ruang 9:16',
    },
    {
      id: `${sceneId}-auto-2-mcu`,
      target: axisA,
      size: 'MCU',
      angle: 'eye',
      move: 'pushIn',
      lensMm: 50,
      azimuthDeg: 35,
      motive: 'MCU karakter utama menyertai pesan narasi',
    },
  ];

  const includeFourthCU = sceneDurationSec >= 9.5;
  if (includeFourthCU) {
    specs.push({
      id: `${sceneId}-auto-3-cu`,
      target: hasTwo ? axisB : axisA,
      size: 'CU',
      angle: 'eye',
      move: 'static',
      lensMm: 70,
      azimuthDeg: hasTwo ? 152 : 28,
      motive: 'CU ekspresi untuk penekanan pesan narasi',
    });
  }

  specs.push({
    id: `${sceneId}-auto-${specs.length}-crane-reveal`,
    target: hasTwo ? 'both' : 'location',
    twoShot: hasTwo,
    size: 'WS',
    angle: 'low',
    move: 'crane',
    lensMm: 35,
    anchor: 'aerial',
    motive: 'Crane reveal — closure sinematik akhir narasi',
  });

  const weights = includeFourthCU
    ? [0.23, 0.21, 0.20, 0.17, 0.19]
    : [0.25, 0.25, 0.25, 0.25];

  let acc = sceneStartSec;
  const sceneEnd = sceneStartSec + sceneDurationSec;
  return specs.map((spec, idx) => {
    const isLast = idx === specs.length - 1;
    const durSec = isLast
      ? Math.max(0.1, Number((sceneEnd - acc).toFixed(3)))
      : Number((sceneDurationSec * weights[idx]).toFixed(3));
    const shot: Shot = { ...spec, startSec: Number(acc.toFixed(3)), durSec };
    acc += durSec;
    return shot;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE: generateShotSequence
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hasilkan sequence shot sinematik otomatis berdasarkan dialogue dan cast.
 *
 * Prinsip utama:
 * - TIDAK setiap dialogue line = satu shot. Shot punya durasi sendiri.
 * - Setiap shot boleh mencakup beberapa dialogue line.
 * - Reaksi pendengar juga punya shot sendiri (bukan hanya pembicara).
 * - Two-shot dipakai sebagai "jangkar" sebelum masuk close-up.
 */
function makeShortsShot(
  sceneId: string,
  index: number,
  tag: string,
  spec: {
    target: string;
    over?: string;
    twoShot?: boolean;
    size: ShotSize;
    angle: ShotAngle;
    move: CameraMove;
    lensMm: number;
    startSec: number;
    durSec: number;
    anchor?: AnchorKey;
    azimuthDeg?: number;
    headroom?: HeadroomStyle;
    elevation?: ShotElevation;
    dutchDeg?: number;
    impactFx?: ShotImpactFx;
    motive: string;
  }
): Shot {
  return {
    id: `${sceneId}-ds-${index}-${tag}`,
    ...spec,
    deepFocus: true,
  };
}

function generateDramaticShortsSequence(
  opts: SequencerOptions,
  sceneId: string
): Shot[] {
  const {
    dialogue,
    cast,
    sceneDurationSec,
    sceneStartSec = 0,
    axis,
  } = opts;

  const charLines = dialogue.filter((d) => !isNarator(d.speakerId));
  const castIds = cast.map((c) => c.castId);
  const axisA = axis?.[0] ?? castIds[0] ?? 'char1';
  const axisB = axis?.[1] ?? castIds[1] ?? 'char2';
  const hasTwo = castIds.length >= 2 && axisA !== axisB;
  const primaryHookId = castIds[0] ?? axisA;
  const sceneEnd = sceneStartSec + sceneDurationSec;

  if (charLines.length === 0) {
    return generateNarrationSequence(sceneId, sceneStartSec, sceneDurationSec, axisA, axisB, hasTwo).map(
      (s) => ({
        ...s,
        move: s.move === 'static' ? 'microPush' : s.move === 'crane' ? 'craneBack' : s.move,
        deepFocus: true,
      })
    );
  }

  const shots: Shot[] = [];
  let idx = 0;
  const azFor = (targetId: string, tight: boolean): number => {
    const isA = targetId === axisA;
    return tight ? (isA ? 28 : 152) : (isA ? 35 : 145);
  };
  const azSingleClear = (targetId: string): number => (targetId === axisA ? 58 : 122);

  // ── 1. HOOK-FIRST OPENING ──────────────────────────────────────────────────
  const firstCharLine = charLines[0];
  const charStartSec = firstCharLine.startSec;
  const preCharDur = Math.max(0, charStartSec - sceneStartSec);

  if (preCharDur >= 5.5) {
    const hookDur = 3.0;
    const rem = preCharDur - hookDur;
    const discDur = rem * 0.5;
    const enterDur = rem - discDur;

    shots.push(
      makeShortsShot(sceneId, idx++, 'hook-cu', {
        target: primaryHookId,
        size: 'CU',
        angle: 'eye',
        move: 'slowPull',
        lensMm: 65,
        azimuthDeg: azFor(primaryHookId, true),
        startSec: sceneStartSec,
        durSec: hookDur,
        motive: 'Hook 3 detik pertama — CU wajah ekspresif dengan slow pull-out pembuka',
      })
    );
    shots.push(
      makeShortsShot(sceneId, idx++, 'discovery-ews', {
        target: 'location',
        size: 'EWS',
        angle: 'aerial',
        move: 'dollyTrack',
        lensMm: 26,
        anchor: 'aerial',
        startSec: sceneStartSec + hookDur,
        durSec: discDur,
        motive: 'Spatial discovery EWS — menyisir lanskap lokasi secara sinematik',
      })
    );
    shots.push(
      makeShortsShot(sceneId, idx++, 'enter-high', {
        target: hasTwo ? 'both' : axisA,
        twoShot: hasTwo,
        size: 'WS',
        angle: 'high',
        elevation: 'high',
        move: 'dollyTrack',
        lensMm: 35,
        anchor: 'wide',
        // Diagonal 3/4 (35°) terhadap axis, bukan default 50° dari timur:
        // di saung sawah, azimuth 50° menaruh tiang saung tepat di garis
        // pandang ke kedua karakter (audit obstacle-sightline). 35° memutar
        // kamera ke sisi depan dek sehingga anak yang masuk terlihat jelas.
        azimuthDeg: azFor(axisA, false),
        startSec: sceneStartSec + hookDur + discDur,
        durSec: enterDur,
        motive: 'Elevated entrance — sudut tinggi mengamati pergerakan karakter memasuki set',
      })
    );
  } else if (preCharDur >= 2.0) {
    shots.push(
      makeShortsShot(sceneId, idx++, 'hook-cu', {
        target: primaryHookId,
        size: 'CU',
        angle: 'eye',
        move: 'slowPull',
        lensMm: 65,
        azimuthDeg: azFor(primaryHookId, true),
        startSec: sceneStartSec,
        durSec: preCharDur,
        motive: 'Hook CU pembuka dengan slow pull-out',
      })
    );
  }

  // Sisakan 3.5–4.5s terakhir scene untuk closure craneBack two-shot; sejajarkan dengan dialog terakhir jika berada di jendela closure
  const lastCharLine = charLines[charLines.length - 1];
  const defaultClosureCut = sceneEnd - Math.min(4.5, Math.max(3.5, sceneDurationSec * 0.11));
  const closureCutPoint =
    lastCharLine &&
    lastCharLine.startSec >= sceneEnd - 4.6 &&
    lastCharLine.startSec <= sceneEnd - 3.2
      ? lastCharLine.startSec
      : defaultClosureCut;

  // ── 2. TIGHT DIALOGUE RHYTHM (2.0–3.6s per shot, zero static) ─────────────
  let cursor = shots.length > 0 ? shots[shots.length - 1].startSec + shots[shots.length - 1].durSec : sceneStartSec;

  for (let i = 0; i < charLines.length; i++) {
    const line = charLines[i];
    const nextLine = charLines[i + 1];
    const speakerId = line.speakerId;
    const listenerId = speakerId === axisA ? axisB : axisA;
    const rawWinEnd = nextLine ? nextLine.startSec : Math.min(sceneEnd, line.startSec + line.durSec);

    if (line.startSec >= closureCutPoint - 0.6) {
      // Baris penutup jatuh di jendela closure -> biarkan craneBack menutupnya
      break;
    }

    const winStart = Math.max(sceneStartSec, cursor);
    const winEnd = nextLine && nextLine.startSec > closureCutPoint - 0.6
      ? closureCutPoint
      : Math.min(closureCutPoint, rawWinEnd);
    const winDur = winEnd - winStart;
    if (winDur < 1.3) continue;

    const isClimax = line.emotion === 'solemn' || line.emotion === 'sad';

    if (isClimax && winDur >= 4.2) {
      // ── CLIMAX: Build-up MCU (low oppressive) -> Axial Dutch Punch CU -> Quiet CU reaction
      const buildDur = Number((winDur * 0.38).toFixed(3));
      const punchDur = Number((winDur * 0.32).toFixed(3));
      const reactDur = Number((winDur - buildDur - punchDur).toFixed(3));

      shots.push(
        makeShortsShot(sceneId, idx++, 'climax-buildup', {
          target: speakerId,
          size: 'MCU',
          angle: 'low',
          elevation: 'low',
          headroom: 'oppressive',
          move: 'microPush',
          lensMm: 55,
          azimuthDeg: azSingleClear(speakerId),
          startSec: winStart,
          durSec: buildDur,
          motive: 'Build-up ketegangan — MCU sudut rendah headroom ketat menuju pesan hikmah',
        })
      );
      shots.push(
        makeShortsShot(sceneId, idx++, 'climax-punch', {
          target: speakerId,
          size: 'CU',
          angle: 'dutch',
          dutchDeg: -7,
          headroom: 'normal',
          move: 'axialPunch',
          lensMm: 46,
          azimuthDeg: azSingleClear(speakerId),
          impactFx: 'speedlines',
          startSec: winStart + buildDur,
          durSec: punchDur,
          motive: 'Puncak hikmah — axial crash-zoom punch-in + Dutch tilt + radial speedlines',
        })
      );
      shots.push(
        makeShortsShot(sceneId, idx++, 'climax-react', {
          target: hasTwo ? listenerId : speakerId,
          size: hasTwo ? 'CU' : 'MS',
          angle: 'eye',
          move: 'microPush',
          lensMm: 68,
          azimuthDeg: azFor(hasTwo ? listenerId : speakerId, true),
          startSec: winStart + buildDur + punchDur,
          durSec: reactDur,
          motive: 'Quiet deceleration — tahan reaksi mendalam pendengar setelah impact beat',
        })
      );
      cursor = winEnd;
    } else if (i === 0 && winDur >= 3.2) {
      const aDur = Number((winDur * 0.55).toFixed(3));
      const bDur = Number((winDur - aDur).toFixed(3));
      shots.push(
        makeShortsShot(sceneId, idx++, 'two-shot', {
          target: hasTwo ? 'both' : speakerId,
          twoShot: hasTwo,
          size: 'MS',
          angle: 'eye',
          move: 'microPush',
          lensMm: 40,
          anchor: 'medium',
          azimuthDeg: 50,
          startSec: winStart,
          durSec: aDur,
          motive: 'Two-shot master 9:16 — buka interaksi hangat dengan micro push-in',
        })
      );
      shots.push(
        makeShortsShot(sceneId, idx++, 'ots', {
          target: speakerId,
          over: hasTwo ? listenerId : undefined,
          size: 'MCU',
          angle: hasTwo ? 'ots' : 'eye',
          move: 'microPush',
          lensMm: 55,
          azimuthDeg: azFor(speakerId, false),
          startSec: winStart + aDur,
          durSec: bDur,
          motive: 'OTS pembicara — hadirkan kedalaman foreground bahu lawan bicara',
        })
      );
      cursor = winEnd;
    } else if (i === 1 && winDur >= 3.2) {
      const aDur = Number((winDur * 0.55).toFixed(3));
      const bDur = Number((winDur - aDur).toFixed(3));
      shots.push(
        makeShortsShot(sceneId, idx++, 'prop-tilt', {
          target: speakerId,
          size: 'CU',
          angle: 'eye',
          headroom: 'propTop',
          move: 'pushTiltProp',
          lensMm: 65,
          azimuthDeg: azFor(speakerId, true),
          startSec: winStart,
          durSec: aDur,
          motive: 'Prop-priority tilt-up — push-in halus menonjolkan caping & ekspresi syukur',
        })
      );
      shots.push(
        makeShortsShot(sceneId, idx++, 'ots', {
          target: speakerId,
          over: hasTwo ? listenerId : undefined,
          size: 'MCU',
          angle: hasTwo ? 'ots' : 'eye',
          move: 'microPush',
          lensMm: 55,
          azimuthDeg: azFor(speakerId, false),
          startSec: winStart + aDur,
          durSec: bDur,
          motive: 'Kembali ke OTS MCU menjaga kontinuitas garis pandang 180°',
        })
      );
      cursor = winEnd;
    } else if (line.emotion === 'thinking' && winDur >= 3.2) {
      const aDur = Number((winDur * 0.55).toFixed(3));
      const bDur = Number((winDur - aDur).toFixed(3));
      shots.push(
        makeShortsShot(sceneId, idx++, 'high-question', {
          target: speakerId,
          size: 'MCU',
          angle: 'high',
          elevation: 'high',
          move: 'microPush',
          lensMm: 52,
          azimuthDeg: azSingleClear(speakerId),
          startSec: winStart,
          durSec: aDur,
          motive: 'High-angle keresahan — menunjukkan kerentanan pertanyaan penanya',
        })
      );
      shots.push(
        makeShortsShot(sceneId, idx++, 'eye-listen', {
          target: hasTwo ? listenerId : speakerId,
          size: 'MCU',
          angle: 'eye',
          elevation: 'eye',
          headroom: 'tight',
          move: 'microPush',
          lensMm: 55,
          azimuthDeg: azSingleClear(hasTwo ? listenerId : speakerId),
          startSec: winStart + aDur,
          durSec: bDur,
          motive: 'Eye-level MCU pendengar — dikencangkan ke 55mm agar wajah masuk Zona Emas; sudut eye-level membedakannya dari climax-buildup low-angle sesudahnya (hindari jump-cut)',
        })
      );
      cursor = winEnd;
    } else if (winDur >= 3.0) {
      const aDur = Number((winDur * 0.50).toFixed(3));
      const bDur = Number((winDur - aDur).toFixed(3));
      const prevShot = shots[shots.length - 1];
      const avoidCU = prevShot?.size === 'CU' && prevShot.target === speakerId;
      shots.push(
        makeShortsShot(sceneId, idx++, 'speaker', {
          target: speakerId,
          over: hasTwo && avoidCU ? listenerId : undefined,
          size: avoidCU ? 'MCU' : 'CU',
          angle: hasTwo && avoidCU ? 'ots' : 'eye',
          move: 'microPush',
          lensMm: avoidCU ? 55 : 65,
          azimuthDeg: azFor(speakerId, !avoidCU),
          startSec: winStart,
          durSec: aDur,
          motive: avoidCU
            ? 'OTS MCU pembicara menjaga variasi shot dan ritme dialog'
            : 'CU pembicara dengan micro push-in menjaga ritme dialog',
        })
      );
      shots.push(
        makeShortsShot(sceneId, idx++, 'two-resolution', {
          target: hasTwo ? 'both' : speakerId,
          twoShot: hasTwo,
          size: 'MS',
          angle: 'eye',
          move: 'dollyTrack',
          lensMm: 40,
          anchor: 'medium',
          azimuthDeg: 50,
          startSec: winStart + aDur,
          durSec: bDur,
          motive: 'Two-shot dolly track hangat merangkum kesepakatan kedua tokoh',
        })
      );
      cursor = winEnd;
    } else {
      const prevShot = shots[shots.length - 1];
      const useTwo = prevShot?.target === speakerId && hasTwo;
      shots.push(
        makeShortsShot(sceneId, idx++, useTwo ? 'two-beat' : 'cu-beat', {
          target: useTwo ? 'both' : speakerId,
          twoShot: useTwo,
          size: useTwo ? 'MS' : 'MCU',
          angle: 'eye',
          move: 'microPush',
          lensMm: useTwo ? 40 : 55,
          azimuthDeg: useTwo ? 50 : azFor(speakerId, false),
          startSec: winStart,
          durSec: winDur,
          motive: 'Beat dialog padat dengan gerak micro push-in bermotif',
        })
      );
      cursor = winEnd;
    }
  }

  // ── 3. CLOSURE: WS TWO-SHOT CRANE-BACK ─────────────────────────────────────
  const closureStart = Math.min(cursor, sceneEnd - 3.5);
  if (shots.length > 0 && closureStart < cursor) {
    const prev = shots[shots.length - 1];
    prev.durSec = Math.max(1.2, Number((closureStart - prev.startSec).toFixed(3)));
  }
  const finalStart = shots.length > 0 ? shots[shots.length - 1].startSec + shots[shots.length - 1].durSec : sceneStartSec;
  const finalDur = Number((sceneEnd - finalStart).toFixed(3));
  shots.push(
    makeShortsShot(sceneId, idx++, 'crane-back', {
      target: hasTwo ? 'both' : 'location',
      twoShot: hasTwo,
      size: 'WS',
      angle: 'low',
      move: 'craneBack',
      lensMm: 34,
      anchor: 'aerial',
      azimuthDeg: 50,
      startSec: finalStart,
      durSec: Math.max(1.5, finalDur),
      motive: 'Crane-back reveal — mundur naik melepas kepergian karakter menuju senja',
    })
  );

  // Normalisasi akhir agar 100% kontinu tanpa celah atau overlap
  if (shots.length > 0) {
    shots[0].startSec = sceneStartSec;
    for (let i = 0; i < shots.length - 1; i++) {
      shots[i].durSec = Math.max(1.2, Number((shots[i + 1].startSec - shots[i].startSec).toFixed(3)));
      shots[i + 1].startSec = Number((shots[i].startSec + shots[i].durSec).toFixed(3));
    }
    const last = shots[shots.length - 1];
    last.durSec = Math.max(1.2, Number((sceneEnd - last.startSec).toFixed(3)));
  }

  return shots;
}

export function generateShotSequence(
  opts: SequencerOptions,
  sceneId = 'scene'
): Shot[] {
  if (opts.style === 'dramatic-shorts') {
    return generateDramaticShortsSequence(opts, sceneId);
  }

  const {
    dialogue,
    cast,
    sceneDurationSec,
    sceneStartSec = 0,
    axis,
    style = 'cinematic',
  } = opts;

  // Hanya ambil dialogue yang bukan narator (untuk logika dialog 2 orang)
  const charLines = dialogue.filter((d) => !isNarator(d.speakerId));
  const castIds = cast.map((c) => c.castId);

  // Tentukan axis pair untuk OTS (charA vs charB)
  const axisA = axis?.[0] ?? castIds[0] ?? 'char1';
  const axisB = axis?.[1] ?? castIds[1] ?? 'char2';

  // Fallback narasi murni: hasilkan 4–5 shot sinematik tanpa gap
  if (charLines.length === 0) {
    return generateNarrationSequence(
      sceneId,
      sceneStartSec,
      sceneDurationSec,
      axisA,
      axisB,
      castIds.length >= 2
    );
  }

  const beats: Beat[] = [];
  _shotCounter = 0;

  // ── 1. ESTABLISHING BEAT (selalu ada di awal scene) ───────────────────────
  // Durasi sebelum karakter berdialog dihitung dari charLines[0] (bukan narator)
  const firstCharLine = charLines[0];
  const charStartSec = firstCharLine ? firstCharLine.startSec : sceneStartSec + sceneDurationSec;
  const preCharDur = Math.max(0, charStartSec - sceneStartSec);

  // Establishing shot selalu dibuat di awal: 2.5s hingga maksimal 5.0s
  const establishingDur = Math.min(
    5.0,
    Math.max(2.5, preCharDur > 4.5 ? preCharDur * 0.5 : preCharDur > 0 ? preCharDur : 4.0)
  );

  beats.push({
    type: 'establishing',
    startSec: sceneStartSec,
    durSec: establishingDur,
    targetId: 'location',
  });

  // ── 2. ENTRANCE BEAT (karakter bergerak masuk) ─────────────────────────────
  // Jika masih ada sisa waktu sebelum karakter pertama berdialog, tampilkan WS entrance
  if (preCharDur >= establishingDur + 1.8) {
    const entranceStart = sceneStartSec + establishingDur;
    const entranceDur = charStartSec - entranceStart;
    beats.push({
      type: 'entrance',
      startSec: entranceStart,
      durSec: entranceDur,
      targetId: castIds.length >= 2 ? 'both' : axisA,
    });
  }

  // ── 3. DIALOGUE BEATS ──────────────────────────────────────────────────────
  // Proses setiap dialogue line karakter (bukan narator) dengan aturan sinematografi
  let prevSpeakerId = '';
  let prevBeatType: BeatType = 'establishing';
  let consecutiveCU = 0;

  for (let i = 0; i < charLines.length; i++) {
    const line = charLines[i];
    const nextLine = charLines[i + 1];
    const speakerId = line.speakerId;
    const listenerId = speakerId === axisA ? axisB : axisA;

    // Hitung berapa lama "jendela" untuk shot di sekitar line ini
    // Shot dimulai sedikit sebelum line mulai bicara (pre-roll 0.3s)
    const shotStart = Math.max(
      (beats[beats.length - 1]?.startSec ?? sceneStartSec) +
        (beats[beats.length - 1]?.durSec ?? 0),
      line.startSec - 0.3
    );

    // Tentukan pola shot berdasarkan konteks:
    const isFirst = i === 0;
    const isClimax = isClimaxBeat(line);
    const speakerChanged = speakerId !== prevSpeakerId;
    const needsTwoShot =
      isFirst || (speakerChanged && consecutiveCU >= 2) || (style === 'cinematic' && i % 4 === 0);

    // Cabang A berlaku untuk SEMUA line yang butuh two-shot, bukan cuma line
    // pertama. Sebelumnya kondisi `isFirst && needsTwoShot` membuat line
    // non-pertama yang butuh reset two-shot (mis. setelah 2 CU berturut-turut,
    // atau tiap 4 line gaya cinematic) jatuh ke cabang continuation (E): shot
    // CU-reaction sebelumnya malah diperpanjang menutupi line pembicara lain
    // (di Konten 1 sc1: satu CU anak statis 16.25 dtk) dan line pembicara
    // lawannya tidak mendapat shot sama sekali. Logika two-shot + OTS di bawah
    // ini generik per-line, jadi aman dipakai untuk reset di tengah dialog.
    if (needsTwoShot) {
      // ── A. TWO-SHOT: jangkar awal dialog / reset setelah CU berturut-turut ──
      const tsDur = Math.max(2.8, Math.min(3.8, line.durSec * 0.65));
      beats.push({
        type: 'two-shot',
        startSec: shotStart,
        durSec: tsDur,
        targetId: 'both',
      });

      // Lanjutkan dengan OTS pembicara jika durasi kalimat masih ada
      const remainingDur = (line.startSec + line.durSec) - (shotStart + tsDur);
      if (remainingDur >= 1.5) {
        beats.push({
          type: 'ots-speaker',
          startSec: shotStart + tsDur,
          durSec: remainingDur,
          targetId: speakerId,
          otherTargetId: listenerId,
        });
      }
      consecutiveCU = 0;

    } else if (speakerChanged && !needsTwoShot) {
      // ── C. OTS BERGANTIAN: pembicara berganti (TIDAK langsung zoom CU) ──
      if (!isClimax) {
        // Reaksi pendengar selama ~40% durasi line sebelumnya jika ada waktu jeda
        const reactDur = Math.max(1.5, Math.min(2.5, line.startSec - shotStart));
        if (reactDur >= 1.5 && shotStart < line.startSec) {
          beats.push({
            type: 'reaction',
            startSec: shotStart,
            durSec: reactDur,
            targetId: speakerId, // reaksi orang yang akan menyambut bicara
          });
        }

        // Tampilkan pembicara via OTS (MCU) — ada kedalaman pundak lawan bicara
        const speakerShotDur = line.durSec * 0.75;
        beats.push({
          type: 'ots-speaker',
          startSec: line.startSec,
          durSec: speakerShotDur,
          targetId: speakerId,
          otherTargetId: listenerId,
        });
        consecutiveCU = 0;

      } else {
        // ── D. CLIMAX: puncak emosi → CU + reaksi ──────────────────────────

        // Reset dulu dengan two-shot jika sudah terlalu sering CU berturut-turut
        if (consecutiveCU >= 2) {
          const wsDur = Math.min(2.2, line.startSec - shotStart);
          if (wsDur >= 1.5) {
            beats.push({
              type: 'wide-close',
              startSec: shotStart,
              durSec: wsDur,
              targetId: 'both',
            });
          }
        }

        // CU pembicara (puncak — hanya di kata kunci / hadits / pesan mendalam)
        const cuDur = line.durSec * 0.65;
        beats.push({
          type: 'cu-speaker',
          startSec: line.startSec,
          durSec: cuDur,
          targetId: speakerId,
        });
        consecutiveCU++;

        // CU reaksi pendengar setelah puncak
        const reactionStart = line.startSec + cuDur;
        const reactionEnd = nextLine ? nextLine.startSec : line.startSec + line.durSec;
        const reactionDur = Math.max(1.5, reactionEnd - reactionStart);
        if (reactionDur >= 1.5) {
          beats.push({
            type: 'cu-reaction',
            startSec: reactionStart,
            durSec: reactionDur,
            targetId: listenerId,
          });
          consecutiveCU++;
        }
      }

    } else {
      // ── E. CONTINUATION: pembicara sama, lanjutkan shot ──────────────────
      if (isClimax && consecutiveCU === 0) {
        // Upgrade ke CU jika belum pernah
        const prevBeat = beats[beats.length - 1];
        if (prevBeat) {
          // Potong shot sebelumnya di titik ini
          prevBeat.durSec = Math.max(1.0, line.startSec - prevBeat.startSec);
        }
        const cuDur = line.durSec * 0.65;
        beats.push({
          type: 'cu-speaker',
          startSec: line.startSec,
          durSec: cuDur,
          targetId: speakerId,
        });
        consecutiveCU++;

        // Tambahkan reaksi
        const reactStart = line.startSec + cuDur;
        const reactEnd = nextLine ? nextLine.startSec : line.startSec + line.durSec;
        const reactDur = Math.max(1.5, reactEnd - reactStart);
        if (reactDur >= 1.2) {
          beats.push({
            type: 'cu-reaction',
            startSec: reactStart,
            durSec: reactDur,
            targetId: listenerId,
          });
          consecutiveCU++;
        }
      } else {
        // Lanjutkan OTS yang sama, shot sudah ada di prevBeat
        // Update durasi shot sebelumnya untuk mencakup line ini juga
        const prevBeat = beats[beats.length - 1];
        if (prevBeat && prevBeat.targetId === speakerId) {
          prevBeat.durSec = Math.max(
            prevBeat.durSec,
            line.startSec + line.durSec - prevBeat.startSec
          );
        }
      }
    }

    prevSpeakerId = speakerId;
    prevBeatType = beats[beats.length - 1]?.type ?? prevBeatType;
  }

  // ── 4. CLOSURE BEAT (akhir scene) ──────────────────────────────────────────
  const lastBeat = beats[beats.length - 1];
  const lastBeatEnd = lastBeat ? lastBeat.startSec + lastBeat.durSec : sceneStartSec;
  const sceneEnd = sceneStartSec + sceneDurationSec;
  const closureDur = sceneEnd - lastBeatEnd;

  if (closureDur >= 2.5) {
    // Jika style dramatic, pakai crane reveal
    // Jika banyak sisa waktu, pakai two-shot dulu lalu crane
    if (closureDur >= 5.0 && style !== 'documentary') {
      beats.push({
        type: 'wide-close',
        startSec: lastBeatEnd,
        durSec: closureDur * 0.4,
        targetId: 'both',
      });
      beats.push({
        type: 'crane-reveal',
        startSec: lastBeatEnd + closureDur * 0.4,
        durSec: closureDur * 0.6,
        targetId: castIds.length >= 2 ? 'both' : 'location',
      });
    } else {
      beats.push({
        type: closureDur >= 4.0 ? 'crane-reveal' : 'wide-close',
        startSec: lastBeatEnd,
        durSec: closureDur,
        targetId: castIds.length >= 2 ? 'both' : 'location',
      });
    }
  }

  // ── 5. VALIDASI, TUTUP GAP & TRIM ──────────────────────────────────────────
  // Pastikan tidak ada shot yang overlap, terlalu pendek, atau menyisakan celah
  const MIN_DUR = 1.2;
  const validatedBeats = beats.filter((b) => b.durSec >= MIN_DUR && b.startSec < sceneEnd - 0.1);

  if (validatedBeats.length > 0) {
    validatedBeats[0].startSec = sceneStartSec;

    for (let i = 0; i < validatedBeats.length - 1; i++) {
      const curr = validatedBeats[i];
      const next = validatedBeats[i + 1];
      const currEnd = curr.startSec + curr.durSec;
      const gap = next.startSec - currEnd;
      if (gap > 0) {
        curr.durSec += gap;
      } else if (gap < 0) {
        const trimmed = next.startSec - curr.startSec;
        if (trimmed >= MIN_DUR) {
          curr.durSec = trimmed;
        } else {
          next.startSec = curr.startSec + curr.durSec;
        }
      }
    }

    // Jika beat terakhir terlalu pendek di akhir scene, gabungkan ke beat sebelumnya
    while (validatedBeats.length > 1) {
      const last = validatedBeats[validatedBeats.length - 1];
      if (sceneEnd - last.startSec < MIN_DUR) {
        validatedBeats.pop();
      } else {
        break;
      }
    }

    const last = validatedBeats[validatedBeats.length - 1];
    last.durSec = Math.max(MIN_DUR, sceneEnd - last.startSec);
  }

  // ── 6. KONVERSI BEATS → SHOTS ──────────────────────────────────────────────
  return validatedBeats.map((beat, i) => beatToShot(beat, sceneId, i, beat.targetId === axisA));
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: validasi hasil sequence (untuk debugging)
// ─────────────────────────────────────────────────────────────────────────────

export function validateSequence(shots: Shot[]): string[] {
  const issues: string[] = [];

  for (let i = 0; i < shots.length - 1; i++) {
    const a = shots[i];
    const b = shots[i + 1];

    // Cek gap
    const aEnd = a.startSec + a.durSec;
    if (Math.abs(aEnd - b.startSec) > 0.2) {
      issues.push(`Gap antara ${a.id} dan ${b.id}: ${(b.startSec - aEnd).toFixed(2)}s`);
    }

    // Cek dua CU berturut-turut pada target yang sama (tidak boleh!)
    if (a.size === 'CU' && b.size === 'CU' && a.target === b.target) {
      issues.push(`Dua CU berturut-turut pada target sama: ${a.id} → ${b.id}`);
    }

    // Cek shot terlalu pendek
    if (a.durSec < 1.0) {
      issues.push(`Shot terlalu pendek (${a.durSec.toFixed(1)}s): ${a.id}`);
    }
  }

  return issues;
}
