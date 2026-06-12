import { Ionicons } from '@expo/vector-icons';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { ListState } from '@/components/list-state';
import { ListingCard } from '@/components/listing-card';
import { PickerSheet, type PickerOption } from '@/components/picker-sheet';
import { PressableScale } from '@/components/pressable-scale';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Motion, Radius, Shadow, Spacing } from '@/constants/theme';
import { useListings } from '@/data/ListingsProvider';
import {
  matchesPropertyFilters,
  matchesVehicleFilters,
  type PriceRange,
  type PropertyFilters,
  type VehicleFilters,
} from '@/data/section-filters';
import { hasSection } from '@/data/sections';
import { VEHICLE_MAKES } from '@/data/vehicle-makes';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import { DEAL_TYPE_SHORT, PROPERTY_TYPE_LABEL, TRANSMISSION_LABEL } from '@/lib/attribute-labels';
import { groupThousands } from '@/lib/format';
import type { DealType, Listing, PropertyType, Transmission } from '@/types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type SortMode = 'newest' | 'price_low' | 'price_high';

const YEAR_MIN_OPTIONS = [2022, 2020, 2018, 2015, 2010];
const MILEAGE_MAX_OPTIONS = [50_000, 100_000, 150_000];
const BEDROOMS_MIN_OPTIONS = [1, 2, 3, 4, 5];
const AREA_MIN_OPTIONS = [50, 100, 150, 200, 300];

const CAR_PRICE_BRACKETS: PriceRange[] = [
  { max: 10_000_000 },
  { min: 10_000_000, max: 20_000_000 },
  { min: 20_000_000, max: 40_000_000 },
  { min: 40_000_000 },
];
const RENT_PRICE_BRACKETS: PriceRange[] = [
  { max: 500_000 },
  { min: 500_000, max: 1_000_000 },
  { min: 1_000_000, max: 2_000_000 },
  { min: 2_000_000 },
];
const SALE_PRICE_BRACKETS: PriceRange[] = [
  { max: 100_000_000 },
  { min: 100_000_000, max: 300_000_000 },
  { min: 300_000_000, max: 600_000_000 },
  { min: 600_000_000 },
];

function sortListings(items: Listing[], mode: SortMode): Listing[] {
  return [...items].sort((a, b) => {
    if (mode === 'price_low') {
      const ap = a.priceIqd > 0 ? a.priceIqd : Number.POSITIVE_INFINITY;
      const bp = b.priceIqd > 0 ? b.priceIqd : Number.POSITIVE_INFINITY;
      return ap - bp;
    }
    if (mode === 'price_high') {
      const ap = a.priceIqd > 0 ? a.priceIqd : -1;
      const bp = b.priceIqd > 0 ? b.priceIqd : -1;
      return bp - ap;
    }
    return b.createdAt - a.createdAt;
  });
}

function FilterChip({ icon, label, active, onPress }: { icon: IoniconName; label: string; active?: boolean; onPress: () => void }) {
  const theme = useTheme();
  const { isRTL } = useI18n();
  const pop = useSharedValue(1);

  useEffect(() => {
    if (active) {
      pop.value = withSequence(withSpring(1.1, Motion.springBouncy), withSpring(1, Motion.spring));
    }
  }, [active, pop]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(180)}
      layout={LinearTransition.springify().damping(18).stiffness(240).mass(0.7)}
      style={popStyle}>
      <PressableScale
        scaleTo={0.92}
        haptic
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: Boolean(active) }}
        style={[
          styles.chip,
          {
            backgroundColor: active ? theme.tintSoft : theme.backgroundElement,
            borderColor: active ? theme.tint : theme.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}>
        <Ionicons name={icon} size={14} color={active ? theme.tint : theme.text} />
        <ThemedText type="small" numberOfLines={1} style={[styles.chipLabel, active && { color: theme.tint, fontWeight: '700' }]}>
          {label}
        </ThemedText>
      </PressableScale>
    </Animated.View>
  );
}

