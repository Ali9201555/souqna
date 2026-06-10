import type { ComponentProps } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Motion } from '@/constants/theme';
import { hapticSelect } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  /** Scale while pressed. Big cards read better near 0.98, small buttons 0.92. */
  scaleTo?: number;
  /** Fire a selection haptic on press (native only). */
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Reanimated entering pass-through (e.g. staggered list entrances). */
  entering?: ComponentProps<typeof Animated.View>['entering'];
};

/**
 * A Pressable with native-feeling spring press feedback (scale + slight fade).
 * Use for every tappable surface instead of bare Pressable opacity flips.
 */
export function PressableScale({
  scaleTo = 0.97,
  haptic = false,
  onPressIn,
  onPressOut,
  onPress,
  style,
  entering,
  children,
  ...rest
}: PressableScaleProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pressed.value * (scaleTo - 1) }],
    opacity: 1 - pressed.value * 0.04,
  }));

  return (
    <AnimatedPressable
      {...rest}
      entering={entering}
      onPressIn={(e) => {
        pressed.value = withSpring(1, Motion.springSnappy);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = withSpring(0, Motion.spring);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) hapticSelect();
        onPress?.(e);
      }}
      style={[style, animatedStyle]}>
      {children}
    </AnimatedPressable>
  );
}
