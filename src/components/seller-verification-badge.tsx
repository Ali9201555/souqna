import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';

type SellerVerificationBadgeProps = {
  verified?: boolean;
  variant?: 'subtle' | 'solid';
  size?: 'small' | 'regular';
};

export function SellerVerificationBadge({
  verified,
  variant = 'subtle',
  size = 'regular',
}: SellerVerificationBadgeProps) {
  const theme = useTheme();
  const { t, isRTL } = useI18n();

  if (!verified) return null;

  const solid = variant === 'solid';
  const compact = size === 'small';
  const color = solid ? theme.onTint : theme.success;

  return (
    <View
      accessibilityLabel={t('detail_verified')}
      style={[
        styles.badge,
        compact && styles.small,
        {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          backgroundColor: solid ? theme.tint : theme.background,
          borderColor: solid ? theme.tint : theme.border,
        },
      ]}>
      <Ionicons name="shield-checkmark" size={compact ? 12 : 14} color={color} />
      <ThemedText style={[compact ? styles.smallText : styles.text, { color }]}>
        {t('detail_verified')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  small: {
    gap: Spacing.half,
    paddingHorizontal: Spacing.one,
  },
  text: { fontSize: 12, lineHeight: 16, fontWeight: '800' },
  smallText: { fontSize: 11, lineHeight: 14, fontWeight: '800' },
});
