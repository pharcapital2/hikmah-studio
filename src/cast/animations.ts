export type CharacterAction =
  | 'idle'
  | 'walk'
  | 'run'
  | 'hoe'
  | 'ride_horse'
  | 'pray'
  | 'sit'
  | 'wave'
  | 'carry'
  | 'drink';

export const ACTION_LABELS: { id: CharacterAction; label: string; icon: string }[] = [
  { id: 'idle', label: 'Diam / Bicara', icon: '🧍' },
  { id: 'walk', label: 'Berjalan', icon: '🚶' },
  { id: 'run', label: 'Berlari', icon: '🏃' },
  { id: 'hoe', label: 'Mencangkul', icon: '⛏️' },
  { id: 'ride_horse', label: 'Menunggangi Kuda', icon: '🐎' },
  { id: 'pray', label: 'Berdoa', icon: '🤲' },
  { id: 'sit', label: 'Duduk Bersila', icon: '🧘' },
  { id: 'wave', label: 'Melambai', icon: '👋' },
  { id: 'carry', label: 'Memikul Panen', icon: '🌾' },
  { id: 'drink', label: 'Minum', icon: '🍵' },
];

export interface LimbArmPose {
  shoulder: [number, number, number];
  elbow: number;
}

export interface LimbLegPose {
  hip: [number, number, number];
  knee: number;
  ankle: number;
}

