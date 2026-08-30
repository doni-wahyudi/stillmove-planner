/**
 * Pantry / Fridge Tracker Types
 */

export type StorageLocation =
  | 'Kulkas Atas'
  | 'Kulkas Bawah'
  | 'Freezer'
  | 'Lemari Dapur'
  | 'Meja Dapur';

export type PantryCategory =
  | 'Sayuran'
  | 'Buah'
  | 'Daging/Protein'
  | 'Bumbu & Rempah'
  | 'Minuman'
  | 'Susu & Olahan'
  | 'Karbohidrat'
  | 'Makanan Beku'
  | 'Saus & Kondimen'
  | 'Other';

export type QuantityUnit =
  | 'gram'
  | 'kg'
  | 'ml'
  | 'liter'
  | 'pcs'
  | 'botol'
  | 'bungkus'
  | 'kaleng'
  | 'sachet'
  | 'buah';

export type QuantityFraction = 'full' | 'three-quarters' | 'half' | 'quarter' | 'empty';

export type FreshnessStatus = 'fresh' | 'ok' | 'warning' | 'critical' | 'expired' | 'unknown';

export interface PantryItem {
  id: string;
  profile_id: string;
  created_at: string;
  updated_at: string;

  // Identity
  name: string;
  emoji: string;
  category: PantryCategory;
  storage_location: StorageLocation;
  brand: string;

  // Quantity
  quantity_initial: number;
  quantity_unit: QuantityUnit;
  quantity_remaining: number;
  quantity_fraction: QuantityFraction;

  // Dates
  purchase_date: string;
  expired_date: string | null;
  shelf_life_days: number | null;

  // Notes
  notes: string;
}

export interface PantryItemFormData {
  name: string;
  emoji: string;
  category: PantryCategory;
  storage_location: StorageLocation;
  brand: string;
  quantity_initial: number;
  quantity_unit: QuantityUnit;
  quantity_remaining: number;
  quantity_fraction: QuantityFraction;
  purchase_date: string;
  expired_date: string;
  shelf_life_days: string;
  notes: string;
}
