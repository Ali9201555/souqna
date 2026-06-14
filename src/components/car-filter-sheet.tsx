import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Motion, Radius, Shadow, Spacing } from '@/constants/theme';
import { GOVERNORATES, getGovernorate } from '@/data/governorates';
import { countVehicleFilters, matchesVehicleFilters, type VehicleFilters } from '@/data/section-filters';
import { VEHICLE_MAKES, getModelsForMake, getVehicleMake, getVehicleModel, modelLabel } from '@/data/vehicle-makes';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import { FUEL_LABEL, TRANSMISSION_LABEL } from '@/lib/attribute-labels';
import { groupThousands } from '@/lib/format';
import type { TKey } from '@/i18n/translations';
import type { FuelType, Listing, ListingCondition, Transmission } from '@/types';

type Page = 'main' | 'make' | 'model' | 'governorate';
const FUELS: FuelType[] = ['gasoline', 'diesel', 'hybrid', 'electric', 'lpg'];

/** Arabic/Kurdish keyboards can emit Eastern digits; normalize before parsing. */
function toAsciiDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}
function parseNum(value: string): number | undefined {
  const digits = toAsciiDigits(value).replace(/[^\d]/g, '');
  return digits ? Number(digits) : undefined;
}

/**
 * Full-featured car filter sheet. The stateful body remounts on each open
 * (conditional render) so the DRAFT re-seeds from the applied filters without a
 * reset effect. Make/model/governorate use in-sheet searchable sub-pages to
 * avoid stacked modals; the sheet shows a live result count and commits on
 * "Show N".
 */
export function CarFilterSheet({
  visible,
  base,
  initial,
  onApply,
  onClose,
}: {
  visible: boolean;
  base: Listing[];
  initial: VehicleFilters;
  onApply: (next: VehicleFilters) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={t('common_close')} onPress={onClose} />
        </Animated.View>
        {visible && <SheetBody base={base} initial={initial} onApply={onApply} onClose={onClose} />}
      </View>
    </Modal>
  );
}

