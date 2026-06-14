import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/data/AuthProvider';
import { fetchKitchens, upsertMyKitchen, type KitchenInput } from '@/data/kitchensApi';
import { SEED_KITCHENS } from '@/data/seed';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Kitchen } from '@/types';

type KitchensContextValue = {
  kitchens: Kitchen[];
  isLoading: boolean;
  /** The signed-in cook's storefront, or null if they haven't opened one. */
  myKitchen: Kitchen | null;
  getKitchen: (id: string) => Kitchen | undefined;
  getKitchenByOwner: (ownerId: string) => Kitchen | undefined;
  /** Create or update my kitchen. Returns it. */
  saveMyKitchen: (input: KitchenInput) => Promise<Kitchen>;
  refresh: () => Promise<void>;
};

const KitchensContext = createContext<KitchensContextValue | null>(null);

export function KitchensProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const live = isSupabaseConfigured;

  const [kitchens, setKitchens] = useState<Kitchen[]>(live ? [] : SEED_KITCHENS);
  const [isLoading, setIsLoading] = useState(live);

  const refresh = useCallback(async () => {
    if (!live) return;
    setIsLoading(true);
    try {
      setKitchens(await fetchKitchens());
    } catch {
      // Keep the existing list; storefront screens surface their own empty state.
    } finally {
      setIsLoading(false);
    }
  }, [live]);

  useEffect(() => {
    if (!live) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [live, refresh]);

  const getKitchen = useCallback((id: string) => kitchens.find((k) => k.id === id), [kitchens]);
  const getKitchenByOwner = useCallback((ownerId: string) => kitchens.find((k) => k.ownerId === ownerId), [kitchens]);

  const myKitchen = useMemo(
    () => (userId ? kitchens.find((k) => k.ownerId === userId) ?? null : null),
    [kitchens, userId],
  );

  const saveMyKitchen = useCallback(
    async (input: KitchenInput): Promise<Kitchen> => {
      const ownerId = userId ?? 'me'; // demo: the seed "me" user
      if (live && userId) {
        const saved = await upsertMyKitchen(input, userId);
        setKitchens((prev) => [saved, ...prev.filter((k) => k.id !== saved.id)]);
        return saved;
      }
      // Demo: create/update an in-memory kitchen for the local user.
      const existing = kitchens.find((k) => k.ownerId === ownerId);
      const kitchen: Kitchen = {
        id: existing?.id ?? `local-kitchen-${Date.now()}`,
        ownerId,
        name: input.name,
        bio: input.bio,
        coverUrl: input.coverUrl,
        cuisines: input.cuisines,
        governorateId: input.governorateId,
        createdAt: existing?.createdAt ?? Date.now(),
      };
      setKitchens((prev) => [kitchen, ...prev.filter((k) => k.ownerId !== ownerId)]);
      return kitchen;
    },
    [live, userId, kitchens],
  );

  const value = useMemo<KitchensContextValue>(
    () => ({ kitchens, isLoading, myKitchen, getKitchen, getKitchenByOwner, saveMyKitchen, refresh }),
    [kitchens, isLoading, myKitchen, getKitchen, getKitchenByOwner, saveMyKitchen, refresh],
  );

  return <KitchensContext value={value}>{children}</KitchensContext>;
}

export function useKitchens() {
  const ctx = use(KitchensContext);
  if (!ctx) throw new Error('useKitchens must be used within a KitchensProvider');
  return ctx;
}
