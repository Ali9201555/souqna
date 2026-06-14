import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useAuth } from '@/data/AuthProvider';
import {
  fetchMyThreads,
  fetchThreadMessages,
  getOrCreateThread,
  mapMessageRow,
  markThreadRead as apiMarkRead,
  sendThreadMessage,
} from '@/data/chatApi';
import { fetchSellerProfiles } from '@/data/listingsApi';
import { DEMO_USER_ID, SELLERS, SEED_THREADS } from '@/data/seed';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { ChatMessage, ChatThread } from '@/types';

type Party = { name: string; avatarColor: string };

type ChatContextValue = {
  threads: ChatThread[];
  isLoading: boolean;
  totalUnread: number;
  /** Get-or-create the thread for a listing's seller; returns its id (null if it can't). */
  openThread: (listingId: string, sellerId: string) => Promise<string | null>;
  loadMessages: (threadId: string) => Promise<ChatMessage[]>;
  sendMessage: (threadId: string, body: string) => Promise<ChatMessage>;
  /** Subscribe to incoming messages on a thread (realtime in live mode; no-op in demo). */
  subscribeMessages: (threadId: string, onInsert: (m: ChatMessage) => void) => () => void;
  markRead: (threadId: string) => void;
  getParty: (id: string) => Party | undefined;
  refresh: () => Promise<void>;
};

const ChatContext = createContext<ChatContextValue | null>(null);

const seedParty = (id: string): Party | undefined => {
  const s = SELLERS.find((x) => x.id === id);
  return s ? { name: s.name, avatarColor: s.avatarColor } : undefined;
};

/** A couple of demo messages per seed thread so opening one shows history. */
function buildSeedMessages(): Record<string, ChatMessage[]> {
  const out: Record<string, ChatMessage[]> = {};
  for (const th of SEED_THREADS) {
    out[th.id] = [
      { id: `${th.id}-m1`, threadId: th.id, senderId: DEMO_USER_ID, body: 'مرحبا، هل ما زال متوفراً؟', createdAt: th.lastAt - 600_000 },
      { id: `${th.id}-m2`, threadId: th.id, senderId: th.withSellerId, body: th.lastMessage, createdAt: th.lastAt },
    ];
  }
  return out;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const live = isSupabaseConfigured && userId != null;

  const [threads, setThreads] = useState<ChatThread[]>(live ? [] : SEED_THREADS);
  const [isLoading, setIsLoading] = useState(live);
  const [parties, setParties] = useState<Record<string, Party>>({});
  // Demo message store (live mode reads messages from Supabase per-thread).
  const demoMessages = useRef<Record<string, ChatMessage[]>>(buildSeedMessages());

  const refresh = useCallback(async () => {
    // Demo mode (signed out / no backend): the in-memory seed is the source.
    if (!live || !userId) {
      setThreads(SEED_THREADS);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const next = await fetchMyThreads(userId);
      setThreads(next);
      const ids = [...new Set(next.map((t) => t.withSellerId))];
      if (ids.length) {
        const profiles = await fetchSellerProfiles(ids);
        setParties((prev) => {
          const map = { ...prev };
          for (const p of profiles) map[p.id] = { name: p.name || '—', avatarColor: p.avatarColor };
          return map;
        });
      }
    } catch {
      // Leave the existing list; the Chats tab surfaces its own empty/idle state.
    } finally {
      setIsLoading(false);
    }
  }, [live, userId]);

  useEffect(() => {
    // Load threads on mount / when auth-mode flips. Standard fetch-on-mount;
    // the loading-state setState is intentional (mirrors ListingsProvider).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const openThread = useCallback(
    async (listingId: string, sellerId: string): Promise<string | null> => {
      if (live && userId) {
        try {
          const id = await getOrCreateThread(listingId, sellerId, userId);
          await refresh();
          return id;
        } catch {
          return null;
        }
      }
      // Demo: reuse an existing local thread for this listing+seller or create one.
      const existing = threads.find((t) => t.listingId === listingId && t.withSellerId === sellerId);
      if (existing) return existing.id;
      const id = `local-thread-${Date.now()}`;
      const thread: ChatThread = { id, listingId, withSellerId: sellerId, lastMessage: '', lastAt: Date.now(), unread: 0 };
      demoMessages.current[id] = [];
      setThreads((prev) => [thread, ...prev]);
      return id;
    },
    [live, userId, threads, refresh],
  );

  const loadMessages = useCallback(
    async (threadId: string): Promise<ChatMessage[]> => {
      if (live) return fetchThreadMessages(threadId);
      return demoMessages.current[threadId] ?? [];
    },
    [live],
  );

  const sendMessage = useCallback(
    async (threadId: string, body: string): Promise<ChatMessage> => {
      if (live && userId) return sendThreadMessage(threadId, userId, body);
      const msg: ChatMessage = { id: `local-msg-${Date.now()}`, threadId, senderId: DEMO_USER_ID, body, createdAt: Date.now() };
      demoMessages.current[threadId] = [...(demoMessages.current[threadId] ?? []), msg];
      setThreads((prev) =>
        [...prev]
          .map((t) => (t.id === threadId ? { ...t, lastMessage: body, lastAt: msg.createdAt } : t))
          .sort((a, b) => b.lastAt - a.lastAt),
      );
      return msg;
    },
    [live, userId],
  );

  const subscribeMessages = useCallback(
    (threadId: string, onInsert: (m: ChatMessage) => void) => {
      if (!live) return () => undefined;
      const channel = supabase
        .channel(`thread:${threadId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` }, (payload) => {
          onInsert(mapMessageRow(payload.new as Parameters<typeof mapMessageRow>[0]));
        })
        .subscribe();
      return () => {
        void supabase.removeChannel(channel);
      };
    },
    [live],
  );

  const markRead = useCallback(
    (threadId: string) => {
      setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, unread: 0 } : t)));
      if (live && userId) void apiMarkRead(threadId, userId);
    },
    [live, userId],
  );

  const getParty = useCallback((id: string): Party | undefined => parties[id] ?? seedParty(id), [parties]);

  const totalUnread = useMemo(() => threads.reduce((n, t) => n + t.unread, 0), [threads]);

  const value = useMemo<ChatContextValue>(
    () => ({ threads, isLoading, totalUnread, openThread, loadMessages, sendMessage, subscribeMessages, markRead, getParty, refresh }),
    [threads, isLoading, totalUnread, openThread, loadMessages, sendMessage, subscribeMessages, markRead, getParty, refresh],
  );

  return <ChatContext value={value}>{children}</ChatContext>;
}

export function useChat() {
  const ctx = use(ChatContext);
  if (!ctx) throw new Error('useChat must be used within a ChatProvider');
  return ctx;
}
