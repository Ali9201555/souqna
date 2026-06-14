import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/data/AuthProvider';
import { useChat } from '@/data/ChatProvider';
import { useListings } from '@/data/ListingsProvider';
import { DEMO_USER_ID } from '@/data/seed';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import { formatPrice } from '@/lib/format';
import type { ChatMessage } from '@/types';

const QUICK_REPLY_KEYS = ['chat_quick_available', 'chat_quick_price', 'chat_quick_seeToday'] as const;

export default function ConversationScreen() {
  const params = useLocalSearchParams<{ id: string; listingId?: string; sellerId?: string }>();
  const threadId = params.id;
  const router = useRouter();
  const theme = useTheme();
  const { t, isRTL } = useI18n();
  const { user } = useAuth();
  const { threads, loadMessages, sendMessage, subscribeMessages, markRead, getParty } = useChat();
  const { getListing, getSeller } = useListings();

  const myId = user?.id ?? DEMO_USER_ID;
  const thread = threads.find((th) => th.id === threadId);
  const listingId = thread?.listingId ?? (typeof params.listingId === 'string' ? params.listingId : undefined);
  const partyId = thread?.withSellerId ?? (typeof params.sellerId === 'string' ? params.sellerId : undefined);
  const listing = listingId ? getListing(listingId) : undefined;
  const partyName = (partyId ? getParty(partyId)?.name ?? getSeller(partyId)?.name : undefined) ?? t('chats_title');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  // Monotonic key for optimistic bubbles (no Date.now() in render-adjacent code);
  // replaced by the server row's id once the send resolves.
  const tempSeq = useRef(0);

  // Load history + mark read once we know the thread.
  useEffect(() => {
    if (!threadId) return;
    let active = true;
    loadMessages(threadId).then((msgs) => {
      if (active) setMessages(msgs);
    });
    markRead(threadId);
    return () => {
      active = false;
    };
    // markRead/loadMessages identity is stable per provider value; thread id is the real key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  // Realtime: append incoming messages, deduped by id (our own echo is dropped).
  useEffect(() => {
    if (!threadId) return;
    return subscribeMessages(threadId, (row) => {
      setMessages((m) => (m.some((x) => x.id === row.id) ? m : [...m, row]));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const send = async (raw: string) => {
    const body = raw.trim();
    if (!body || sending) return;
    setSending(true);
    tempSeq.current += 1;
    const tempId = `temp-${tempSeq.current}`;
    setMessages((m) => [...m, { id: tempId, threadId, senderId: myId, body, createdAt: tempSeq.current }]);
    setInput('');
    try {
      const saved = await sendMessage(threadId, body);
      setMessages((m) => m.map((x) => (x.id === tempId ? saved : x)));
    } catch {
      setMessages((m) => m.filter((x) => x.id !== tempId));
      setInput(body);
    } finally {
      setSending(false);
    }
  };

  // Newest at the bottom: store oldest→newest, render inverted.
  const inverted = useMemo(() => [...messages].reverse(), [messages]);
  const priceText = listing ? (listing.priceIqd > 0 ? formatPrice(listing.priceIqd, t('common_currency')) : t('contactForPrice')) : '';

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: partyName, headerTitleStyle: { fontSize: 17, fontWeight: '800' } }} />

      {listing && (
        <PressableScale
          scaleTo={0.99}
          accessibilityRole="button"
          accessibilityLabel={listing.title}
          onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
          style={[styles.listingBar, { backgroundColor: theme.surface, boxShadow: Shadow.card, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Image source={{ uri: listing.images[0] }} style={styles.listingThumb} contentFit="cover" />
          <View style={styles.flex}>
            <ThemedText numberOfLines={1} style={[styles.listingTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {listing.title}
            </ThemedText>
            <ThemedText type="small" themeColor="price" style={{ textAlign: isRTL ? 'right' : 'left', fontWeight: '700' }}>
              {priceText}
            </ThemedText>
          </View>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.textSecondary} />
        </PressableScale>
      )}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={92}>
        <FlatList
          ref={listRef}
          data={inverted}
          inverted
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            messages.length === 0 ? (
              <View style={styles.intro}>
                <Ionicons name="chatbubble-ellipses-outline" size={32} color={theme.tint} />
                <ThemedText type="small" themeColor="textSecondary" style={styles.introText}>
                  {t('chat_intro')}
                </ThemedText>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const mine = item.senderId === myId;
            return (
              <View style={[styles.bubble, mine ? [styles.mine, { backgroundColor: theme.tint }] : [styles.theirs, { backgroundColor: theme.backgroundElement }]]}>
                <ThemedText style={{ color: mine ? theme.onTint : theme.text }}>{item.body}</ThemedText>
              </View>
            );
          }}
        />

        {messages.length === 0 && (
          <View style={[styles.quickRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {QUICK_REPLY_KEYS.map((key) => (
              <PressableScale
                key={key}
                haptic
                scaleTo={0.95}
                accessibilityRole="button"
                accessibilityLabel={t(key)}
                onPress={() => send(t(key))}
                style={[styles.quickChip, { backgroundColor: theme.tintSoft }]}>
                <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>{t(key)}</ThemedText>
              </PressableScale>
            ))}
          </View>
        )}

        <View style={[styles.composer, { borderTopColor: theme.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('chat_placeholder')}
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, textAlign: isRTL ? 'right' : 'left' }]}
          />
          <PressableScale
            haptic
            scaleTo={0.9}
            disabled={!input.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel={t('chat_send')}
            onPress={() => send(input)}
            style={[styles.sendBtn, { backgroundColor: theme.tint, opacity: !input.trim() || sending ? 0.5 : 1 }]}>
            <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={20} color={theme.onTint} />
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listingBar: { alignItems: 'center', gap: Spacing.two, margin: Spacing.three, marginBottom: 0, padding: Spacing.two, borderRadius: Radius.lg },
  listingThumb: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: 'rgba(0,0,0,0.06)' },
  listingTitle: { fontSize: 14, fontWeight: '600' },
  listContent: { padding: Spacing.three, gap: Spacing.two, flexGrow: 1, justifyContent: 'flex-end' },
  intro: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  introText: { textAlign: 'center', maxWidth: 280 },
  bubble: { maxWidth: '82%', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.lg },
  mine: { alignSelf: 'flex-end', borderBottomRightRadius: Radius.sm },
  theirs: { alignSelf: 'flex-start', borderBottomLeftRadius: Radius.sm },
  quickRow: { flexWrap: 'wrap', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  quickChip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.pill },
  composer: { alignItems: 'flex-end', gap: Spacing.two, padding: Spacing.two, paddingHorizontal: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, maxHeight: 120, minHeight: 44, borderRadius: Radius.xl, paddingHorizontal: Spacing.three, paddingTop: Spacing.two + 2, paddingBottom: Spacing.two + 2, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
