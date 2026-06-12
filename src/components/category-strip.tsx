import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { CATEGORIES } from '@/data/categories';
import { hasSection } from '@/data/sections';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Cap the entrance stagger so long strips don't trickle in forever. */
const MAX_STAGGER_INDEX = 8;

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
      {CATEGORIES.map((c, index) => (
        <PressableScale
          key={c.id}
          haptic
          scaleTo={0.9}
          entering={FadeInDown.duration(360).delay(Math.min(index, MAX_STAGGER_INDEX) * 55)}
          accessibilityRole="button"
          accessibilityLabel={c.name[lang]}
          onPress={() =>
            hasSection(c.id)
              ? router.push({ pathname: '/section/[category]', params: { category: c.id } })
              : router.push({ pathname: '/search', params: { category: c.id } })
          }
          style={[
            styles.chip,
            { backgroundColor: theme.backgroundElement, flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}>
          <View style={[styles.chipIcon, { backgroundColor: theme.tintSoft }]}>
            <Ionicons name={c.icon as IoniconName} size={16} color={theme.tint} />
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
  content: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  chip: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.one,
    borderRadius: Radius.pill,
  },
  chipIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 13, fontWeight: '600', paddingHorizontal: Spacing.one },
});
