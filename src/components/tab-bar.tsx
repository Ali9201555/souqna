import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Motion, Radius, Shadow, Spacing } from '@/constants/theme';
import { useListings } from '@/data/ListingsProvider';
import { useTheme } from '@/hooks/use-theme';
import { hapticImpact, hapticSelect } from '@/lib/haptics';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  index: { active: 'home', inactive: 'home-outline' },
  search: { active: 'search', inactive: 'search-outline' },
  chats: { active: 'chatbubble-ellipses', inactive: 'chatbubble-ellipses-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

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

  useEffect(() => {
    active.value = focused ? withSpring(1, Motion.spring) : withTiming(0, { duration: 160 });
  }, [active, focused]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: active.value,
    transform: [{ scale: 0.6 + active.value * 0.4 }],
  }));

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
        <Ionicons
          name={focused ? icon.active : icon.inactive}
          size={23}
          color={focused ? theme.tint : theme.textSecondary}
        />
        {badge != null && badge > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.danger, borderColor: theme.surface }]}>
            <ThemedText style={styles.badgeText}>{badge > 9 ? '9+' : badge}</ThemedText>
          </View>
        )}
      </View>
      <ThemedText
        numberOfLines={1}
        style={[styles.label, { color: focused ? theme.tint : theme.textSecondary }]}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}

/**
 * Custom tab bar: pill-highlighted active tabs, unread badge on Chats, and a
 * raised brand-green Sell button in the center. Tab order mirrors via the
 * framework's RTL handling (same as the default bar), so no manual reverse.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { threads } = useListings();
  const unread = threads.reduce((sum, thread) => sum + thread.unread, 0);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, Spacing.two),
        },
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
          return (
            <View key={route.key} style={styles.item}>
              <PressableScale
                scaleTo={0.9}
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => {
                  hapticImpact();
                  onPress();
                }}
                style={[styles.sellButton, { backgroundColor: theme.tint, boxShadow: Shadow.fab }]}>
                <Ionicons name="add" size={30} color={theme.onTint} />
              </PressableScale>
              <ThemedText style={[styles.label, styles.sellLabel, { color: theme.tint }]}>{label}</ThemedText>
            </View>
          );
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
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  iconWrap: { width: 48, height: 30, alignItems: 'center', justifyContent: 'center' },
  pill: {
    position: 'absolute',
    width: 48,
    height: 30,
    borderRadius: Radius.pill,
  },
  label: { fontSize: 10.5, lineHeight: 14, fontWeight: '600' },
  badge: {
    position: 'absolute',
    top: -4,
    right: 2,
    minWidth: 17,
    height: 17,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, lineHeight: 12, fontWeight: '700' },
  sellButton: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -Spacing.four,
  },
  sellLabel: { fontWeight: '700' },
});