export interface ActionPose {
  rootOffset: [number, number, number];
  rootRot: [number, number, number];
  torsoRot: [number, number, number];
  torsoSquash: [number, number, number];
  headAddRot: [number, number, number];
  armL: LimbArmPose;
  armR: LimbArmPose;
  legL: LimbLegPose;
  legR: LimbLegPose;
  /** 0..1 pulse saat mata cangkul menghantam tanah pada aksi 'hoe'. */
  hoeImpact: number;
  /** Fase langkah kuda saat aksi 'ride_horse'. */
  horsePhase: number;
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const smooth01 = (v: number): number => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerp3 = (
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const wrap01 = (v: number): number => ((v % 1) + 1) % 1;

function makeBasePose(): ActionPose {
  return {
    rootOffset: [0, 0, 0],
    rootRot: [0, 0, 0],
    torsoRot: [0, 0, 0],
    torsoSquash: [1, 1, 1],
    headAddRot: [0, 0, 0],
    armL: { shoulder: [0, 0, 0.1], elbow: 0.14 },
    armR: { shoulder: [0, 0, -0.1], elbow: 0.14 },
    legL: { hip: [0, 0, 0.02], knee: 0.02, ankle: 0 },
    legR: { hip: [0, 0, -0.02], knee: 0.02, ankle: 0 },
    hoeImpact: 0,
    horsePhase: 0,
  };
}

/**
 * Menghitung pose artikulasi karakter secara deterministik berbasis `time` dan `seed`
 * (tanpa Math.random) agar konsisten di preview interaktif dan render Remotion.
 */
export function sampleActionPose(
  action: CharacterAction,
  time: number,
  seed: number,
  speed = 1
): ActionPose {
  const t = Math.max(0, time) * Math.max(0.1, speed);
  const pose = makeBasePose();

  switch (action) {
    case 'walk': {
      const ph = t * 5.2 + seed * 0.37;
      const sL = Math.sin(ph);
      const sR = Math.sin(ph + Math.PI);
      const bounce = Math.abs(Math.sin(ph));

      pose.rootOffset = [0, bounce * 0.032, 0];
      pose.torsoRot = [0.08, Math.sin(ph) * 0.06, Math.cos(ph) * 0.02];
      pose.torsoSquash = [1 + bounce * 0.012, 1 - bounce * 0.015, 1 + bounce * 0.012];
      pose.headAddRot = [-0.04, -Math.sin(ph) * 0.035, 0];

      pose.legL = {
        hip: [-sL * 0.52, 0, 0.03],
        knee: Math.max(0.05, Math.sin(ph - 0.6) * 0.62 + 0.22),
        ankle: Math.sin(ph + 0.45) * 0.18,
      };
      pose.legR = {
        hip: [-sR * 0.52, 0, -0.03],
        knee: Math.max(0.05, Math.sin(ph + Math.PI - 0.6) * 0.62 + 0.22),
        ankle: Math.sin(ph + Math.PI + 0.45) * 0.18,
      };

      // Ayunan lengan berlawanan arah langkah kaki
      pose.armL = {
        shoulder: [-sR * 0.48, 0, 0.11],
        elbow: 0.28 + Math.max(0, sR) * 0.22,
      };
      pose.armR = {
        shoulder: [-sL * 0.48, 0, -0.11],
        elbow: 0.28 + Math.max(0, sL) * 0.22,
      };
      return pose;
    }

    case 'run': {
      const ph = t * 9.4 + seed * 0.37;
      const sL = Math.sin(ph);
      const sR = Math.sin(ph + Math.PI);
      const bounce = Math.abs(Math.sin(ph));

      pose.rootOffset = [0, bounce * 0.072, 0];
      pose.torsoRot = [0.24, Math.sin(ph) * 0.11, Math.cos(ph) * 0.04];
      pose.torsoSquash = [1 + bounce * 0.03, 1 - bounce * 0.04, 1 + bounce * 0.03];
      pose.headAddRot = [-0.14, -Math.sin(ph) * 0.06, 0];

      pose.legL = {
        hip: [-sL * 0.92, 0, 0.03],
        knee: Math.max(0.12, Math.sin(ph - 0.55) * 1.15 + 0.45),
        ankle: Math.sin(ph + 0.4) * 0.28,
      };
      pose.legR = {
        hip: [-sR * 0.92, 0, -0.03],
        knee: Math.max(0.12, Math.sin(ph + Math.PI - 0.55) * 1.15 + 0.45),
        ankle: Math.sin(ph + Math.PI + 0.4) * 0.28,
      };

      pose.armL = {
        shoulder: [-sR * 0.85, 0, 0.16],
        elbow: 1.2 + Math.max(0, sR) * 0.25,
      };
      pose.armR = {
        shoulder: [-sL * 0.85, 0, -0.16],
        elbow: 1.2 + Math.max(0, sL) * 0.25,
      };
      return pose;
    }

    case 'hoe': {
      // Siklus mencangkul: angkat (0..0.42) -> ayun kuat ke tanah (0.42..0.60) -> tarik & pulih (0.60..1)
      const cy = wrap01(t * 0.85 + seed * 0.17);
      let lift = 0;
      let impact = 0;

      if (cy < 0.42) {
        lift = smooth01(cy / 0.42);
      } else if (cy < 0.6) {
        const down = (cy - 0.42) / 0.18;
        lift = 1 - Math.pow(down, 1.85);
      } else if (cy < 0.78) {
        const pull = smooth01((cy - 0.6) / 0.18);
        lift = lerp(0, 0.18, pull);
      } else {
        const recover = smooth01((cy - 0.78) / 0.22);
        lift = lerp(0.18, 0, recover);
      }

      if (cy >= 0.59 && cy < 0.88) {
        impact = Math.pow(1 - (cy - 0.59) / 0.29, 1.35);
      }

      const strike = 1 - lift;
      pose.hoeImpact = clamp01(impact);
      pose.rootOffset = [0, -0.045 - strike * 0.035, 0];
      pose.torsoRot = [lerp(-0.1, 0.56, strike), lerp(-0.08, 0.06, strike), 0];
      pose.torsoSquash = [
        1 + impact * 0.04,
        1 - impact * 0.05,
        1 + impact * 0.04,
      ];
      pose.headAddRot = [lerp(-0.08, -0.22, strike), 0, 0];

      // Kuda-kuda kaki asimetris kokoh
      pose.legL = {
        hip: [-0.32 - strike * 0.08, 0.1, 0.14],
        knee: 0.36 + strike * 0.14,
        ankle: -0.06,
      };
      pose.legR = {
        hip: [0.22 + strike * 0.05, -0.08, -0.14],
        knee: 0.18 + strike * 0.1,
        ankle: 0.12,
      };

      // Kedua tangan menggenggam gagang cangkul di tengah tubuh
      pose.armR = {
        shoulder: lerp3([-2.18, 0.06, 0.22], [-0.74, 0.08, 0.22], strike),
        elbow: lerp(0.55, 0.32, strike),
      };
      pose.armL = {
        shoulder: lerp3([-1.95, -0.06, -0.24], [-0.64, -0.08, -0.24], strike),
        elbow: lerp(0.62, 0.38, strike),
      };
      return pose;
    }

    case 'ride_horse': {
      const horsePhase = t * 6.5;
      const trotBounce = Math.abs(Math.sin(horsePhase)) * 0.045;

      pose.horsePhase = horsePhase;
      // Tinggi sadel = 0.86; hip dasar = 0.56 -> offset 0.30 + pantulan trot
      pose.rootOffset = [0, 0.3 + trotBounce, -0.02];
      pose.torsoRot = [
        0.12 + Math.sin(horsePhase * 2) * 0.035,
        0,
        Math.cos(horsePhase) * 0.025,
      ];
      pose.headAddRot = [Math.sin(horsePhase * 2 - 0.3) * 0.04, 0, 0];

      // Kaki mengangkang di samping perut kuda & menekuk ke sanggurdi
      pose.legL = {
        hip: [-0.42, 0, 0.44],
        knee: 0.82,
        ankle: -0.22,
      };
      pose.legR = {
        hip: [-0.42, 0, -0.44],
        knee: 0.82,
        ankle: -0.22,
      };

      // Kedua tangan ke depan memegang tali kekang
      const reinBob = Math.sin(horsePhase) * 0.045;
      pose.armL = {
        shoulder: [-0.62 + reinBob, 0, -0.14],
        elbow: 0.95,
      };
      pose.armR = {
        shoulder: [-0.62 + reinBob, 0, 0.14],
        elbow: 0.95,
      };
      return pose;
    }

    case 'pray': {
      const br = Math.sin(t * 2.0 + seed) * 0.025;
      pose.torsoRot = [0.06, 0, 0];
      pose.headAddRot = [0.16 + br * 0.6, 0, 0];

      // Kedua telapak tangan diangkat khusyuk di depan dada
      pose.armL = {
        shoulder: [-0.52, -0.28, -0.22],
        elbow: 1.48 + br,
      };
      pose.armR = {
        shoulder: [-0.52, 0.28, 0.22],
        elbow: 1.48 + br,
      };
      return pose;
    }

    case 'sit': {
      const calm = Math.sin(t * 1.5 + seed) * 0.015;
      pose.rootOffset = [0, -0.5, 0];
      pose.torsoRot = [0.03 + calm, 0, 0];
      pose.headAddRot = [calm * 0.4, 0, 0];

      // Duduk bersila: paha terbuka ke depan-samping, betis menyilang ke dalam di atas lantai
      pose.legL = {
        hip: [-Math.PI + 0.1, 0.927, 1.57],
        knee: 1.72,
        ankle: 0.15,
      };
      pose.legR = {
        hip: [-Math.PI + 0.18, -0.927, -1.57],
        knee: 1.72,
        ankle: 0.15,
      };

      // Tangan bertumpu santai di atas pangkuan/lutut
      pose.armL = {
        shoulder: [-0.32, 0, 0.18],
        elbow: 0.65,
      };
      pose.armR = {
        shoulder: [-0.32, 0, -0.18],
        elbow: 0.65,
      };
      return pose;
    }

    case 'wave': {
      const osc = Math.sin(t * 7.5 + seed);
      pose.torsoRot = [0, 0, -0.05];
      pose.headAddRot = [0.02, 0, -0.09 + osc * 0.04];

      pose.armR = {
        shoulder: [-0.24, 0, -2.35 + osc * 0.28],
        elbow: 0.45 + Math.cos(t * 7.5 + seed) * 0.18,
      };
      pose.armL = {
        shoulder: [0.04, 0, 0.12],
        elbow: 0.16,
      };
      return pose;
    }

    case 'carry': {
      const ph = t * 4.4 + seed * 0.37;
      const sL = Math.sin(ph);
      const sR = Math.sin(ph + Math.PI);
      const bounce = Math.abs(Math.sin(ph));

      pose.rootOffset = [Math.cos(ph) * 0.018, bounce * 0.025 - 0.02, 0];
      pose.torsoRot = [0.12, Math.sin(ph) * 0.03, Math.sin(ph) * 0.04];
      pose.headAddRot = [-0.06, 0, -Math.sin(ph) * 0.02];

      pose.legL = {
        hip: [-sL * 0.38, 0, 0.04],
        knee: Math.max(0.06, Math.sin(ph - 0.6) * 0.52 + 0.18),
        ankle: Math.sin(ph + 0.4) * 0.15,
      };
      pose.legR = {
        hip: [-sR * 0.38, 0, -0.04],
        knee: Math.max(0.06, Math.sin(ph + Math.PI - 0.6) * 0.52 + 0.18),
        ankle: Math.sin(ph + Math.PI + 0.4) * 0.15,
      };

      // Tangan terangkat ke kiri-kanan bahu memegang pikulan bambu
      pose.armL = {
        shoulder: [-2.48, 0, 1.48],
        elbow: 0.72,
      };
      pose.armR = {
        shoulder: [-2.48, 0, -1.48],
        elbow: 0.72,
      };
      return pose;
    }

    case 'drink': {
      const cy = wrap01(t * 0.55 + seed * 0.13);
      let sip = 0;
      if (cy < 0.35) {
        sip = smooth01(cy / 0.35);
      } else if (cy < 0.65) {
        sip = 1;
      } else {
        sip = 1 - smooth01((cy - 0.65) / 0.35);
      }

      pose.torsoRot = [lerp(0.02, -0.03, sip), 0, 0];
      pose.headAddRot = [lerp(0, -0.14, sip), 0, 0];

      // Tangan kanan mengangkat cangkir tanah liat ke bibir lalu menurunkan kembali
      pose.armR = {
        shoulder: lerp3([-0.22, 0, -0.12], [-1.65, 0.62, 0.25], sip),
        elbow: lerp(1.25, 0.45, sip),
      };
      pose.armL = {
        shoulder: [0.05, 0, 0.12],
        elbow: 0.16,
      };
      return pose;
    }

    case 'idle':
    default: {
      const sway = Math.sin(t * 0.35 + seed) * 0.015;
      const armBreathe = Math.sin(t * 1.1 + seed) * 0.03;
      pose.rootOffset = [sway, 0, 0];
      pose.armL = { shoulder: [armBreathe, 0, 0.1], elbow: 0.15 + armBreathe * 0.5 };
      pose.armR = { shoulder: [-armBreathe, 0, -0.1], elbow: 0.15 - armBreathe * 0.5 };
      return pose;
    }
  }
}
