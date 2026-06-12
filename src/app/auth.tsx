import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Motion, Radius, Shadow, Spacing } from '@/constants/theme';
import { AUTH_USES_EMAIL, useAuth, type AuthErrorCode } from '@/data/AuthProvider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import type { TKey } from '@/i18n/translations';

const RESEND_SECONDS = 60;
/** Inner padding of the segmented control track. */
const SEGMENT_PAD = Spacing.one;

const ERR_KEY: Record<AuthErrorCode, TKey> = {
  invalid_phone: AUTH_USES_EMAIL ? 'auth_err_invalid_email' : 'auth_err_invalid_phone',
  invalid_code: 'auth_err_invalid_code',
  rate_limited: 'auth_err_rate_limited',
  expired: 'auth_err_expired',
  network: 'auth_err_network',
  not_configured: 'auth_err_unknown',
  unknown: 'auth_err_unknown',
};

type Mode = 'signin' | 'signup';
type Field = 'name' | 'identifier' | 'code';

export default function AuthScreen() {
  const router = useRouter();
  const { t, isRTL } = useI18n();
  const theme = useTheme();
  const scheme = useColorScheme();
  const { signInWithPhone, verifyOtp, setDisplayName } = useAuth();
  const align = isRTL ? 'right' : 'left';

  const [mode, setMode] = useState<Mode>('signin');
  const [step, setStep] = useState<'identify' | 'otp'>('identify');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [focused, setFocused] = useState<Field | null>(null);

  // One interval for the whole otp step (not re-armed per tick); ticking at 0
  // is a same-value setState, which React bails out of.
  useEffect(() => {
    if (step !== 'otp') return;
    const id = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [step]);

  const send = async () => {
    if (pending) return;
    setPending(true);
    setErrorCode(null);
    const res = await signInWithPhone(identifier);
    setPending(false);
    if (res.ok) {
      setStep('otp');
      setCode('');
      setFocused(null);
      setResendIn(RESEND_SECONDS);
    } else {
      setErrorCode(res.code);
    }
  };

  const verify = async () => {
    if (pending) return;
    setPending(true);
    setErrorCode(null);
    const res = await verifyOtp(identifier, code);
    if (res.ok) {
      // OTP signup and sign-in are the same flow server-side; "create account"
      // just adds the display name. Failure here is non-fatal — the name can be
      // edited from the profile later.
      if (mode === 'signup' && name.trim()) await setDisplayName(name);
      setPending(false);
      router.back();
    } else {
      setPending(false);
      setErrorCode(res.code);
    }
  };

  const editIdentifier = () => {
    setStep('identify');
    setCode('');
    setErrorCode(null);
    setFocused(null);
  };

  // U+2066/U+2069 (LRI/PDI) bidi-isolate the number/email so "+964 …" doesn't
  // visually reorder inside an Arabic/Kurdish sentence.
  const target = `⁦${AUTH_USES_EMAIL ? identifier.trim() : `+964 ${identifier.replace(/\D/g, '')}`}⁩`;
  const inputBase = (field: Field) => ({
    color: theme.text,
    backgroundColor: theme.backgroundElement,
    borderColor: focused === field ? theme.tint : 'transparent',
  });
  const dangerWash = scheme === 'dark' ? 'rgba(251, 113, 133, 0.14)' : 'rgba(225, 29, 72, 0.08)';
  const closeBtn = (
    <PressableScale
      scaleTo={0.9}
      onPress={() => router.back()}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t('common_close')}
      style={[styles.closeBtn, { backgroundColor: theme.backgroundElement }]}>
      <Ionicons name="close" size={20} color={theme.text} />
    </PressableScale>
  );

  const sendDisabled = !identifier.trim() || (mode === 'signup' && !name.trim());

  return (
    <Screen title={t('auth_title')} headerRight={closeBtn}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.duration(360)} style={[styles.hero, { boxShadow: Shadow.card }]}>
          <LinearGradient
            colors={[theme.tint, theme.accent]}
            start={isRTL ? { x: 1, y: 0 } : { x: 0, y: 0 }}
            end={isRTL ? { x: 0, y: 1 } : { x: 1, y: 1 }}
            style={styles.heroInner}>
            <View style={styles.heroIcon}>
              <Ionicons name="storefront-outline" size={24} color={theme.onTint} />
            </View>
            <ThemedText style={[styles.brandName, { color: theme.onTint }]}>{t('appName')}</ThemedText>
            <ThemedText type="small" style={[styles.brandTag, { color: theme.onTint }]}>
              {t('auth_welcome')}
            </ThemedText>
          </LinearGradient>
        </Animated.View>

        {/* Keyed by step so identify ↔ otp transitions re-run the entrance. */}
        <Animated.View
          key={step}
          entering={FadeInDown.duration(320).delay(60)}
          style={[
            styles.formCard,
            { backgroundColor: theme.surface, boxShadow: Shadow.card },
            scheme === 'dark' && { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
          ]}>
          {step === 'identify' && (
            <ModeSegment
              mode={mode}
              onChange={(m) => {
                setMode(m);
                setErrorCode(null);
              }}
            />
          )}

          {errorCode != null && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[styles.alert, { backgroundColor: dangerWash, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="alert-circle" size={18} color={theme.danger} />
              <ThemedText type="small" themeColor="danger" style={[styles.alertText, { textAlign: align }]}>
                {t(ERR_KEY[errorCode])}
              </ThemedText>
            </Animated.View>
          )}

          {step === 'identify' ? (
            <>
              {mode === 'signup' && (
                <>
                  <ThemedText type="smallBold" style={{ textAlign: align }}>
                    {t('auth_nameLabel')}
                  </ThemedText>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder={t('auth_ph_name')}
                    placeholderTextColor={theme.textSecondary}
                    accessibilityLabel={t('auth_nameLabel')}
                    onFocus={() => setFocused('name')}
                    onBlur={() => setFocused(null)}
                    style={[styles.input, inputBase('name'), { textAlign: align }]}
                  />
                </>
              )}

              <ThemedText type="smallBold" style={{ textAlign: align }}>
                {AUTH_USES_EMAIL ? t('auth_emailLabel') : t('auth_phoneLabel')}
              </ThemedText>

              {AUTH_USES_EMAIL ? (
                <TextInput
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder={t('auth_emailPlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel={t('auth_emailLabel')}
                  onFocus={() => setFocused('identifier')}
                  onBlur={() => setFocused(null)}
                  style={[styles.input, inputBase('identifier'), styles.ltr]}
                />
              ) : (
                <View
                  style={[
                    styles.phoneRow,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: focused === 'identifier' ? theme.tint : 'transparent',
                    },
                  ]}>
                  <View style={[styles.prefix, { borderColor: theme.border }]}>
                    <ThemedText style={{ color: theme.textSecondary }}>+964</ThemedText>
                  </View>
                  <TextInput
                    value={identifier}
                    onChangeText={setIdentifier}
                    placeholder={t('auth_phonePlaceholder')}
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="phone-pad"
                    accessibilityLabel={t('auth_phoneLabel')}
                    onFocus={() => setFocused('identifier')}
                    onBlur={() => setFocused(null)}
                    style={[styles.phoneInput, { color: theme.text }, styles.ltr]}
                  />
                </View>
              )}

              <PrimaryButton
                label={t(mode === 'signup' ? 'auth_signup_tab' : 'auth_sendCode')}
                onPress={send}
                pending={pending}
                disabled={sendDisabled}
              />
            </>
          ) : (
            <>
              <View style={[styles.alert, { backgroundColor: theme.tintSoft, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons
                  name={AUTH_USES_EMAIL ? 'mail-unread-outline' : 'chatbubble-ellipses-outline'}
                  size={18}
                  color={theme.tint}
                />
                <View style={styles.alertBody}>
                  <ThemedText type="small" themeColor="tint" style={[styles.infoText, { textAlign: align }]}>
                    {t('auth_otpSentTo', { target })}
                  </ThemedText>
                  {AUTH_USES_EMAIL && (
                    <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: align }}>
                      {t('auth_linkHint')}
                    </ThemedText>
                  )}
                </View>
              </View>

              <ThemedText type="smallBold" style={{ textAlign: align }}>
                {t('auth_otpLabel')}
              </ThemedText>

              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                placeholder={t('auth_otpPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                maxLength={6}
                accessibilityLabel={t('auth_otpLabel')}
                onFocus={() => setFocused('code')}
                onBlur={() => setFocused(null)}
                style={[styles.input, inputBase('code'), styles.otpInput]}
              />

              <PrimaryButton label={t('auth_verify')} onPress={verify} pending={pending} disabled={code.length < 6} />

              <View style={[styles.otpFooter, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <PressableScale scaleTo={0.9} onPress={editIdentifier} hitSlop={8} accessibilityRole="button">
                  <ThemedText type="small" themeColor="tint" style={styles.footerLink}>
                    {t('auth_wrongNumber')}
                  </ThemedText>
                </PressableScale>
                <PressableScale
                  scaleTo={0.9}
                  onPress={send}
                  disabled={resendIn > 0 || pending}
                  hitSlop={8}
                  accessibilityRole="button">
                  <ThemedText type="small" themeColor={resendIn > 0 ? 'textSecondary' : 'tint'} style={styles.footerLink}>
                    {resendIn > 0 ? t('auth_resendIn', { seconds: resendIn }) : t('auth_resend')}
                  </ThemedText>
                </PressableScale>
              </View>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

/** Sign-in / create-account switch with a spring-slid soft indicator. */
function ModeSegment({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const theme = useTheme();
  const { t, isRTL } = useI18n();
  const [trackWidth, setTrackWidth] = useState(0);

  const segmentWidth = Math.max(0, (trackWidth - SEGMENT_PAD * 2) / 2);
  const index = mode === 'signin' ? 0 : 1;
  // Items render in flex order, so RTL flips which physical side each mode occupies.
  const visualIndex = isRTL ? 1 - index : index;

  const indicatorStyle = useAnimatedStyle(
    () => ({ transform: [{ translateX: withSpring(visualIndex * segmentWidth, Motion.spring) }] }),
    [visualIndex, segmentWidth],
  );

  return (
    <View
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      style={[
        styles.segmentTrack,
        { backgroundColor: theme.backgroundElement, flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}>
      {segmentWidth > 0 && (
        <Animated.View
          style={[
            styles.segmentIndicator,
            { width: segmentWidth, backgroundColor: theme.tintSoft, borderColor: theme.border, boxShadow: Shadow.card },
            indicatorStyle,
          ]}
        />
      )}
      {(['signin', 'signup'] as Mode[]).map((m) => {
        const active = mode === m;
        return (
          <PressableScale
            key={m}
            scaleTo={0.97}
            onPress={() => onChange(m)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={styles.segmentItem}>
            <ThemedText
              type="small"
              style={{ color: active ? theme.tint : theme.textSecondary, fontWeight: active ? '800' : '600' }}>
              {t(m === 'signin' ? 'auth_signin_tab' : 'auth_signup_tab')}
            </ThemedText>
          </PressableScale>
        );
      })}
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  pending,
  disabled,
}: {
  label: string;
  onPress: () => void;
  pending: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const { isRTL } = useI18n();
  const off = pending || disabled;
  return (
    <PressableScale
      haptic
      scaleTo={0.97}
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: pending }}
      style={[styles.primary, off ? styles.primaryOff : { boxShadow: Shadow.fab }]}>
      <LinearGradient
        colors={[theme.tint, theme.accent]}
        start={isRTL ? { x: 1, y: 0 } : { x: 0, y: 0 }}
        end={isRTL ? { x: 0, y: 1 } : { x: 1, y: 1 }}
        style={styles.primaryInner}>
        {pending ? (
          <ActivityIndicator color={theme.onTint} />
        ) : (
          <ThemedText style={{ color: theme.onTint, fontWeight: '800', fontSize: 16 }}>{label}</ThemedText>
        )}
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  body: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  closeBtn: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: Radius.xxl },
  heroInner: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.xxl,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginBottom: Spacing.one,
  },
  brandName: { fontSize: 34, fontWeight: '800', lineHeight: 40 },
  brandTag: { textAlign: 'center', opacity: 0.9 },
  formCard: { borderRadius: Radius.xl, padding: Spacing.three, gap: Spacing.three },
  segmentTrack: { borderRadius: Radius.pill, padding: SEGMENT_PAD },
  segmentIndicator: {
    position: 'absolute',
    top: SEGMENT_PAD,
    bottom: SEGMENT_PAD,
    left: SEGMENT_PAD,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.two + Spacing.one },
  alert: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
    borderRadius: Radius.lg,
  },
  alertText: { flex: 1 },
  alertBody: { flex: 1, gap: Spacing.one },
  infoText: { fontWeight: '600' },
  input: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 15,
  },
  // Phone numbers, emails, and OTP codes are always LTR even in an RTL UI.
  ltr: { textAlign: 'left', writingDirection: 'ltr' },
  otpInput: { textAlign: 'center', writingDirection: 'ltr', fontSize: 22, letterSpacing: 6, fontWeight: '800' },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  prefix: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, borderRightWidth: StyleSheet.hairlineWidth },
  phoneInput: { flex: 1, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, fontSize: 15 },
  primary: { borderRadius: Radius.pill },
  primaryOff: { opacity: 0.55 },
  primaryInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.pill,
    minHeight: 52,
  },
  otpFooter: { alignItems: 'center', justifyContent: 'space-between' },
  footerLink: { fontWeight: '700' },
});
