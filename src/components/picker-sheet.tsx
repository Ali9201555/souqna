import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Motion, Radius, Shadow, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';

export type PickerOption = { id: string | null; label: string };

export function PickerSheet({
  visible,
  title,
  options,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useI18n();
  const rowDir = isRTL ? 'row-reverse' : 'row';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel={t('common_close')}
            onPress={onClose}
          />
        </Animated.View>
        <Animated.View
          entering={SlideInDown.springify()
            .damping(Motion.spring.damping)
            .stiffness(Motion.spring.stiffness)
            .mass(Motion.spring.mass)}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              boxShadow: Shadow.float,
              // Overshoot guard: the spring briefly lifts the sheet past its
              // resting position; the negative margin keeps the gap covered.
              marginBottom: -Spacing.four,
              paddingBottom: Math.max(insets.bottom, Spacing.three) + Spacing.four,
            },
            scheme === 'dark' && { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
          ]}>
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
          </View>
          <View style={[styles.headerRow, { flexDirection: rowDir }]}>
            <ThemedText style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{title}</ThemedText>
            <PressableScale
              scaleTo={0.9}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common_close')}
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </PressableScale>
          </View>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {options.map((opt) => {
              const selected = opt.id === selectedId;
              return (
                <PressableScale
                  key={String(opt.id)}
                  scaleTo={0.97}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onSelect(opt.id);
                    onClose();
                  }}
                  style={[
                    styles.option,
                    { flexDirection: rowDir },
                    selected && { backgroundColor: theme.tintSoft },
                  ]}>
                  <ThemedText
                    style={{
                      color: selected ? theme.tint : theme.text,
                      fontWeight: selected ? '700' : '500',
                      textAlign: isRTL ? 'right' : 'left',
                    }}>
                    {opt.label}
                  </ThemedText>
                  {selected && <Ionicons name="checkmark-circle" size={20} color={theme.tint} />}
                </PressableScale>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
  },
  handleRow: { alignItems: 'center', paddingVertical: Spacing.two },
  handle: { width: 44, height: 5, borderRadius: Radius.pill },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  title: { flex: 1, fontSize: 18, fontWeight: '800' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { maxHeight: 400 },
  listContent: { paddingHorizontal: Spacing.two, gap: Spacing.half, paddingBottom: Spacing.two },
  option: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
  },
});
