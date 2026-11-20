import type { TimeOfDay, Weather } from './types';
export interface SkyPreset { sky: string; fog: string; sunColor: string; sunIntensity: number; ambient: number; sunPos: [number, number, number]; night: boolean }
export const SKY_PRESETS: Record<TimeOfDay, SkyPreset> = {
  day: { sky: '#87ceeb', fog: '#cfe8f5', sunColor: '#fff4d6', sunIntensity: 2.2, ambient: 0.7, sunPos: [60, 90, 40], night: false },
  sunset: { sky: '#f4a259', fog: '#f7c08a', sunColor: '#ff9a5a', sunIntensity: 1.6, ambient: 0.45, sunPos: [90, 25, 30], night: false },
  night: { sky: '#0a1330', fog: '#0f1a3a', sunColor: '#8aa4ff', sunIntensity: 0.5, ambient: 0.22, sunPos: [-40, 70, -30], night: true },
};
export const WEATHER_FOG: Record<Weather, number> = { clear: 0.0025, rain: 0.008, fog: 0.025 };
export const isNight = (t: TimeOfDay) => t === 'night';
/** Props like house/street lights should use this to know when to glow. */
export const lightsOn = (t: TimeOfDay, w: Weather) => t === 'night' || (t === 'sunset' && w !== 'clear');
export const basePalette = { grass: '#6aa84f', dirt: '#8b6b45', road: '#3a3d42', wood: '#8a5a33', brick: '#b5523b', roof: '#7a3b2e', stone: '#9aa0a6', water: '#3d8fbf', white: '#f2efe6' };
