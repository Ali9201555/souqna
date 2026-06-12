import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Platform, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { CategoryStrip } from '@/components/category-strip';
import { ListingCard } from '@/components/listing-card';
import { PressableScale } from '@/components/pressable-scale';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Radius, Shadow, Spacing } from '@/constants/theme';
import { useListings } from '@/data/ListingsProvider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';

/** Scroll offsets between which the compact frosted bar fades in. */
const BAR_FADE_START = 48;
const BAR_FADE_END = 96;
/** Negative-scroll range over which the hero stretches on overscroll. */
const HERO_OVERSCROLL = 120;
/** Row/column counts for the loading skeleton grid (3 rows × 2 columns). */
const SKELETON_ROWS = [0, 1, 2];
const SKELETON_COLS = [0, 1];

function HomeHeader({ scrollY }: { scrollY: SharedValue<number> }) {
  const theme = useTheme();
  const router = useRouter();
  const { t, isRTL } = useI18n();
  const align = isRTL ? 'right' : 'left';

  // Pull-to-refresh stretch: the hero follows the overscroll and swells a touch.
  const heroStyle = useAnimatedStyle(() => {
    const pull = interpolate(scrollY.value, [-HERO_OVERSCROLL, 0], [1, 0], Extrapolation.CLAMP);
    return {
      transform: [{ translateY: pull * (HERO_OVERSCROLL / 8) }, { scale: 1 + pull * 0.05 }],
    };
  });

  // The hero search pill hands off to the compact bar: it fades/lifts away over
  // the same scroll window the bar fades in, so the morph feels continuous.
  const searchHandoffStyle = useAnimatedStyle(() => {
    const progress = interpolate(scrollY.value, [BAR_FADE_START, BAR_FADE_END], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: 1 - progress,
      transform: [{ translateY: progress * -10 }],
      pointerEvents: progress < 0.4 ? ('auto' as const) : ('none' as const),
    };
  });

  return (
    <View style={styles.headerWrap}>
      <Animated.View style={[styles.hero, { boxShadow: Shadow.card }, heroStyle]}>
        <LinearGradient
          colors={[theme.tint, theme.accent]}
          start={isRTL ? { x: 1, y: 0 } : { x: 0, y: 0 }}
          end={isRTL ? { x: 0, y: 1 } : { x: 1, y: 1 }}
          style={styles.heroInner}>
          <View
            pointerEvents="none"
            style={[styles.heroBubble, isRTL ? styles.heroBubbleRTL : styles.heroBubbleLTR]}
          />
          <View
            pointerEvents="none"
            style={[styles.heroBubbleSm, isRTL ? styles.heroBubbleSmRTL : styles.heroBubbleSmLTR]}
          />

          <ThemedText style={[styles.brand, { textAlign: align, color: theme.onTint }]}>
            {t('appName')}
          </ThemedText>
          <ThemedText type="small" style={[styles.tagline, { textAlign: align, color: theme.onTint }]}>
            {t('tagline')}
          </ThemedText>

          <Animated.View style={searchHandoffStyle}>
            <PressableScale
              scaleTo={0.98}
              accessibilityRole="button"
              accessibilityLabel={t('home_searchHint')}
              onPress={() => router.push('/search')}
              style={[
                styles.search,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  boxShadow: Shadow.card,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}>
              <Ionicons name="search" size={18} color={theme.tint} />
              <ThemedText
                type="small"
                themeColor="textSecondary"
                numberOfLines={1}
                style={[styles.searchText, { textAlign: align }]}>
                {t('home_searchHint')}
              </ThemedText>
            </PressableScale>
          </Animated.View>
        </LinearGradient>
      </Animated.View>

      <PressableScale
        haptic
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={t('home_discover')}
        onPress={() => router.push('/discover')}
        style={[styles.discover, { boxShadow: Shadow.card }]}>
        <LinearGradient
          colors={[theme.accent, theme.tintDeep]}
          start={isRTL ? { x: 1, y: 0 } : { x: 0, y: 0 }}
          end={isRTL ? { x: 0, y: 1 } : { x: 1, y: 1 }}
          style={[styles.discoverInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.discoverIcon}>
            <Ionicons name="sparkles" size={16} color={theme.onTint} />
          </View>
          <View style={styles.flex}>
            <ThemedText style={[styles.discoverTitle, { color: theme.onTint, textAlign: align }]}>
              {t('home_discover')}
            </ThemedText>
            <ThemedText type="small" style={[styles.discoverSub, { color: theme.onTint, textAlign: align }]}>
              {t('home_discoverHint')}
            </ThemedText>
          </View>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.onTint} />
        </LinearGradient>
      </PressableScale>

      <CategoryStrip />

      <ThemedText style={[styles.section, { textAlign: align }]}>{t('home_latest')}</ThemedText>
    </View>
  );
}

/** Compact frosted bar that fades in once the big header scrolls away. */
function CompactBar({ scrollY }: { scrollY: SharedValue<number> }) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const router = useRouter();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();

  const barStyle = useAnimatedStyle(() => {
    const progress = interpolate(scrollY.value, [BAR_FADE_START, BAR_FADE_END], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: progress,
      transform: [{ translateY: interpolate(progress, [0, 1], [-10, 0]) }],
      pointerEvents: progress > 0.6 ? ('auto' as const) : ('none' as const),
    };
  });

  const inner = (
    <View
      style={[
        styles.compactRow,
        { paddingTop: insets.top + Spacing.two, flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}>
      <ThemedText style={[styles.compactBrand, { color: theme.tint }]}>{t('appName')}</ThemedText>
      <PressableScale
        scaleTo={0.96}
        accessibilityRole="button"
        accessibilityLabel={t('tab_search')}
        onPress={() => router.push('/search')}
        style={[
          styles.compactSearch,
          { backgroundColor: theme.backgroundElement, flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}>
        <Ionicons name="search" size={15} color={theme.tint} />
        <ThemedText
          type="small"
          themeColor="textSecondary"
          numberOfLines={1}
          style={[styles.compactSearchText, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('home_searchHint')}
        </ThemedText>
      </PressableScale>
    </View>
  );

  return (
    <Animated.View style={[styles.compactBar, { borderBottomColor: theme.border }, barStyle]}>
      {Platform.OS === 'android' ? (
        <View style={{ backgroundColor: theme.background }}>{inner}</View>
      ) : (
        <BlurView intensity={70} tint={scheme === 'dark' ? 'dark' : 'light'} style={styles.blurFill}>
          {inner}
        </BlurView>
      )}
    </Animated.View>
  );
}

/** 6-card placeholder grid shown while listings load — mirrors the card layout. */
function HomeSkeleton() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { isRTL } = useI18n();

  return (
    <View style={styles.skeletonGrid}>
      {SKELETON_ROWS.map((row) => (
        <View key={row} style={[styles.skeletonRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {SKELETON_COLS.map((col) => {
            const i = row * SKELETON_COLS.length + col;
            return (
              <View
                key={col}
                style={[
                  styles.skeletonCard,
                  { backgroundColor: theme.surface, boxShadow: Shadow.card },
                  scheme === 'dark' && {
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: theme.border,
                  },
                ]}>
                <Skeleton radius={0} delay={i * 90} style={styles.skeletonImage} />
                <View style={styles.skeletonBody}>
                  <Skeleton width="55%" height={16} delay={i * 90 + 60} />
                  <Skeleton width="85%" height={12} delay={i * 90 + 120} />
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const { listings, isLoading } = useListings();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  // Data is local for now, so refresh is just the gesture affordance; it gets
  // a real refetch when the Supabase provider lands.
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => setRefreshing(false), 600);
  }, []);

  return (
    <ThemedView style={styles.flex}>
      <Animated.FlatList
        data={listings}
        keyExtractor={(l) => l.id}
        numColumns={2}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={<HomeHeader scrollY={scrollY} />}
        ListEmptyComponent={isLoading ? <HomeSkeleton /> : null}
        columnWrapperStyle={styles.column}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.two }]}
        renderItem={({ item, index }) => <ListingCard listing={item} index={index} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.tint}
            colors={[theme.tint]}
            progressViewOffset={insets.top}
          />
        }
      />
      <CompactBar scrollY={scrollY} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerWrap: { gap: Spacing.three, paddingBottom: Spacing.one },
  hero: {
    marginHorizontal: Spacing.three,
    borderRadius: Radius.xxl,
  },
  heroInner: {
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    padding: Spacing.three,
    paddingTop: Spacing.four,
    gap: Spacing.one,
  },
  heroBubble: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    top: -64,
  },
  heroBubbleLTR: { right: -42 },
  heroBubbleRTL: { left: -42 },
  heroBubbleSm: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: -34,
  },
  heroBubbleSmLTR: { left: -26 },
  heroBubbleSmRTL: { right: -26 },
  brand: { fontSize: 30, lineHeight: 36, fontWeight: '800' },
  tagline: { opacity: 0.85, marginBottom: Spacing.two },
  search: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchText: { flex: 1 },
  discover: {
    marginHorizontal: Spacing.three,
    borderRadius: Radius.xl,
  },
  discoverInner: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  discoverIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  discoverTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800' },
  discoverSub: { fontSize: 13, lineHeight: 17, opacity: 0.9 },
  section: { fontSize: 18, fontWeight: '800', paddingHorizontal: Spacing.three },
  column: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  content: { gap: Spacing.three, paddingBottom: BottomTabInset },
  compactBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  blurFill: { width: '100%' },
  compactRow: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  compactBrand: { fontSize: 18, fontWeight: '800' },
  compactSearch: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two - Spacing.half,
    borderRadius: Radius.pill,
  },
  compactSearchText: { flex: 1, fontSize: 13 },
  skeletonGrid: { gap: Spacing.three },
  skeletonRow: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  skeletonCard: {
    flex: 1,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  skeletonImage: { width: '100%', height: 'auto', aspectRatio: 4 / 3 },
  skeletonBody: { padding: Spacing.two + Spacing.one, gap: Spacing.two },
});
