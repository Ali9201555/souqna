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
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useListings } from '@/data/ListingsProvider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';

/** Scroll offsets between which the compact frosted bar fades in. */
const BAR_FADE_START = 48;
const BAR_FADE_END = 96;

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

      <PressableScale
        scaleTo={0.98}
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
        <Ionicons name="search" size={18} color={theme.textSecondary} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.searchText}>
          {t('home_searchHint')}
        </ThemedText>
      </PressableScale>

      <PressableScale
        haptic
        scaleTo={0.98}
        onPress={() => router.push('/discover')}
        style={[styles.discover, { boxShadow: Shadow.card }]}>
        <LinearGradient
          colors={[theme.tint, theme.tintDeep]}
          start={isRTL ? { x: 1, y: 0 } : { x: 0, y: 0 }}
          end={isRTL ? { x: 0, y: 1 } : { x: 1, y: 1 }}
          style={[styles.discoverInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.discoverIcon}>
            <Ionicons name="sparkles" size={20} color={theme.onTint} />
          </View>
          <View style={styles.flex}>
            <ThemedText style={[styles.discoverTitle, { color: theme.onTint, textAlign: align }]}>
              {t('home_discover')}
            </ThemedText>
            <ThemedText type="small" style={[styles.discoverSub, { color: theme.onTint, textAlign: align }]}>
              {t('home_discoverHint')}
            </ThemedText>
          </View>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={theme.onTint} />
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
        scaleTo={0.9}
        accessibilityRole="button"
        accessibilityLabel={t('tab_search')}
        onPress={() => router.push('/search')}
        style={[styles.compactSearch, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="search" size={18} color={theme.text} />
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

export default function HomeScreen() {
  const { listings } = useListings();
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
        ListHeaderComponent={HomeHeader}
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
  headerWrap: { gap: Spacing.two, paddingBottom: Spacing.two },
  brand: { fontSize: 30, fontWeight: '800', paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  tagline: { paddingHorizontal: Spacing.three },
  search: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.one,
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
    marginTop: Spacing.one,
    borderRadius: Radius.lg,
  },
  discoverInner: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
  },
  discoverIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  discoverTitle: { fontSize: 16, fontWeight: '800' },
  discoverSub: { opacity: 0.9 },
  section: { fontSize: 18, fontWeight: '700', paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  column: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  content: { gap: Spacing.three, paddingBottom: Spacing.five },
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  compactBrand: { fontSize: 18, fontWeight: '800' },
  compactSearch: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
