import { Stack, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListingCard } from '@/components/listing-card';
import { ListState } from '@/components/list-state';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useListings } from '@/data/ListingsProvider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import type { Listing } from '@/types';

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

/** Placeholder grid mirroring the two-column saved layout while listings load. */
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

export default function SavedScreen() {
  const { favorites, getListing, isLoading } = useListings();
  const { t, isRTL } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      <Stack.Screen
        options={{ title: t('profile_favorites'), headerTitleStyle: { fontSize: 18, fontWeight: '800' } }}
      />

      {isLoading && saved.length === 0 ? (
        <SkeletonGrid />
      ) : saved.length === 0 ? (
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
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.five }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <ThemedText type="small" themeColor="textSecondary" style={[styles.count, { textAlign: align }]}>
              {t('saved_count', { count: saved.length })}
            </ThemedText>
          }
          renderItem={({ item, index }) => <ListingCard listing={item} index={index} />}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  count: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.two },
  column: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  content: { gap: Spacing.three },
  skeletonGrid: { gap: Spacing.three, paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
  skeletonRow: { gap: Spacing.three },
  skeletonCard: { flex: 1, borderRadius: Radius.xl, overflow: 'hidden' },
  skeletonImage: { width: '100%', aspectRatio: 4 / 3 },
  skeletonBody: { padding: Spacing.two + Spacing.one, gap: Spacing.one },
});
