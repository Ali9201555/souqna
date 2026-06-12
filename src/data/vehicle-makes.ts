import type { LocalizedText } from '@/types';

export type VehicleMake = { id: string; name: LocalizedText };

/** Common makes in the Iraqi market, roughly by popularity. Ids are stable. */
export const VEHICLE_MAKES: VehicleMake[] = [
  { id: 'toyota', name: { ar: 'تويوتا', ku: 'تۆیۆتا', en: 'Toyota' } },
  { id: 'kia', name: { ar: 'كيا', ku: 'کیا', en: 'Kia' } },
  { id: 'hyundai', name: { ar: 'هيونداي', ku: 'هیۆندای', en: 'Hyundai' } },
  { id: 'nissan', name: { ar: 'نيسان', ku: 'نیسان', en: 'Nissan' } },
  { id: 'chevrolet', name: { ar: 'شفروليت', ku: 'شیڤرۆلێت', en: 'Chevrolet' } },
  { id: 'mitsubishi', name: { ar: 'ميتسوبيشي', ku: 'میتسوبیشی', en: 'Mitsubishi' } },
  { id: 'honda', name: { ar: 'هوندا', ku: 'هۆندا', en: 'Honda' } },
  { id: 'ford', name: { ar: 'فورد', ku: 'فۆرد', en: 'Ford' } },
  { id: 'mercedes', name: { ar: 'مرسيدس', ku: 'مەرسێدس', en: 'Mercedes-Benz' } },
  { id: 'bmw', name: { ar: 'بي إم دبليو', ku: 'بی ئێم دەبلیو', en: 'BMW' } },
  { id: 'other', name: { ar: 'أخرى', ku: 'هیتر', en: 'Other' } },
];

export function getVehicleMake(id: string): VehicleMake | undefined {
  return VEHICLE_MAKES.find((m) => m.id === id);
}
