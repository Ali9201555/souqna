import { Ionicons } from '@expo/vector-icons';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
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

import { CarFilterSheet } from '@/components/car-filter-sheet';
import { ListState } from '@/components/list-state';
import { ListingCard } from '@/components/listing-card';
import { PickerSheet, type PickerOption } from '@/components/picker-sheet';
import { PressableScale } from '@/components/pressable-scale';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Motion, Radius, Shadow, Spacing } from '@/constants/theme';
import { CUISINES, DIET_TAGS, DISH_TYPES, getCuisine, getDishType } from '@/data/cuisines';
import { getGovernorate } from '@/data/governorates';
import { useListings } from '@/data/ListingsProvider';
import {
  countVehicleFilters,
  matchesFoodFilters,
  matchesPropertyFilters,
  matchesVehicleFilters,
  sortListings,
  type FoodFilters,
  type PriceRange,
  type PropertyFilters,
  type SortMode,
  type VehicleFilters,
} from '@/data/section-filters';
import { hasSection } from '@/data/sections';
import { getVehicleMake, getVehicleModel } from '@/data/vehicle-makes';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import { DEAL_TYPE_SHORT, FULFILLMENT_LABEL, FUEL_LABEL, PROPERTY_TYPE_LABEL, TRANSMISSION_LABEL } from '@/lib/attribute-labels';
import { groupThousands } from '@/lib/format';
import type { TKey } from '@/i18n/translations';
import type { DealType, Fulfillment, Language, Listing, PropertyType } from '@/types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const BEDROOMS_MIN_OPTIONS = [1, 2, 3, 4, 5];
const AREA_MIN_OPTIONS = [50, 100, 150, 200, 300];

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

const FOOD_PRICE_BRACKETS: PriceRange[] = [
  { max: 10_000 },
  { min: 10_000, max: 25_000 },
  { min: 25_000, max: 50_000 },
  { min: 50_000 },
];

const VEHICLE_SORTS: SortMode[] = ['newest', 'price_low', 'price_high', 'year_new', 'mileage_low'];
const SORT_LABEL: Record<SortMode, TKey> = {
  newest: 'search_sort_newest',
  price_low: 'search_sort_priceLow',
  price_high: 'search_sort_priceHigh',
  year_new: 'sort_year_new',
  mileage_low: 'sort_mileage_low',
};

type Translate = (key: TKey, vars?: Record<string, string | number>) => string;
type Pill = { key: string; label: string; clear: Partial<VehicleFilters> };

