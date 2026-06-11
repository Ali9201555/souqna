import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SellerVerificationBadge } from '@/components/seller-verification-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { getGovernorate } from '@/data/governorates';
import { useListings } from '@/data/ListingsProvider';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import { formatPrice } from '@/lib/format';
import type { Listing } from '@/types';

const SWIPE_RATIO = 0.25;

export default function DiscoverScreen() {
  const { listings, toggleFavorite, isFavorite } = useListings();
  const { t, isRTL } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [index, setIndex] = useState(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const current = listings[index];
  const next = listings[index + 1];
  const currentId = current?.id;

  const advance = (dir: 'save' | 'skip', id: string) => {
    if (dir === 'save' && !isFavorite(id)) toggleFavorite(id);
    setIndex((i) => i + 1);
    translateX.value = 0;
    translateY.value = 0;
  };

  const fling = (dir: 'save' | 'skip') => {
    if (!currentId) return;
    const to = dir === 'save' ? width * 1.5 : -width * 1.5;
    const id = currentId;
    translateX.value = withTiming(to, { duration: 240 }, (finished) => {
      if (finished) runOnJS(advance)(dir, id);
    });
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.25;
    })
    .onEnd((e) => {
      const threshold = width * SWIPE_RATIO;
      if (currentId && e.translationX > threshold) {
        const id = currentId;
        translateX.value = withTiming(width * 1.5, { duration: 220 }, (finished) => {
          if (finished) runOnJS(advance)('save', id);
        });
      } else if (currentId && e.translationX < -threshold) {
        const id = currentId;
        translateX.value = withTiming(-width * 1.5, { duration: 220 }, (finished) => {
          if (finished) runOnJS(advance)('skip', id);
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotateZ: `${interpolate(translateX.value, [-width / 2, 0, width / 2], [-9, 0, 9], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const saveStamp = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [width * 0.05, width * SWIPE_RATIO], [0, 1], Extrapolation.CLAMP),
  }));
  const skipStamp = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-width * SWIPE_RATIO, -width * 0.05], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top', 'bottom']} style={styles.flex}>
        <View style={[styles.topBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={[styles.iconBtn, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="chevron-down" size={22} color={theme.text} />
          </Pressable>
          <View style={styles.titleWrap}>
            <ThemedText style={styles.topTitle}>{t('discover_title')}</ThemedText>
            {current && (
              <ThemedText type="small" themeColor="textSecondary">
                {index + 1} / {listings.length}
              </ThemedText>
            )}
          </View>
          <View style={styles.iconBtn} />
        </View>

        {current ? (
          <>
            <View style={styles.deck}>
              {next && (
                <View style={[styles.cardWrap, styles.peek]} pointerEvents="none">
                  <CardFace listing={next} dimmed />
                </View>
              )}
              <GestureDetector gesture={pan}>
                <Animated.View style={[styles.cardWrap, cardStyle]}>
                  <CardFace listing={current} />
                  <Animated.View style={[styles.stamp, styles.stampSave, { borderColor: theme.success }, saveStamp]}>
                    <Ionicons name="heart" size={26} color={theme.success} />
                    <ThemedText style={[styles.stampText, { color: theme.success }]}>{t('discover_save')}</ThemedText>
                  </Animated.View>
                  <Animated.View style={[styles.stamp, styles.stampSkip, { borderColor: theme.danger }, skipStamp]}>
                    <Ionicons name="close" size={26} color={theme.danger} />
                    <ThemedText style={[styles.stampText, { color: theme.danger }]}>{t('discover_skip')}</ThemedText>
                  </Animated.View>
                </Animated.View>
              </GestureDetector>
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={() => fling('skip')}
                accessibilityRole="button"
                accessibilityLabel={t('discover_skip')}
                style={({ pressed }) => [styles.action, styles.actionGhost, { borderColor: theme.border }, pressed && styles.pressed]}>
                <Ionicons name="close" size={30} color={theme.textSecondary} />
              </Pressable>
              <Pressable
                onPress={() => router.push({ pathname: '/listing/[id]', params: { id: current.id } })}
                accessibilityRole="button"
                accessibilityLabel={t('detail_details')}
                style={({ pressed }) => [styles.actionSmall, { borderColor: theme.border }, pressed && styles.pressed]}>
                <Ionicons name="information" size={20} color={theme.text} />
              </Pressable>
              <Pressable
                onPress={() => fling('save')}
                accessibilityRole="button"
                accessibilityLabel={t('discover_save')}
                style={({ pressed }) => [styles.action, { backgroundColor: theme.tint }, pressed && styles.pressed]}>
                <Ionicons name="heart" size={30} color={theme.onTint} />
              </Pressable>
            </View>

            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
              {t('discover_hint')}
            </ThemedText>
          </>
        ) : (
          <View style={styles.empty}>
            <View style={[styles.emptyBadge, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="checkmark-done" size={44} color={theme.tint} />
            </View>
            <ThemedText style={styles.emptyTitle}>{t('discover_empty')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyHint}>
              {t('discover_emptyHint')}
            </ThemedText>
            <Pressable
              onPress={() => router.push('/saved')}
              style={({ pressed }) => [styles.emptyBtn, { backgroundColor: theme.tint }, pressed && styles.pressed]}>
              <Ionicons name="heart" size={18} color={theme.onTint} />
              <ThemedText style={{ color: theme.onTint, fontWeight: '700' }}>{t('discover_seeSaved')}</ThemedText>
            </Pressable>
            <Pressable onPress={() => router.back()} style={styles.emptyLink}>
              <ThemedText type="small" themeColor="tint">{t('common_close')}</ThemedText>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function CardFace({ listing, dimmed }: { listing: Listing; dimmed?: boolean }) {
  const theme = useTheme();
  const { t, lang, isRTL } = useI18n();
  const { getSeller } = useListings();
  const seller = getSeller(listing.sellerId);
  const gov = getGovernorate(listing.governorateId);
  const priceText = listing.priceIqd > 0 ? formatPrice(listing.priceIqd, t('common_currency')) : t('contactForPrice');
  const align = isRTL ? 'right' : 'left';
  const rowDir = isRTL ? 'row-reverse' : 'row';

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Image source={{ uri: listing.images[0] }} style={StyleSheet.absoluteFill} contentFit="cover" transition={dimmed ? 0 : 150} />

      <View style={[styles.topChips, { flexDirection: rowDir }]}>
        <View style={styles.chip}>
          <ThemedText style={styles.chipText}>{listing.condition === 'new' ? t('cond_new') : t('cond_used')}</ThemedText>
        </View>
        {listing.negotiable && (
          <View style={styles.chip}>
            <ThemedText style={styles.chipText}>{t('negotiable')}</ThemedText>
          </View>
        )}
      </View>

      <View style={styles.scrim}>
        <ThemedText style={[styles.price, { textAlign: align }]}>{priceText}</ThemedText>
        <ThemedText numberOfLines={2} style={[styles.title, { textAlign: align }]}>{listing.title}</ThemedText>
        <View style={[styles.metaRow, { flexDirection: rowDir }]}>
          <Ionicons name="location-outline" size={15} color="#fff" />
          <ThemedText style={styles.meta}>{gov?.name[lang]}</ThemedText>
          <SellerVerificationBadge verified={seller?.isPhoneVerified} variant="solid" size="small" />
          {seller && seller.ratingCount > 0 && (
            <View style={[styles.rating, { flexDirection: rowDir }]}>
              <Ionicons name="star" size={13} color={theme.star} />
              <ThemedText style={styles.meta}>{seller.ratingAvg}</ThemedText>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  iconBtn: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { alignItems: 'center' },
  topTitle: { fontSize: 18, fontWeight: '800' },
  deck: { flex: 1, margin: Spacing.three, alignItems: 'center', justifyContent: 'center' },
  cardWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  peek: { transform: [{ scale: 0.94 }, { translateY: 18 }] },
  card: { flex: 1, borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', justifyContent: 'space-between' },
  topChips: { gap: Spacing.two, padding: Spacing.three },
  chip: { backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: Spacing.two, paddingVertical: 4, borderRadius: Radius.pill },
  chipText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  scrim: { backgroundColor: 'rgba(0,0,0,0.5)', padding: Spacing.three, gap: 4 },
  price: { color: '#fff', fontSize: 26, fontWeight: '800' },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 24 },
  metaRow: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.one, flexWrap: 'wrap' },
  meta: { color: '#fff', fontSize: 13, fontWeight: '600' },
  rating: { alignItems: 'center', gap: 2 },
  stamp: {
    position: 'absolute',
    top: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderWidth: 3,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  stampSave: { left: Spacing.four, transform: [{ rotate: '-14deg' }] },
  stampSkip: { right: Spacing.four, transform: [{ rotate: '14deg' }] },
  stampText: { fontSize: 22, fontWeight: '900' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.four, paddingVertical: Spacing.two },
  action: { width: 64, height: 64, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  actionGhost: { borderWidth: 2 },
  actionSmall: { width: 48, height: 48, borderRadius: Radius.pill, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  hint: { textAlign: 'center', paddingBottom: Spacing.three, paddingHorizontal: Spacing.four },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.five },
  emptyBadge: { width: 96, height: 96, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  emptyHint: { textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderRadius: Radius.md, marginTop: Spacing.two },
  emptyLink: { padding: Spacing.two },
});
