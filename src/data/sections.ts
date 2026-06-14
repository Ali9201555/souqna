import type { TKey } from '@/i18n/translations';

/**
 * Categories with a dedicated browse section (structured filters + fact
 * badges). Everything else routes to the generic /search screen. Adding a
 * section = one entry here + an attributes variant + a filter set.
 */
export const SECTION_CATEGORIES = ['vehicles', 'realestate', 'food'] as const;
export type SectionCategory = (typeof SECTION_CATEGORIES)[number];

export function hasSection(id: string | null | undefined): id is SectionCategory {
  return id === 'vehicles' || id === 'realestate' || id === 'food';
}

export const SECTION_TITLE: Record<SectionCategory, TKey> = {
  vehicles: 'section_cars_title',
  realestate: 'section_realestate_title',
  food: 'section_food_title',
};
