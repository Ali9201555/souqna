import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { SellerVerificationBadge } from '@/components/seller-verification-badge';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { getGovernorate } from '@/data/governorates';
import { useListings } from '@/data/ListingsProvider';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import { formatPrice, formatRelativeTime } from '@/lib/format';
import type { Listing } from '@/types';

export function ListingCard({ listing }: { listing: Listing }) {
  const theme = useTheme();
  const router = useRouter();
  const { t, lang, isRTL } = useI18n();
  const { getSeller, isFavorite, toggleFavorite } = useListings();

  const fav = isFavorite(listing.id);
  const seller = getSeller(listing.sellerId);
  const gov = getGovernorate(listing.governorateId);
  const priceText =
    listing.priceIqd > 0 ? formatPrice(listing.priceIqd, t('common_currency')) : t('contactForPrice');
  const align = isRTL ? 'right' : 'left';

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View>
        <Image source={{ uri: listing.images[0] }} style={styles.image} contentFit="cover" transition={150} />
        <Pressable
          hitSlop={10}
          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite(listing.id);
          }}
          style={[styles.heart, { backgroundColor: theme.background }]}>
          <Ionicons name={fav ? 'heart' : 'heart-outline'} size={18} color={fav ? theme.danger : theme.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <ThemedText themeColor="price" style={[styles.price, { textAlign: align }]}>
          {priceText}
        </ThemedText>
        <ThemedText numberOfLines={2} style={[styles.cardTitle, { textAlign: align }]}>
          {listing.title}
        </ThemedText>
        <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="location-outline" size={13} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.metaText}>
            {gov?.name[lang]} · {formatRelativeTime(listing.createdAt, t)}
          </ThemedText>
        </View>
        <SellerVerificationBadge verified={seller?.isPhoneVerified} size="small" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85 },
  image: { width: '100%', aspectRatio: 4 / 3, backgroundColor: '#00000010' },
  heart: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: Spacing.two, gap: 2 },
  price: { fontSize: 16, fontWeight: '800' },
  cardTitle: { fontSize: 14, lineHeight: 19, fontWeight: '600' },
  metaRow: { alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontSize: 12, flexShrink: 1 },
});
