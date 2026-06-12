import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type ListStateProps = {
  /** `loading` shows a spinner; `empty`/`error` show an icon with text. */
  variant?: 'loading' | 'empty' | 'error';
  /** Ionicons glyph for the empty/error variants; defaults per variant. */
  icon?: IoniconName;
  title: string;
  hint?: string;
  /** Optional call-to-action (e.g. retry, browse). Both props required to show it. */
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Centered placeholder for a list's loading / empty / error states. Layout is
 * direction-neutral (centered), so it needs no explicit RTL handling. All text
 * goes through i18n at the call site; colors come from theme tokens.
 */
export function ListState({ variant = 'empty', icon, title, hint, actionLabel, onAction }: ListStateProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const fallbackIcon: IoniconName = variant === 'error' ? 'cloud-offline-outline' : 'file-tray-outline';
  const dangerWash = scheme === 'dark' ? 'rgba(251, 113, 133, 0.14)' : 'rgba(225, 29, 72, 0.08)';

  return (
    <Animated.View entering={FadeInDown.duration(360)} style={styles.container}>
      {variant === 'loading' ? (
        <ActivityIndicator size="large" color={theme.tint} />
      ) : (
        <View
          style={[styles.iconCircle, { backgroundColor: variant === 'error' ? dangerWash : theme.tintSoft }]}>
          <Ionicons
            name={icon ?? fallbackIcon}
            size={36}
            color={variant === 'error' ? theme.danger : theme.tint}
          />
        </View>
      )}

      <ThemedText style={styles.title}>{title}</ThemedText>
      {hint != null && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          {hint}
        </ThemedText>
      )}

      {actionLabel != null && onAction != null && (
        <PressableScale
          haptic
          scaleTo={0.96}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={[styles.action, { backgroundColor: theme.tint }]}>
          <ThemedText style={{ color: theme.onTint, fontWeight: '700' }}>{actionLabel}</ThemedText>
        </PressableScale>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.five },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  hint: { textAlign: 'center' },
  action: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.pill,
  },
});
