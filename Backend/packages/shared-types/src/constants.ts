import 'dotenv/config';

// ─── WEIGHT ───────────────────────────────────────────────────────────────────
// ALL weight values in the database are stored in KILOGRAMS as integers.
// Conversion to quintals happens ONLY at display or commission calculation.
// 1 quintal = 100 kg.
export const WEIGHT_UNIT = 'KG' as const;
export const KG_PER_QUINTAL = 100;

export const toQuintals = (kg: number): number => kg / KG_PER_QUINTAL;
export const toKilograms = (quintals: number): number => quintals * KG_PER_QUINTAL;

// ─── MONEY ────────────────────────────────────────────────────────────────────
// ALL monetary values in the database are stored in ETB cents (integers).
// 1 ETB = 100 cents.
export const ETB_CENTS_PER_BIRR = 100;

export const toEtb = (cents: number): number => cents / ETB_CENTS_PER_BIRR;
export const toCents = (etb: number): number => Math.round(etb * ETB_CENTS_PER_BIRR);

// ─── FUEL ─────────────────────────────────────────────────────────────────────
export const DEFAULT_FUEL_CONSUMPTION_L_PER_100KM = 25;

// ─── GEOGRAPHY ────────────────────────────────────────────────────────────────
export const EARTH_RADIUS_KM = 6371;