function SheetBody({ base, initial, onApply, onClose }: { base: Listing[]; initial: VehicleFilters; onApply: (next: VehicleFilters) => void; onClose: () => void }) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { t, lang, isRTL } = useI18n();
  const align = isRTL ? 'right' : 'left';
  const rowDir = isRTL ? 'row-reverse' : 'row';

  const [draft, setDraft] = useState<VehicleFilters>(initial);
  const [page, setPage] = useState<Page>('main');
  const [search, setSearch] = useState('');

  const set = (patch: Partial<VehicleFilters>) => setDraft((d) => ({ ...d, ...patch }));
  const count = useMemo(() => base.filter((l) => matchesVehicleFilters(l, draft)).length, [base, draft]);
  const activeCount = countVehicleFilters(draft);

  const models = getModelsForMake(draft.make);
  const makeName = draft.make ? (getVehicleMake(draft.make)?.name[lang] ?? draft.make) : t('search_all');
  const modelName = draft.make && draft.model ? (getVehicleModel(draft.make, draft.model)?.[lang === 'en' ? 'en' : 'ar'] ?? draft.model) : t('search_all');
  const govName = draft.governorateId ? (getGovernorate(draft.governorateId)?.name[lang] ?? draft.governorateId) : t('search_all');

  const priceMinFmt = draft.price?.min != null ? groupThousands(draft.price.min) : '';
  const priceMaxFmt = draft.price?.max != null ? groupThousands(draft.price.max) : '';

  const goList = (p: Page) => {
    if (p === 'model' && (!draft.make || models.length === 0)) return;
    setSearch('');
    setPage(p);
  };

  const headerTitle =
    page === 'make' ? t('attr_vehicle_make') : page === 'model' ? t('attr_vehicle_model') : page === 'governorate' ? t('search_governorate') : t('filters_title');

  const filteredRows = useMemo(() => {
    const rows: { id: string | null; label: string }[] =
      page === 'make'
        ? [{ id: null, label: t('search_all') }, ...VEHICLE_MAKES.map((m) => ({ id: m.id, label: m.name[lang] }))]
        : page === 'model'
          ? [{ id: null, label: t('search_all') }, ...models.map((m) => ({ id: m.id, label: modelLabel(m, lang) }))]
          : page === 'governorate'
            ? [{ id: null, label: t('search_all') }, ...GOVERNORATES.map((g) => ({ id: g.id, label: g.name[lang] }))]
            : [];
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.label.toLowerCase().includes(q)) : rows;
  }, [page, search, lang, models, t]);

  const selectListRow = (id: string | null) => {
    if (page === 'make') set({ make: id ?? undefined, model: undefined });
    else if (page === 'model') set({ model: id ?? undefined });
    else if (page === 'governorate') set({ governorateId: id ?? undefined });
    setPage('main');
  };
  const currentListSelection = page === 'make' ? (draft.make ?? null) : page === 'model' ? (draft.model ?? null) : page === 'governorate' ? (draft.governorateId ?? null) : null;

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(Motion.spring.damping).stiffness(Motion.spring.stiffness).mass(Motion.spring.mass)}
      style={[
        styles.sheet,
        { backgroundColor: theme.surface, boxShadow: Shadow.float, paddingBottom: Math.max(insets.bottom, Spacing.three) },
        scheme === 'dark' && { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
      ]}>
      <View style={styles.handleRow}>
        <View style={[styles.handle, { backgroundColor: theme.border }]} />
      </View>

      <View style={[styles.headerRow, { flexDirection: rowDir }]}>
        {page !== 'main' ? (
          <PressableScale scaleTo={0.9} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common_close')} onPress={() => setPage('main')} style={[styles.iconBtn, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={18} color={theme.text} />
          </PressableScale>
        ) : (
          <View style={styles.iconBtn} />
        )}
        <ThemedText style={styles.title}>{headerTitle}</ThemedText>
        <PressableScale scaleTo={0.9} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common_close')} onPress={onClose} style={[styles.iconBtn, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="close" size={18} color={theme.textSecondary} />
        </PressableScale>
      </View>

      {page === 'main' ? (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Section label={t('attr_vehicle_make')} align={align}>
            <SelectRow label={makeName} active={draft.make != null} onPress={() => goList('make')} />
          </Section>
          {draft.make != null && models.length > 0 && (
            <Section label={t('attr_vehicle_model')} align={align}>
              <SelectRow label={modelName} active={draft.model != null} onPress={() => goList('model')} />
            </Section>
          )}

          <Section label={t('attr_vehicle_year')} align={align}>
            <View style={[styles.pair, { flexDirection: rowDir }]}>
              <NumberField value={draft.yearMin} placeholder={t('filter_from')} maxLength={4} onChange={(n) => set({ yearMin: n })} />
              <NumberField value={draft.yearMax} placeholder={t('filter_to')} maxLength={4} onChange={(n) => set({ yearMax: n })} />
            </View>
          </Section>

          <Section label={`${t('filter_price')} (${t('common_currency')})`} align={align}>
            <View style={[styles.pair, { flexDirection: rowDir }]}>
              <NumberField value={draft.price?.min} placeholder={t('filter_min')} onChange={(n) => set({ price: { ...draft.price, min: n } })} />
              <NumberField value={draft.price?.max} placeholder={t('filter_max')} onChange={(n) => set({ price: { ...draft.price, max: n } })} />
            </View>
            {(priceMinFmt || priceMaxFmt) !== '' && (
              <ThemedText type="small" themeColor="textSecondary" style={[styles.ltr, { textAlign: align }]}>
                {priceMinFmt || '0'} – {priceMaxFmt || '∞'}
              </ThemedText>
            )}
          </Section>

          <Section label={`${t('attr_vehicle_mileage')} (${t('unit_km')})`} align={align}>
            <NumberField value={draft.mileageMax} placeholder={t('filter_max')} onChange={(n) => set({ mileageMax: n })} />
          </Section>

          <Section label={t('attr_vehicle_trim')} align={align}>
            <TextField value={draft.trim ?? ''} placeholder={t('attr_ph_trim')} align={align} onChange={(v) => set({ trim: v || undefined })} />
          </Section>

          <Section label={t('attr_vehicle_transmission')} align={align}>
            <Segmented<Transmission> options={['automatic', 'manual']} labels={TRANSMISSION_LABEL} selected={draft.transmission} onSelect={(v) => set({ transmission: v })} />
          </Section>

          <Section label={t('attr_vehicle_fuel')} align={align}>
            <Chips items={FUELS} labels={FUEL_LABEL} selected={draft.fuel} onSelect={(v) => set({ fuel: v })} />
          </Section>

          <Section label={t('sell_field_condition')} align={align}>
            <Segmented<ListingCondition> options={['new', 'used']} labels={{ new: 'cond_new', used: 'cond_used' }} selected={draft.condition} onSelect={(v) => set({ condition: v })} />
          </Section>

          <Section label={t('search_governorate')} align={align}>
            <SelectRow label={govName} active={draft.governorateId != null} onPress={() => goList('governorate')} />
          </Section>
        </ScrollView>
      ) : (
        <>
          <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement, flexDirection: rowDir }]}>
            <Ionicons name="search" size={18} color={theme.textSecondary} />
            <TextInput value={search} onChangeText={setSearch} placeholder={t('search_placeholder')} placeholderTextColor={theme.textSecondary} autoCorrect={false} style={[styles.searchInput, { color: theme.text, textAlign: align }]} />
          </View>
          <ScrollView style={styles.body} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {filteredRows.map((r) => {
              const selected = r.id === currentListSelection;
              return (
                <PressableScale
                  key={String(r.id)}
                  scaleTo={0.98}
                  accessibilityRole="button"
                  accessibilityLabel={r.label}
                  accessibilityState={{ selected }}
                  onPress={() => selectListRow(r.id)}
                  style={[styles.option, { flexDirection: rowDir }, selected && { backgroundColor: theme.tintSoft }]}>
                  <ThemedText style={{ color: selected ? theme.tint : theme.text, fontWeight: selected ? '700' : '500', textAlign: align }}>{r.label}</ThemedText>
                  {selected && <Ionicons name="checkmark-circle" size={20} color={theme.tint} />}
                </PressableScale>
              );
            })}
          </ScrollView>
        </>
      )}

      {page === 'main' && (
        <View style={[styles.footer, { borderTopColor: theme.border, flexDirection: rowDir }]}>
          <PressableScale scaleTo={0.97} accessibilityRole="button" accessibilityLabel={t('filters_reset')} onPress={() => setDraft({})} style={[styles.resetBtn, { borderColor: theme.border }]}>
            <ThemedText style={{ fontWeight: '700', color: activeCount > 0 ? theme.text : theme.textSecondary }}>{t('filters_reset')}</ThemedText>
          </PressableScale>
          <PressableScale
            haptic
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLabel={t('filters_show', { count })}
            onPress={() => {
              onApply(draft);
              onClose();
            }}
            style={[styles.applyBtn, { backgroundColor: theme.tint, boxShadow: Shadow.fab }]}>
            <ThemedText style={{ color: theme.onTint, fontWeight: '800', fontSize: 16 }}>{t('filters_show', { count })}</ThemedText>
          </PressableScale>
        </View>
      )}
    </Animated.View>
  );
}

