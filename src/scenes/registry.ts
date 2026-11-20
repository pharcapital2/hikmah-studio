import type { ProductionStory } from './types';
import { KONTEN_HIKMAH_1 } from './kontenHikmah1';
import { KONTEN_HIKMAH_2 } from './kontenHikmah2';
import { KONTEN_HIKMAH_3 } from './kontenHikmah3';
import { KONTEN_HIKMAH_4 } from './kontenHikmah4';

export interface StoryRegistryEntry {
  key: string; // 'konten-1' | 'konten-2' | 'konten-3' | 'konten-4'
  label: string;
  story: ProductionStory;
}

export const PRODUCTION_STORIES: StoryRegistryEntry[] = [
  { key: 'konten-4', label: '🌳 Konten #4 (Pohon)', story: KONTEN_HIKMAH_4 },
  { key: 'konten-3', label: '🎬 Konten #3 (Pasar)', story: KONTEN_HIKMAH_3 },
  { key: 'konten-2', label: '🌾 Konten #2 (Sawah)', story: KONTEN_HIKMAH_2 },
  { key: 'konten-1', label: '🎬 Konten #1 (Jembatan)', story: KONTEN_HIKMAH_1 },
];

export function getStoryById(idOrKey: string): ProductionStory | undefined {
  return PRODUCTION_STORIES.find((e) => e.key === idOrKey || e.story.id === idOrKey)?.story;
}
