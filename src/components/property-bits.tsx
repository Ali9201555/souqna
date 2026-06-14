import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { getAmenity } from '@/data/amenities';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import { INTERNET_LABEL, WATER_LABEL } from '@/lib/attribute-labels';
import { approxOther, formatMoney } from '@/lib/format';
import type { Currency, PropertyUtilities } from '@/types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/**
 * The headline differentiator: structured Iraqi utilities (national-grid hours,
 * generator amps, water, internet, security) shown as a pinned card under the
 * price. The single feature OpenSooq doesn't have.
 */
export function UtilityBadges({ utilities }: { utilities: PropertyUtilities }) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { t, isRTL } = useI18n();
  const u = utilities;

  const badges: { icon: IoniconName; label: string; strong?: boolean }[] = [];
  if (u.gridHoursPerDay != null) badges.push({ icon: 'flash', label: t('util_grid', { count: u.gridHoursPerDay }), strong: true });
  if (u.generatorAmps != null) badges.push({ icon: 'battery-charging', label: t('util_amps', { count: u.generatorAmps }), strong: true });
  else if (u.generatorIncluded) badges.push({ icon: 'battery-charging', label: t('util_generator'), strong: true });
  if (u.water != null) badges.push({ icon: 'water', label: t(WATER_LABEL[u.water]) });
  if (u.waterFiltered) badges.push({ icon: 'funnel', label: t('util_waterFiltered') });
  if (u.internet != null) badges.push({ icon: 'wifi', label: t(INTERNET_LABEL[u.internet]) });
  if (u.securityGuard) badges.push({ icon: 'shield-checkmark', label: t('util_security') });
  if (u.cctv) badges.push({ icon: 'videocam', label: t('util_cctv') });
  if (u.gated) badges.push({ icon: 'lock-closed', label: t('util_gated') });
  if (u.parkingSpaces != null && u.parkingSpaces > 0) badges.push({ icon: 'car', label: t('util_parking', { count: u.parkingSpaces }) });
  if (badges.length === 0) return null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, boxShadow: Shadow.card },
        scheme === 'dark' && { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
      ]}>
      <View style={[styles.titleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Ionicons name="flash" size={16} color={theme.tint} />
        <ThemedText style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{t('util_title')}</ThemedText>
      </View>
      <View style={[styles.wrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {badges.map((b) => (
          <View
            key={b.label}
            style={[
              styles.badge,
              { backgroundColor: b.strong ? theme.tintSoft : theme.backgroundElement, flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}>
            <Ionicons name={b.icon} size={14} color={b.strong ? theme.tint : theme.textSecondary} />
            <ThemedText type="small" style={{ color: b.strong ? theme.tint : theme.text, fontWeight: b.strong ? '700' : '500' }}>
              {b.label}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

export function AmenityChips({ ids }: { ids: string[] }) {
  const theme = useTheme();
  const { lang, isRTL } = useI18n();
  if (ids.length === 0) return null;
  return (
    <View style={[styles.wrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {ids.map((id) => {
        const a = getAmenity(id);
        if (!a) return null;
        return (
          <View key={id} style={[styles.amenity, { backgroundColor: theme.backgroundElement, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name={a.icon as IoniconName} size={15} color={theme.tint} />
            <ThemedText type="small">{a.name[lang]}</ThemedText>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Dual IQD/USD price. The native currency reads large; the other shows as a
 * clearly-labelled "≈" estimate. priceIqd is always the canonical spine.
 */
export function PriceTag({
  priceIqd,
  currency,
  priceUsd,
  size = 'lg',
}: {
  priceIqd: number;
  currency?: Currency;
  priceUsd?: number;
  size?: 'lg' | 'sm';
}) {
  const { t, isRTL } = useI18n();
  const iqdLabel = t('common_currency');
  const align = isRTL ? 'right' : 'left';

  if (priceIqd <= 0) {
    return <ThemedText themeColor="price" style={[size === 'lg' ? styles.priceLg : styles.priceSm, { textAlign: align }]}>{t('contactForPrice')}</ThemedText>;
  }
  // Native currency: USD when quoted in dollars, else IQD.
  const native: Currency = currency === 'USD' && priceUsd != null ? 'USD' : 'IQD';
  const nativeAmount = native === 'USD' ? (priceUsd as number) : priceIqd;

  return (
    <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
      <ThemedText themeColor="price" style={[size === 'lg' ? styles.priceLg : styles.priceSm, { textAlign: align }]}>
        {formatMoney(nativeAmount, native, iqdLabel)}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: align }}>
        {approxOther(nativeAmount, native, iqdLabel)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.two },
  titleRow: { alignItems: 'center', gap: Spacing.two },
  title: { flex: 1, fontSize: 15, fontWeight: '800' },
  wrap: { flexWrap: 'wrap', gap: Spacing.two },
  badge: { alignItems: 'center', gap: 5, paddingHorizontal: Spacing.two + 2, paddingVertical: Spacing.one + 2, borderRadius: Radius.pill },
  amenity: { alignItems: 'center', gap: 5, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 2, borderRadius: Radius.pill },
  priceLg: { fontSize: 24, fontWeight: '800' },
  priceSm: { fontSize: 17, fontWeight: '800' },
});
