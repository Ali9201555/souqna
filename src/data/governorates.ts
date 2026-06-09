import type { Governorate } from '@/types';

export const GOVERNORATES: Governorate[] = [
  { id: 'baghdad', name: { ar: 'بغداد', ku: 'بەغدا', en: 'Baghdad' } },
  { id: 'basra', name: { ar: 'البصرة', ku: 'بەسرە', en: 'Basra' } },
  { id: 'nineveh', name: { ar: 'نينوى', ku: 'نەینەوا', en: 'Nineveh' } },
  { id: 'erbil', name: { ar: 'أربيل', ku: 'هەولێر', en: 'Erbil' } },
  { id: 'sulaymaniyah', name: { ar: 'السليمانية', ku: 'سلێمانی', en: 'Sulaymaniyah' } },
  { id: 'duhok', name: { ar: 'دهوك', ku: 'دهۆک', en: 'Duhok' } },
  { id: 'kirkuk', name: { ar: 'كركوك', ku: 'کەرکووک', en: 'Kirkuk' } },
  { id: 'najaf', name: { ar: 'النجف', ku: 'نەجەف', en: 'Najaf' } },
  { id: 'karbala', name: { ar: 'كربلاء', ku: 'کەربەلا', en: 'Karbala' } },
  { id: 'babylon', name: { ar: 'بابل', ku: 'بابل', en: 'Babylon' } },
  { id: 'wasit', name: { ar: 'واسط', ku: 'واسیت', en: 'Wasit' } },
  { id: 'diyala', name: { ar: 'ديالى', ku: 'دیالە', en: 'Diyala' } },
  { id: 'anbar', name: { ar: 'الأنبار', ku: 'ئەنبار', en: 'Anbar' } },
  { id: 'saladin', name: { ar: 'صلاح الدين', ku: 'سەلاحەدین', en: 'Saladin' } },
  { id: 'dhiqar', name: { ar: 'ذي قار', ku: 'زیقار', en: 'Dhi Qar' } },
  { id: 'maysan', name: { ar: 'ميسان', ku: 'مەیسان', en: 'Maysan' } },
  { id: 'muthanna', name: { ar: 'المثنى', ku: 'موسەننا', en: 'Muthanna' } },
  { id: 'qadisiyah', name: { ar: 'القادسية', ku: 'قادسیە', en: 'Qadisiyah' } },
  { id: 'halabja', name: { ar: 'حلبجة', ku: 'هەڵەبجە', en: 'Halabja' } },
];

export function getGovernorate(id: string): Governorate | undefined {
  return GOVERNORATES.find((g) => g.id === id);
}
