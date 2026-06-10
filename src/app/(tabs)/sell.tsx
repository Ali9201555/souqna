import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View, type StyleProp, type TextStyle } from 'react-native';

import { PickerSheet, type PickerOption } from '@/components/picker-sheet';
import { PhotoPicker } from '@/components/photo-picker';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { CATEGORIES, getCategory } from '@/data/categories';
import { GOVERNORATES, getGovernorate } from '@/data/governorates';
import { useListings } from '@/data/ListingsProvider';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import {
  checkPostRateLimit,
  parsePostTimestamps,
  POST_TIMESTAMPS_KEY,
  validateListingDraft,
  type ListingDraftError,
} from '@/lib/trust/posting-guardrails';
import type { TKey } from '@/i18n/translations';
import type { ListingCondition } from '@/types';

export default function SellScreen() {
  const { addListing } = useListings();
  const { t, lang, isRTL } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const align = isRTL ? 'right' : 'left';

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [negotiable, setNegotiable] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [governorateId, setGovernorateId] = useState<string | null>(null);
  const [condition, setCondition] = useState<ListingCondition>('used');
  const [images, setImages] = useState<string[]>([]);
  const [picker, setPicker] = useState<null | 'category' | 'governorate'>(null);
  const [errorKey, setErrorKey] = useState<TKey | null>(null);
  const [postedId, setPostedId] = useState<string | null>(null);
  const [postTimestamps, setPostTimestamps] = useState<number[]>([]);

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(POST_TIMESTAMPS_KEY).then((stored) => {
      if (isMounted) setPostTimestamps(parsePostTimestamps(stored));
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const errorFor = (code: ListingDraftError): TKey => {
    if (code === 'title') return 'sell_guard_title';
    if (code === 'description') return 'sell_guard_description';
    if (code === 'content') return 'sell_guard_content';
    return 'sell_required';
  };

  const publish = async () => {
    const priceNum = parseInt(price.replace(/[^\d]/g, ''), 10);
    const draft = validateListingDraft({
      title,
      description: desc,
      priceIqd: priceNum,
      categoryId,
      governorateId,
      condition,
    });

    if (!draft.ok) {
      setErrorKey(errorFor(draft.code));
      return;
    }
    if (!categoryId || !governorateId) {
      setErrorKey('sell_required');
      return;
    }

    const limit = checkPostRateLimit(postTimestamps);
    if (!limit.allowed) {
      setErrorKey('sell_guard_rateLimit');
      return;
    }

    const listing = addListing({
      title: title.trim(),
      description: desc.trim(),
      priceIqd: priceNum,
      negotiable,
      categoryId,
      governorateId,
      condition,
      images: images.length ? images : [`https://picsum.photos/seed/new-${Date.now()}/800/600`],
    });
    setPostTimestamps(limit.timestamps);
    AsyncStorage.setItem(POST_TIMESTAMPS_KEY, JSON.stringify(limit.timestamps)).catch(() => undefined);
    setErrorKey(null);
    setPostedId(listing.id);
    setTitle('');
    setDesc('');
    setPrice('');
    setNegotiable(false);
    setCategoryId(null);
    setGovernorateId(null);
    setCondition('used');
    setImages([]);
  };

  const categoryOptions: PickerOption[] = CATEGORIES.map((c) => ({ id: c.id, label: c.name[lang] }));
  const govOptions: PickerOption[] = GOVERNORATES.map((g) => ({ id: g.id, label: g.name[lang] }));
  const inputStyle: StyleProp<TextStyle> = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border, textAlign: align }];

  return (
    <Screen title={t('sell_title')}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {postedId && (
          <View style={[styles.successCard, { backgroundColor: theme.tint }]}>
            <Ionicons name="checkmark-circle" size={22} color={theme.onTint} />
            <ThemedText style={[styles.successText, { color: theme.onTint }]}>{t('sell_success')}</ThemedText>
            <Pressable
              onPress={() => router.push({ pathname: '/listing/[id]', params: { id: postedId } })}
              style={[styles.successBtn, { backgroundColor: theme.onTint }]}>
              <ThemedText style={{ color: theme.tint, fontWeight: '700' }}>{t('detail_details')}</ThemedText>
            </Pressable>
          </View>
        )}

        <Field label={t('sell_photos')} align={align}>
          <PhotoPicker images={images} onChange={setImages} />
        </Field>

        <Field label={t('sell_field_title')} align={align}>
          <TextInput value={title} onChangeText={setTitle} placeholder={t('sell_ph_title')} placeholderTextColor={theme.textSecondary} style={inputStyle} />
        </Field>

        <Field label={t('sell_field_desc')} align={align}>
          <TextInput
            value={desc}
            onChangeText={setDesc}
            placeholder={t('sell_ph_desc')}
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[inputStyle, styles.multiline]}
          />
        </Field>

        <Field label={t('sell_field_price')} align={align}>
          <TextInput value={price} onChangeText={setPrice} placeholder={t('sell_ph_price')} placeholderTextColor={theme.textSecondary} keyboardType="number-pad" style={inputStyle} />
          <View style={[styles.switchRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <ThemedText type="small">{t('sell_negotiable')}</ThemedText>
            <Switch value={negotiable} onValueChange={setNegotiable} trackColor={{ true: theme.tint, false: theme.border }} />
          </View>
        </Field>

        <Field label={t('sell_field_category')} align={align}>
          <SelectRow label={categoryId ? getCategory(categoryId)?.name[lang] ?? t('sell_choose') : t('sell_choose')} onPress={() => setPicker('category')} />
        </Field>

        <Field label={t('sell_field_governorate')} align={align}>
          <SelectRow label={governorateId ? getGovernorate(governorateId)?.name[lang] ?? t('sell_choose') : t('sell_choose')} onPress={() => setPicker('governorate')} />
        </Field>

        <Field label={t('sell_field_condition')} align={align}>
          <View style={[styles.segment, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {(['used', 'new'] as ListingCondition[]).map((c) => {
              const active = condition === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCondition(c)}
                  style={[
                    styles.segmentItem,
                    { borderColor: theme.border, backgroundColor: active ? theme.tint : theme.backgroundElement },
                  ]}>
                  <ThemedText style={{ color: active ? theme.onTint : theme.text, fontWeight: active ? '700' : '500' }}>
                    {c === 'new' ? t('cond_new') : t('cond_used')}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Field>

        {errorKey && (
          <ThemedText type="small" themeColor="danger" style={{ textAlign: align }}>
            {t(errorKey)}
          </ThemedText>
        )}

        <Pressable onPress={publish} style={[styles.publish, { backgroundColor: theme.tint }]}>
          <ThemedText style={{ color: theme.onTint, fontWeight: '800', fontSize: 16 }}>{t('sell_publish')}</ThemedText>
        </Pressable>
      </ScrollView>

      <PickerSheet visible={picker === 'category'} title={t('sell_field_category')} options={categoryOptions} selectedId={categoryId} onSelect={setCategoryId} onClose={() => setPicker(null)} />
      <PickerSheet visible={picker === 'governorate'} title={t('sell_field_governorate')} options={govOptions} selectedId={governorateId} onSelect={setGovernorateId} onClose={() => setPicker(null)} />
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

function SelectRow({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  const { isRTL } = useI18n();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.select,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}>
      <ThemedText>{label}</ThemedText>
      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  field: { gap: Spacing.one },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 15,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  switchRow: { alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.one },
  select: {
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  segment: { gap: Spacing.two },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  publish: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    marginTop: Spacing.two,
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  successText: { flex: 1, fontWeight: '700' },
  successBtn: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: Radius.sm },
});
