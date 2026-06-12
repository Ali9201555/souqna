import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';

type HintRowProps = {
  title?: string;
  hint?: ReactNode;
};

/** Soft violet info pill — a friendly inline hint, not a warning. */
export function HintRow({ title = 'Try editing', hint = 'app/index.tsx' }: HintRowProps) {
  const theme = useTheme();
  const { isRTL } = useI18n();

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: theme.accentSoft, flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}>
      <Ionicons name="information-circle" size={16} color={theme.accent} />
      <ThemedText
        type="small"
        style={[styles.title, { color: theme.accent, textAlign: isRTL ? 'right' : 'left' }]}>
        {title}
      </ThemedText>
      <View style={[styles.codeSnippet, { backgroundColor: theme.surface }]}>
        <ThemedText type="small" style={{ color: theme.accent }}>
          {hint}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  title: { flex: 1, fontWeight: '700' },
  codeSnippet: {
    borderRadius: Radius.pill,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
});
