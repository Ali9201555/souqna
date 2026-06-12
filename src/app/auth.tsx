import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth, type AuthErrorCode } from '@/data/AuthProvider';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import type { TKey } from '@/i18n/translations';

const ERR_KEY: Record<AuthErrorCode, TKey> = {
  invalid_phone: 'auth_err_invalid_phone',
  invalid_email: 'auth_err_invalid_email',
  invalid_code: 'auth_err_invalid_code',
  invalid_credentials: 'auth_err_invalid_credentials',
  email_in_use: 'auth_err_email_in_use',
  email_not_confirmed: 'auth_err_email_not_confirmed',
  weak_password: 'auth_err_weak_password',
  rate_limited: 'auth_err_rate_limited',
  expired: 'auth_err_expired',
  network: 'auth_err_network',
  not_configured: 'auth_err_unknown',
  unknown: 'auth_err_unknown',
};

type Mode = 'signin' | 'signup';
type Step = 'form' | 'forgot' | 'resetSent' | 'confirmSent';

export default function AuthScreen() {
  const router = useRouter();
  const { t, isRTL } = useI18n();
  const theme = useTheme();
  const { signUpWithPassword, signInWithPassword, requestPasswordReset } = useAuth();
  const align = isRTL ? 'right' : 'left';

  const [mode, setMode] = useState<Mode>('signin');
  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);

  const submit = async () => {
    if (pending) return;
    setPending(true);
    setErrorCode(null);
    if (mode === 'signup') {
      const res = await signUpWithPassword({ name, email, password });
      setPending(false);
      if (!res.ok) setErrorCode(res.code);
      else if ('pendingConfirmation' in res) setStep('confirmSent');
      else router.back();
    } else {
      const res = await signInWithPassword(email, password);
      setPending(false);
      if (!res.ok) setErrorCode(res.code);
      else router.back();
    }
  };

  const sendReset = async () => {
    if (pending) return;
    setPending(true);
    setErrorCode(null);
    const res = await requestPasswordReset(email);
    setPending(false);
    if (res.ok) setStep('resetSent');
    else setErrorCode(res.code);
  };

  // U+2066/U+2069 (LRI/PDI) bidi-isolate the email inside Arabic/Kurdish copy.
  const target = `⁦${email.trim()}⁩`;
  const inputBase = { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border };
  const closeBtn = (
    <Pressable onPress={() => router.back()} hitSlop={8}>
      <Ionicons name="close" size={24} color={theme.text} />
    </Pressable>
  );

  const submitDisabled =
    !email.trim() || password.length === 0 || (mode === 'signup' && !name.trim());

  return (
    <Screen title={t('auth_title')} headerRight={closeBtn}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <ThemedText style={[styles.brandName, { color: theme.tint }]}>{t('appName')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.brandTag}>
            {t('auth_welcome')}
          </ThemedText>
        </View>

        {step === 'confirmSent' || step === 'resetSent' ? (
          <View style={styles.notice}>
            <Ionicons name="mail-unread-outline" size={44} color={theme.tint} />
            <ThemedText style={styles.noticeTitle}>
              {t(step === 'confirmSent' ? 'auth_confirmTitle' : 'auth_resetTitle')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.noticeHint}>
              {t(step === 'confirmSent' ? 'auth_confirmHint' : 'auth_resetSentTo', { target })}
            </ThemedText>
            <Pressable onPress={() => setStep('form')} hitSlop={8}>
              <ThemedText type="small" themeColor="tint">
                {t('common_close')}
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            {step === 'form' && (
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
                      <ThemedText
                        style={{ color: active ? theme.onTint : theme.text, fontWeight: active ? '700' : '500' }}>
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

            {step === 'form' && mode === 'signup' && (
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
              {t('auth_emailLabel')}
            </ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth_emailPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, inputBase, styles.ltr]}
            />

            {step === 'form' ? (
              <>
                <ThemedText type="smallBold" style={{ textAlign: align }}>
                  {t('auth_passwordLabel')}
                </ThemedText>
                <View style={[styles.passwordRow, inputBase, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder={t('auth_ph_password')}
                    placeholderTextColor={theme.textSecondary}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.passwordInput, { color: theme.text }, styles.ltr]}
                  />
                  <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textSecondary} />
                  </Pressable>
                </View>

                <PrimaryButton
                  label={t(mode === 'signup' ? 'auth_signup_tab' : 'auth_signin_tab')}
                  onPress={submit}
                  pending={pending}
                  disabled={submitDisabled}
                />

                {mode === 'signin' && (
                  <Pressable
                    onPress={() => {
                      setStep('forgot');
                      setErrorCode(null);
                    }}
                    hitSlop={8}>
                    <ThemedText type="small" themeColor="tint" style={{ textAlign: 'center' }}>
                      {t('auth_forgotPassword')}
                    </ThemedText>
                  </Pressable>
                )}
              </>
            ) : (
              <>
                <PrimaryButton label={t('auth_sendReset')} onPress={sendReset} pending={pending} disabled={!email.trim()} />
                <Pressable
                  onPress={() => {
                    setStep('form');
                    setErrorCode(null);
                  }}
                  hitSlop={8}>
                  <ThemedText type="small" themeColor="tint" style={{ textAlign: 'center' }}>
                    {t('common_close')}
                  </ThemedText>
                </Pressable>
              </>
            )}
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
  // Emails and passwords are always LTR even in an RTL UI.
  ltr: { textAlign: 'left', writingDirection: 'ltr' },
  passwordRow: {
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  passwordInput: { flex: 1, paddingVertical: Spacing.three, fontSize: 15 },
  primary: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.three, borderRadius: Radius.md, minHeight: 48 },
  pressed: { opacity: 0.85 },
  notice: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  noticeTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  noticeHint: { textAlign: 'center' },
});
