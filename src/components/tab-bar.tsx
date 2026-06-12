import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Motion, Radius, Shadow, Spacing } from '@/constants/theme';
import { useListings } from '@/data/ListingsProvider';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import { hapticImpact, hapticSelect } from '@/lib/haptics';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  index: { active: 'home', inactive: 'home-outline' },
  search: { active: 'search', inactive: 'search-outline' },
  chats: { active: 'chatbubble-ellipses', inactive: 'chatbubble-ellipses-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

/** Keeps the floating dock phone-sized when centered on wide/web layouts. */
const DOCK_MAX_WIDTH = 430;

/** Unread badge that pops in with a springy overshoot when the count goes 0 → n. */
function TabBadge({ count }: { count: number }) {
  const theme = useTheme();
  const { isRTL } = useI18n();
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(withSpring(1.2, Motion.springBouncy), withSpring(1, Motion.spring));
  }, [scale]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        styles.badge,
        isRTL ? styles.badgeRTL : styles.badgeLTR,
        { backgroundColor: theme.tint, borderColor: theme.surface },
        popStyle,
      ]}>
      <ThemedText style={[styles.badgeText, { color: theme.onTint }]}>
        {count > 9 ? '9+' : count}
      </ThemedText>
    </Animated.View>
  );
}

function TabItem({
  label,
  icon,
  focused,
  badge,
  onPress,
}: {
  label: string;
  icon: { active: IoniconName; inactive: IoniconName };
  focused: boolean;
  badge?: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const active = useSharedValue(focused ? 1 : 0);
  const pop = useSharedValue(1);

  useEffect(() => {
    active.value = focused ? withSpring(1, Motion.spring) : withTiming(0, { duration: 160 });
    if (focused) {
      pop.value = withSequence(withSpring(1.18, Motion.springBouncy), withSpring(1, Motion.spring));
    }
  }, [active, pop, focused]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: active.value,
    transform: [{ scale: 0.6 + active.value * 0.4 }],
  }));

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <PressableScale
      scaleTo={0.88}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.item}>
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.pill, { backgroundColor: theme.tintSoft }, pillStyle]} />
        <Animated.View style={popStyle}>
          <Ionicons
            name={focused ? icon.active : icon.inactive}
            size={22}
            color={focused ? theme.tint : theme.textSecondary}
          />
        </Animated.View>
        {badge != null && badge > 0 && <TabBadge count={badge} />}
      </View>
      <ThemedText
        numberOfLines={1}
        style={[styles.label, { color: focused ? theme.tint : theme.textSecondary }]}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}

/** Raised gradient Sell button — floats above the dock and pops on press. */
function SellButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  const { isRTL } = useI18n();
  const pop = useSharedValue(1);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <View style={styles.item}>
      <PressableScale
        scaleTo={0.9}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          hapticImpact();
          // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are mutated by design.
          pop.value = withSequence(withSpring(1.2, Motion.springBouncy), withSpring(1, Motion.spring));
          onPress();
        }}
        style={styles.sellRaise}>
        <Animated.View style={[styles.sellShadow, popStyle]}>
          <LinearGradient
            colors={[theme.tint, theme.accent]}
            start={isRTL ? { x: 1, y: 0 } : { x: 0, y: 0 }}
            end={isRTL ? { x: 0, y: 1 } : { x: 1, y: 1 }}
            style={styles.sellButton}>
            <Ionicons name="add" size={28} color={theme.onTint} />
          </LinearGradient>
        </Animated.View>
      </PressableScale>
      <ThemedText numberOfLines={1} style={[styles.label, styles.sellLabel, { color: theme.tint }]}>
        {label}
      </ThemedText>
    </View>
  );
}

/**
 * Floating tab dock: a detached pill hovering above the canvas (screens clear
 * it via BottomTabInset), with pill-highlighted active tabs, an unread badge
 * on Chats, and a raised gradient Sell button in the center. Tab order
 * mirrors via the framework's RTL handling (same as the default bar), so the
 * dock keeps a plain 'row'.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { threads } = useListings();
  const unread = threads.reduce((sum, thread) => sum + thread.unread, 0);

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, Spacing.two) + Spacing.two }]}>
      <View
        style={[
          styles.dock,
          { backgroundColor: theme.surface, borderColor: theme.border, boxShadow: Shadow.dock },
        ]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          if (route.name === 'sell') {
            return <SellButton key={route.key} label={label} onPress={onPress} />;
          }

          return (
            <TabItem
              key={route.key}
              label={label}
              icon={TAB_ICONS[route.name] ?? TAB_ICONS.index}
              focused={focused}
              badge={route.name === 'chats' ? unread : undefined}
              onPress={() => {
                hapticSelect();
                onPress();
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    // Let taps in the side gutters fall through to the screen underneath.
    pointerEvents: 'box-none',
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
    maxWidth: DOCK_MAX_WIDTH,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  item: { flex: 1, alignItems: 'center', gap: Spacing.half },
  iconWrap: { width: 46, height: 28, alignItems: 'center', justifyContent: 'center' },
  pill: {
    position: 'absolute',
    width: 46,
    height: 28,
    borderRadius: Radius.pill,
  },
  label: { fontSize: 10, lineHeight: 13, fontWeight: '600' },
  badge: {
    position: 'absolute',
    top: -Spacing.one,
    minWidth: 17,
    height: 17,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  badgeLTR: { right: Spacing.half },
  badgeRTL: { left: Spacing.half },
  badgeText: { fontSize: 10, lineHeight: 12, fontWeight: '700' },
  sellRaise: { marginTop: -Spacing.four },
  sellShadow: { borderRadius: Radius.pill, boxShadow: Shadow.fab },
  sellButton: {
    width: 54,
    height: 54,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellLabel: { fontWeight: '700' },
});
