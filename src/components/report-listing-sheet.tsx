import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInDown, ZoomIn } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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

/** Cap the entrance stagger of the reason rows. */
const MAX_STAGGER_INDEX = 8;

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
  const scheme = useColorScheme();
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
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <View style={styles.root}>
        <Animated.View entering={FadeIn.duration(200)} style={styles.backdrop}>
          <Pressable
            style={styles.flex}
            accessibilityRole="button"
            accessibilityLabel={t('common_close')}
            onPress={close}
          />
        </Animated.View>
        <Animated.View
          entering={SlideInDown.springify()
            .damping(Motion.spring.damping)
            .stiffness(Motion.spring.stiffness)
            .mass(Motion.spring.mass)}
          style={[
            styles.sheet,
            { backgroundColor: theme.surface },
            scheme === 'dark' && { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
          ]}>
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
            <PressableScale
              scaleTo={0.9}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common_close')}
              onPress={close}
              style={[styles.closeBtn, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </PressableScale>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.reasonList}>
              {reasonOptions.map((option, index) => {
                const selected = option.id === reason;
                return (
                  <PressableScale
                    key={option.id}
                    scaleTo={0.98}
                    entering={FadeInDown.duration(360).delay(Math.min(index, MAX_STAGGER_INDEX) * 55)}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    accessibilityState={{ selected }}
                    testID={`report-reason-${option.id}`}
                    onPress={() => setReason(option.id)}
                    style={[
                      styles.reasonRow,
                      {
                        flexDirection: rowDir,
                        backgroundColor: selected ? theme.tintSoft : theme.backgroundElement,
                        borderColor: selected ? theme.tint : theme.border,
                      },
                    ]}>
                    <Ionicons name={reasonIcons[option.id]} size={18} color={selected ? theme.tint : theme.textSecondary} />
                    <ThemedText style={[styles.reasonLabel, { textAlign: align }]}>{option.label}</ThemedText>
                    {selected && (
                      <Animated.View
                        entering={ZoomIn.springify()
                          .damping(Motion.springBouncy.damping)
                          .stiffness(Motion.springBouncy.stiffness)
                          .mass(Motion.springBouncy.mass)}>
                        <Ionicons name="checkmark-circle" size={20} color={theme.tint} />
                      </Animated.View>
                    )}
                  </PressableScale>
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

            <PressableScale
              haptic
              scaleTo={0.97}
              accessibilityRole="button"
              accessibilityLabel={t('report_submit')}
              accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
              testID="report-submit-button"
              onPress={submit}
              disabled={isSubmitting}
              style={[
                styles.submit,
                { flexDirection: rowDir, backgroundColor: theme.danger },
                isSubmitting && styles.submitBusy,
              ]}>
              {isSubmitting ? (
                <ActivityIndicator color={theme.onTint} />
              ) : (
                <Ionicons name="flag" size={18} color={theme.onTint} />
              )}
              <ThemedText style={[styles.submitText, { color: theme.onTint }]}>{t('report_submit')}</ThemedText>
            </PressableScale>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  flex: { flex: 1 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    // Spring overshoot guard: sink the sheet slightly below the screen edge and
    // give the padding back so no gap flashes while the entrance settles.
    marginBottom: -Spacing.four,
    paddingBottom: Spacing.five + Spacing.four,
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
  title: { fontSize: 18, fontWeight: '800' },
  closeBtn: {
    width: Spacing.five,
    height: Spacing.five,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { gap: Spacing.three, padding: Spacing.three },
  reasonList: { gap: Spacing.two },
  reasonRow: {
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  reasonLabel: { flex: 1, fontWeight: '600' },
  details: {
    minHeight: 104,
    borderRadius: Radius.lg,
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
    borderRadius: Radius.pill,
    paddingVertical: Spacing.three,
  },
  submitBusy: { opacity: 0.7 },
  submitText: { fontWeight: '800' },
});