/** Applied vehicle filters → removable pills, in reading order. */
function vehiclePills(f: VehicleFilters, t: Translate, lang: Language): Pill[] {
  const pills: Pill[] = [];
  if (f.make != null) {
    pills.push({ key: 'make', label: getVehicleMake(f.make)?.name[lang] ?? f.make, clear: { make: undefined, model: undefined } });
  }
  if (f.make != null && f.model != null) {
    pills.push({ key: 'model', label: getVehicleModel(f.make, f.model)?.[lang === 'en' ? 'en' : 'ar'] ?? f.model, clear: { model: undefined } });
  }
  if (f.yearMin != null || f.yearMax != null) {
    const label = f.yearMin != null && f.yearMax != null ? `${f.yearMin}–${f.yearMax}` : f.yearMin != null ? `${f.yearMin}+` : `≤${f.yearMax}`;
    pills.push({ key: 'year', label, clear: { yearMin: undefined, yearMax: undefined } });
  }
  if (f.price?.min != null || f.price?.max != null) {
    const label = f.price.min != null && f.price.max != null ? `${groupThousands(f.price.min)}–${groupThousands(f.price.max)}` : f.price.max != null ? t('filter_upTo', { amount: groupThousands(f.price.max) }) : `${groupThousands(f.price.min ?? 0)}+`;
    pills.push({ key: 'price', label, clear: { price: undefined } });
  }
  if (f.mileageMax != null) pills.push({ key: 'mileage', label: t('filter_maxKm', { count: groupThousands(f.mileageMax) }), clear: { mileageMax: undefined } });
  if (f.trim != null && f.trim.trim() !== '') pills.push({ key: 'trim', label: f.trim, clear: { trim: undefined } });
  if (f.transmission != null) pills.push({ key: 'transmission', label: t(TRANSMISSION_LABEL[f.transmission]), clear: { transmission: undefined } });
  if (f.fuel != null) pills.push({ key: 'fuel', label: t(FUEL_LABEL[f.fuel]), clear: { fuel: undefined } });
  if (f.condition != null) pills.push({ key: 'condition', label: t(f.condition === 'new' ? 'cond_new' : 'cond_used'), clear: { condition: undefined } });
  if (f.governorateId != null) pills.push({ key: 'gov', label: getGovernorate(f.governorateId)?.name[lang] ?? f.governorateId, clear: { governorateId: undefined } });
  return pills;
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
  if (category === 'vehicles') return <VehiclesSection />;
  if (category === 'food') return <FoodSection />;
  return <RealEstateSection />;
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

  const theme = useTheme();
  const [filters, setFilters] = useState<VehicleFilters>({});
  const [sort, setSort] = useState<SortMode>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const results = useMemo(() => sortListings(base.filter((l) => matchesVehicleFilters(l, filters)), sort), [base, filters, sort]);
  const activeCount = countVehicleFilters(filters);
  const pills = useMemo(() => vehiclePills(filters, t, lang), [filters, t, lang]);
  const sortOptions: PickerOption[] = VEHICLE_SORTS.map((id) => ({ id, label: t(SORT_LABEL[id]) }));

  const header = (
    <View style={styles.controls}>
      <View style={[styles.toolbar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <PressableScale
          haptic
          scaleTo={0.96}
          accessibilityRole="button"
          accessibilityLabel={t('filters_title')}
          onPress={() => setShowFilters(true)}
          style={[styles.toolBtn, { backgroundColor: activeCount > 0 ? theme.tint : theme.backgroundElement, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="options-outline" size={16} color={activeCount > 0 ? theme.onTint : theme.text} />
          <ThemedText type="small" style={{ fontWeight: '700', color: activeCount > 0 ? theme.onTint : theme.text }}>
            {activeCount > 0 ? t('filters_with_count', { count: activeCount }) : t('filters_title')}
          </ThemedText>
        </PressableScale>
        <FilterChip icon="swap-vertical-outline" active={sort !== 'newest'} label={t(SORT_LABEL[sort])} onPress={() => setShowSort(true)} />
      </View>

      {pills.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.pillRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {pills.map((p) => (
            <ActivePill key={p.key} label={p.label} onRemove={() => setFilters((f) => ({ ...f, ...p.clear }))} />
          ))}
          <PressableScale scaleTo={0.95} accessibilityRole="button" accessibilityLabel={t('filters_clear_all')} onPress={() => setFilters({})} style={styles.clearAll}>
            <ThemedText type="small" themeColor="tint" style={{ fontWeight: '700' }}>{t('filters_clear_all')}</ThemedText>
          </PressableScale>
        </ScrollView>
      )}

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

      <CarFilterSheet visible={showFilters} base={base} initial={filters} onApply={setFilters} onClose={() => setShowFilters(false)} />
      <PickerSheet visible={showSort} title={t('search_sort')} options={sortOptions} selectedId={sort} onSelect={(id) => { if (id) setSort(id as SortMode); }} onClose={() => setShowSort(false)} />
    </>
  );
}

function ActivePill({ label, onRemove }: { label: string; onRemove: () => void }) {
  const theme = useTheme();
  const { t, isRTL } = useI18n();
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      layout={LinearTransition.springify().damping(18).stiffness(240).mass(0.7)}>
      <PressableScale
        haptic
        scaleTo={0.94}
        accessibilityRole="button"
        accessibilityLabel={`${t('common_close')} ${label}`}
        onPress={onRemove}
        style={[styles.pill, { backgroundColor: theme.tintSoft, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <ThemedText type="small" numberOfLines={1} style={{ color: theme.tint, fontWeight: '700' }}>
          {label}
        </ThemedText>
        <Ionicons name="close-circle" size={15} color={theme.tint} />
      </PressableScale>
    </Animated.View>
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
  // Real estate offers the price/recency sorts (year/mileage are car-only).
  const realEstateSorts: SortMode[] = ['newest', 'price_low', 'price_high'];
  const sortOptions: PickerOption[] = realEstateSorts.map((id) => ({ id, label: t(SORT_LABEL[id]) }));

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
        <FilterChip icon="swap-vertical-outline" active={sort !== 'newest'} label={t(SORT_LABEL[sort])} onPress={() => setPicker('sort')} />
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

function FoodSection() {
  const { t, lang, isRTL } = useI18n();
  const { base, isLoading, error, refetch } = useSectionBase('food');

  const [filters, setFilters] = useState<FoodFilters>({});
  const [priceIdx, setPriceIdx] = useState<number | null>(null);
  const [sort, setSort] = useState<SortMode>('newest');
  const [picker, setPicker] = useState<null | 'cuisine' | 'dish' | 'diet' | 'fulfillment' | 'price' | 'sort'>(null);

  const effective: FoodFilters = useMemo(
    () => ({ ...filters, price: priceIdx != null ? FOOD_PRICE_BRACKETS[priceIdx] : undefined }),
    [filters, priceIdx],
  );
  const results = useMemo(() => sortListings(base.filter((l) => matchesFoodFilters(l, effective)), sort), [base, effective, sort]);

  const all = { id: null, label: t('search_all') };
  const cuisineOptions: PickerOption[] = [all, ...CUISINES.map((c) => ({ id: c.id, label: c.name[lang] }))];
  const dishOptions: PickerOption[] = [all, ...DISH_TYPES.map((d) => ({ id: d.id, label: d.name[lang] }))];
  const dietOptions: PickerOption[] = [all, ...DIET_TAGS.map((d) => ({ id: d.id, label: d.name[lang] }))];
  const fulfillmentOptions: PickerOption[] = [
    all,
    { id: 'pickup', label: t(FULFILLMENT_LABEL.pickup) },
    { id: 'delivery', label: t(FULFILLMENT_LABEL.delivery) },
  ];
  const priceOptions: PickerOption[] = [all, ...FOOD_PRICE_BRACKETS.map((r, i) => ({ id: String(i), label: priceBracketLabel(r, t) }))];
  const foodSorts: SortMode[] = ['newest', 'price_low', 'price_high'];
  const sortOptions: PickerOption[] = foodSorts.map((id) => ({ id, label: t(SORT_LABEL[id]) }));

  const header = (
    <View style={styles.controls}>
      <View style={[styles.chipRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <FilterChip icon="restaurant-outline" active={filters.cuisine != null} label={filters.cuisine ? (getCuisine(filters.cuisine)?.name[lang] ?? t('attr_cuisine')) : t('attr_cuisine')} onPress={() => setPicker('cuisine')} />
        <FilterChip icon="fast-food-outline" active={filters.dishType != null} label={filters.dishType ? (getDishType(filters.dishType)?.name[lang] ?? t('attr_dishType')) : t('attr_dishType')} onPress={() => setPicker('dish')} />
        <FilterChip icon="leaf-outline" active={filters.diet != null} label={filters.diet ? (DIET_TAGS.find((d) => d.id === filters.diet)?.name[lang] ?? t('attr_diet')) : t('attr_diet')} onPress={() => setPicker('diet')} />
        <FilterChip icon="bag-handle-outline" active={filters.fulfillment != null} label={filters.fulfillment ? t(FULFILLMENT_LABEL[filters.fulfillment]) : t('attr_fulfillment')} onPress={() => setPicker('fulfillment')} />
        <FilterChip icon="pricetag-outline" active={priceIdx != null} label={priceIdx != null ? priceBracketLabel(FOOD_PRICE_BRACKETS[priceIdx], t) : t('filter_price')} onPress={() => setPicker('price')} />
        <FilterChip icon="swap-vertical-outline" active={sort !== 'newest'} label={t(SORT_LABEL[sort])} onPress={() => setPicker('sort')} />
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
      <Stack.Screen options={{ title: t('section_food_title'), headerTitleStyle: { fontSize: 18, fontWeight: '800' } }} />
      <SectionList results={results} isLoading={isLoading} error={error} refetch={refetch} emptyIcon="restaurant-outline" header={header} />

      <PickerSheet visible={picker === 'cuisine'} title={t('attr_cuisine')} options={cuisineOptions} selectedId={filters.cuisine ?? null} onSelect={(id) => setFilters((f) => ({ ...f, cuisine: id ?? undefined }))} onClose={() => setPicker(null)} />
      <PickerSheet visible={picker === 'dish'} title={t('attr_dishType')} options={dishOptions} selectedId={filters.dishType ?? null} onSelect={(id) => setFilters((f) => ({ ...f, dishType: id ?? undefined }))} onClose={() => setPicker(null)} />
      <PickerSheet visible={picker === 'diet'} title={t('attr_diet')} options={dietOptions} selectedId={filters.diet ?? null} onSelect={(id) => setFilters((f) => ({ ...f, diet: id ?? undefined }))} onClose={() => setPicker(null)} />
      <PickerSheet visible={picker === 'fulfillment'} title={t('attr_fulfillment')} options={fulfillmentOptions} selectedId={filters.fulfillment ?? null} onSelect={(id) => setFilters((f) => ({ ...f, fulfillment: (id as Fulfillment | null) ?? undefined }))} onClose={() => setPicker(null)} />
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
  toolbar: { alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three },
  toolBtn: { alignItems: 'center', gap: Spacing.one + 2, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.pill },
  pillRow: { alignItems: 'center', gap: Spacing.one + 2, paddingHorizontal: Spacing.three },
  pill: { alignItems: 'center', gap: 4, paddingHorizontal: Spacing.two + 2, paddingVertical: Spacing.one + 2, borderRadius: Radius.pill },
  clearAll: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one + 2 },
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
