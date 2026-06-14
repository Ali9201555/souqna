import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View, type StyleProp, type TextStyle } from 'react-native';

import { PhotoPicker } from '@/components/photo-picker';
import { PickerSheet, type PickerOption } from '@/components/picker-sheet';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/data/AuthProvider';
import { CUISINES } from '@/data/cuisines';
import { GOVERNORATES, getGovernorate } from '@/data/governorates';
import { useKitchens } from '@/data/KitchensProvider';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';

export default function KitchenEditScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t, lang, isRTL } = useI18n();
  const { isAuthenticated } = useAuth();
  const { myKitchen, saveMyKitchen } = useKitchens();
  const align = isRTL ? 'right' : 'left';

  const [name, setName] = useState(myKitchen?.name ?? '');
  const [bio, setBio] = useState(myKitchen?.bio ?? '');
  const [cover, setCover] = useState<string[]>(myKitchen?.coverUrl ? [myKitchen.coverUrl] : []);
  const [cuisines, setCuisines] = useState<string[]>(myKitchen?.cuisines ?? []);
  const [governorateId, setGovernorateId] = useState<string | null>(myKitchen?.governorateId ?? null);
  const [showGov, setShowGov] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleCuisine = (id: string) =>
    setCuisines((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const inputStyle: StyleProp<TextStyle> = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, textAlign: align }];
  const govOptions: PickerOption[] = GOVERNORATES.map((g) => ({ id: g.id, label: g.name[lang] }));

  const save = async () => {
    if (saving) return;
    if (!name.trim()) {
      setError(true);
      return;
    }
    if (isSupabaseConfigured && !isAuthenticated) {
      router.replace('/auth');
      return;
    }
    setError(false);
    setSaving(true);
    try {
      const kitchen = await saveMyKitchen({
        name: name.trim(),
        bio: bio.trim(),
        coverUrl: cover[0],
        cuisines,
        governorateId: governorateId ?? undefined,
      });
      router.replace({ pathname: '/kitchen/[id]', params: { id: kitchen.id } });
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  const close = (
    <PressableScale scaleTo={0.9} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common_close')} onPress={() => router.back()}>
      <Ionicons name="close" size={24} color={theme.text} />
    </PressableScale>
  );

  return (
    <Screen title={myKitchen ? t('kitchen_editTitle') : t('kitchen_openTitle')} headerRight={close}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label={t('kitchen_cover')} align={align}>
          <PhotoPicker images={cover} onChange={setCover} max={1} />
        </Field>

        <Field label={t('kitchen_name')} align={align}>
          <TextInput value={name} onChangeText={setName} placeholder={t('kitchen_ph_name')} placeholderTextColor={theme.textSecondary} style={inputStyle} />
        </Field>

        <Field label={t('kitchen_bio')} align={align}>
          <TextInput value={bio} onChangeText={setBio} placeholder={t('kitchen_ph_bio')} placeholderTextColor={theme.textSecondary} multiline style={[inputStyle, styles.multiline]} />
        </Field>

        <Field label={t('kitchen_cuisines')} align={align}>
          <View style={styles.chipWrap}>
            {CUISINES.filter((c) => c.id !== 'other').map((c) => {
              const active = cuisines.includes(c.id);
              return (
                <PressableScale
                  key={c.id}
                  haptic
                  scaleTo={0.94}
                  accessibilityRole="button"
                  accessibilityLabel={c.name[lang]}
                  accessibilityState={{ selected: active }}
                  onPress={() => toggleCuisine(c.id)}
                  style={[styles.chip, { backgroundColor: active ? theme.tintSoft : theme.backgroundElement, borderColor: active ? theme.tint : 'transparent' }]}>
                  <ThemedText type="small" style={{ color: active ? theme.tint : theme.text, fontWeight: active ? '700' : '500' }}>
                    {c.name[lang]}
                  </ThemedText>
                </PressableScale>
              );
            })}
          </View>
        </Field>

        <Field label={t('search_governorate')} align={align}>
          <PressableScale
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={t('search_governorate')}
            onPress={() => setShowGov(true)}
            style={[styles.select, { backgroundColor: theme.backgroundElement, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <ThemedText>{governorateId ? getGovernorate(governorateId)?.name[lang] ?? t('sell_choose') : t('sell_choose')}</ThemedText>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.textSecondary} />
          </PressableScale>
        </Field>

        {error && (
          <ThemedText type="small" themeColor="danger" style={{ textAlign: align }}>
            {t('kitchen_required')}
          </ThemedText>
        )}

        <PressableScale
          haptic
          scaleTo={0.98}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={t('kitchen_save')}
          onPress={() => void save()}
          style={[styles.saveBtn, { backgroundColor: theme.tint, opacity: saving ? 0.6 : 1 }]}>
          {saving ? <ActivityIndicator color={theme.onTint} /> : <ThemedText style={{ color: theme.onTint, fontWeight: '800', fontSize: 16 }}>{t('kitchen_save')}</ThemedText>}
        </PressableScale>
      </ScrollView>

      <PickerSheet visible={showGov} title={t('search_governorate')} options={govOptions} selectedId={governorateId} onSelect={(idv) => setGovernorateId(idv)} onClose={() => setShowGov(false)} />
    </Screen>
  );
}

function Field({ label, align, children }: { label: string; align: 'left' | 'right'; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" style={{ textAlign: align }}>
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  field: { gap: Spacing.one },
  input: { borderRadius: Radius.lg, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, fontSize: 15 },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.pill, borderWidth: StyleSheet.hairlineWidth },
  select: { alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  saveBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.three, borderRadius: Radius.pill, marginTop: Spacing.two, minHeight: 48 },
});
