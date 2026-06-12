import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Motion, Radius, Spacing } from '@/constants/theme';
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
  const color = solid ? theme.onTint : theme.tint;

  return (
    <Animated.View
      entering={ZoomIn.springify()
        .damping(Motion.springBouncy.damping)
        .stiffness(Motion.springBouncy.stiffness)
        .mass(Motion.springBouncy.mass)}
      accessibilityLabel={t('detail_verified')}
      style={[
        styles.badge,
        compact && styles.small,
        {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          backgroundColor: solid ? theme.tint : theme.tintSoft,
        },
      ]}>
      <Ionicons name="shield-checkmark" size={compact ? 12 : 14} color={color} />
      <ThemedText style={[compact ? styles.smallText : styles.text, { color }]}>
        {t('detail_verified')}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
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
