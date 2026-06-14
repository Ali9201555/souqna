import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, TextInput, View, type TextInputProps } from 'react-native';

import { PickerSheet, type PickerOption } from '@/components/picker-sheet';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { CUISINES, DIET_TAGS, DISH_TYPES } from '@/data/cuisines';
import { VEHICLE_MAKES, getModelsForMake, getVehicleMake, getVehicleModel, modelLabel } from '@/data/vehicle-makes';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import { DEAL_TYPE_LABEL, FULFILLMENT_LABEL, FUEL_LABEL, PROPERTY_TYPE_LABEL, TRANSMISSION_LABEL } from '@/lib/attribute-labels';
import { parseIntField } from '@/lib/format';
import type { TKey } from '@/i18n/translations';
import type {
  DealType,
  FoodAttributes,
  Fulfillment,
  FuelType,
  ListingAttributes,
  PropertyAttributes,
  PropertyType,
  Transmission,
  VehicleAttributes,
} from '@/types';

/** Focused inputs get a tint ring; unfocused sit borderless on the element fill (matches the Sell form). */
const INPUT_BORDER_WIDTH = 1.5;

/**
 * Category-specific structured inputs for the Sell form. Renders nothing for
 * categories without a section. All fields are optional — better a listing
 * with fewer facts than an abandoned post.
 */
export function AttributeFields({
  value,
  onChange,
}: {
  value: ListingAttributes | undefined;
  onChange: (next: ListingAttributes) => void;
}) {
  if (value?.kind === 'vehicle') return <VehicleFields value={value} onChange={onChange} />;
  if (value?.kind === 'property') return <PropertyFields value={value} onChange={onChange} />;
  if (value?.kind === 'food') return <FoodFields value={value} onChange={onChange} />;
  return null;
}

