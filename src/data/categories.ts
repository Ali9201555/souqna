import type { Category } from '@/types';

export const CATEGORIES: Category[] = [
  { id: 'vehicles', icon: 'car-sport', name: { ar: 'سيارات', ku: 'ئۆتۆمبێل', en: 'Vehicles' } },
  { id: 'realestate', icon: 'home', name: { ar: 'عقارات', ku: 'خانووبەرە', en: 'Real estate' } },
  { id: 'mobiles', icon: 'phone-portrait', name: { ar: 'موبايلات', ku: 'مۆبایل', en: 'Mobiles' } },
  { id: 'electronics', icon: 'laptop', name: { ar: 'إلكترونيات', ku: 'ئەلیکترۆنیات', en: 'Electronics' } },
  { id: 'furniture', icon: 'bed', name: { ar: 'أثاث', ku: 'کەلوپەل', en: 'Furniture' } },
  { id: 'appliances', icon: 'tv', name: { ar: 'أجهزة منزلية', ku: 'ئامێری ماڵەوە', en: 'Home appliances' } },
  { id: 'food', icon: 'restaurant', name: { ar: 'أكل بيتي', ku: 'خواردنی ماڵەوە', en: 'Home-cooked food' } },
  { id: 'fashion', icon: 'shirt', name: { ar: 'أزياء', ku: 'جلوبەرگ', en: 'Fashion' } },
  { id: 'power', icon: 'flash', name: { ar: 'مولدات وطاقة', ku: 'مۆڵید و وزە', en: 'Generators & power' } },
  { id: 'services', icon: 'construct', name: { ar: 'خدمات', ku: 'خزمەتگوزاری', en: 'Services' } },
  { id: 'jobs', icon: 'briefcase', name: { ar: 'وظائف', ku: 'کار', en: 'Jobs' } },
  { id: 'other', icon: 'pricetags', name: { ar: 'أخرى', ku: 'هیتر', en: 'Other' } },
];

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
