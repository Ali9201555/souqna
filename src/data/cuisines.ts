import type { LocalizedText } from '@/types';

/**
 * Reference data for the home-cooked Food section ("Etsy for home cooks").
 * Ids are stable kebab-case; names localized ar / ku / en (en falls back).
 * Iraqi-first ordering. Used by food listing attributes, the Sell-food form,
 * and the Food section filters.
 */

export type Cuisine = { id: string; name: LocalizedText };

export const CUISINES: Cuisine[] = [
  { id: 'iraqi', name: { ar: 'عراقي', ku: 'عێراقی', en: 'Iraqi' } },
  { id: 'kurdish', name: { ar: 'كردي', ku: 'کوردی', en: 'Kurdish' } },
  { id: 'levantine', name: { ar: 'شامي', ku: 'شامی', en: 'Levantine' } },
  { id: 'gulf', name: { ar: 'خليجي', ku: 'کەنداوی', en: 'Gulf' } },
  { id: 'egyptian', name: { ar: 'مصري', ku: 'میسری', en: 'Egyptian' } },
  { id: 'turkish', name: { ar: 'تركي', ku: 'تورکی', en: 'Turkish' } },
  { id: 'persian', name: { ar: 'إيراني', ku: 'ئێرانی', en: 'Persian' } },
  { id: 'indian', name: { ar: 'هندي', ku: 'هیندی', en: 'Indian' } },
  { id: 'italian', name: { ar: 'إيطالي', ku: 'ئیتاڵی', en: 'Italian' } },
  { id: 'asian', name: { ar: 'آسيوي', ku: 'ئاسیایی', en: 'Asian' } },
  { id: 'fastfood', name: { ar: 'وجبات سريعة', ku: 'خواردنی خێرا', en: 'Fast food' } },
  { id: 'sweets', name: { ar: 'حلويات', ku: 'شیرینی', en: 'Sweets & desserts' } },
  { id: 'bakery', name: { ar: 'معجنات ومخبوزات', ku: 'هەویرینە', en: 'Bakery & pastries' } },
  { id: 'healthy', name: { ar: 'صحي ودايت', ku: 'تەندروست', en: 'Healthy & diet' } },
  { id: 'other', name: { ar: 'أخرى', ku: 'هیتر', en: 'Other' } },
];

export type DishType = { id: string; icon: string; name: LocalizedText };

/** `icon` is an Ionicons glyph (for chips/badges). */
export const DISH_TYPES: DishType[] = [
  { id: 'main', icon: 'restaurant', name: { ar: 'طبق رئيسي', ku: 'خواردنی سەرەکی', en: 'Main dish' } },
  { id: 'rice', icon: 'nutrition', name: { ar: 'تمن ورز', ku: 'برنج', en: 'Rice dishes' } },
  { id: 'grill', icon: 'flame', name: { ar: 'مشاوي', ku: 'برژاو', en: 'Grills' } },
  { id: 'appetizer', icon: 'leaf', name: { ar: 'مقبلات', ku: 'پێشخواردن', en: 'Appetizers' } },
  { id: 'soup', icon: 'cafe', name: { ar: 'شوربات', ku: 'شۆربا', en: 'Soups' } },
  { id: 'salad', icon: 'leaf-outline', name: { ar: 'سلطات', ku: 'زەڵاتە', en: 'Salads' } },
  { id: 'breakfast', icon: 'egg', name: { ar: 'فطور', ku: 'نانی بەیانی', en: 'Breakfast' } },
  { id: 'pastry', icon: 'pizza', name: { ar: 'معجنات', ku: 'هەویرینە', en: 'Pastries' } },
  { id: 'bread', icon: 'browsers', name: { ar: 'خبز', ku: 'نان', en: 'Bread' } },
  { id: 'dessert', icon: 'ice-cream', name: { ar: 'حلويات', ku: 'شیرینی', en: 'Desserts' } },
  { id: 'pickles', icon: 'flask', name: { ar: 'مخللات وطرشي', ku: 'تورشی', en: 'Pickles' } },
  { id: 'drinks', icon: 'wine', name: { ar: 'مشروبات وعصائر', ku: 'خواردنەوە', en: 'Drinks & juices' } },
  { id: 'other', icon: 'fast-food', name: { ar: 'أخرى', ku: 'هیتر', en: 'Other' } },
];

export type DietTag = { id: string; name: LocalizedText };

/**
 * Optional dietary tags a cook can flag on a dish. Halal is assumed the norm
 * in Iraq, so it is not a tag here — these are the differentiators buyers
 * filter on.
 */
export const DIET_TAGS: DietTag[] = [
  { id: 'vegetarian', name: { ar: 'نباتي', ku: 'ڕووەکی', en: 'Vegetarian' } },
  { id: 'vegan', name: { ar: 'نباتي صرف', ku: 'ڕووەکی تەواو', en: 'Vegan' } },
  { id: 'glutenFree', name: { ar: 'خالٍ من الغلوتين', ku: 'بێ گلۆتین', en: 'Gluten-free' } },
  { id: 'sugarFree', name: { ar: 'خالٍ من السكر', ku: 'بێ شەکر', en: 'Sugar-free' } },
  { id: 'spicy', name: { ar: 'حار', ku: 'تیژ', en: 'Spicy' } },
  { id: 'organic', name: { ar: 'عضوي', ku: 'ئۆرگانیک', en: 'Organic' } },
];

export function getCuisine(id: string): Cuisine | undefined {
  return CUISINES.find((c) => c.id === id);
}

export function getDishType(id: string): DishType | undefined {
  return DISH_TYPES.find((d) => d.id === id);
}

export function getDietTag(id: string): DietTag | undefined {
  return DIET_TAGS.find((d) => d.id === id);
}
