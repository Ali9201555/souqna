import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { type ComponentProps, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Radius, Shadow, Spacing } from '@/constants/theme';
import { AUTH_USES_EMAIL, useAuth } from '@/data/AuthProvider';
import { useListings } from '@/data/ListingsProvider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import { formatPrice } from '@/lib/format';
import type { Language } from '@/types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Cap the entrance stagger so long lists don't feel sluggish. */
const MAX_STAGGER_INDEX = 8;

export default function ProfileScreen() {
  const { myListings, favorites, isLoading } = useListings();
  const { isAuthenticated, user, profile, signOut } = useAuth();
  const { t, lang, setLang, isRTL } = useI18n();
  const theme = useTheme();
  const scheme = useColorScheme();
  const router = useRouter();
  const align = isRTL ? 'right' : 'left';
  const rowDir = isRTL ? 'row-reverse' : 'row';

  const displayName = profile?.name?.trim() || user?.phone || user?.email || t('profile_guest');
  const contact = user?.phone ?? user?.email ?? null;
  const showContact = contact != null && contact !== displayName;

  const langs: { id: Language; label: string }[] = [
    { id: 'ar', label: t('lang_ar') },
    { id: 'ku', label: t('lang_ku') },
    { id: 'en', label: t('lang_en') },
  ];

  const cardBase = [
    { backgroundColor: theme.surface, boxShadow: Shadow.card },
    scheme === 'dark' && { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
  ];

  return (
    <Screen title={t('tab_profile')}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(360)} style={[styles.hero, cardBase]}>
          {isAuthenticated ? (
            <>
              <View style={[styles.identity, { flexDirection: rowDir }]}>
                <Avatar name={displayName} color={profile?.avatarColor ?? theme.tint} size={72} />
                <View style={styles.flex}>
                  <ThemedText style={[styles.name, { textAlign: align }]} numberOfLines={1}>
                    {displayName}
                  </ThemedText>
                  {showContact && (
                    <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: align }}>
                      {contact}
                    </ThemedText>
                  )}
                </View>
              </View>
              <PressableScale
                haptic
                scaleTo={0.97}
                accessibilityRole="button"
                accessibilityLabel={t('auth_signOut')}
                onPress={() => signOut()}
                style={[
                  styles.pillBtn,
                  {
                    backgroundColor:
                      scheme === 'dark' ? 'rgba(251, 113, 133, 0.16)' : 'rgba(225, 29, 72, 0.08)',
                    flexDirection: rowDir,
                  },
                ]}>
                <Ionicons name="log-out-outline" size={18} color={theme.danger} />
                <ThemedText style={{ color: theme.danger, fontWeight: '700' }}>{t('auth_signOut')}</ThemedText>
              </PressableScale>
            </>
          ) : (
            <>
              <View style={[styles.identity, { flexDirection: rowDir }]}>
                <Avatar name={t('profile_guest')} color={theme.textSecondary} size={72} />
                <View style={styles.flex}>
                  <ThemedText style={[styles.name, { textAlign: align }]}>{t('profile_guest')}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: align }}>
                    {t(AUTH_USES_EMAIL ? 'profile_signInHintEmail' : 'profile_signInHint')}
                  </ThemedText>
                </View>
              </View>
              <PressableScale
                haptic
                scaleTo={0.97}
                accessibilityRole="button"
                accessibilityLabel={t(AUTH_USES_EMAIL ? 'profile_signInEmail' : 'profile_signIn')}
                onPress={() => router.push('/auth')}
                style={styles.gradientWrap}>
                <LinearGradient
                  colors={[theme.tint, theme.accent]}
                  start={isRTL ? { x: 1, y: 0 } : { x: 0, y: 0 }}
                  end={isRTL ? { x: 0, y: 1 } : { x: 1, y: 1 }}
                  style={[styles.pillBtn, { flexDirection: rowDir }]}>
                  <Ionicons name={AUTH_USES_EMAIL ? 'mail' : 'call'} size={18} color={theme.onTint} />
                  <ThemedText style={{ color: theme.onTint, fontWeight: '700' }}>
                    {t(AUTH_USES_EMAIL ? 'profile_signInEmail' : 'profile_signIn')}
                  </ThemedText>
                </LinearGradient>
              </PressableScale>
            </>
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(360).delay(55)}
          style={[styles.chipsRow, { flexDirection: rowDir }]}>
          <PressableScale
            haptic
            scaleTo={0.95}
            accessibilityRole="button"
            accessibilityLabel={t('profile_favorites')}
            onPress={() => router.push('/saved')}
            style={[styles.chip, { backgroundColor: theme.tintSoft, flexDirection: rowDir }]}>
            <Ionicons name="heart-outline" size={16} color={theme.tint} />
            <ThemedText type="smallBold" themeColor="tint">
              {t('profile_favorites')}
            </ThemedText>
            {favorites.length > 0 && (
              <View style={[styles.chipCount, { backgroundColor: theme.tint }]}>
                <ThemedText style={[styles.chipCountText, { color: theme.onTint }]}>
                  {favorites.length}
                </ThemedText>
              </View>
            )}
          </PressableScale>
          {myListings.length > 0 && (
            <View style={[styles.chip, { backgroundColor: theme.accentSoft, flexDirection: rowDir }]}>
              <Ionicons name="pricetags-outline" size={16} color={theme.accent} />
              <ThemedText type="smallBold" themeColor="accent">
                {t('profile_listingsCount', { count: myListings.length })}
              </ThemedText>
            </View>
          )}
        </Animated.View>

        <Section title={t('profile_language')} align={align} delay={110}>
          <View style={[styles.langRow, { flexDirection: rowDir }]}>
            {langs.map((l) => {
              const active = l.id === lang;
              return (
                <PressableScale
                  key={l.id}
                  haptic
                  scaleTo={0.97}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setLang(l.id)}
                  style={[
                    styles.langPill,
                    active
                      ? { backgroundColor: theme.tint, boxShadow: Shadow.card }
                      : {
                          backgroundColor: theme.surface,
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: theme.border,
                        },
                  ]}>
                  <ThemedText style={{ color: active ? theme.onTint : theme.text, fontWeight: active ? '700' : '500' }}>
                    {l.label}
                  </ThemedText>
                </PressableScale>
              );
            })}
          </View>
        </Section>

        <Section title={t('profile_myListings')} align={align} delay={165}>
          {isLoading ? (
            <View style={styles.mineList}>
              {[0, 1].map((i) => (
                <View key={i} style={[styles.mineRow, cardBase, { flexDirection: rowDir }]}>
                  <Skeleton width={56} height={56} radius={Radius.md} delay={i * 90} />
                  <View style={[styles.flex, styles.skeletonBody, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Skeleton width="70%" height={14} delay={i * 90 + 40} />
                    <Skeleton width="40%" height={12} delay={i * 90 + 80} />
                  </View>
                </View>
              ))}
            </View>
          ) : myListings.length === 0 ? (
            <PressableScale
              haptic
              scaleTo={0.98}
              accessibilityRole="button"
              accessibilityLabel={t('sell_title')}
              onPress={() => router.push('/sell')}
              style={[
                styles.emptyMine,
                { borderColor: theme.tint, backgroundColor: theme.tintSoft, flexDirection: rowDir },
              ]}>
              <Ionicons name="add-circle-outline" size={20} color={theme.tint} />
              <ThemedText type="smallBold" themeColor="tint">
                {t('sell_title')}
              </ThemedText>
            </PressableScale>
          ) : (
            <View style={styles.mineList}>
              {myListings.map((l, i) => (
                <PressableScale
                  key={l.id}
                  scaleTo={0.98}
                  accessibilityRole="button"
                  accessibilityLabel={l.title}
                  entering={FadeInDown.duration(360).delay(Math.min(i, MAX_STAGGER_INDEX) * 55)}
                  onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l.id } })}
                  style={[styles.mineRow, cardBase, { flexDirection: rowDir }]}>
                  <Image source={{ uri: l.images[0] }} style={styles.mineThumb} contentFit="cover" />
                  <View style={styles.flex}>
                    <ThemedText numberOfLines={1} style={{ textAlign: align, fontWeight: '600' }}>
                      {l.title}
                    </ThemedText>
                    <ThemedText type="small" themeColor="price" style={[styles.minePrice, { textAlign: align }]}>
                      {l.priceIqd > 0 ? formatPrice(l.priceIqd, t('common_currency')) : t('contactForPrice')}
                    </ThemedText>
                  </View>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.textSecondary} />
                </PressableScale>
              ))}
            </View>
          )}
        </Section>

        <Section title={t('profile_settings')} align={align} delay={220}>
          <GroupCard>
            <Row icon="notifications-outline" label={t('profile_settings')} />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <Row icon="help-circle-outline" label={t('profile_help')} />
          </GroupCard>
        </Section>
      </ScrollView>
    </Screen>
  );
}

