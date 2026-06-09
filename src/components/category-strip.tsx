import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { CATEGORIES } from '@/data/categories';
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
        <Pressable
          key={c.id}
          onPress={() => router.push({ pathname: '/search', params: { category: c.id } })}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
          <View style={[styles.circle, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name={c.icon as IoniconName} size={26} color={theme.tint} />
          </View>
          <ThemedText numberOfLines={1} style={styles.label}>
            {c.name[lang]}
          </ThemedText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  item: { alignItems: 'center', width: 74, gap: 6 },
  pressed: { opacity: 0.6 },
  circle: { width: 60, height: 60, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, textAlign: 'center' },
});
