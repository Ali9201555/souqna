import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
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
  const { isRTL } = useI18n();
  const rowDir = isRTL ? 'row-reverse' : 'row';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
          </View>
          <View style={[styles.headerRow, { flexDirection: rowDir }]}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>
          <ScrollView style={styles.list}>
            {options.map((opt) => {
              const selected = opt.id === selectedId;
              return (
                <Pressable
                  key={String(opt.id)}
                  onPress={() => {
                    onSelect(opt.id);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    { flexDirection: rowDir, borderBottomColor: theme.border },
                    pressed && { backgroundColor: theme.backgroundElement },
                  ]}>
                  <ThemedText style={{ color: selected ? theme.tint : theme.text, fontWeight: selected ? '700' : '500' }}>
                    {opt.label}
                  </ThemedText>
                  {selected && <Ionicons name="checkmark" size={20} color={theme.tint} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: Spacing.five,
  },
  handleRow: { alignItems: 'center', paddingVertical: Spacing.two },
  handle: { width: 40, height: 4, borderRadius: Radius.pill },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  title: { fontSize: 18, fontWeight: '700' },
  list: { maxHeight: 400 },
  option: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