function Section({ label, align, children }: { label: string; align: 'left' | 'right'; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={{ textAlign: align }}>
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

function SelectRow({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  const theme = useTheme();
  const { isRTL } = useI18n();
  return (
    <PressableScale scaleTo={0.98} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.select, { backgroundColor: theme.backgroundElement, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <ThemedText style={{ fontWeight: active ? '700' : '500', color: active ? theme.tint : theme.text }}>{label}</ThemedText>
      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.textSecondary} />
    </PressableScale>
  );
}

function NumberField({ value, placeholder, maxLength, onChange }: { value?: number; placeholder?: string; maxLength?: number; onChange: (n: number | undefined) => void }) {
  const theme = useTheme();
  return (
    <TextInput
      value={value != null ? String(value) : ''}
      onChangeText={(v) => onChange(parseNum(v))}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      keyboardType="number-pad"
      maxLength={maxLength}
      style={[styles.input, styles.ltr, { color: theme.text, backgroundColor: theme.backgroundElement }]}
    />
  );
}

function TextField({ value, placeholder, align, onChange }: { value: string; placeholder?: string; align: 'left' | 'right'; onChange: (v: string) => void }) {
  const theme = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      autoCorrect={false}
      style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, textAlign: align }]}
    />
  );
}

function Segmented<T extends string>({ options, labels, selected, onSelect }: { options: T[]; labels: Record<T, TKey>; selected: T | undefined; onSelect: (v: T | undefined) => void }) {
  const { t, isRTL } = useI18n();
  const theme = useTheme();
  return (
    <View style={[styles.segment, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {options.map((option) => {
        const active = selected === option;
        return (
          <PressableScale
            key={option}
            haptic
            scaleTo={0.96}
            accessibilityRole="button"
            accessibilityLabel={t(labels[option])}
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(active ? undefined : option)}
            style={[styles.segmentItem, { backgroundColor: active ? theme.tint : theme.backgroundElement }]}>
            <ThemedText style={{ color: active ? theme.onTint : theme.text, fontWeight: active ? '700' : '500' }}>{t(labels[option])}</ThemedText>
          </PressableScale>
        );
      })}
    </View>
  );
}

function Chips<T extends string>({ items, labels, selected, onSelect }: { items: T[]; labels: Record<T, TKey>; selected: T | undefined; onSelect: (v: T | undefined) => void }) {
  const { t, isRTL } = useI18n();
  const theme = useTheme();
  return (
    <View style={[styles.chipWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {items.map((item) => {
        const active = selected === item;
        return (
          <PressableScale
            key={item}
            haptic
            scaleTo={0.94}
            accessibilityRole="button"
            accessibilityLabel={t(labels[item])}
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(active ? undefined : item)}
            style={[styles.chip, { backgroundColor: active ? theme.tintSoft : theme.backgroundElement, borderColor: active ? theme.tint : 'transparent' }]}>
            <ThemedText type="small" style={{ color: active ? theme.tint : theme.text, fontWeight: active ? '700' : '500' }}>{t(labels[item])}</ThemedText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { maxHeight: '92%', borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl },
  handleRow: { alignItems: 'center', paddingVertical: Spacing.two },
  handle: { width: 44, height: 5, borderRadius: Radius.pill },
  headerRow: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800' },
  iconBtn: { width: 32, height: 32, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  body: { flexShrink: 1 },
  bodyContent: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, gap: Spacing.three },
  section: { gap: Spacing.one + 2 },
  select: { alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.lg, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  pair: { gap: Spacing.two },
  input: { flex: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, fontSize: 15 },
  ltr: { textAlign: 'left', writingDirection: 'ltr' },
  segment: { gap: Spacing.two },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.three, borderRadius: Radius.pill },
  chipWrap: { flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.pill, borderWidth: StyleSheet.hairlineWidth },
  searchBox: { alignItems: 'center', gap: Spacing.two, marginHorizontal: Spacing.three, marginBottom: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: Radius.lg },
  searchInput: { flex: 1, paddingVertical: Spacing.three, fontSize: 15 },
  listContent: { paddingHorizontal: Spacing.two, paddingBottom: Spacing.three, gap: Spacing.half },
  option: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, borderRadius: Radius.lg },
  footer: { alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
  resetBtn: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderRadius: Radius.pill, borderWidth: StyleSheet.hairlineWidth },
  applyBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.three, borderRadius: Radius.pill },
});
