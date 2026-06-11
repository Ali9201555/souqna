import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
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
  const fallbackIcon: IoniconName = variant === 'error' ? 'cloud-offline-outline' : 'file-tray-outline';

  return (
    <View style={styles.container}>
      {variant === 'loading' ? (
        <ActivityIndicator size="large" color={theme.tint} />
      ) : (
        <Ionicons
          name={icon ?? fallbackIcon}
          size={48}
          color={variant === 'error' ? theme.danger : theme.textSecondary}
        />
      )}

      <ThemedText style={styles.title}>{title}</ThemedText>
      {hint != null && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          {hint}
        </ThemedText>
      )}

      {actionLabel != null && onAction != null && (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.action, { backgroundColor: theme.tint }, pressed && styles.pressed]}>
          <ThemedText style={{ color: theme.onTint, fontWeight: '700' }}>{actionLabel}</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.five },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  hint: { textAlign: 'center' },
  action: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
  pressed: { opacity: 0.85 },
});
