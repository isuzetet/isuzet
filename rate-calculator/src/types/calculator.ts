export type Language = 'en' | 'am';

export interface Zone {
  id: string;
  en: string;
  am: string;
}

export interface CargoType {
  id: string;
  en: string;
  am: string;
  icon: string;
  multiplier?: number;
  warning?: {
    en: string;
    am: string;
  };
  isTimeCritical?: boolean;
  maxTransitHours?: number;
}

export interface EstimateResponse {
  distanceKm: number;
  transitHours: number;
  baseRate: number;
  cargoAdjustment: number;
  seasonalAdjustment: number;
  total: number;
  minRange: number;
  maxRange: number;
  savingsVsBroker?: number;
  savingsPct?: number;
}

export interface CalculatorState {
  originZone: string;
  destZone: string;
  cargoType: string;
  weight: number;
  weightUnit: 'kg' | 'quintals';
  pickupDate: string;
  paymentModel: 'ESCROW' | 'COD' | 'ROLLING_CREDIT';
}