function FoodFields({ value, onChange }: { value: FoodAttributes; onChange: (next: FoodAttributes) => void }) {
  const { t, lang, isRTL } = useI18n();
  const theme = useTheme();
  const [showCuisine, setShowCuisine] = useState(false);
  const [showDish, setShowDish] = useState(false);
  const align = isRTL ? 'right' : 'left';

  const cuisineOptions: PickerOption[] = CUISINES.map((c) => ({ id: c.id, label: c.name[lang] }));
  const dishOptions: PickerOption[] = DISH_TYPES.map((d) => ({ id: d.id, label: d.name[lang] }));
  const cuisineLabel = value.cuisine ? (CUISINES.find((c) => c.id === value.cuisine)?.name[lang] ?? t('sell_choose')) : t('sell_choose');
  const dishLabel = value.dishType ? (DISH_TYPES.find((d) => d.id === value.dishType)?.name[lang] ?? t('sell_choose')) : t('sell_choose');

  const toggleDiet = (id: string) => {
    const set = new Set(value.diet ?? []);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange({ ...value, diet: set.size ? [...set] : undefined });
  };

  return (
    <>
      <Labeled label={t('attr_cuisine')} align={align}>
        <SelectRow label={cuisineLabel} onPress={() => setShowCuisine(true)} />
      </Labeled>

      <Labeled label={t('attr_dishType')} align={align}>
        <SelectRow label={dishLabel} onPress={() => setShowDish(true)} />
      </Labeled>

      <View style={[styles.pairRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.pairItem}>
          <Labeled label={t('attr_servings')} align={align}>
            <FocusInput
              value={value.servings != null ? String(value.servings) : ''}
              onChangeText={(v) => onChange({ ...value, servings: parseIntField(v) })}
              placeholder={t('attr_ph_servings')}
              keyboardType="number-pad"
              maxLength={3}
              style={styles.ltrDigits}
            />
          </Labeled>
        </View>
        <View style={styles.pairItem}>
          <Labeled label={t('attr_leadTime')} align={align}>
            <FocusInput
              value={value.leadTimeHours != null ? String(value.leadTimeHours) : ''}
              onChangeText={(v) => onChange({ ...value, leadTimeHours: parseIntField(v) })}
              placeholder={t('attr_ph_leadTime')}
              keyboardType="number-pad"
              maxLength={3}
              style={styles.ltrDigits}
            />
          </Labeled>
        </View>
      </View>

      <Labeled label={t('attr_fulfillment')} align={align}>
        <Segmented<Fulfillment>
          options={['pickup', 'delivery', 'both']}
          labels={FULFILLMENT_LABEL}
          selected={value.fulfillment}
          onSelect={(fulfillment) => onChange({ ...value, fulfillment })}
        />
      </Labeled>

      <Labeled label={t('attr_diet')} align={align}>
        <View style={styles.dietWrap}>
          {DIET_TAGS.map((tag) => {
            const active = (value.diet ?? []).includes(tag.id);
            return (
              <PressableScale
                key={tag.id}
                haptic
                scaleTo={0.94}
                accessibilityRole="button"
                accessibilityLabel={tag.name[lang]}
                accessibilityState={{ selected: active }}
                onPress={() => toggleDiet(tag.id)}
                style={[styles.dietChip, { backgroundColor: active ? theme.tintSoft : theme.backgroundElement, borderColor: active ? theme.tint : 'transparent' }]}>
                <ThemedText type="small" style={{ color: active ? theme.tint : theme.text, fontWeight: active ? '700' : '500' }}>
                  {tag.name[lang]}
                </ThemedText>
              </PressableScale>
            );
          })}
        </View>
      </Labeled>

      <PickerSheet visible={showCuisine} title={t('attr_cuisine')} options={cuisineOptions} selectedId={value.cuisine ?? null} onSelect={(id) => onChange({ ...value, cuisine: id ?? undefined })} onClose={() => setShowCuisine(false)} />
      <PickerSheet visible={showDish} title={t('attr_dishType')} options={dishOptions} selectedId={value.dishType ?? null} onSelect={(id) => onChange({ ...value, dishType: id ?? undefined })} onClose={() => setShowDish(false)} />
    </>
  );
}

const MODEL_OTHER = '__other__';

function VehicleFields({ value, onChange }: { value: VehicleAttributes; onChange: (next: VehicleAttributes) => void }) {
  const { t, lang, isRTL } = useI18n();
  const [showMake, setShowMake] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [showFuel, setShowFuel] = useState(false);
  const align = isRTL ? 'right' : 'left';

  const makeOptions: PickerOption[] = VEHICLE_MAKES.map((m) => ({ id: m.id, label: m.name[lang] }));
  const fuelOptions: PickerOption[] = (Object.keys(FUEL_LABEL) as FuelType[]).map((f) => ({ id: f, label: t(FUEL_LABEL[f]) }));

  const models = getModelsForMake(value.make);
  const modelOptions: PickerOption[] = [
    ...models.map((m) => ({ id: m.id, label: modelLabel(m, lang) })),
    { id: MODEL_OTHER, label: t('attr_model_other') },
  ];
  // A listed model resolves to a known entry; anything else (incl. free text)
  // is treated as a custom model and edited as text.
  const known = value.make && value.model ? getVehicleModel(value.make, value.model) : undefined;
  const [customModel, setCustomModel] = useState(Boolean(value.model && !known));
  const isCustom = customModel || (value.model != null && !known);

  const selectMake = (id: string | null) => {
    setCustomModel(false);
    // Changing make invalidates the model — clear it.
    onChange({ ...value, make: id ?? undefined, model: undefined });
  };
  const selectModel = (id: string | null) => {
    if (id === MODEL_OTHER) {
      setCustomModel(true);
      onChange({ ...value, model: undefined });
    } else {
      setCustomModel(false);
      onChange({ ...value, model: id ?? undefined });
    }
  };

  const modelButtonLabel = isCustom
    ? t('attr_model_other')
    : known
      ? modelLabel(known, lang)
      : t('sell_choose');

  return (
    <>
      <Labeled label={t('attr_vehicle_make')} align={align}>
        <SelectRow
          label={value.make ? (getVehicleMake(value.make)?.name[lang] ?? t('sell_choose')) : t('sell_choose')}
          onPress={() => setShowMake(true)}
        />
      </Labeled>

      <Labeled label={t('attr_vehicle_model')} align={align}>
        {value.make && models.length > 0 ? (
          <SelectRow label={modelButtonLabel} onPress={() => setShowModel(true)} />
        ) : null}
        {(!value.make || models.length === 0 || isCustom) && (
          <FocusInput
            value={value.model ?? ''}
            onChangeText={(v) => onChange({ ...value, model: v || undefined })}
            placeholder={t('attr_ph_model')}
            style={{ textAlign: align }}
          />
        )}
      </Labeled>

      <Labeled label={t('attr_vehicle_trim')} align={align}>
        <FocusInput
          value={value.trim ?? ''}
          onChangeText={(v) => onChange({ ...value, trim: v || undefined })}
          placeholder={t('attr_ph_trim')}
          style={{ textAlign: align }}
        />
      </Labeled>

      <View style={[styles.pairRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.pairItem}>
          <Labeled label={t('attr_vehicle_year')} align={align}>
            <FocusInput
              value={value.year != null ? String(value.year) : ''}
              onChangeText={(v) => onChange({ ...value, year: parseIntField(v) })}
              placeholder={t('attr_ph_year')}
              keyboardType="number-pad"
              maxLength={4}
              style={styles.ltrDigits}
            />
          </Labeled>
        </View>
        <View style={styles.pairItem}>
          <Labeled label={t('attr_vehicle_mileage')} align={align}>
            <FocusInput
              value={value.mileageKm != null ? String(value.mileageKm) : ''}
              onChangeText={(v) => onChange({ ...value, mileageKm: parseIntField(v) })}
              placeholder={t('attr_ph_mileage')}
              keyboardType="number-pad"
              style={styles.ltrDigits}
            />
          </Labeled>
        </View>
      </View>

      <Labeled label={t('attr_vehicle_transmission')} align={align}>
        <Segmented<Transmission>
          options={['automatic', 'manual']}
          labels={TRANSMISSION_LABEL}
          selected={value.transmission}
          onSelect={(transmission) => onChange({ ...value, transmission })}
        />
      </Labeled>

      <Labeled label={t('attr_vehicle_fuel')} align={align}>
        <SelectRow label={value.fuel ? t(FUEL_LABEL[value.fuel]) : t('sell_choose')} onPress={() => setShowFuel(true)} />
      </Labeled>

      <PickerSheet
        visible={showMake}
        title={t('attr_vehicle_make')}
        options={makeOptions}
        selectedId={value.make ?? null}
        onSelect={selectMake}
        onClose={() => setShowMake(false)}
      />
      <PickerSheet
        visible={showModel}
        title={t('attr_vehicle_model')}
        options={modelOptions}
        selectedId={isCustom ? MODEL_OTHER : (value.model ?? null)}
        onSelect={selectModel}
        onClose={() => setShowModel(false)}
      />
      <PickerSheet
        visible={showFuel}
        title={t('attr_vehicle_fuel')}
        options={fuelOptions}
        selectedId={value.fuel ?? null}
        onSelect={(id) => onChange({ ...value, fuel: (id as FuelType | null) ?? undefined })}
        onClose={() => setShowFuel(false)}
      />
    </>
  );
}

function PropertyFields({ value, onChange }: { value: PropertyAttributes; onChange: (next: PropertyAttributes) => void }) {
  const { t, isRTL } = useI18n();
  const theme = useTheme();
  const [showType, setShowType] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locDenied, setLocDenied] = useState(false);
  const align = isRTL ? 'right' : 'left';

  // No formal addresses in Iraq → the owner drops a GPS pin from where they are.
  const captureLocation = async () => {
    if (locating) return;
    setLocating(true);
    setLocDenied(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocDenied(true);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      onChange({ ...value, lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setLocDenied(true);
    } finally {
      setLocating(false);
    }
  };
  const hasPin = value.lat != null && value.lng != null;

  const typeOptions: PickerOption[] = (Object.keys(PROPERTY_TYPE_LABEL) as PropertyType[]).map((p) => ({
    id: p,
    label: t(PROPERTY_TYPE_LABEL[p]),
  }));

  return (
    <>
      <Labeled label={t('attr_deal_type')} align={align}>
        <Segmented<DealType>
          options={['sale', 'rent']}
          labels={DEAL_TYPE_LABEL}
          selected={value.dealType}
          onSelect={(dealType) => onChange({ ...value, dealType })}
        />
      </Labeled>

      <Labeled label={t('attr_property_type')} align={align}>
        <SelectRow
          label={value.propertyType ? t(PROPERTY_TYPE_LABEL[value.propertyType]) : t('sell_choose')}
          onPress={() => setShowType(true)}
        />
      </Labeled>

      <View style={[styles.pairRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.pairItem}>
          <Labeled label={t('attr_bedrooms')} align={align}>
            <FocusInput
              value={value.bedrooms != null ? String(value.bedrooms) : ''}
              onChangeText={(v) => onChange({ ...value, bedrooms: parseIntField(v) })}
              keyboardType="number-pad"
              maxLength={2}
              style={styles.ltrDigits}
            />
          </Labeled>
        </View>
        <View style={styles.pairItem}>
          <Labeled label={t('attr_bathrooms')} align={align}>
            <FocusInput
              value={value.bathrooms != null ? String(value.bathrooms) : ''}
              onChangeText={(v) => onChange({ ...value, bathrooms: parseIntField(v) })}
              keyboardType="number-pad"
              maxLength={2}
              style={styles.ltrDigits}
            />
          </Labeled>
        </View>
      </View>

      <Labeled label={t('attr_area')} align={align}>
        <FocusInput
          value={value.areaM2 != null ? String(value.areaM2) : ''}
          onChangeText={(v) => onChange({ ...value, areaM2: parseIntField(v) })}
          placeholder={t('attr_ph_area')}
          keyboardType="number-pad"
          style={styles.ltrDigits}
        />
      </Labeled>

      <View style={[styles.switchRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <ThemedText type="small">{t('attr_furnished')}</ThemedText>
        <Switch
          value={value.furnished ?? false}
          onValueChange={(furnished) => onChange({ ...value, furnished })}
          trackColor={{ true: theme.tint, false: theme.border }}
        />
      </View>

      <Labeled label={t('attr_location')} align={align}>
        <PressableScale
          haptic
          scaleTo={0.98}
          disabled={locating}
          accessibilityRole="button"
          accessibilityLabel={t(hasPin ? 'loc_captured' : 'loc_useCurrent')}
          onPress={() => void captureLocation()}
          style={[
            styles.locateBtn,
            { backgroundColor: hasPin ? theme.backgroundElement : theme.tint, flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}>
          {locating ? (
            <ActivityIndicator color={hasPin ? theme.text : theme.onTint} />
          ) : (
            <>
              <Ionicons name={hasPin ? 'checkmark-circle' : 'locate'} size={18} color={hasPin ? theme.tint : theme.onTint} />
              <ThemedText style={{ color: hasPin ? theme.text : theme.onTint, fontWeight: '700' }}>
                {t(hasPin ? 'loc_captured' : 'loc_useCurrent')}
              </ThemedText>
            </>
          )}
        </PressableScale>
        {locDenied && (
          <ThemedText type="small" themeColor="danger" style={{ textAlign: align }}>
            {t('loc_denied')}
          </ThemedText>
        )}
        {hasPin && (
          <View style={[styles.switchRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <ThemedText type="small">{t('loc_showExact')}</ThemedText>
            <Switch
              value={!value.hideExactLocation}
              onValueChange={(showExact) => onChange({ ...value, hideExactLocation: showExact ? undefined : true })}
              trackColor={{ true: theme.tint, false: theme.border }}
            />
          </View>
        )}
      </Labeled>

      <PickerSheet
        visible={showType}
        title={t('attr_property_type')}
        options={typeOptions}
        selectedId={value.propertyType ?? null}
        onSelect={(id) => onChange({ ...value, propertyType: (id as PropertyType | null) ?? undefined })}
        onClose={() => setShowType(false)}
      />
    </>
  );
}

function Labeled({ label, align, children }: { label: string; align: 'left' | 'right'; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" style={{ textAlign: align }}>
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

/** Text input on the element fill; focus swaps the transparent ring for tint (matches the Sell form). */
function FocusInput({ style, onFocus, onBlur, ...rest }: TextInputProps) {
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

function Segmented<T extends string>({
  options,
  labels,
  selected,
  onSelect,
}: {
  options: T[];
  labels: Record<T, TKey>;
  selected: T | undefined;
  onSelect: (value: T) => void;
}) {
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
            scaleTo={0.95}
            accessibilityRole="button"
            accessibilityLabel={t(labels[option])}
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(option)}
            style={[styles.segmentItem, { backgroundColor: active ? theme.tint : theme.backgroundElement }]}>
            <ThemedText style={{ color: active ? theme.onTint : theme.text, fontWeight: active ? '700' : '500' }}>
              {t(labels[option])}
            </ThemedText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  input: {
    borderWidth: INPUT_BORDER_WIDTH,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 15,
  },
  // Numbers stay LTR even in an RTL UI.
  ltrDigits: { textAlign: 'left', writingDirection: 'ltr' },
  pairRow: { gap: Spacing.two },
  pairItem: { flex: 1 },
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
  switchRow: { alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.one },
  locateBtn: { alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingVertical: Spacing.three, borderRadius: Radius.pill, minHeight: 48 },
  dietWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  dietChip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.pill, borderWidth: StyleSheet.hairlineWidth },
});
