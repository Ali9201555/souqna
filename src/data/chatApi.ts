import { supabase } from '@/lib/supabase';
import type { ChatMessage, ChatThread } from '@/types';

/**
 * Supabase chat layer. Threads are 1:1 per (listing, buyer); the
 * `on_message_insert` trigger keeps `last_message`/unread current, so the
 * client only ever INSERTs messages — never writes thread previews directly.
 * Only call when configured + signed in (`supabase` throws otherwise; RLS
 * requires `auth.uid()` to be a participant).
 */

type ThreadRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message: string | null;
  last_message_at: string | null;
  buyer_unread: number;
  seller_unread: number;
  created_at: string;
};

type MessageRow = { id: string; thread_id: string; sender_id: string; body: string; created_at: string };

function mapThread(row: ThreadRow, userId: string): ChatThread {
  const iAmBuyer = row.buyer_id === userId;
  return {
    id: row.id,
    listingId: row.listing_id,
    withSellerId: iAmBuyer ? row.seller_id : row.buyer_id,
    lastMessage: row.last_message ?? '',
    lastAt: new Date(row.last_message_at ?? row.created_at).getTime(),
    unread: iAmBuyer ? row.buyer_unread : row.seller_unread,
  };
}

/** Exported for the realtime payload (payload.new is a raw messages row). */
export function mapMessageRow(row: MessageRow): ChatMessage {
  return { id: row.id, threadId: row.thread_id, senderId: row.sender_id, body: row.body, createdAt: new Date(row.created_at).getTime() };
}

/** Get-or-create the (listing, buyer) thread atomically; returns the thread id. */
export async function getOrCreateThread(listingId: string, sellerId: string, userId: string): Promise<string> {
  if (userId === sellerId) throw new Error('cannot_message_self');
  const { data, error } = await supabase
    .from('chat_threads')
    .upsert({ listing_id: listingId, buyer_id: userId, seller_id: sellerId }, { onConflict: 'listing_id,buyer_id', ignoreDuplicates: false })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return (data as unknown as ThreadRow).id;
}

/** Threads where I'm a participant, newest activity first. */
export async function fetchMyThreads(userId: string): Promise<ChatThread[]> {
  const { data, error } = await supabase
    .from('chat_threads')
    .select('*')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as ThreadRow[]).map((r) => mapThread(r, userId));
}

export async function fetchThreadMessages(threadId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase.from('messages').select('*').eq('thread_id', threadId).order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as MessageRow[]).map(mapMessageRow);
}

/** Insert a message. The trigger updates the thread preview + recipient unread. */
export async function sendThreadMessage(threadId: string, userId: string, body: string): Promise<ChatMessage> {
  const { data, error } = await supabase.from('messages').insert({ thread_id: threadId, sender_id: userId, body }).select().single();
  if (error) throw new Error(error.message);
  return mapMessageRow(data as unknown as MessageRow);
}

/** Zero MY unread on this thread (whichever side I'm on); best-effort. */
export async function markThreadRead(threadId: string, userId: string): Promise<void> {
  await supabase.from('chat_threads').update({ buyer_unread: 0 }).eq('id', threadId).eq('buyer_id', userId).then(() => undefined, () => undefined);
  await supabase.from('chat_threads').update({ seller_unread: 0 }).eq('id', threadId).eq('seller_id', userId).then(() => undefined, () => undefined);
}
