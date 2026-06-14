import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Switch, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AttributeFields } from '@/components/attribute-fields';
import { AuthGate } from '@/components/auth-gate';
import { PickerSheet, type PickerOption } from '@/components/picker-sheet';
import { PhotoPicker } from '@/components/photo-picker';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Radius, Shadow, Spacing } from '@/constants/theme';
import { CATEGORIES, getCategory } from '@/data/categories';
import { GOVERNORATES, getGovernorate } from '@/data/governorates';
import { useListings } from '@/data/ListingsProvider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import { hapticImpact } from '@/lib/haptics';
import {
  checkPostRateLimit,
  parsePostTimestamps,
  POST_TIMESTAMPS_KEY,
  validateListingDraft,
  type ListingDraftError,
} from '@/lib/trust/posting-guardrails';
import { toAsciiDigits } from '@/lib/format';
import type { TKey } from '@/i18n/translations';
import type { ListingAttributes, ListingCondition } from '@/types';

/** Focused inputs get a tint ring; unfocused sit borderless on the element fill. */
const INPUT_BORDER_WIDTH = 1.5;
/** Cap the section entrance stagger so the form never feels sluggish (precedent: listing-card). */
const MAX_STAGGER_INDEX = 8;

/** Empty attribute shell for categories that collect structured facts. */
function attributeShell(categoryId: string | null): ListingAttributes | undefined {
  if (categoryId === 'vehicles') return { kind: 'vehicle' };
  if (categoryId === 'realestate') return { kind: 'property', dealType: 'sale' };
  if (categoryId === 'food') return { kind: 'food', fulfillment: 'pickup' };
  return undefined;
}

export default function SellScreen() {
  const { createListing } = useListings();
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
  const [attributes, setAttributes] = useState<ListingAttributes | undefined>(undefined);
  const [images, setImages] = useState<string[]>([]);
  const [picker, setPicker] = useState<null | 'category' | 'governorate'>(null);
  const [errorKey, setErrorKey] = useState<TKey | null>(null);
  const [submitError, setSubmitError] = useState(false);
  const [posting, setPosting] = useState(false);
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
    if (posting) return;
    const priceNum = parseInt(toAsciiDigits(price).replace(/[^\d]/g, ''), 10);
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

    setErrorKey(null);
    setSubmitError(false);
    setPosting(true);
    try {
      const listing = await createListing({
        title: title.trim(),
        description: desc.trim(),
        priceIqd: priceNum,
        negotiable,
        categoryId,
        governorateId,
        condition,
        attributes,
        images: images.length ? images : [`https://picsum.photos/seed/new-${Date.now()}/800/600`],
      });
      // Count toward the rate limit only on success — a failed network publish
      // shouldn't burn the daily posting quota.
      setPostTimestamps(limit.timestamps);
      AsyncStorage.setItem(POST_TIMESTAMPS_KEY, JSON.stringify(limit.timestamps)).catch(() => undefined);
      setPostedId(listing.id);
      // Reset only on success — a failed publish keeps the draft for retry.
      setTitle('');
      setDesc('');
      setPrice('');
      setNegotiable(false);
      setCategoryId(null);
      setGovernorateId(null);
      setCondition('used');
      setAttributes(undefined);
      setImages([]);
    } catch {
      setSubmitError(true);
    } finally {
      setPosting(false);
    }
  };

  const categoryOptions: PickerOption[] = CATEGORIES.map((c) => ({ id: c.id, label: c.name[lang] }));
  const govOptions: PickerOption[] = GOVERNORATES.map((g) => ({ id: g.id, label: g.name[lang] }));
  const gradientStart = isRTL ? { x: 1, y: 0 } : { x: 0, y: 0 };
  const gradientEnd = isRTL ? { x: 0, y: 1 } : { x: 1, y: 1 };

  return (
    <Screen title={t('sell_title')}>
      <AuthGate title={t('gate_sell_title')} message={t('gate_sell_message')}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {postedId && (
          <Animated.View entering={FadeInDown.duration(360)} style={[styles.successCard, { boxShadow: Shadow.card }]}>
            <LinearGradient
              colors={[theme.tint, theme.accent]}
              start={gradientStart}
              end={gradientEnd}
              style={[styles.successInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="checkmark-circle" size={22} color={theme.onTint} />
              <ThemedText style={[styles.successText, { color: theme.onTint, textAlign: align }]}>
                {t('sell_success')}
              </ThemedText>
              <PressableScale
                haptic
                scaleTo={0.92}
                accessibilityRole="button"
                accessibilityLabel={t('detail_details')}
                onPress={() => router.push({ pathname: '/listing/[id]', params: { id: postedId } })}
                style={[styles.successBtn, { backgroundColor: theme.onTint }]}>
                <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>
                  {t('detail_details')}
                </ThemedText>
              </PressableScale>
            </LinearGradient>
          </Animated.View>
        )}

        <SectionCard title={t('sell_photos')} align={align} index={0}>
          <PhotoPicker images={images} onChange={setImages} />
        </SectionCard>

        <SectionCard align={align} index={1}>
          <Field label={t('sell_field_title')} align={align}>
            <FormInput value={title} onChangeText={setTitle} placeholder={t('sell_ph_title')} style={{ textAlign: align }} />
          </Field>
          <Field label={t('sell_field_desc')} align={align}>
            <FormInput
              value={desc}
              onChangeText={setDesc}
              placeholder={t('sell_ph_desc')}
              multiline
              style={[styles.multiline, { textAlign: align }]}
            />
          </Field>
        </SectionCard>

        <SectionCard title={t('sell_field_price')} align={align} index={2}>
          <FormInput
            value={price}
            onChangeText={setPrice}
            placeholder={t('sell_ph_price')}
            keyboardType="number-pad"
            style={{ textAlign: align }}
          />
          <View style={[styles.switchRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <ThemedText type="small">{t('sell_negotiable')}</ThemedText>
            <Switch value={negotiable} onValueChange={setNegotiable} trackColor={{ true: theme.tint, false: theme.border }} />
          </View>
        </SectionCard>

        <SectionCard align={align} index={3}>
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
                  <PressableScale
                    key={c}
                    haptic
                    scaleTo={0.95}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setCondition(c)}
                    style={[styles.segmentItem, { backgroundColor: active ? theme.tint : theme.backgroundElement }]}>
                    <ThemedText style={{ color: active ? theme.onTint : theme.text, fontWeight: active ? '700' : '500' }}>
                      {c === 'new' ? t('cond_new') : t('cond_used')}
                    </ThemedText>
                  </PressableScale>
                );
              })}
            </View>
          </Field>
        </SectionCard>

        {attributes && (
          <SectionCard title={categoryId ? getCategory(categoryId)?.name[lang] : undefined} align={align} index={4}>
            <AttributeFields value={attributes} onChange={setAttributes} />
          </SectionCard>
        )}

        {errorKey && (
          <Animated.View entering={FadeInDown.duration(240)}>
            <ThemedText type="small" themeColor="danger" style={{ textAlign: align }}>
              {t(errorKey)}
            </ThemedText>
          </Animated.View>
        )}
        {submitError && (
          <Animated.View entering={FadeInDown.duration(240)}>
            <ThemedText type="small" themeColor="danger" style={{ textAlign: align }}>
              {t('sell_error')}
            </ThemedText>
          </Animated.View>
        )}

        <PressableScale
          scaleTo={0.97}
          accessibilityRole="button"
          accessibilityLabel={posting ? t('sell_posting') : t('sell_publish')}
          onPress={() => {
            hapticImpact();
            void publish();
          }}
          disabled={posting}
          style={[styles.publish, { boxShadow: Shadow.fab, opacity: posting ? 0.6 : 1 }]}>
          <LinearGradient colors={[theme.tint, theme.accent]} start={gradientStart} end={gradientEnd} style={styles.publishInner}>
            <ThemedText style={{ color: theme.onTint, fontWeight: '800', fontSize: 16 }}>
              {posting ? t('sell_posting') : t('sell_publish')}
            </ThemedText>
          </LinearGradient>
        </PressableScale>
      </ScrollView>

      <PickerSheet
        visible={picker === 'category'}
        title={t('sell_field_category')}
        options={categoryOptions}
        selectedId={categoryId}
        onSelect={(id) => {
          setCategoryId(id);
          // Switching category swaps the structured-facts form; stale facts
          // from another category must never ride along.
          setAttributes(attributeShell(id));
        }}
        onClose={() => setPicker(null)}
      />
      <PickerSheet visible={picker === 'governorate'} title={t('sell_field_governorate')} options={govOptions} selectedId={governorateId} onSelect={setGovernorateId} onClose={() => setPicker(null)} />
      </AuthGate>
    </Screen>
  );
}

