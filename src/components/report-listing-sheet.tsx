import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import { REPORT_REASONS, validateReport } from '@/lib/trust/moderation';
import type { ReportReason } from '@/types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const reasonIcons: Record<ReportReason, IoniconName> = {
  scam: 'warning-outline',
  prohibited: 'ban-outline',
  duplicate: 'copy-outline',
  sold: 'bag-check-outline',
  offensive: 'alert-circle-outline',
  other: 'ellipsis-horizontal-circle-outline',
};

export function ReportListingSheet({
  visible,
  isSubmitting,
  error,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (reason: ReportReason, details: string) => Promise<void>;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { t, isRTL } = useI18n();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const align = isRTL ? 'right' : 'left';
  const rowDir = isRTL ? 'row-reverse' : 'row';

  const reasonOptions = useMemo(
    () => REPORT_REASONS.map((id) => ({ id, label: t(`report_reason_${id}`) })),
    [t],
  );

  const submit = async () => {
    if (!reason) {
      setLocalError(t('report_error_reason'));
      return;
    }

    const result = validateReport(reason, details);
    if (!result.ok) {
      setLocalError(result.code === 'reason' ? t('report_error_reason') : t('report_error_details'));
      return;
    }

    setLocalError(null);
    await onSubmit(reason, result.details);
    setReason(null);
    setDetails('');
  };

  const close = () => {
    if (isSubmitting) return;
    setLocalError(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={close} />
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
          </View>
          <View style={[styles.headerRow, { flexDirection: rowDir }]}>
            <View style={styles.flex}>
              <ThemedText style={[styles.title, { textAlign: align }]}>{t('report_title')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: align }}>
                {t('report_subtitle')}
              </ThemedText>
            </View>
            <Pressable onPress={close} hitSlop={8}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.reasonList}>
              {reasonOptions.map((option) => {
                const selected = option.id === reason;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    testID={`report-reason-${option.id}`}
                    onPress={() => setReason(option.id)}
                    style={({ pressed }) => [
                      styles.reasonRow,
                      {
                        flexDirection: rowDir,
                        backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
                        borderColor: selected ? theme.tint : theme.border,
                      },
                      pressed && { opacity: 0.75 },
                    ]}>
                    <Ionicons name={reasonIcons[option.id]} size={18} color={selected ? theme.tint : theme.textSecondary} />
                    <ThemedText style={[styles.reasonLabel, { textAlign: align }]}>{option.label}</ThemedText>
                    {selected && <Ionicons name="checkmark-circle" size={20} color={theme.tint} />}
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder={t('report_details_placeholder')}
              placeholderTextColor={theme.textSecondary}
              multiline
              textAlign={align}
              style={[
                styles.details,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                  textAlign: align,
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                },
              ]}
            />

            {(localError || error) && (
              <ThemedText type="small" themeColor="danger" style={{ textAlign: align }}>
                {localError ?? error}
              </ThemedText>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('report_submit')}
              testID="report-submit-button"
              onPress={submit}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.submit,
                { flexDirection: rowDir, backgroundColor: theme.tint },
                (pressed || isSubmitting) && { opacity: 0.75 },
              ]}>
              {isSubmitting ? (
                <ActivityIndicator color={theme.onTint} />
              ) : (
                <Ionicons name="flag" size={18} color={theme.onTint} />
              )}
              <ThemedText style={{ color: theme.onTint, fontWeight: '700' }}>{t('report_submit')}</ThemedText>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  flex: { flex: 1 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: Spacing.five,
    maxHeight: '88%',
  },
  handleRow: { alignItems: 'center', paddingVertical: Spacing.two },
  handle: { width: 40, height: 4, borderRadius: Radius.pill },
  headerRow: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  title: { fontSize: 18, fontWeight: '700' },
  content: { gap: Spacing.three, padding: Spacing.three },
  reasonList: { gap: Spacing.two },
  reasonRow: {
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  reasonLabel: { flex: 1, fontWeight: '600' },
  details: {
    minHeight: 104,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  submit: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
  },
});
