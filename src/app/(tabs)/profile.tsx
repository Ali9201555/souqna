import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { type ComponentProps, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/data/AuthProvider';
import { useListings } from '@/data/ListingsProvider';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import { formatPrice } from '@/lib/format';
import type { Language } from '@/types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export default function ProfileScreen() {
  const { myListings, favorites } = useListings();
  const { isAuthenticated, user, profile, signOut } = useAuth();
  const { t, lang, setLang, isRTL } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const align = isRTL ? 'right' : 'left';

  const displayName = profile?.name?.trim() || user?.phone || user?.email || t('profile_guest');
  const contact = user?.phone ?? user?.email ?? null;
  const showContact = contact != null && contact !== displayName;

  const langs: { id: Language; label: string }[] = [
    { id: 'ar', label: t('lang_ar') },
    { id: 'ku', label: t('lang_ku') },
    { id: 'en', label: t('lang_en') },
  ];

  return (
    <Screen title={t('tab_profile')}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          {isAuthenticated ? (
            <>
              <View style={[styles.identity, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Avatar name={displayName} color={profile?.avatarColor ?? theme.tint} size={56} />
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
              <Pressable
                onPress={() => signOut()}
                style={[styles.signOut, { borderColor: theme.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="log-out-outline" size={18} color={theme.danger} />
                <ThemedText style={{ color: theme.danger, fontWeight: '700' }}>{t('auth_signOut')}</ThemedText>
              </Pressable>
            </>
          ) : (
            <>
              <View style={[styles.identity, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Avatar name={t('profile_guest')} color={theme.textSecondary} size={56} />
                <View style={styles.flex}>
                  <ThemedText style={[styles.name, { textAlign: align }]}>{t('profile_guest')}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: align }}>
                    {t('profile_signInHint')}
                  </ThemedText>
                </View>
              </View>
              <Pressable
                onPress={() => router.push('/auth')}
                style={[styles.signIn, { backgroundColor: theme.tint, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="call" size={18} color={theme.onTint} />
                <ThemedText style={{ color: theme.onTint, fontWeight: '700' }}>{t('profile_signIn')}</ThemedText>
              </Pressable>
            </>
          )}
        </View>

        <Row
          icon="heart-outline"
          label={t('profile_favorites')}
          value={favorites.length > 0 ? String(favorites.length) : undefined}
          onPress={() => router.push('/saved')}
        />

        <Section title={t('profile_language')} align={align}>
          <View style={[styles.langRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {langs.map((l) => {
              const active = l.id === lang;
              return (
                <Pressable
                  key={l.id}
                  onPress={() => setLang(l.id)}
                  style={[
                    styles.langPill,
                    { borderColor: active ? theme.tint : theme.border, backgroundColor: active ? theme.tint : 'transparent' },
                  ]}>
                  <ThemedText style={{ color: active ? theme.onTint : theme.text, fontWeight: active ? '700' : '500' }}>
                    {l.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title={t('profile_myListings')} align={align}>
          {myListings.length === 0 ? (
            <Pressable
              onPress={() => router.push('/sell')}
              style={[styles.emptyMine, { borderColor: theme.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="add-circle-outline" size={20} color={theme.tint} />
              <ThemedText type="small" themeColor="tint">
                {t('sell_title')}
              </ThemedText>
            </Pressable>
          ) : (
            <View style={styles.mineList}>
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: align }}>
                {t('profile_listingsCount', { count: myListings.length })}
              </ThemedText>
              {myListings.map((l) => (
                <Pressable
                  key={l.id}
                  onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l.id } })}
                  style={[styles.mineRow, { backgroundColor: theme.backgroundElement, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Image source={{ uri: l.images[0] }} style={styles.mineThumb} contentFit="cover" />
                  <View style={styles.flex}>
                    <ThemedText numberOfLines={1} style={{ textAlign: align, fontWeight: '600' }}>
                      {l.title}
                    </ThemedText>
                    <ThemedText type="small" themeColor="price" style={{ textAlign: align }}>
                      {l.priceIqd > 0 ? formatPrice(l.priceIqd, t('common_currency')) : t('contactForPrice')}
                    </ThemedText>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </Section>

        <Section title={t('profile_settings')} align={align}>
          <Row icon="notifications-outline" label={t('profile_settings')} />
          <Row icon="help-circle-outline" label={t('profile_help')} />
        </Section>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, align, children }: { title: string; align: 'left' | 'right'; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={{ textAlign: align }}>
        {title}
      </ThemedText>
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
  const rowStyle = [
    styles.row,
    { backgroundColor: theme.backgroundElement, flexDirection: isRTL ? 'row-reverse' : 'row' } as const,
  ];
  const inner = (
    <>
      <Ionicons name={icon} size={20} color={theme.text} />
      <ThemedText style={styles.flex}>{label}</ThemedText>
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
    <Pressable onPress={onPress} style={({ pressed }) => [rowStyle, pressed && styles.rowPressed]}>
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.four },
  flex: { flex: 1 },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: Spacing.three },
  identity: { alignItems: 'center', gap: Spacing.three },
  name: { fontSize: 18, fontWeight: '700' },
  signIn: { alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingVertical: Spacing.three, borderRadius: Radius.md },
  signOut: { alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingVertical: Spacing.three, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
  section: { gap: Spacing.two },
  langRow: { gap: Spacing.two },
  langPill: { flex: 1, alignItems: 'center', paddingVertical: Spacing.three, borderRadius: Radius.md, borderWidth: 1 },
  emptyMine: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  mineList: { gap: Spacing.two },
  mineRow: { alignItems: 'center', gap: Spacing.three, padding: Spacing.two, borderRadius: Radius.md },
  mineThumb: { width: 56, height: 56, borderRadius: Radius.sm },
  row: { alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.md },
  rowPressed: { opacity: 0.7 },
});
