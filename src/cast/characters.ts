export type Emotion =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'surprised'
  | 'angry'
  | 'solemn'
  | 'thinking';

export type HeadwearType =
  | 'peci'
  | 'peci-white'
  | 'sorban'
  | 'caping'
  | 'hijab'
  | 'none';

export type OutfitStyle =
  | 'koko_sarong'
  | 'gamis_cardigan'
  | 'hoodie_backpack'
  | 'koko_vest_sash'
  | 'farmer_overalls'
  | 'jubbah_cloak'
  | 'batik_formal'
  | 'blazer_tie';

export const OUTFIT_LABELS: { id: OutfitStyle; label: string; icon: string }[] = [
  { id: 'koko_sarong', label: 'Koko & Sarung', icon: '🕌' },
  { id: 'gamis_cardigan', label: 'Gamis Cardigan', icon: '👗' },
  { id: 'hoodie_backpack', label: 'Hoodie & Ransel', icon: '🎒' },
  { id: 'koko_vest_sash', label: 'Rompi & Selendang', icon: '🧥' },
  { id: 'farmer_overalls', label: 'Werpak Petani', icon: '🌾' },
  { id: 'jubbah_cloak', label: 'Jubah & Mantel', icon: '✨' },
  { id: 'batik_formal', label: 'Kemeja Batik', icon: '🎨' },
  { id: 'blazer_tie', label: 'Jas & Dasi', icon: '👔' },
];

export type CostumePattern =
  | 'sarong'
  | 'songket'
  | 'polka'
  | 'batik'
  | 'flannel'
  | 'stripes'
  | 'koko_embroidery'
  | 'plain';

export interface CastCostume {
  skin: string;
  /** Signature porcelain-ivory pillow head (#f8fafc default). */
  headColor?: string;
  hair: string;
  /** Baju koko / gamis primary color. */
  top: string;
  /** Sarung / skirt base color. */
  bottom: string;
  /** Sarung plaid stripe / sash / polka accent. */
  accent?: string;
  /** Warna lapisan luar (cardigan, rompi, ransel, werpak, mantel, jas). */
  outerColor?: string;
  /** Gaya lengan baju pada segmen lengan atas stickman. */
  sleeveStyle?: 'short' | 'long' | 'none';
  /** Gaya siluet busana 3D. */
  outfit?: OutfitStyle;
  pattern?: CostumePattern;
  /** Diagonal selendang/sorban sash across torso. */
  sash?: boolean;
  headwear?: HeadwearType;
  height: number;
}

export interface CastCharacter {
  id: string;
  name: string;
  costume: CastCostume;
  seed: number;
}

export const castRegistry: Record<string, CastCharacter> = {
  ayah: {
    id: 'ayah',
    name: 'Ayah Arman',
    seed: 11,
    costume: {
      skin: '#e0ac82',
      headColor: '#f8fafc',
      hair: '#334155',
      top: '#2b6cb0',
      bottom: '#1e293b',
      accent: '#38bdf8',
      outerColor: '#1e40af',
      sleeveStyle: 'short',
      outfit: 'koko_sarong',
      pattern: 'sarong',
      headwear: 'peci',
      height: 1.74,
    },
  },
  ibu: {
    id: 'ibu',
    name: 'Ibu Aminah',
    seed: 23,
    costume: {
      skin: '#e8b890',
      headColor: '#f8fafc',
      hair: '#2a1a14',
      top: '#be185d',
      bottom: '#9d174d',
      accent: '#fbcfe8',
      outerColor: '#831843',
      sleeveStyle: 'long',
      outfit: 'gamis_cardigan',
      pattern: 'polka',
      headwear: 'hijab',
      height: 1.62,
    },
  },
  anak: {
    id: 'anak',
    name: 'Adik Fajar',
    seed: 37,
    costume: {
      skin: '#e6b48a',
      headColor: '#f8fafc',
      hair: '#1e293b',
      top: '#d97706',
      bottom: '#1e3a8a',
      accent: '#fde047',
      outerColor: '#2563eb',
      sleeveStyle: 'short',
      outfit: 'hoodie_backpack',
      pattern: 'stripes',
      headwear: 'none',
      height: 1.25,
    },
  },
  kakek: {
    id: 'kakek',
    name: 'Kakek Salman',
    seed: 53,
    costume: {
      skin: '#dfb592',
      headColor: '#f8fafc',
      hair: '#64748b',
      top: '#3f6212',
      bottom: '#1e293b',
      accent: '#fde68a',
      outerColor: '#713f12',
      sleeveStyle: 'long',
      outfit: 'koko_vest_sash',
      pattern: 'songket',
      sash: true,
      headwear: 'peci-white',
      height: 1.68,
    },
  },
  petani: {
    id: 'petani',
    name: 'Pak Tani Sabar',
    seed: 71,
    costume: {
      skin: '#d9a478',
      headColor: '#f8fafc',
      hair: '#334155',
      top: '#9a3412',
      bottom: '#292524',
      accent: '#fbbf24',
      outerColor: '#374151',
      sleeveStyle: 'short',
      outfit: 'farmer_overalls',
      pattern: 'flannel',
      headwear: 'caping',
      height: 1.7,
    },
  },
  ustadz: {
    id: 'ustadz',
    name: 'Ustadz Hakim',
    seed: 89,
    costume: {
      skin: '#e4b894',
      headColor: '#f8fafc',
      hair: '#1e293b',
      top: '#065f46',
      bottom: '#0f172a',
      accent: '#fef08a',
      outerColor: '#022c22',
      sleeveStyle: 'long',
      outfit: 'jubbah_cloak',
      pattern: 'koko_embroidery',
      sash: true,
      headwear: 'sorban',
      height: 1.76,
    },
  },
};

export const getCast = (id: string): CastCharacter =>
  castRegistry[id] ?? castRegistry.anak;
