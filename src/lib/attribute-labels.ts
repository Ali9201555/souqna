import type { TKey } from '@/i18n/translations';
import type { DealType, Fulfillment, FuelType, PropertyType, Transmission } from '@/types';

/** i18n keys for attribute enum values, shared by Sell inputs, cards, filters, detail. */

export const FUEL_LABEL: Record<FuelType, TKey> = {
  gasoline: 'attr_fuel_gasoline',
  diesel: 'attr_fuel_diesel',
  hybrid: 'attr_fuel_hybrid',
  electric: 'attr_fuel_electric',
  lpg: 'attr_fuel_lpg',
};

export const PROPERTY_TYPE_LABEL: Record<PropertyType, TKey> = {
  house: 'attr_prop_house',
  apartment: 'attr_prop_apartment',
  land: 'attr_prop_land',
  commercial: 'attr_prop_commercial',
  farm: 'attr_prop_farm',
};

export const TRANSMISSION_LABEL: Record<Transmission, TKey> = {
  automatic: 'attr_trans_automatic',
  manual: 'attr_trans_manual',
};

/** Compact transmission for card badges where the full word is too wide. */
export const TRANSMISSION_SHORT: Record<Transmission, TKey> = {
  automatic: 'attr_trans_automatic_short',
  manual: 'attr_trans_manual_short',
};

export const DEAL_TYPE_LABEL: Record<DealType, TKey> = {
  sale: 'attr_deal_sale',
  rent: 'attr_deal_rent',
};

/** Compact variants for chips/badges where the full label is too long. */
export const DEAL_TYPE_SHORT: Record<DealType, TKey> = {
  sale: 'attr_deal_sale_short',
  rent: 'attr_deal_rent_short',
};

export const FULFILLMENT_LABEL: Record<Fulfillment, TKey> = {
  pickup: 'fulfillment_pickup',
  delivery: 'fulfillment_delivery',
  both: 'fulfillment_both',
};
