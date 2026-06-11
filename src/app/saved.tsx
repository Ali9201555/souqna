import { Stack, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { ListingCard } from '@/components/listing-card';
import { ListState } from '@/components/list-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useListings } from '@/data/ListingsProvider';
import { useI18n } from '@/i18n/LanguageProvider';
import type { Listing } from '@/types';

export default function SavedScreen() {
  const { favorites, getListing } = useListings();
  const { t, isRTL } = useI18n();
  const router = useRouter();
  const align = isRTL ? 'right' : 'left';

  // Newest save first — toggleFavorite appends, so reverse the stored order.
  const saved = useMemo(
    () =>
      [...favorites]
        .reverse()
        .map(getListing)
        .filter((listing): listing is Listing => listing != null),
    [favorites, getListing],
  );

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: t('profile_favorites'), headerTitleStyle: { fontSize: 18 } }} />

      {saved.length === 0 ? (
        <ListState
          icon="heart-outline"
          title={t('saved_empty')}
          hint={t('saved_emptyHint')}
          actionLabel={t('saved_browse')}
          onAction={() => router.replace('/')}
        />
      ) : (
        <FlatList
          data={saved}
          keyExtractor={(listing) => listing.id}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <ThemedText type="small" themeColor="textSecondary" style={[styles.count, { textAlign: align }]}>
              {t('saved_count', { count: saved.length })}
            </ThemedText>
          }
          renderItem={({ item }) => <ListingCard listing={item} />}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  count: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.two },
  column: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  content: { gap: Spacing.three, paddingBottom: Spacing.five },
});
