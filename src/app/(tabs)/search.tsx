import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState, type ComponentProps } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ListingCard } from '@/components/listing-card';
import { PickerSheet, type PickerOption } from '@/components/picker-sheet';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { CATEGORIES, getCategory } from '@/data/categories';
import { GOVERNORATES, getGovernorate } from '@/data/governorates';
import { useListings } from '@/data/ListingsProvider';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function FilterButton({ icon, label, onPress }: { icon: IoniconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  const { isRTL } = useI18n();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterBtn,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}>
      <Ionicons name={icon} size={16} color={theme.text} />
      <ThemedText type="small" numberOfLines={1} style={styles.filterLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export default function SearchScreen() {
  const { listings } = useListings();
  const { t, lang, isRTL } = useI18n();
  const theme = useTheme();
  const params = useLocalSearchParams<{ category?: string }>();

  const [query, setQuery] = useState('');
  const routeCategoryId = typeof params.category === 'string' ? params.category : null;
  const [categorySelection, setCategorySelection] = useState<{ routeCategoryId: string | null; value: string | null } | null>(null);
  const categoryId = categorySelection?.routeCategoryId === routeCategoryId ? categorySelection.value : routeCategoryId;
  const [governorateId, setGovernorateId] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | 'category' | 'governorate'>(null);
  const setCategoryId = (value: string | null) => setCategorySelection({ routeCategoryId, value });

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter((l) => {
      if (categoryId && l.categoryId !== categoryId) return false;
      if (governorateId && l.governorateId !== governorateId) return false;
      if (q && !l.title.toLowerCase().includes(q) && !l.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [listings, query, categoryId, governorateId]);

  const categoryLabel = categoryId ? getCategory(categoryId)?.name[lang] : t('search_all');
  const govLabel = governorateId ? getGovernorate(governorateId)?.name[lang] : t('search_all');

  const categoryOptions: PickerOption[] = [
    { id: null, label: t('search_all') },
    ...CATEGORIES.map((c) => ({ id: c.id, label: c.name[lang] })),
  ];
  const govOptions: PickerOption[] = [
    { id: null, label: t('search_all') },
    ...GOVERNORATES.map((g) => ({ id: g.id, label: g.name[lang] })),
  ];

  const hasFilters = Boolean(categoryId || governorateId || query.trim());

  return (
    <Screen title={t('search_title')}>
      <View style={styles.controls}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}>
          <Ionicons name="search" size={18} color={theme.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('search_placeholder')}
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>

        <View style={[styles.filterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <FilterButton icon="grid-outline" label={`${t('search_category')}: ${categoryLabel}`} onPress={() => setPicker('category')} />
          <FilterButton icon="location-outline" label={`${t('search_governorate')}: ${govLabel}`} onPress={() => setPicker('governorate')} />
        </View>

        <View style={[styles.resultsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('search_results', { count: results.length })}
          </ThemedText>
          {hasFilters && (
            <Pressable
              onPress={() => {
                setQuery('');
                setCategoryId(null);
                setGovernorateId(null);
              }}>
              <ThemedText type="small" themeColor="tint">
                {t('search_clear')}
              </ThemedText>
            </Pressable>
          )}
        </View>
      </View>

      {results.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="search" size={40} color={theme.textSecondary} />
          <ThemedText style={styles.emptyTitle}>{t('search_noResults')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyHint}>
            {t('search_noResultsHint')}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(l) => l.id}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.grid}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <ListingCard listing={item} />}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { padding: Spacing.three, gap: Spacing.two },
  searchBox: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, paddingVertical: Spacing.three, fontSize: 15 },
  filterRow: { gap: Spacing.two },
  filterBtn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterLabel: { flexShrink: 1 },
  resultsRow: { alignItems: 'center', justifyContent: 'space-between' },
  column: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  grid: { gap: Spacing.three, paddingBottom: Spacing.five },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.five },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyHint: { textAlign: 'center' },
});
