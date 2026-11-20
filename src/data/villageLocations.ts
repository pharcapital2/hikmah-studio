import { VillageLocationPreset } from '../types/story';

export const VILLAGE_LOCATION_PRESETS: VillageLocationPreset[] = [
  {
    id: 'river-bridge',
    label: 'Sungai & Jembatan Kincir',
    icon: '🌉',
    description: 'Jembatan lengkung berlentera, sungai mengalir, & kincir air berputar',
    camera: {
      mode: 'orbitPan',
      position: [3.6, 2.5, 13.8],
      lookAt: [-2.4, 1.2, 7.6],
      fov: 52,
      orbitSpeed: 0.06,
      damping: 4.0,
    },
  },
  {
    id: 'rice-field',
    label: 'Sawah Terasering & Saung',
    icon: '🌾',
    description: 'Petak sawah bertingkat, padi bergoyang, saung bambu, & pohon kelapa',
    camera: {
      mode: 'orbitPan',
      position: [7.8, 2.2, 4.2],
      lookAt: [13.5, 1.3, -2.5],
      fov: 50,
      orbitSpeed: 0.06,
      damping: 4.0,
    },
  },
  {
    id: 'surau-well',
    label: 'Surau & Sumur Desa',
    icon: '🕌',
    description: 'Mushola panggung beratap tajug, bedug, sumur timba, & gerobak kayu',
    camera: {
      mode: 'orbitPan',
      position: [-3.0, 2.55, 0.6],
      lookAt: [-10.4, 2.35, -0.8],
      fov: 54,
      orbitSpeed: 0.04,
      damping: 4.0,
    },
  },
  {
    id: 'village-road',
    label: 'Jalan Desa & Batu Besar',
    icon: '🪨',
    description: 'Koridor jalan utama desa, batu raksasa, rumah panggung, & gunung',
    camera: {
      mode: 'steadyTrack',
      position: [0.35, 1.72, 4.6],
      lookAt: [-0.25, 1.35, -3.0],
      fov: 48,
      damping: 4.0,
    },
  },
  {
    id: 'panorama',
    label: 'Panorama Desa Full',
    icon: '🏞️',
    description: 'Tampak menyeluruh sungai, jembatan, sawah, surau, dan jalan desa',
    camera: {
      mode: 'orbitPan',
      position: [0.5, 6.8, 18.5],
      lookAt: [0, 1.2, -4.0],
      fov: 54,
      orbitSpeed: 0.05,
      damping: 4.0,
    },
  },
];
