import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Motion, Radius, Shadow, Spacing } from '@/constants/theme';
import { useListings } from '@/data/ListingsProvider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import { formatRelativeTime } from '@/lib/format';

/** Cap the entrance stagger so deep scroll positions don't feel sluggish. */
const MAX_STAGGER_INDEX = 8;

const AVATAR_SIZE = 48;
const RING_THICKNESS = 2;
const RING_GAP = 2;
/** Read and unread avatars share one footprint so rows stay aligned. */
const AVATAR_SLOT = AVATAR_SIZE + (RING_THICKNESS + RING_GAP) * 2;

/** Avatar wrapper: unread threads get a tint→accent gradient ring. */
function ThreadAvatar({ name, color, unread }: { name: string; color: string; unread: boolean }) {
  const theme = useTheme();
  const { isRTL } = useI18n();

  if (!unread) {
    return (
      <View style={styles.avatarSlot}>
        <Avatar name={name} color={color} size={AVATAR_SIZE} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[theme.tint, theme.accent]}
      start={isRTL ? { x: 1, y: 0 } : { x: 0, y: 0 }}
      end={isRTL ? { x: 0, y: 1 } : { x: 1, y: 1 }}
      style={styles.avatarRing}>
      <View style={[styles.avatarRingGap, { backgroundColor: theme.surface }]}>
        <Avatar name={name} color={color} size={AVATAR_SIZE} />
      </View>
    </LinearGradient>
  );
}

/** Unread count pill that pops in with a springy overshoot. */
function UnreadBadge({ count }: { count: number }) {
  const theme = useTheme();
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(withSpring(1.2, Motion.springBouncy), withSpring(1, Motion.spring));
  }, [scale]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.badge, { backgroundColor: theme.tint }, popStyle]}>
      <ThemedText style={[styles.badgeText, { color: theme.onTint }]}>{count}</ThemedText>
    </Animated.View>
  );
}

export default function ChatsScreen() {
  const { threads, getListing, getSeller, isLoading } = useListings();
  const { t, isRTL } = useI18n();
  const theme = useTheme();
  const scheme = useColorScheme();
  const router = useRouter();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';

  const cardStyle = [
    styles.card,
    { backgroundColor: theme.surface, boxShadow: Shadow.card },
    scheme === 'dark' && { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
  ];

  if (isLoading) {
    return (
      <Screen title={t('chats_title')}>
        <View style={styles.skeletonList}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[cardStyle, { flexDirection: rowDir }]}>
              <Skeleton width={AVATAR_SLOT} height={AVATAR_SLOT} radius={Radius.pill} delay={i * 90} />
              <View style={[styles.skeletonBody, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Skeleton width="50%" height={14} delay={i * 90 + 40} />
                <Skeleton width="78%" height={12} delay={i * 90 + 80} />
                <Skeleton width="36%" height={12} delay={i * 90 + 120} />
              </View>
            </View>
          ))}
        </View>
      </Screen>
    );
  }

  if (threads.length === 0) {
    return (
      <Screen title={t('chats_title')}>
        <Animated.View entering={FadeInDown.duration(360)} style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.tintSoft }]}>
            <Ionicons name="chatbubbles-outline" size={36} color={theme.tint} />
          </View>
          <ThemedText style={styles.emptyTitle}>{t('chats_empty')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyHint}>
            {t('chats_emptyHint')}
          </ThemedText>
        </Animated.View>
      </Screen>
    );
  }

  return (
    <Screen title={t('chats_title')}>
      <Animated.View
        entering={FadeIn.duration(300)}
        style={[styles.note, { backgroundColor: theme.tintSoft, flexDirection: rowDir }]}>
        <Ionicons name="information-circle-outline" size={16} color={theme.tint} />
        <ThemedText type="small" themeColor="tint" style={[styles.noteText, { textAlign: align }]}>
          {t('chats_demoNote')}
        </ThemedText>
      </Animated.View>

      <FlatList
        data={threads}
        keyExtractor={(thread) => thread.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const listing = getListing(item.listingId);
          const seller = getSeller(item.withSellerId);
          const unread = item.unread > 0;
          return (
            <PressableScale
              entering={FadeInDown.duration(360).delay(Math.min(index, MAX_STAGGER_INDEX) * 55)}
              scaleTo={0.98}
              accessibilityRole="button"
              accessibilityLabel={seller?.name}
              onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.listingId } })}
              style={[cardStyle, { flexDirection: rowDir }]}>
              <ThreadAvatar
                name={seller?.name ?? '?'}
                color={seller?.avatarColor ?? theme.tint}
                unread={unread}
              />
              <View style={styles.rowBody}>
                <View style={[styles.rowTop, { flexDirection: rowDir }]}>
                  <ThemedText
                    numberOfLines={1}
                    style={[styles.rowName, unread && styles.rowNameUnread, { textAlign: align }]}>
                    {seller?.name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.time}>
                    {formatRelativeTime(item.lastAt, t)}
                  </ThemedText>
                </View>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  numberOfLines={1}
                  style={{ textAlign: align }}>
                  {listing?.title}
                </ThemedText>
                <ThemedText
                  type="small"
                  numberOfLines={1}
                  style={[
                    styles.lastMsg,
                    unread && styles.lastMsgUnread,
                    { textAlign: align, color: unread ? theme.text : theme.textSecondary },
                  ]}>
                  {item.lastMessage}
                </ThemedText>
              </View>
              {unread && <UnreadBadge count={item.unread} />}
            </PressableScale>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.five },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptyHint: { textAlign: 'center' },
  note: {
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
  },
  noteText: { flex: 1 },
  list: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset,
    gap: Spacing.two,
  },
  card: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.xl,
  },
  avatarSlot: { width: AVATAR_SLOT, height: AVATAR_SLOT, alignItems: 'center', justifyContent: 'center' },
  avatarRing: {
    width: AVATAR_SLOT,
    height: AVATAR_SLOT,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRingGap: {
    width: AVATAR_SIZE + RING_GAP * 2,
    height: AVATAR_SIZE + RING_GAP * 2,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  rowName: { flex: 1, fontWeight: '700', fontSize: 15 },
  rowNameUnread: { fontWeight: '800' },
  time: { fontSize: 12, lineHeight: 16 },
  lastMsg: { fontSize: 13 },
  lastMsgUnread: { fontWeight: '600' },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  skeletonList: { padding: Spacing.three, gap: Spacing.two },
  skeletonBody: { flex: 1, gap: Spacing.two },
});
