import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ListingCard } from '@/components/listing-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useListings } from '@/data/ListingsProvider';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import type { Listing } from '@/types';

export default function SavedScreen() {
  const { favorites, getListing } = useListings();
  const { t, isRTL } = useI18n();
  const theme = useTheme();
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
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={48} color={theme.textSecondary} />
          <ThemedText style={styles.emptyTitle}>{t('saved_empty')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyHint}>
            {t('saved_emptyHint')}
          </ThemedText>
          <Pressable
            onPress={() => router.replace('/')}
            style={({ pressed }) => [styles.browseBtn, { backgroundColor: theme.tint }, pressed && styles.pressed]}>
            <ThemedText style={{ color: theme.onTint, fontWeight: '700' }}>{t('saved_browse')}</ThemedText>
          </Pressable>
        </View>
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.five },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyHint: { textAlign: 'center' },
  browseBtn: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
  pressed: { opacity: 0.85 },
});
