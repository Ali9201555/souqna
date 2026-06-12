import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/data/AuthProvider';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import type { TKey } from '@/i18n/translations';

/**
 * Landing screen for password-reset links. The link signs the user into a
 * recovery session (web: detectSessionInUrl → PASSWORD_RECOVERY routes here);
 * saving calls auth.updateUser with the new password.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t, isRTL } = useI18n();
  const theme = useTheme();
  const { updatePassword } = useAuth();
  const align = isRTL ? 'right' : 'left';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [errorKey, setErrorKey] = useState<TKey | null>(null);
  const [done, setDone] = useState(false);

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

  const inputBase = { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border };

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: t('reset_title'), headerTitleStyle: { fontSize: 18 } }} />
      {done ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-circle-outline" size={48} color={theme.success} />
          <ThemedText style={styles.doneTitle}>{t('reset_done')}</ThemedText>
          <Pressable
            onPress={() => router.replace('/')}
            style={({ pressed }) => [styles.primary, { backgroundColor: theme.tint }, pressed && styles.pressed]}>
            <ThemedText style={{ color: theme.onTint, fontWeight: '700' }}>{t('saved_browse')}</ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.body}>
          {errorKey != null && (
            <ThemedText type="small" themeColor="danger" style={{ textAlign: align }}>
              {t(errorKey)}
            </ThemedText>
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
            style={[styles.input, inputBase, styles.ltr]}
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
            style={[styles.input, inputBase, styles.ltr]}
          />

          <Pressable
            onPress={() => void save()}
            disabled={pending || password.length === 0 || confirm.length === 0}
            style={[
              styles.primary,
              { backgroundColor: theme.tint, opacity: pending || !password || !confirm ? 0.6 : 1 },
            ]}>
            {pending ? (
              <ActivityIndicator color={theme.onTint} />
            ) : (
              <ThemedText style={{ color: theme.onTint, fontWeight: '800', fontSize: 16 }}>{t('reset_save')}</ThemedText>
            )}
          </Pressable>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: Spacing.three, gap: Spacing.three },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.five },
  doneTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 15,
  },
  ltr: { textAlign: 'left', writingDirection: 'ltr' },
  primary: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.three, borderRadius: Radius.md, minHeight: 48, paddingHorizontal: Spacing.five },
  pressed: { opacity: 0.85 },
});
