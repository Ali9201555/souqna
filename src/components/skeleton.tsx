import { useEffect } from 'react';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  /** Stagger the pulse so neighboring blocks don't blink in lockstep. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Pulsing placeholder block for loading states. Direction-neutral (a plain
 * opacity pulse, no sweep), so it needs no RTL handling.
 */
export function Skeleton({ width, height = 16, radius = Radius.md, delay = 0, style }: SkeletonProps) {
  const theme = useTheme();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withDelay(delay, withRepeat(withTiming(1, { duration: 800 }), -1, true));
  }, [pulse, delay]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: 0.45 + pulse.value * 0.55 }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: theme.backgroundElement },
        animatedStyle,
        style,
      ]}
    />
  );
}
