import { Zone, CargoType } from '../types/calculator';

export const ZONES: Zone[] = [
  { id: 'addis', en: 'Addis Ababa', am: 'አዲስ አበባ' },
  { id: 'hawassa', en: 'Hawassa', am: 'ሀዋሳ' },
  { id: 'jimma', en: 'Jimma', am: 'ጅማ' },
  { id: 'dire_dawa', en: 'Dire Dawa', am: 'ድሬዳዋ' },
  { id: 'gondar', en: 'Gondar', am: 'ጎንደር' },
  { id: 'mekelle', en: 'Mekelle', am: 'መቐለ' },
  { id: 'gambela', en: 'Gambela', am: 'ጋምቤላ' },
  { id: 'bahir_dar', en: 'Bahir Dar', am: 'ባህር ዳር' },
  { id: 'adama', en: 'Adama', am: 'አዳማ' },
  { id: 'dessie', en: 'Dessie', am: 'ደሴ' },
  { id: 'arba_minch', en: 'Arba Minch', am: 'አርባ ምንጭ' },
  { id: 'shashemene', en: 'Shashemene', am: 'ሻሸመኔ' },
];

export const CARGO_TYPES: CargoType[] = [
  { id: 'grain', en: 'Bagged Grain', am: 'ጥራጥሬ', icon: 'Wheat' },
  { id: 'coffee', en: 'Coffee', am: 'ቡና', icon: 'Coffee' },
  { id: 'livestock', en: 'Livestock', am: 'እንስሳ', icon: 'Beef', warning: { en: 'Special permit required', am: 'ልዩ ፈቃድ ያስፈልጋል' } },
  { id: 'produce', en: 'Fresh Produce', am: 'አትክልትና ፍሬ', icon: 'Apple', isTimeCritical: true, maxTransitHours: 24, warning: { en: 'TIME-CRITICAL — 24h max transit', am: 'አጣዳፊ ጭነት — ቢበዛ 24 ሰዓት' } },
  { id: 'beverages', en: 'Beverages', am: 'መጠጥ', icon: 'Milk' },
  { id: 'cement', en: 'Cement', am: 'ሲሚንቶ', icon: 'Brick' },
  { id: 'construction', en: 'Construction Materials', am: 'የግንባታ እቃ', icon: 'Construction' },
  { id: 'fmcg', en: 'FMCG', am: 'ፍጆታ ዕቃ', icon: 'Package' },
  { id: 'khat', en: 'Khat', am: 'ጫት', icon: 'Leaf', isTimeCritical: true, maxTransitHours: 6, warning: { en: 'TIME-CRITICAL — 6h max transit', am: 'አጣዳፊ ጭነት — ቢበዛ 6 ሰዓት' } },
  { id: 'fish', en: 'Fresh Fish', am: 'ዓሣ', icon: 'Fish', isTimeCritical: true, maxTransitHours: 8, warning: { en: 'TIME-CRITICAL — 8h max transit', am: 'አጣዳፊ ጭነት — ቢበዛ 8 ሰዓት' } },
  { id: 'cotton', en: 'Cotton', am: 'ጥጥ', icon: 'Cloud' },
  { id: 'honey', en: 'Honey', am: 'ማር', icon: 'Hexagon' },
];

export const DISTANCE_LOOKUP: Record<string, number> = {
  'addis-hawassa': 275,
  'addis-jimma': 346,
  'addis-dire_dawa': 515,
  'addis-gondar': 738,
  'addis-mekelle': 783,
  'addis-gambela': 775,
  'addis-bahir_dar': 578,
  'addis-adama': 100,
  'addis-arba_minch': 505,
  'hawassa-jimma': 360,
  // Default fallback for others
};

export const getDistance = (o: string, d: string) => {
  const key = `${o}-${d}`;
  const revKey = `${d}-${o}`;
  return DISTANCE_LOOKUP[key] || DISTANCE_LOOKUP[revKey] || 450; // Default 450km if not found
};