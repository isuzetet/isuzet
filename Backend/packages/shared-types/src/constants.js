"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EARTH_RADIUS_KM = exports.DEFAULT_FUEL_CONSUMPTION_L_PER_100KM = exports.toCents = exports.toEtb = exports.ETB_CENTS_PER_BIRR = exports.toKilograms = exports.toQuintals = exports.KG_PER_QUINTAL = exports.WEIGHT_UNIT = void 0;
require("dotenv/config");
// ─── WEIGHT ───────────────────────────────────────────────────────────────────
// ALL weight values in the database are stored in KILOGRAMS as integers.
// Conversion to quintals happens ONLY at display or commission calculation.
// 1 quintal = 100 kg.
exports.WEIGHT_UNIT = 'KG';
exports.KG_PER_QUINTAL = 100;
const toQuintals = (kg) => kg / exports.KG_PER_QUINTAL;
exports.toQuintals = toQuintals;
const toKilograms = (quintals) => quintals * exports.KG_PER_QUINTAL;
exports.toKilograms = toKilograms;
// ─── MONEY ────────────────────────────────────────────────────────────────────
// ALL monetary values in the database are stored in ETB cents (integers).
// 1 ETB = 100 cents.
exports.ETB_CENTS_PER_BIRR = 100;
const toEtb = (cents) => cents / exports.ETB_CENTS_PER_BIRR;
exports.toEtb = toEtb;
const toCents = (etb) => Math.round(etb * exports.ETB_CENTS_PER_BIRR);
exports.toCents = toCents;
// ─── FUEL ─────────────────────────────────────────────────────────────────────
exports.DEFAULT_FUEL_CONSUMPTION_L_PER_100KM = 25;
// ─── GEOGRAPHY ────────────────────────────────────────────────────────────────
exports.EARTH_RADIUS_KM = 6371;
//# sourceMappingURL=constants.js.map