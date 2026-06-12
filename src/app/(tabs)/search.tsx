import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState, type ComponentProps } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ListingCard } from '@/components/listing-card';
import { ListState } from '@/components/list-state';
import { PickerSheet, type PickerOption } from '@/components/picker-sheet';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Radius, Shadow, Spacing } from '@/constants/theme';
import { CATEGORIES, getCategory } from '@/data/categories';
import { GOVERNORATES, getGovernorate } from '@/data/governorates';
import { useListings } from '@/data/ListingsProvider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type SortMode = 'newest' | 'price_low' | 'price_high';

const SORT_MODES: SortMode[] = ['newest', 'price_low', 'price_high'];

function isSortMode(value: string | null): value is SortMode {
  return value === 'newest' || value === 'price_low' || value === 'price_high';
}

function FilterButton({ icon, label, active, onPress }: { icon: IoniconName; label: string; active?: boolean; onPress: () => void }) {
  const theme = useTheme();
  const { isRTL } = useI18n();
  return (
    <PressableScale
      scaleTo={0.95}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(active) }}
      style={[
        styles.filterBtn,
        {
          backgroundColor: active ? theme.tintSoft : theme.backgroundElement,
          borderColor: active ? theme.tint : theme.border,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}>
      <Ionicons name={icon} size={16} color={active ? theme.tint : theme.text} />
      <ThemedText
        type="small"
        numberOfLines={1}
        style={[styles.filterLabel, active && { color: theme.tint, fontWeight: '700' }]}>
        {label}
      </ThemedText>
    </PressableScale>
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

export default function SearchScreen() {
  const { listings, isLoading, error, refetch } = useListings();
  const { t, lang, isRTL } = useI18n();
  const theme = useTheme();
  const params = useLocalSearchParams<{ category?: string }>();

  const [query, setQuery] = useState('');
  const routeCategoryId = typeof params.category === 'string' ? params.category : null;
  const [categorySelection, setCategorySelection] = useState<{ routeCategoryId: string | null; value: string | null } | null>(null);
  const categoryId = categorySelection?.routeCategoryId === routeCategoryId ? categorySelection.value : routeCategoryId;
  const [governorateId, setGovernorateId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [picker, setPicker] = useState<null | 'category' | 'governorate' | 'sort'>(null);
  const setCategoryId = (value: string | null) => setCategorySelection({ routeCategoryId, value });

  const focus = useSharedValue(0);
  const searchBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [theme.border, theme.tint]),
  }));

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = listings.filter((l) => {
      if (categoryId && l.categoryId !== categoryId) return false;
      if (governorateId && l.governorateId !== governorateId) return false;
      if (q && !l.title.toLowerCase().includes(q) && !l.description.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (sortMode === 'price_low') {
        const aPrice = a.priceIqd > 0 ? a.priceIqd : Number.POSITIVE_INFINITY;
        const bPrice = b.priceIqd > 0 ? b.priceIqd : Number.POSITIVE_INFINITY;
        return aPrice - bPrice;
      }
      if (sortMode === 'price_high') {
        const aPrice = a.priceIqd > 0 ? a.priceIqd : -1;
        const bPrice = b.priceIqd > 0 ? b.priceIqd : -1;
        return bPrice - aPrice;
      }
      return b.createdAt - a.createdAt;
    });
  }, [listings, query, categoryId, governorateId, sortMode]);

  const categoryLabel = categoryId ? getCategory(categoryId)?.name[lang] : t('search_all');
  const govLabel = governorateId ? getGovernorate(governorateId)?.name[lang] : t('search_all');
  const sortLabels: Record<SortMode, string> = {
    newest: t('search_sort_newest'),
    price_low: t('search_sort_priceLow'),
    price_high: t('search_sort_priceHigh'),
  };

  const categoryOptions: PickerOption[] = [
    { id: null, label: t('search_all') },
    ...CATEGORIES.map((c) => ({ id: c.id, label: c.name[lang] })),
  ];
  const govOptions: PickerOption[] = [
    { id: null, label: t('search_all') },
    ...GOVERNORATES.map((g) => ({ id: g.id, label: g.name[lang] })),
  ];
  const sortOptions: PickerOption[] = SORT_MODES.map((id) => ({ id, label: sortLabels[id] }));

  const hasFilters = Boolean(categoryId || governorateId || query.trim() || sortMode !== 'newest');

  return (
    <Screen title={t('search_title')}>
      <Animated.View entering={FadeInDown.duration(360)} style={styles.controls}>
        <Animated.View
          style={[
            styles.searchBox,
            {
              backgroundColor: theme.surface,
              boxShadow: Shadow.card,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
            searchBorderStyle,
          ]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('search_placeholder')}
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel={t('search_placeholder')}
            onFocus={() => {
              // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are mutated by design.
              focus.value = withTiming(1, { duration: 160 });
            }}
            onBlur={() => {
              // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are mutated by design.
              focus.value = withTiming(0, { duration: 220 });
            }}
            style={[styles.input, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}
          />
          {query.length > 0 && (
            <PressableScale
              entering={FadeIn.duration(160)}
              onPress={() => setQuery('')}
              hitSlop={8}
              scaleTo={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('search_clear')}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </PressableScale>
          )}
        </Animated.View>

        <View style={[styles.filterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <FilterButton
            icon="grid-outline"
            active={categoryId != null}
            label={`${t('search_category')}: ${categoryLabel}`}
            onPress={() => setPicker('category')}
          />
          <FilterButton
            icon="location-outline"
            active={governorateId != null}
            label={`${t('search_governorate')}: ${govLabel}`}
            onPress={() => setPicker('governorate')}
          />
          <FilterButton
            icon="swap-vertical-outline"
            active={sortMode !== 'newest'}
            label={`${t('search_sort')}: ${sortLabels[sortMode]}`}
            onPress={() => setPicker('sort')}
          />
        </View>

        <View style={[styles.resultsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Animated.View key={results.length} entering={FadeIn.duration(250)}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('search_results', { count: results.length })}
            </ThemedText>
          </Animated.View>
          {hasFilters && (
            <PressableScale
              scaleTo={0.92}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('search_clear')}
              onPress={() => {
                setQuery('');
                setCategoryId(null);
                setGovernorateId(null);
                setSortMode('newest');
              }}>
              <ThemedText type="small" themeColor="tint" style={styles.clearText}>
                {t('search_clear')}
              </ThemedText>
            </PressableScale>
          )}
        </View>
      </Animated.View>

      {error ? (
        <ListState
          variant="error"
          title={t('state_errorTitle')}
          hint={t('state_errorHint')}
          actionLabel={t('state_retry')}
          onAction={refetch}
        />
      ) : isLoading && listings.length === 0 ? (
        <SkeletonGrid />
      ) : results.length === 0 ? (
        <ListState variant="empty" icon="search" title={t('search_noResults')} hint={t('search_noResultsHint')} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(l) => l.id}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => <ListingCard listing={item} index={index} />}
        />
      )}

      <PickerSheet
        visible={picker === 'category'}
        title={t('search_category')}
        options={categoryOptions}
        selectedId={categoryId}
        onSelect={setCategoryId}
        onClose={() => setPicker(null)}
      />
      <PickerSheet
        visible={picker === 'governorate'}
        title={t('search_governorate')}
        options={govOptions}
        selectedId={governorateId}
        onSelect={setGovernorateId}
        onClose={() => setPicker(null)}
      />
      <PickerSheet
        visible={picker === 'sort'}
        title={t('search_sort')}
        options={sortOptions}
        selectedId={sortMode}
        onSelect={(value) => {
          if (isSortMode(value)) setSortMode(value);
        }}
        onClose={() => setPicker(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { padding: Spacing.three, gap: Spacing.two },
  searchBox: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
  },
  input: { flex: 1, paddingVertical: Spacing.three, fontSize: 16 },
  filterRow: { gap: Spacing.two, flexWrap: 'wrap' },
  filterBtn: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 150,
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterLabel: { flexShrink: 1 },
  resultsRow: { alignItems: 'center', justifyContent: 'space-between' },
  clearText: { fontWeight: '700' },
  column: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  grid: { gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.three },
  skeletonGrid: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  skeletonRow: { gap: Spacing.three },
  skeletonCard: { flex: 1, borderRadius: Radius.xl, overflow: 'hidden' },
  skeletonImage: { width: '100%', aspectRatio: 4 / 3 },
  skeletonBody: { padding: Spacing.two + Spacing.one, gap: Spacing.one },
});
