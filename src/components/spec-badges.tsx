import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import { getCuisine, getDishType } from '@/data/cuisines';
import { DEAL_TYPE_SHORT, FUEL_LABEL, TRANSMISSION_SHORT } from '@/lib/attribute-labels';
import { groupThousands } from '@/lib/format';
import type { TKey } from '@/i18n/translations';
import type { Language, Listing } from '@/types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type Badge = { icon: IoniconName; label: string };
type Translate = (key: TKey, vars?: Record<string, string | number>) => string;

/** Compact km for tight card pills: 78,000 → "78K". */
function compactKm(km: number): string {
  return km >= 1000 ? `${Math.round(km / 1000)}K` : String(km);
}

/** Icon + label spec badges for a listing's structured attributes (cars, property). */
export function specBadgesFor(listing: Listing, t: Translate, lang: Language): Badge[] {
  const a = listing.attributes;
  if (a?.kind === 'food') {
    const out: Badge[] = [];
    const cuisine = a.cuisine ? getCuisine(a.cuisine) : undefined;
    if (cuisine) out.push({ icon: 'restaurant-outline', label: cuisine.name[lang] });
    const dish = a.dishType ? getDishType(a.dishType) : undefined;
    if (dish) out.push({ icon: dish.icon as IoniconName, label: dish.name[lang] });
    if (a.servings != null) out.push({ icon: 'people-outline', label: t('fact_servings', { count: a.servings }) });
    return out;
  }
  if (a?.kind === 'vehicle') {
    const out: Badge[] = [];
    if (a.year != null) out.push({ icon: 'calendar-outline', label: String(a.year) });
    if (a.mileageKm != null) out.push({ icon: 'speedometer-outline', label: `${compactKm(a.mileageKm)} ${t('unit_km')}` });
    if (a.transmission != null) out.push({ icon: 'cog-outline', label: t(TRANSMISSION_SHORT[a.transmission]) });
    if (a.fuel != null) out.push({ icon: 'flash-outline', label: t(FUEL_LABEL[a.fuel]) });
    return out;
  }
  if (a?.kind === 'property') {
    const out: Badge[] = [{ icon: 'pricetag-outline', label: t(DEAL_TYPE_SHORT[a.dealType]) }];
    if (a.bedrooms != null) out.push({ icon: 'bed-outline', label: t('fact_beds', { count: a.bedrooms }) });
    if (a.bathrooms != null) out.push({ icon: 'water-outline', label: String(a.bathrooms) });
    if (a.areaM2 != null) out.push({ icon: 'resize-outline', label: `${groupThousands(a.areaM2)} ${t('unit_m2')}` });
    return out;
  }
  return [];
}

/**
 * A row of soft brand pills surfacing the key spec facts. Renders nothing for
 * listings without structured attributes, so generic categories are unchanged.
 */
export function SpecBadges({ listing, max }: { listing: Listing; max?: number }) {
  const theme = useTheme();
  const { t, lang, isRTL } = useI18n();
  const badges = specBadgesFor(listing, t, lang).slice(0, max ?? 99);
  if (badges.length === 0) return null;

  return (
    <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {badges.map((b) => (
        <View
          key={b.label}
          style={[styles.badge, { backgroundColor: theme.tintSoft, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name={b.icon} size={11} color={theme.tint} />
          <ThemedText numberOfLines={1} style={[styles.text, { color: theme.tint }]}>
            {b.label}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexWrap: 'nowrap', gap: Spacing.one, overflow: 'hidden' },
  badge: {
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.one + 2,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    flexShrink: 1,
  },
  text: { fontSize: 11, lineHeight: 15, fontWeight: '700', flexShrink: 1 },
});
