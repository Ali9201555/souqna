import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { getGovernorate } from '@/data/governorates';
import { useListings } from '@/data/ListingsProvider';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import { formatPrice } from '@/lib/format';
import type { Listing } from '@/types';

const MAX = 6;

export function Spotlight() {
  const { listings, getSeller } = useListings();
  const { t, isRTL } = useI18n();
  const theme = useTheme();
  const align = isRTL ? 'right' : 'left';

  // Trust-first: verified-seller listings surface first.
  const featured = useMemo(() => {
    const rank = (l: Listing) => (getSeller(l.sellerId)?.isPhoneVerified ? 0 : 1);
    return [...listings].sort((a, b) => rank(a) - rank(b)).slice(0, MAX);
  }, [listings, getSeller]);

  if (featured.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={[styles.head, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Ionicons name="ribbon" size={18} color={theme.tint} />
        <ThemedText style={[styles.title, { textAlign: align }]}>{t('home_spotlight')}</ThemedText>
      </View>
      <FlatList
        data={featured}
        keyExtractor={(l) => l.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        renderItem={({ item }) => <SpotlightCard listing={item} />}
      />
    </View>
  );
}

function SpotlightCard({ listing }: { listing: Listing }) {
  const theme = useTheme();
  const router = useRouter();
  const { t, lang, isRTL } = useI18n();
  const { getSeller } = useListings();
  const seller = getSeller(listing.sellerId);
  const gov = getGovernorate(listing.governorateId);
  const align = isRTL ? 'right' : 'left';
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const priceText =
    listing.priceIqd > 0 ? formatPrice(listing.priceIqd, t('common_currency')) : t('contactForPrice');

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
      style={({ pressed }) => [styles.card, { borderColor: theme.border }, pressed && styles.pressed]}>
      <Image source={{ uri: listing.images[0] }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />

      {seller?.isPhoneVerified && (
        <View
          style={[
            styles.trust,
            {
              backgroundColor: theme.tint,
              flexDirection: rowDir,
              left: isRTL ? undefined : Spacing.two,
              right: isRTL ? Spacing.two : undefined,
            },
          ]}>
          <Ionicons name="shield-checkmark" size={13} color={theme.onTint} />
          <ThemedText style={[styles.trustText, { color: theme.onTint }]}>{t('detail_verified')}</ThemedText>
        </View>
      )}

      <View style={styles.scrim}>
        <ThemedText style={[styles.price, { textAlign: align }]}>{priceText}</ThemedText>
        <ThemedText numberOfLines={1} style={[styles.cardTitle, { textAlign: align }]}>
          {listing.title}
        </ThemedText>
        <View style={[styles.meta, { flexDirection: rowDir }]}>
          <Ionicons name="location-outline" size={13} color="#fff" />
          <ThemedText style={styles.metaText}>{gov?.name[lang]}</ThemedText>
          {seller && seller.ratingCount > 0 && (
            <View style={[styles.rating, { flexDirection: rowDir }]}>
              <Ionicons name="star" size={13} color={theme.star} />
              <ThemedText style={styles.metaText}>{seller.ratingAvg}</ThemedText>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two, paddingTop: Spacing.one },
  head: { alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three },
  title: { fontSize: 18, fontWeight: '700' },
  row: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  card: {
    width: 280,
    height: 170,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  trust: {
    position: 'absolute',
    top: Spacing.two,
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  trustText: { fontSize: 11, fontWeight: '800' },
  scrim: { backgroundColor: 'rgba(0,0,0,0.5)', padding: Spacing.two, gap: 2 },
  price: { color: '#fff', fontSize: 18, fontWeight: '800' },
  cardTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  meta: { alignItems: 'center', gap: Spacing.two, marginTop: 2 },
  metaText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  rating: { alignItems: 'center', gap: 2 },
  pressed: { opacity: 0.85 },
});
