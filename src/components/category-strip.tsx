import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { CATEGORIES } from '@/data/categories';
import { hasSection } from '@/data/sections';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export function CategoryStrip() {
  const theme = useTheme();
  const router = useRouter();
  const { lang, isRTL } = useI18n();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}>
      {CATEGORIES.map((c) => (
        <PressableScale
          key={c.id}
          haptic
          scaleTo={0.9}
          onPress={() =>
            hasSection(c.id)
              ? router.push({ pathname: '/section/[category]', params: { category: c.id } })
              : router.push({ pathname: '/search', params: { category: c.id } })
          }
          style={styles.item}>
          <View style={[styles.circle, { backgroundColor: theme.tintSoft }]}>
            <Ionicons name={c.icon as IoniconName} size={24} color={theme.tint} />
          </View>
          <ThemedText numberOfLines={1} style={styles.label}>
            {c.name[lang]}
          </ThemedText>
        </PressableScale>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  item: { alignItems: 'center', width: 72, gap: 6 },
  circle: { width: 58, height: 58, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
