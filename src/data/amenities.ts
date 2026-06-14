import type { LocalizedText } from '@/types';

/** Property amenities (multi-select). Ids stable; names localized ar/ku/en. */
export type Amenity = { id: string; icon: string; name: LocalizedText };

export const AMENITIES: Amenity[] = [
  { id: 'parking', icon: 'car-outline', name: { ar: 'موقف سيارات', ku: 'پارکینگ', en: 'Parking' } },
  { id: 'elevator', icon: 'swap-vertical-outline', name: { ar: 'مصعد', ku: 'ئاسانسۆر', en: 'Elevator' } },
  { id: 'garden', icon: 'leaf-outline', name: { ar: 'حديقة', ku: 'باخچە', en: 'Garden' } },
  { id: 'pool', icon: 'water-outline', name: { ar: 'مسبح', ku: 'مەلەوانگە', en: 'Swimming pool' } },
  { id: 'ac', icon: 'snow-outline', name: { ar: 'تكييف', ku: 'ئەیرکۆندیشن', en: 'Air conditioning' } },
  { id: 'heating', icon: 'flame-outline', name: { ar: 'تدفئة مركزية', ku: 'گەرمکردنەوە', en: 'Central heating' } },
  { id: 'balcony', icon: 'business-outline', name: { ar: 'بلكونة', ku: 'بەلکۆنە', en: 'Balcony' } },
  { id: 'kitchen', icon: 'restaurant-outline', name: { ar: 'مطبخ مجهز', ku: 'چێشتخانەی تەواو', en: 'Fitted kitchen' } },
  { id: 'roof', icon: 'home-outline', name: { ar: 'سطح/مرتفع', ku: 'سەربان', en: 'Roof access' } },
  { id: 'storage', icon: 'cube-outline', name: { ar: 'مخزن', ku: 'ئەمبار', en: 'Storage room' } },
  { id: 'maidRoom', icon: 'bed-outline', name: { ar: 'غرفة خادمة', ku: 'ژووری خزمەتکار', en: 'Maid’s room' } },
  { id: 'solar', icon: 'sunny-outline', name: { ar: 'طاقة شمسية', ku: 'وزەی خۆر', en: 'Solar power' } },
];

export function getAmenity(id: string): Amenity | undefined {
  return AMENITIES.find((a) => a.id === id);
}
