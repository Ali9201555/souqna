import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryStrip } from '@/components/category-strip';
import { ListingCard } from '@/components/listing-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useListings } from '@/data/ListingsProvider';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';

function HomeHeader() {
  const theme = useTheme();
  const router = useRouter();
  const { t, isRTL } = useI18n();
  const align = isRTL ? 'right' : 'left';

  return (
    <View style={styles.headerWrap}>
      <ThemedText style={[styles.brand, { textAlign: align, color: theme.tint }]}>{t('appName')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={[styles.tagline, { textAlign: align }]}>
        {t('tagline')}
      </ThemedText>

      <Pressable
        onPress={() => router.push('/search')}
        style={[
          styles.search,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}>
        <Ionicons name="search" size={18} color={theme.textSecondary} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.searchText}>
          {t('home_searchHint')}
        </ThemedText>
      </Pressable>

      <CategoryStrip />

      <ThemedText style={[styles.section, { textAlign: align }]}>{t('home_latest')}</ThemedText>
    </View>
  );
}

export default function HomeScreen() {
  const { listings } = useListings();

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <FlatList
          data={listings}
          keyExtractor={(l) => l.id}
          numColumns={2}
          ListHeaderComponent={HomeHeader}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => <ListingCard listing={item} />}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerWrap: { gap: Spacing.two, paddingBottom: Spacing.two },
  brand: { fontSize: 28, fontWeight: '800', paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  tagline: { paddingHorizontal: Spacing.three },
  search: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.one,
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchText: { flex: 1 },
  section: { fontSize: 18, fontWeight: '700', paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  column: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  content: { gap: Spacing.three, paddingBottom: Spacing.five },
});
