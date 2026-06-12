import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Colors, Motion, Radius, Shadow, Spacing } from '@/constants/theme';
import { getGovernorate } from '@/data/governorates';
import { useListings } from '@/data/ListingsProvider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import { formatPrice, formatRelativeTime } from '@/lib/format';
import { listingFacts } from '@/lib/listing-facts';
import type { Listing } from '@/types';

/** Neutral blurhash so images fade in from a soft wash instead of a flat box. */
export const IMAGE_PLACEHOLDER = { blurhash: 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4' };

/** Cap the entrance stagger so deep scroll positions don't feel sluggish. */
const MAX_STAGGER_INDEX = 8;

export function ListingCard({ listing, index }: { listing: Listing; index?: number }) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const router = useRouter();
  const { t, lang, isRTL } = useI18n();
  const { isFavorite, toggleFavorite, getSeller } = useListings();

  const fav = isFavorite(listing.id);
  const gov = getGovernorate(listing.governorateId);
  const verified = getSeller(listing.sellerId)?.isPhoneVerified ?? false;
  const priceText =
    listing.priceIqd > 0 ? formatPrice(listing.priceIqd, t('common_currency')) : t('contactForPrice');
  const align = isRTL ? 'right' : 'left';

  const heartScale = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.value }] }));

  const entering =
    index != null
      ? FadeInDown.duration(360).delay(Math.min(index, MAX_STAGGER_INDEX) * 55)
      : undefined;

  return (
    <PressableScale
      entering={entering}
      scaleTo={0.98}
      onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
      style={[
        styles.card,
        { backgroundColor: theme.surface, boxShadow: Shadow.card },
        scheme === 'dark' && { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
      ]}>
      <View>
        <Image
          source={{ uri: listing.images[0] }}
          placeholder={IMAGE_PLACEHOLDER}
          style={styles.image}
          contentFit="cover"
          transition={300}
        />
        <PressableScale
          hitSlop={10}
          haptic
          scaleTo={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('a11y_saveListing')}
          onPress={(e) => {
            e.stopPropagation();
            // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are mutated by design.
            heartScale.value = withSequence(withSpring(1.35, Motion.springSnappy), withSpring(1, Motion.spring));
            toggleFavorite(listing.id);
          }}
          style={[styles.heart, isRTL ? styles.heartRTL : styles.heartLTR]}>
          {/* The chip stays white in both schemes, so icon colors come from the light palette. */}
          <Animated.View style={heartStyle}>
            <Ionicons
              name={fav ? 'heart' : 'heart-outline'}
              size={18}
              color={fav ? Colors.light.danger : Colors.light.text}
            />
          </Animated.View>
        </PressableScale>
        {verified && (
          <View
            style={[
              styles.badge,
              isRTL ? styles.badgeRTL : styles.badgeLTR,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}>
            <Ionicons name="shield-checkmark" size={11} color="#FFFFFF" />
            <ThemedText style={styles.badgeText}>{t('detail_verified')}</ThemedText>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <ThemedText themeColor="price" style={[styles.price, { textAlign: align }]}>
          {priceText}
        </ThemedText>
        <ThemedText numberOfLines={2} style={[styles.cardTitle, { textAlign: align }]}>
          {listing.title}
        </ThemedText>
        {(() => {
          const facts = listingFacts(listing, t);
          return facts.length > 0 ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={[styles.factLine, { textAlign: align }]}>
              {facts.join(' · ')}
            </ThemedText>
          ) : null;
        })()}
        <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="location-outline" size={13} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.metaText}>
            {gov?.name[lang]} · {formatRelativeTime(listing.createdAt, t)}
          </ThemedText>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  image: { width: '100%', aspectRatio: 4 / 3, backgroundColor: 'rgba(0,0,0,0.06)' },
  heart: {
    position: 'absolute',
    top: Spacing.two,
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    boxShadow: '0 1px 4px rgba(16, 24, 40, 0.18)',
  },
  heartLTR: { right: Spacing.two },
  heartRTL: { left: Spacing.two },
  badge: {
    position: 'absolute',
    bottom: Spacing.two,
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(13, 18, 16, 0.55)',
  },
  badgeLTR: { left: Spacing.two },
  badgeRTL: { right: Spacing.two },
  badgeText: { color: '#FFFFFF', fontSize: 11, lineHeight: 14, fontWeight: '700' },
  body: { padding: Spacing.two + Spacing.one, gap: 2 },
  price: { fontSize: 17, fontWeight: '800' },
  cardTitle: { fontSize: 14, lineHeight: 19, fontWeight: '600' },
  factLine: { fontSize: 12, marginTop: 1 },
  metaRow: { alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontSize: 12, flexShrink: 1 },
});
