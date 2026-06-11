import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/data/AuthProvider';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';

/**
 * Gate a subtree behind auth. Guests see a sign-in prompt (→ /auth modal);
 * authenticated users see `children`. During the initial session restore we
 * render a neutral spinner so the prompt never flashes before restore resolves.
 * Declarative (not an imperative redirect) so it composes inside a mounted tab
 * without fighting the navigator.
 */
export function AuthGate({ title, message, children }: { title: string; message: string; children: ReactNode }) {
  const { status } = useAuth();
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  if (status === 'authenticated') return <>{children}</>;

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <View style={[styles.card, { borderColor: theme.border }]}>
        <Ionicons name="lock-closed-outline" size={44} color={theme.tint} />
        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          {message}
        </ThemedText>
        <Pressable
          onPress={() => router.push('/auth')}
          style={({ pressed }) => [styles.cta, { backgroundColor: theme.tint }, pressed && styles.pressed]}>
          <ThemedText style={{ color: theme.onTint, fontWeight: '700' }}>{t('gate_cta')}</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
  card: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    maxWidth: 360,
  },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  message: { textAlign: 'center' },
  cta: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
  pressed: { opacity: 0.85 },
});
