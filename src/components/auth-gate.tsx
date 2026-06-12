import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/data/AuthProvider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import { isSupabaseConfigured } from '@/lib/supabase';

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
  const scheme = useColorScheme();
  const { t, isRTL } = useI18n();
  const router = useRouter();

  // Demo mode (no backend configured) has no auth to gate behind — posting is
  // local-only there, so the gate would just dead-end testers.
  if (!isSupabaseConfigured) return <>{children}</>;

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
      <Animated.View
        entering={FadeInDown.duration(360)}
        style={[
          styles.card,
          { backgroundColor: theme.surface, boxShadow: Shadow.card },
          scheme === 'dark' && { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
        ]}>
        <View style={[styles.iconCircle, { backgroundColor: theme.tintSoft }]}>
          <Ionicons name="lock-closed-outline" size={32} color={theme.tint} />
        </View>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          {message}
        </ThemedText>
        <PressableScale
          haptic
          scaleTo={0.97}
          accessibilityRole="button"
          accessibilityLabel={t('gate_cta')}
          onPress={() => router.push('/auth')}
          style={[styles.cta, { boxShadow: Shadow.fab }]}>
          <LinearGradient
            colors={[theme.tint, theme.accent]}
            start={isRTL ? { x: 1, y: 0 } : { x: 0, y: 0 }}
            end={isRTL ? { x: 0, y: 1 } : { x: 1, y: 1 }}
            style={styles.ctaInner}>
            <ThemedText style={{ color: theme.onTint, fontWeight: '800' }}>{t('gate_cta')}</ThemedText>
          </LinearGradient>
        </PressableScale>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
  card: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
    borderRadius: Radius.xl,
    width: '100%',
    maxWidth: 360,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  message: { textAlign: 'center' },
  cta: { marginTop: Spacing.two, borderRadius: Radius.pill },
  ctaInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radius.pill,
  },
});
