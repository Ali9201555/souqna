import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View, type StyleProp, type TextStyle } from 'react-native';

import { PickerSheet, type PickerOption } from '@/components/picker-sheet';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { VEHICLE_MAKES, getVehicleMake } from '@/data/vehicle-makes';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import { parseIntField } from '@/lib/format';
import type { TKey } from '@/i18n/translations';
import type {
  DealType,
  FuelType,
  ListingAttributes,
  PropertyAttributes,
  PropertyType,
  Transmission,
  VehicleAttributes,
} from '@/types';

export const FUEL_LABEL: Record<FuelType, TKey> = {
  gasoline: 'attr_fuel_gasoline',
  diesel: 'attr_fuel_diesel',
  hybrid: 'attr_fuel_hybrid',
  electric: 'attr_fuel_electric',
  lpg: 'attr_fuel_lpg',
};

export const PROPERTY_TYPE_LABEL: Record<PropertyType, TKey> = {
  house: 'attr_prop_house',
  apartment: 'attr_prop_apartment',
  land: 'attr_prop_land',
  commercial: 'attr_prop_commercial',
  farm: 'attr_prop_farm',
};

export const TRANSMISSION_LABEL: Record<Transmission, TKey> = {
  automatic: 'attr_trans_automatic',
  manual: 'attr_trans_manual',
};

export const DEAL_TYPE_LABEL: Record<DealType, TKey> = {
  sale: 'attr_deal_sale',
  rent: 'attr_deal_rent',
};

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
  return null;
}

function VehicleFields({ value, onChange }: { value: VehicleAttributes; onChange: (next: VehicleAttributes) => void }) {
  const { t, lang, isRTL } = useI18n();
  const theme = useTheme();
  const [showMake, setShowMake] = useState(false);
  const [showFuel, setShowFuel] = useState(false);
  const align = isRTL ? 'right' : 'left';
  const inputStyle: StyleProp<TextStyle> = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border, textAlign: align },
  ];

  const makeOptions: PickerOption[] = VEHICLE_MAKES.map((m) => ({ id: m.id, label: m.name[lang] }));
  const fuelOptions: PickerOption[] = (Object.keys(FUEL_LABEL) as FuelType[]).map((f) => ({ id: f, label: t(FUEL_LABEL[f]) }));

  return (
    <>
      <Labeled label={t('attr_vehicle_make')} align={align}>
        <SelectRow
          label={value.make ? (getVehicleMake(value.make)?.name[lang] ?? t('sell_choose')) : t('sell_choose')}
          onPress={() => setShowMake(true)}
        />
      </Labeled>

      <Labeled label={t('attr_vehicle_model')} align={align}>
        <TextInput
          value={value.model ?? ''}
          onChangeText={(v) => onChange({ ...value, model: v || undefined })}
          placeholder={t('attr_ph_model')}
          placeholderTextColor={theme.textSecondary}
          style={inputStyle}
        />
      </Labeled>

      <View style={[styles.pairRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.pairItem}>
          <Labeled label={t('attr_vehicle_year')} align={align}>
            <TextInput
              value={value.year != null ? String(value.year) : ''}
              onChangeText={(v) => onChange({ ...value, year: parseIntField(v) })}
              placeholder={t('attr_ph_year')}
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={4}
              style={[inputStyle, styles.ltrDigits]}
            />
          </Labeled>
        </View>
        <View style={styles.pairItem}>
          <Labeled label={t('attr_vehicle_mileage')} align={align}>
            <TextInput
              value={value.mileageKm != null ? String(value.mileageKm) : ''}
              onChangeText={(v) => onChange({ ...value, mileageKm: parseIntField(v) })}
              placeholder={t('attr_ph_mileage')}
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              style={[inputStyle, styles.ltrDigits]}
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
        onSelect={(id) => onChange({ ...value, make: id ?? undefined })}
        onClose={() => setShowMake(false)}
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
  const align = isRTL ? 'right' : 'left';
  const inputStyle: StyleProp<TextStyle> = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border, textAlign: align },
  ];

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
            <TextInput
              value={value.bedrooms != null ? String(value.bedrooms) : ''}
              onChangeText={(v) => onChange({ ...value, bedrooms: parseIntField(v) })}
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={2}
              style={[inputStyle, styles.ltrDigits]}
            />
          </Labeled>
        </View>
        <View style={styles.pairItem}>
          <Labeled label={t('attr_bathrooms')} align={align}>
            <TextInput
              value={value.bathrooms != null ? String(value.bathrooms) : ''}
              onChangeText={(v) => onChange({ ...value, bathrooms: parseIntField(v) })}
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={2}
              style={[inputStyle, styles.ltrDigits]}
            />
          </Labeled>
        </View>
      </View>

      <Labeled label={t('attr_area')} align={align}>
        <TextInput
          value={value.areaM2 != null ? String(value.areaM2) : ''}
          onChangeText={(v) => onChange({ ...value, areaM2: parseIntField(v) })}
          placeholder={t('attr_ph_area')}
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          style={[inputStyle, styles.ltrDigits]}
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
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            style={[
              styles.segmentItem,
              { borderColor: theme.border, backgroundColor: active ? theme.tint : theme.backgroundElement },
            ]}>
            <ThemedText style={{ color: active ? theme.onTint : theme.text, fontWeight: active ? '700' : '500' }}>
              {t(labels[option])}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
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
  switchRow: { alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.one },
});
