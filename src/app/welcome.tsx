import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth, type OAuthProvider } from '@/data/AuthProvider';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import type { TKey } from '@/i18n/translations';

/**
 * Brand marks for the social buttons. Logo colors are intentionally raw —
 * recognizability beats theming here (Apple flips with the scheme, handled below).
 */
const BRAND = { google: '#EA4335', facebook: '#1877F2' } as const;

type Social = {
  provider: OAuthProvider;
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: TKey;
  color: (text: string) => string;
};

const SOCIALS: Social[] = [
  { provider: 'google', icon: 'logo-google', labelKey: 'welcome_continueGoogle', color: () => BRAND.google },
  { provider: 'apple', icon: 'logo-apple', labelKey: 'welcome_continueApple', color: (text) => text },
  { provider: 'facebook', icon: 'logo-facebook', labelKey: 'welcome_continueFacebook', color: () => BRAND.facebook },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t, isRTL } = useI18n();
  const { isAuthenticated, signInWithOAuth, oauthError, clearOAuthError } = useAuth();

  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const [showSoon, setShowSoon] = useState(false);
  const rowDir = isRTL ? 'row-reverse' : 'row';

  // Any successful sign-in (here or on the pushed email screen) drops us home.
  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated, router]);

  const enterApp = () => router.replace('/');

  const onSocial = async (provider: OAuthProvider) => {
    if (pending) return;
    setShowSoon(false);
    clearOAuthError();
    setPending(provider);
    const res = await signInWithOAuth(provider);
    setPending(null);
    if (res.ok || res.code === 'cancelled') return; // success redirects; cancel is silent
    setShowSoon(true); // not configured / provider disabled → honest "coming soon"
  };

  // Apple sign-in has no place on Android.
  const socials = SOCIALS.filter((s) => !(s.provider === 'apple' && Platform.OS === 'android'));

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={[styles.topBar, { flexDirection: rowDir }]}>
          <View style={[styles.brandLockup, { flexDirection: rowDir }]}>
            <View style={[styles.brandMark, { backgroundColor: theme.tint }]}>
              <Ionicons name="storefront" size={16} color={theme.onTint} />
            </View>
            <ThemedText style={styles.brandName}>{t('appName')}</ThemedText>
          </View>
          <PressableScale
            scaleTo={0.9}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('common_close')}
            onPress={enterApp}
            style={[styles.closeBtn, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="close" size={20} color={theme.text} />
          </PressableScale>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Animated.View
              entering={FadeIn.duration(420)}
              style={{ borderRadius: Radius.xxl, boxShadow: Shadow.card }}>
              <LinearGradient
                colors={[theme.tintSoft, theme.accentSoft]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.scene}>
                <Ionicons name="sunny" size={30} color={theme.star} style={styles.sun} />
                <Ionicons name="home" size={104} color={theme.tint} />
                <Ionicons name="business" size={52} color={theme.accent} style={styles.tower} />
                <View style={[styles.car, { backgroundColor: theme.surface }]}>
                  <Ionicons name="car-sport" size={34} color={theme.accent} />
                </View>
              </LinearGradient>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(420).delay(80)}>
              <ThemedText style={styles.headline}>{t('welcome_headline')}</ThemedText>
              <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
                {t('welcome_subtitle')}
              </ThemedText>
            </Animated.View>
          </View>

          <Animated.View entering={FadeInDown.duration(420).delay(160)} style={styles.actions}>
            {socials.map((s) => (
              <AuthButton
                key={s.provider}
                icon={s.icon}
                iconColor={s.color(theme.text)}
                label={t(s.labelKey)}
                onPress={() => onSocial(s.provider)}
                busy={pending === s.provider}
                disabled={pending != null}
                rowDir={rowDir}
              />
            ))}
            <AuthButton
              icon="mail"
              iconColor={theme.tint}
              label={t('welcome_continueEmail')}
              onPress={() => router.push('/auth')}
              disabled={pending != null}
              rowDir={rowDir}
            />

            {oauthError != null && (
              <Animated.View
                entering={FadeIn.duration(220)}
                style={[styles.soon, { backgroundColor: theme.tintSoft, flexDirection: rowDir }]}>
                <Ionicons name="alert-circle" size={16} color={theme.danger} />
                <ThemedText type="small" themeColor="danger" style={styles.soonText}>
                  {t('welcome_oauthFailed', { detail: oauthError })}
                </ThemedText>
              </Animated.View>
            )}

            {showSoon && (
              <Animated.View
                entering={FadeIn.duration(220)}
                style={[styles.soon, { backgroundColor: theme.backgroundElement, flexDirection: rowDir }]}>
                <Ionicons name="information-circle" size={16} color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary" style={styles.soonText}>
                  {t('welcome_soon')}
                </ThemedText>
              </Animated.View>
            )}

            <PressableScale
              scaleTo={0.97}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('welcome_browse')}
              onPress={enterApp}
              style={styles.guest}>
              <ThemedText type="smallBold" themeColor="tint">
                {t('welcome_browse')}
              </ThemedText>
            </PressableScale>

            <ThemedText type="small" themeColor="textSecondary" style={styles.legal}>
              {t('welcome_legal')}
            </ThemedText>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function AuthButton({
  icon,
  iconColor,
  label,
  onPress,
  busy,
  disabled,
  rowDir,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  rowDir: 'row' | 'row-reverse';
}) {
  const theme = useTheme();
  return (
    <PressableScale
      scaleTo={0.97}
      haptic
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy }}
      style={[
        styles.authBtn,
        { backgroundColor: theme.surface, borderColor: theme.border, flexDirection: rowDir, opacity: disabled && !busy ? 0.5 : 1 },
      ]}>
      {busy ? (
        <ActivityIndicator size="small" color={theme.tint} style={styles.authIcon} />
      ) : (
        <Ionicons name={icon} size={22} color={iconColor} style={styles.authIcon} />
      )}
      <ThemedText style={styles.authLabel}>{label}</ThemedText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  brandLockup: { alignItems: 'center', gap: Spacing.two },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontSize: 20, fontWeight: '800' },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: Spacing.four, paddingBottom: Spacing.three },
  hero: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.four, paddingVertical: Spacing.four },
  scene: {
    width: 260,
    height: 220,
    borderRadius: Radius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sun: { position: 'absolute', top: 26, left: 30 },
  tower: { position: 'absolute', right: 34, bottom: 40, opacity: 0.9 },
  car: {
    position: 'absolute',
    bottom: 26,
    left: 26,
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: Shadow.card,
  },
  headline: { fontSize: 30, lineHeight: 38, fontWeight: '800', textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: Spacing.two },
  actions: { gap: Spacing.two + Spacing.one },
  authBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.three,
    minHeight: 54,
    boxShadow: Shadow.card,
  },
  authIcon: { width: 24, textAlign: 'center' },
  authLabel: { fontSize: 16, fontWeight: '700' },
  soon: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.lg,
  },
  soonText: { flex: 1 },
  guest: { alignItems: 'center', paddingVertical: Spacing.two, marginTop: Spacing.one },
  legal: { textAlign: 'center', paddingHorizontal: Spacing.three, marginTop: Spacing.half },
});