function SkeletonCard({ index }: { index: number }) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { isRTL } = useI18n();
  return (
    <Animated.View
      entering={FadeInDown.duration(360).delay(Math.min(index, 8) * 55)}
      style={[
        styles.skeletonCard,
        { backgroundColor: theme.surface, boxShadow: Shadow.card },
        scheme === 'dark' && { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
      ]}>
      <View style={styles.skeletonImage}>
        <Skeleton width="100%" height="100%" radius={0} delay={index * 90} />
      </View>
      <View style={[styles.skeletonBody, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <Skeleton width="55%" height={16} delay={index * 90 + 60} />
        <Skeleton width="90%" height={12} delay={index * 90 + 120} />
        <Skeleton width="45%" height={10} delay={index * 90 + 180} />
      </View>
    </Animated.View>
  );
}

/** Placeholder grid mirroring the two-column results layout while listings load. */
function SkeletonGrid() {
  const { isRTL } = useI18n();
  return (
    <View style={styles.skeletonGrid}>
      {[0, 1, 2].map((row) => (
        <View key={row} style={[styles.skeletonRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <SkeletonCard index={row * 2} />
          <SkeletonCard index={row * 2 + 1} />
        </View>
      ))}
    </View>
  );
}

export default function SectionScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const category = typeof params.category === 'string' ? params.category : null;

  if (!hasSection(category)) {
    // Self-healing deep links: section-less categories use the generic search.
    return <Redirect href={{ pathname: '/search', params: { category: category ?? '' } }} />;
  }
  return category === 'vehicles' ? <VehiclesSection /> : <RealEstateSection />;
}

function useSectionBase(categoryId: string) {
  const { listings, isLoading, error, refetch } = useListings();
  const base = useMemo(() => listings.filter((l) => l.categoryId === categoryId), [listings, categoryId]);
  return { base, isLoading, error, refetch };
}

function priceBracketLabel(range: PriceRange, t: ReturnType<typeof useI18n>['t']): string {
  if (range.min != null && range.max != null) return `${groupThousands(range.min)} – ${groupThousands(range.max)}`;
  if (range.max != null) return t('filter_upTo', { amount: groupThousands(range.max) });
  return `${groupThousands(range.min ?? 0)}+`;
}

function SectionList({
  results,
  isLoading,
  error,
  refetch,
  emptyIcon,
  header,
}: {
  results: Listing[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  emptyIcon: IoniconName;
  header: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <ThemedView style={styles.flex}>
      {header}
      {error ? (
        <ListState variant="error" title={t('state_errorTitle')} hint={t('state_errorHint')} actionLabel={t('state_retry')} onAction={refetch} />
      ) : isLoading && results.length === 0 ? (
        <SkeletonGrid />
      ) : results.length === 0 ? (
        <ListState variant="empty" icon={emptyIcon} title={t('search_noResults')} hint={t('section_emptyHint')} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(l) => l.id}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => <ListingCard listing={item} index={index} />}
        />
      )}
    </ThemedView>
  );
}

function VehiclesSection() {
  const { t, lang, isRTL } = useI18n();
  const { base, isLoading, error, refetch } = useSectionBase('vehicles');

  const [filters, setFilters] = useState<VehicleFilters>({});
  const [priceIdx, setPriceIdx] = useState<number | null>(null);
  const [sort, setSort] = useState<SortMode>('newest');
  const [picker, setPicker] = useState<null | 'make' | 'year' | 'mileage' | 'transmission' | 'price' | 'sort'>(null);

  const effective: VehicleFilters = useMemo(
    () => ({ ...filters, price: priceIdx != null ? CAR_PRICE_BRACKETS[priceIdx] : undefined }),
    [filters, priceIdx],
  );
  const results = useMemo(() => sortListings(base.filter((l) => matchesVehicleFilters(l, effective)), sort), [base, effective, sort]);

  const makeOptions: PickerOption[] = [
    { id: null, label: t('search_all') },
    ...VEHICLE_MAKES.map((m) => ({ id: m.id, label: m.name[lang] })),
  ];
  const yearOptions: PickerOption[] = [
    { id: null, label: t('search_all') },
    ...YEAR_MIN_OPTIONS.map((y) => ({ id: String(y), label: `${y}+` })),
  ];
  const mileageOptions: PickerOption[] = [
    { id: null, label: t('search_all') },
    ...MILEAGE_MAX_OPTIONS.map((m) => ({ id: String(m), label: t('filter_maxKm', { count: groupThousands(m) }) })),
  ];
  const transmissionOptions: PickerOption[] = [
    { id: null, label: t('search_all') },
    { id: 'automatic', label: t('attr_trans_automatic') },
    { id: 'manual', label: t('attr_trans_manual') },
  ];
  const priceOptions: PickerOption[] = [
    { id: null, label: t('search_all') },
    ...CAR_PRICE_BRACKETS.map((r, i) => ({ id: String(i), label: priceBracketLabel(r, t) })),
  ];
  const sortLabels: Record<SortMode, string> = {
    newest: t('search_sort_newest'),
    price_low: t('search_sort_priceLow'),
    price_high: t('search_sort_priceHigh'),
  };
  const sortOptions: PickerOption[] = (['newest', 'price_low', 'price_high'] as SortMode[]).map((id) => ({ id, label: sortLabels[id] }));

  const header = (
    <View style={styles.controls}>
      <View style={[styles.chipRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <FilterChip icon="car-sport-outline" active={filters.make != null} label={filters.make ? (VEHICLE_MAKES.find((m) => m.id === filters.make)?.name[lang] ?? t('attr_vehicle_make')) : t('attr_vehicle_make')} onPress={() => setPicker('make')} />
        <FilterChip icon="calendar-outline" active={filters.yearMin != null} label={filters.yearMin != null ? `${filters.yearMin}+` : t('attr_vehicle_year')} onPress={() => setPicker('year')} />
        <FilterChip icon="speedometer-outline" active={filters.mileageMax != null} label={filters.mileageMax != null ? t('filter_maxKm', { count: groupThousands(filters.mileageMax) }) : t('attr_vehicle_mileage')} onPress={() => setPicker('mileage')} />
        <FilterChip icon="cog-outline" active={filters.transmission != null} label={filters.transmission ? t(TRANSMISSION_LABEL[filters.transmission]) : t('attr_vehicle_transmission')} onPress={() => setPicker('transmission')} />
        <FilterChip icon="pricetag-outline" active={priceIdx != null} label={priceIdx != null ? priceBracketLabel(CAR_PRICE_BRACKETS[priceIdx], t) : t('filter_price')} onPress={() => setPicker('price')} />
        <FilterChip icon="swap-vertical-outline" active={sort !== 'newest'} label={sortLabels[sort]} onPress={() => setPicker('sort')} />
      </View>
      <Animated.View key={results.length} entering={FadeInDown.duration(300)}>
        <ThemedText type="small" themeColor="textSecondary" style={[styles.count, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('search_results', { count: results.length })}
        </ThemedText>
      </Animated.View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: t('section_cars_title'), headerTitleStyle: { fontSize: 18, fontWeight: '800' } }} />
      <SectionList results={results} isLoading={isLoading} error={error} refetch={refetch} emptyIcon="car-sport-outline" header={header} />

      <PickerSheet visible={picker === 'make'} title={t('attr_vehicle_make')} options={makeOptions} selectedId={filters.make ?? null} onSelect={(id) => setFilters((f) => ({ ...f, make: id ?? undefined }))} onClose={() => setPicker(null)} />
      <PickerSheet visible={picker === 'year'} title={t('attr_vehicle_year')} options={yearOptions} selectedId={filters.yearMin != null ? String(filters.yearMin) : null} onSelect={(id) => setFilters((f) => ({ ...f, yearMin: id != null ? Number(id) : undefined }))} onClose={() => setPicker(null)} />
      <PickerSheet visible={picker === 'mileage'} title={t('attr_vehicle_mileage')} options={mileageOptions} selectedId={filters.mileageMax != null ? String(filters.mileageMax) : null} onSelect={(id) => setFilters((f) => ({ ...f, mileageMax: id != null ? Number(id) : undefined }))} onClose={() => setPicker(null)} />
      <PickerSheet visible={picker === 'transmission'} title={t('attr_vehicle_transmission')} options={transmissionOptions} selectedId={filters.transmission ?? null} onSelect={(id) => setFilters((f) => ({ ...f, transmission: (id as Transmission | null) ?? undefined }))} onClose={() => setPicker(null)} />
      <PickerSheet visible={picker === 'price'} title={t('filter_price')} options={priceOptions} selectedId={priceIdx != null ? String(priceIdx) : null} onSelect={(id) => setPriceIdx(id != null ? Number(id) : null)} onClose={() => setPicker(null)} />
      <PickerSheet visible={picker === 'sort'} title={t('search_sort')} options={sortOptions} selectedId={sort} onSelect={(id) => { if (id === 'newest' || id === 'price_low' || id === 'price_high') setSort(id); }} onClose={() => setPicker(null)} />
    </>
  );
}

function RealEstateSection() {
  const { t, isRTL } = useI18n();
  const theme = useTheme();
  const { base, isLoading, error, refetch } = useSectionBase('realestate');

  const [filters, setFilters] = useState<PropertyFilters>({});
  const [priceIdx, setPriceIdx] = useState<number | null>(null);
  const [sort, setSort] = useState<SortMode>('newest');
  const [picker, setPicker] = useState<null | 'type' | 'beds' | 'area' | 'price' | 'sort'>(null);

  // Brackets differ wildly between rent (monthly) and sale (total); the price
  // chip only appears once a deal type is chosen, and changing it resets price.
  const brackets = filters.dealType === 'rent' ? RENT_PRICE_BRACKETS : SALE_PRICE_BRACKETS;
  const setDealType = (dealType: DealType | undefined) => {
    setFilters((f) => ({ ...f, dealType }));
    setPriceIdx(null);
  };

  const effective: PropertyFilters = useMemo(
    () => ({ ...filters, price: filters.dealType != null && priceIdx != null ? brackets[priceIdx] : undefined }),
    [filters, priceIdx, brackets],
  );
  const results = useMemo(() => sortListings(base.filter((l) => matchesPropertyFilters(l, effective)), sort), [base, effective, sort]);

  const typeOptions: PickerOption[] = [
    { id: null, label: t('search_all') },
    ...(Object.keys(PROPERTY_TYPE_LABEL) as PropertyType[]).map((p) => ({ id: p, label: t(PROPERTY_TYPE_LABEL[p]) })),
  ];
  const bedsOptions: PickerOption[] = [
    { id: null, label: t('search_all') },
    ...BEDROOMS_MIN_OPTIONS.map((n) => ({ id: String(n), label: `${n}+` })),
  ];
  const areaOptions: PickerOption[] = [
    { id: null, label: t('search_all') },
    ...AREA_MIN_OPTIONS.map((n) => ({ id: String(n), label: `${n}+ ${t('unit_m2')}` })),
  ];
  const priceOptions: PickerOption[] = [
    { id: null, label: t('search_all') },
    ...brackets.map((r, i) => ({ id: String(i), label: priceBracketLabel(r, t) })),
  ];
  const sortLabels: Record<SortMode, string> = {
    newest: t('search_sort_newest'),
    price_low: t('search_sort_priceLow'),
    price_high: t('search_sort_priceHigh'),
  };
  const sortOptions: PickerOption[] = (['newest', 'price_low', 'price_high'] as SortMode[]).map((id) => ({ id, label: sortLabels[id] }));

  const dealSegments: { value: DealType | undefined; label: string }[] = [
    { value: undefined, label: t('search_all') },
    { value: 'sale', label: t(DEAL_TYPE_SHORT.sale) },
    { value: 'rent', label: t(DEAL_TYPE_SHORT.rent) },
  ];

  const header = (
    <View style={styles.controls}>
      <View style={[styles.segment, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {dealSegments.map((s) => {
          const active = filters.dealType === s.value;
          return (
            <PressableScale
              key={s.label}
              haptic
              scaleTo={0.96}
              accessibilityRole="button"
              accessibilityLabel={s.label}
              accessibilityState={{ selected: active }}
              onPress={() => setDealType(s.value)}
              style={[
                styles.segmentItem,
                {
                  borderColor: active ? theme.tint : theme.border,
                  backgroundColor: active ? theme.tint : theme.backgroundElement,
                },
                active && { boxShadow: Shadow.card },
              ]}>
              <ThemedText style={{ color: active ? theme.onTint : theme.text, fontWeight: active ? '700' : '500' }}>{s.label}</ThemedText>
            </PressableScale>
          );
        })}
      </View>
      <View style={[styles.chipRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <FilterChip icon="business-outline" active={filters.propertyType != null} label={filters.propertyType ? t(PROPERTY_TYPE_LABEL[filters.propertyType]) : t('attr_property_type')} onPress={() => setPicker('type')} />
        <FilterChip icon="bed-outline" active={filters.bedroomsMin != null} label={filters.bedroomsMin != null ? `${filters.bedroomsMin}+` : t('attr_bedrooms')} onPress={() => setPicker('beds')} />
        <FilterChip icon="resize-outline" active={filters.areaM2Min != null} label={filters.areaM2Min != null ? `${filters.areaM2Min}+ ${t('unit_m2')}` : t('attr_area')} onPress={() => setPicker('area')} />
        {filters.dealType != null && (
          <FilterChip icon="pricetag-outline" active={priceIdx != null} label={priceIdx != null ? priceBracketLabel(brackets[priceIdx], t) : t('filter_price')} onPress={() => setPicker('price')} />
        )}
        <FilterChip icon="swap-vertical-outline" active={sort !== 'newest'} label={sortLabels[sort]} onPress={() => setPicker('sort')} />
      </View>
      <Animated.View key={results.length} entering={FadeInDown.duration(300)}>
        <ThemedText type="small" themeColor="textSecondary" style={[styles.count, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('search_results', { count: results.length })}
        </ThemedText>
      </Animated.View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: t('section_realestate_title'), headerTitleStyle: { fontSize: 18, fontWeight: '800' } }} />
      <SectionList results={results} isLoading={isLoading} error={error} refetch={refetch} emptyIcon="home-outline" header={header} />

      <PickerSheet visible={picker === 'type'} title={t('attr_property_type')} options={typeOptions} selectedId={filters.propertyType ?? null} onSelect={(id) => setFilters((f) => ({ ...f, propertyType: (id as PropertyType | null) ?? undefined }))} onClose={() => setPicker(null)} />
      <PickerSheet visible={picker === 'beds'} title={t('attr_bedrooms')} options={bedsOptions} selectedId={filters.bedroomsMin != null ? String(filters.bedroomsMin) : null} onSelect={(id) => setFilters((f) => ({ ...f, bedroomsMin: id != null ? Number(id) : undefined }))} onClose={() => setPicker(null)} />
      <PickerSheet visible={picker === 'area'} title={t('attr_area')} options={areaOptions} selectedId={filters.areaM2Min != null ? String(filters.areaM2Min) : null} onSelect={(id) => setFilters((f) => ({ ...f, areaM2Min: id != null ? Number(id) : undefined }))} onClose={() => setPicker(null)} />
      <PickerSheet visible={picker === 'price'} title={t('filter_price')} options={priceOptions} selectedId={priceIdx != null ? String(priceIdx) : null} onSelect={(id) => setPriceIdx(id != null ? Number(id) : null)} onClose={() => setPicker(null)} />
      <PickerSheet visible={picker === 'sort'} title={t('search_sort')} options={sortOptions} selectedId={sort} onSelect={(id) => { if (id === 'newest' || id === 'price_low' || id === 'price_high') setSort(id); }} onClose={() => setPicker(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  controls: { paddingTop: Spacing.two, gap: Spacing.two, paddingBottom: Spacing.two },
  segment: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipRow: { flexWrap: 'wrap', gap: Spacing.one + 2, paddingHorizontal: Spacing.three },
  chip: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipLabel: { flexShrink: 1 },
  count: { paddingHorizontal: Spacing.three },
  column: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  grid: { gap: Spacing.three, paddingBottom: Spacing.five },
  skeletonGrid: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  skeletonRow: { gap: Spacing.three },
  skeletonCard: { flex: 1, borderRadius: Radius.xl, overflow: 'hidden' },
  skeletonImage: { width: '100%', aspectRatio: 4 / 3 },
  skeletonBody: { padding: Spacing.two + Spacing.one, gap: Spacing.one },
});