function Section({
  title,
  align,
  delay = 0,
  children,
}: {
  title: string;
  align: 'left' | 'right';
  delay?: number;
  children: ReactNode;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(360).delay(delay)} style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={{ textAlign: align }}>
        {title}
      </ThemedText>
      {children}
    </Animated.View>
  );
}

/** Floating surface card that groups settings-style rows. */
function GroupCard({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const scheme = useColorScheme();
  return (
    <View
      style={[
        styles.groupCard,
        { backgroundColor: theme.surface, boxShadow: Shadow.card },
        scheme === 'dark' && { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
      ]}>
      {children}
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const { isRTL } = useI18n();
  const rowStyle = [styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' } as const];
  const inner = (
    <>
      <View style={[styles.rowIcon, { backgroundColor: theme.tintSoft }]}>
        <Ionicons name={icon} size={18} color={theme.tint} />
      </View>
      <ThemedText style={[styles.flex, { textAlign: isRTL ? 'right' : 'left' }]}>{label}</ThemedText>
      {value != null && (
        <ThemedText type="small" themeColor="textSecondary">
          {value}
        </ThemedText>
      )}
      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.textSecondary} />
    </>
  );

  if (!onPress) {
    return <View style={rowStyle}>{inner}</View>;
  }
  return (
    <PressableScale scaleTo={0.98} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={rowStyle}>
      {inner}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: BottomTabInset },
  flex: { flex: 1 },
  hero: { borderRadius: Radius.xxl, padding: Spacing.four, gap: Spacing.three },
  identity: { alignItems: 'center', gap: Spacing.three },
  name: { fontSize: 22, lineHeight: 28, fontWeight: '800' },
  pillBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.pill,
  },
  gradientWrap: { borderRadius: Radius.pill, boxShadow: Shadow.fab },
  chipsRow: { alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  chip: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  chipCount: {
    minWidth: 20,
    height: 20,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  chipCountText: { fontSize: 11, lineHeight: 14, fontWeight: '700' },
  section: { gap: Spacing.two },
  langRow: { gap: Spacing.two },
  langPill: { flex: 1, alignItems: 'center', paddingVertical: Spacing.three, borderRadius: Radius.pill },
  emptyMine: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  mineList: { gap: Spacing.two },
  mineRow: { alignItems: 'center', gap: Spacing.three, padding: Spacing.two, borderRadius: Radius.lg },
  mineThumb: { width: 56, height: 56, borderRadius: Radius.md },
  minePrice: { fontWeight: '800' },
  skeletonBody: { gap: Spacing.two },
  groupCard: { borderRadius: Radius.xl, overflow: 'hidden' },
  row: { alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.three },
});
