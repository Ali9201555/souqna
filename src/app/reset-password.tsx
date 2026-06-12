import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/data/AuthProvider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import type { TKey } from '@/i18n/translations';

/** Focus ring is full-strength border; reserve the width so layout is stable. */
const INPUT_BORDER_WIDTH = 1.5;

/**
 * Landing screen for password-reset links. The link signs the user into a
 * recovery session (web: detectSessionInUrl → PASSWORD_RECOVERY routes here);
 * saving calls auth.updateUser with the new password.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t, isRTL } = useI18n();
  const theme = useTheme();
  const scheme = useColorScheme();
  const { updatePassword } = useAuth();
  const align = isRTL ? 'right' : 'left';
  const rowDir = isRTL ? 'row-reverse' : 'row';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [errorKey, setErrorKey] = useState<TKey | null>(null);
  const [done, setDone] = useState(false);
  const [focused, setFocused] = useState<'password' | 'confirm' | null>(null);

  const save = async () => {
    if (pending) return;
    if (password !== confirm) {
      setErrorKey('reset_mismatch');
      return;
    }
    setPending(true);
    setErrorKey(null);
    const res = await updatePassword(password);
    setPending(false);
    if (res.ok) setDone(true);
    else setErrorKey(res.code === 'weak_password' ? 'auth_err_weak_password' : 'auth_err_unknown');
  };

  const dangerWash = scheme === 'dark' ? 'rgba(251, 113, 133, 0.14)' : 'rgba(225, 29, 72, 0.08)';
  const inputStyle = (field: 'password' | 'confirm') => [
    styles.input,
    {
      color: theme.text,
      backgroundColor: theme.backgroundElement,
      borderColor: focused === field ? theme.tint : 'transparent',
    },
  ];
  const off = pending || password.length === 0 || confirm.length === 0;

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: t('reset_title'), headerTitleStyle: { fontSize: 18, fontWeight: '800' } }} />
      {done ? (
        <Animated.View entering={FadeInDown.duration(360)} style={styles.center}>
          <View style={[styles.doneIcon, { backgroundColor: theme.tintSoft }]}>
            <Ionicons name="checkmark-circle-outline" size={36} color={theme.success} />
          </View>
          <ThemedText style={styles.doneTitle}>{t('reset_done')}</ThemedText>
          <PressableScale
            haptic
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLabel={t('saved_browse')}
            onPress={() => router.replace('/')}
            style={[styles.primaryWrap, { boxShadow: Shadow.fab }]}>
            <LinearGradient
              colors={[theme.tint, theme.accent]}
              start={isRTL ? { x: 1, y: 0 } : { x: 0, y: 0 }}
              end={isRTL ? { x: 0, y: 1 } : { x: 1, y: 1 }}
              style={styles.primary}>
              <ThemedText style={{ color: theme.onTint, fontWeight: '700' }}>{t('saved_browse')}</ThemedText>
            </LinearGradient>
          </PressableScale>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInDown.duration(360)} style={styles.body}>
          {errorKey != null && (
            <Animated.View
              entering={FadeInDown.duration(240)}
              style={[styles.alert, { backgroundColor: dangerWash, flexDirection: rowDir }]}>
              <Ionicons name="alert-circle" size={16} color={theme.danger} />
              <ThemedText type="small" themeColor="danger" style={[styles.alertText, { textAlign: align }]}>
                {t(errorKey)}
              </ThemedText>
            </Animated.View>
          )}

          <ThemedText type="smallBold" style={{ textAlign: align }}>
            {t('reset_passwordLabel')}
          </ThemedText>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth_ph_password')}
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            autoCapitalize="none"
            onFocus={() => setFocused('password')}
            onBlur={() => setFocused(null)}
            style={[inputStyle('password'), styles.ltr]}
          />

          <ThemedText type="smallBold" style={{ textAlign: align }}>
            {t('reset_confirmLabel')}
          </ThemedText>
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            placeholder={t('auth_ph_password')}
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            autoCapitalize="none"
            onFocus={() => setFocused('confirm')}
            onBlur={() => setFocused(null)}
            style={[inputStyle('confirm'), styles.ltr]}
          />

          <PressableScale
            haptic
            scaleTo={0.97}
            onPress={() => void save()}
            disabled={off}
            accessibilityRole="button"
            accessibilityLabel={t('reset_save')}
            accessibilityState={{ disabled: off, busy: pending }}
            style={[styles.primaryWrap, { opacity: off ? 0.55 : 1, boxShadow: Shadow.fab }]}>
            <LinearGradient
              colors={[theme.tint, theme.accent]}
              start={isRTL ? { x: 1, y: 0 } : { x: 0, y: 0 }}
              end={isRTL ? { x: 0, y: 1 } : { x: 1, y: 1 }}
              style={styles.primary}>
              {pending ? (
                <ActivityIndicator color={theme.onTint} />
              ) : (
                <ThemedText style={{ color: theme.onTint, fontWeight: '800', fontSize: 16 }}>{t('reset_save')}</ThemedText>
              )}
            </LinearGradient>
          </PressableScale>
        </Animated.View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: Spacing.three, gap: Spacing.three },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.five },
  doneIcon: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  alert: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.lg,
  },
  alertText: { flex: 1 },
  input: {
    borderWidth: INPUT_BORDER_WIDTH,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 15,
  },
  ltr: { textAlign: 'left', writingDirection: 'ltr' },
  primaryWrap: { borderRadius: Radius.pill },
  primary: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.pill,
    minHeight: 48,
    paddingHorizontal: Spacing.five,
  },
});
