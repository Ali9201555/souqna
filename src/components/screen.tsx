import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';

export function Screen({
  title,
  headerRight,
  children,
}: {
  title?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  const theme = useTheme();
  const { isRTL } = useI18n();

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        {title != null && (
          <View
            style={[
              styles.header,
              { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: theme.border },
            ]}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            {headerRight}
          </View>
        )}
        <View style={styles.flex}>{children}</View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
});
