import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { AUTH_USES_EMAIL, useAuth, type AuthErrorCode } from '@/data/AuthProvider';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import type { TKey } from '@/i18n/translations';

const RESEND_SECONDS = 60;

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

export default function AuthScreen() {
  const router = useRouter();
  const { t, isRTL } = useI18n();
  const theme = useTheme();
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
  };

  // U+2066/U+2069 (LRI/PDI) bidi-isolate the number/email so "+964 …" doesn't
  // visually reorder inside an Arabic/Kurdish sentence.
  const target = `⁦${AUTH_USES_EMAIL ? identifier.trim() : `+964 ${identifier.replace(/\D/g, '')}`}⁩`;
  const inputBase = { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border };
  const closeBtn = (
    <Pressable onPress={() => router.back()} hitSlop={8}>
      <Ionicons name="close" size={24} color={theme.text} />
    </Pressable>
  );

  const sendDisabled = !identifier.trim() || (mode === 'signup' && !name.trim());

  return (
    <Screen title={t('auth_title')} headerRight={closeBtn}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <ThemedText style={[styles.brandName, { color: theme.tint }]}>{t('appName')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.brandTag}>
            {t('auth_welcome')}
          </ThemedText>
        </View>

        {step === 'identify' && (
          <View style={[styles.segment, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {(['signin', 'signup'] as Mode[]).map((m) => {
              const active = mode === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    setMode(m);
                    setErrorCode(null);
                  }}
                  style={[
                    styles.segmentItem,
                    { borderColor: theme.border, backgroundColor: active ? theme.tint : theme.backgroundElement },
                  ]}>
                  <ThemedText style={{ color: active ? theme.onTint : theme.text, fontWeight: active ? '700' : '500' }}>
                    {t(m === 'signin' ? 'auth_signin_tab' : 'auth_signup_tab')}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        )}

        {errorCode != null && (
          <ThemedText type="small" themeColor="danger" style={{ textAlign: align }}>
            {t(ERR_KEY[errorCode])}
          </ThemedText>
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
                  style={[styles.input, inputBase, { textAlign: align }]}
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
                style={[styles.input, inputBase, styles.ltr]}
              />
            ) : (
              <View style={[styles.phoneRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <View style={[styles.prefix, { borderColor: theme.border }]}>
                  <ThemedText style={{ color: theme.textSecondary }}>+964</ThemedText>
                </View>
                <TextInput
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder={t('auth_phonePlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="phone-pad"
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
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: align }}>
              {t('auth_otpSentTo', { target })}
            </ThemedText>
            {AUTH_USES_EMAIL && (
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: align }}>
                {t('auth_linkHint')}
              </ThemedText>
            )}

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
              style={[styles.input, inputBase, styles.otpInput]}
            />

            <PrimaryButton label={t('auth_verify')} onPress={verify} pending={pending} disabled={code.length < 6} />

            <View style={[styles.otpFooter, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Pressable onPress={editIdentifier} hitSlop={8}>
                <ThemedText type="small" themeColor="tint">
                  {t('auth_wrongNumber')}
                </ThemedText>
              </Pressable>
              <Pressable onPress={send} disabled={resendIn > 0 || pending} hitSlop={8}>
                <ThemedText type="small" themeColor={resendIn > 0 ? 'textSecondary' : 'tint'}>
                  {resendIn > 0 ? t('auth_resendIn', { seconds: resendIn }) : t('auth_resend')}
                </ThemedText>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
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
  const off = pending || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: theme.tint, opacity: off ? 0.6 : 1 },
        pressed && !off && styles.pressed,
      ]}>
      {pending ? (
        <ActivityIndicator color={theme.onTint} />
      ) : (
        <ThemedText style={{ color: theme.onTint, fontWeight: '800', fontSize: 16 }}>{label}</ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  brand: { alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.four },
  brandName: { fontSize: 34, fontWeight: '800', lineHeight: 40 },
  brandTag: { textAlign: 'center' },
  segment: { gap: Spacing.two },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 15,
  },
  // Phone numbers, emails, and OTP codes are always LTR even in an RTL UI.
  ltr: { textAlign: 'left', writingDirection: 'ltr' },
  otpInput: { textAlign: 'center', writingDirection: 'ltr', fontSize: 22, letterSpacing: 6 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  prefix: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, borderRightWidth: StyleSheet.hairlineWidth },
  phoneInput: { flex: 1, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, fontSize: 15 },
  primary: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.three, borderRadius: Radius.md, minHeight: 48 },
  pressed: { opacity: 0.85 },
  otpFooter: { alignItems: 'center', justifyContent: 'space-between' },
});