/** Floating white card grouping one form section, with a staggered entrance. */
function SectionCard({
  title,
  align,
  index,
  children,
}: {
  title?: string;
  align: 'left' | 'right';
  index: number;
  children: ReactNode;
}) {
  const theme = useTheme();
  const scheme = useColorScheme();
  return (
    <Animated.View
      entering={FadeInDown.duration(360).delay(Math.min(index, MAX_STAGGER_INDEX) * 55)}
      style={[
        styles.card,
        { backgroundColor: theme.surface, boxShadow: Shadow.card },
        scheme === 'dark' && { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
      ]}>
      {title != null && (
        <ThemedText style={[styles.cardTitle, { textAlign: align }]}>{title}</ThemedText>
      )}
      {children}
    </Animated.View>
  );
}

function Field({ label, align, children }: { label: string; align: 'left' | 'right'; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" style={{ textAlign: align }}>
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

/** Text input on the element fill; focus swaps the transparent ring for tint. */
function FormInput({ style, onFocus, onBlur, ...rest }: TextInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      {...rest}
      placeholderTextColor={theme.textSecondary}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[
        styles.input,
        {
          color: theme.text,
          backgroundColor: theme.backgroundElement,
          borderColor: focused ? theme.tint : 'transparent',
        },
        style,
      ]}
    />
  );
}

function SelectRow({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  const { isRTL } = useI18n();
  return (
    <PressableScale
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.select,
        { backgroundColor: theme.backgroundElement, flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}>
      <ThemedText>{label}</ThemedText>
      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.textSecondary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.three },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  field: { gap: Spacing.one },
  input: {
    borderWidth: INPUT_BORDER_WIDTH,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 15,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  switchRow: { alignItems: 'center', justifyContent: 'space-between' },
  select: {
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  segment: { gap: Spacing.two },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.pill,
  },
  publish: {
    borderRadius: Radius.pill,
    marginTop: Spacing.two,
  },
  publishInner: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.pill,
  },
  successCard: { borderRadius: Radius.xl },
  successInner: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.xl,
  },
  successText: { flex: 1, fontWeight: '700' },
  successBtn: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: Radius.pill },
});
