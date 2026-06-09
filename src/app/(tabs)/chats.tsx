import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useListings } from '@/data/ListingsProvider';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import { formatRelativeTime } from '@/lib/format';

export default function ChatsScreen() {
  const { threads, getListing, getSeller } = useListings();
  const { t, isRTL } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const rowDir = isRTL ? 'row-reverse' : 'row';

  if (threads.length === 0) {
    return (
      <Screen title={t('chats_title')}>
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={48} color={theme.textSecondary} />
          <ThemedText style={styles.emptyTitle}>{t('chats_empty')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyHint}>
            {t('chats_emptyHint')}
          </ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen title={t('chats_title')}>
      <View style={[styles.note, { backgroundColor: theme.backgroundElement, flexDirection: rowDir }]}>
        <Ionicons name="information-circle-outline" size={16} color={theme.textSecondary} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.noteText}>
          {t('chats_demoNote')}
        </ThemedText>
      </View>

      <FlatList
        data={threads}
        keyExtractor={(thread) => thread.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const listing = getListing(item.listingId);
          const seller = getSeller(item.withSellerId);
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.listingId } })}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: theme.border, flexDirection: rowDir },
                pressed && { backgroundColor: theme.backgroundElement },
              ]}>
              <Avatar name={seller?.name ?? '?'} color={seller?.avatarColor ?? theme.tint} />
              <View style={styles.rowBody}>
                <View style={[styles.rowTop, { flexDirection: rowDir }]}>
                  <ThemedText numberOfLines={1} style={[styles.rowName, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {seller?.name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatRelativeTime(item.lastAt, t)}
                  </ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={{ textAlign: isRTL ? 'right' : 'left' }}>
                  {listing?.title}
                </ThemedText>
                <ThemedText
                  type="small"
                  numberOfLines={1}
                  style={[styles.lastMsg, { textAlign: isRTL ? 'right' : 'left', color: item.unread > 0 ? theme.text : theme.textSecondary }]}>
                  {item.lastMessage}
                </ThemedText>
              </View>
              {item.unread > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.tint }]}>
                  <ThemedText style={styles.badgeText}>{item.unread}</ThemedText>
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.five },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyHint: { textAlign: 'center' },
  note: { alignItems: 'center', gap: Spacing.two, margin: Spacing.three, padding: Spacing.two, borderRadius: Radius.sm },
  noteText: { flex: 1 },
  list: { paddingHorizontal: Spacing.three },
  row: { alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  rowName: { flex: 1, fontWeight: '700' },
  lastMsg: { fontSize: 13 },
  badge: { minWidth: 22, height: 22, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
