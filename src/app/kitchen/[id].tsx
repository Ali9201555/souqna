import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { ListState } from '@/components/list-state';
import { ListingCard } from '@/components/listing-card';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/data/AuthProvider';
import { useChat } from '@/data/ChatProvider';
import { getCuisine } from '@/data/cuisines';
import { getGovernorate } from '@/data/governorates';
import { useKitchens } from '@/data/KitchensProvider';
import { useListings } from '@/data/ListingsProvider';
import { DEMO_USER_ID } from '@/data/seed';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';

export default function KitchenScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { t, lang, isRTL } = useI18n();
  const { getKitchen } = useKitchens();
  const { listings, getSeller } = useListings();
  const { openThread } = useChat();
  const { user, isAuthenticated } = useAuth();
  const align = isRTL ? 'right' : 'left';
  const rowDir = isRTL ? 'row-reverse' : 'row';

  const kitchen = id ? getKitchen(id) : undefined;
  const dishes = useMemo(
    () => (kitchen ? listings.filter((l) => l.categoryId === 'food' && l.sellerId === kitchen.ownerId) : []),
    [listings, kitchen],
  );

  if (!kitchen) {
    return (
      <ThemedView style={styles.flex}>
        <Stack.Screen options={{ title: '' }} />
        <ListState variant="empty" icon="storefront-outline" title={t('kitchen_notFound')} />
      </ThemedView>
    );
  }

  const owner = getSeller(kitchen.ownerId);
  const gov = kitchen.governorateId ? getGovernorate(kitchen.governorateId) : undefined;
  const isMine = (user?.id ?? DEMO_USER_ID) === kitchen.ownerId;

  const messageKitchen = () => {
    const anchor = dishes[0];
    if (!anchor) return;
    if (isSupabaseConfigured && !isAuthenticated) {
      router.push('/auth');
      return;
    }
    void openThread(anchor.id, kitchen.ownerId).then((threadId) => {
      if (threadId) router.push({ pathname: '/chat/[id]', params: { id: threadId, listingId: anchor.id, sellerId: kitchen.ownerId } });
    });
  };

  const hero = (
    <View>
      <View style={styles.coverWrap}>
        {kitchen.coverUrl ? (
          <Image source={{ uri: kitchen.coverUrl }} style={styles.cover} contentFit="cover" transition={250} />
        ) : (
          <View style={[styles.cover, { backgroundColor: theme.tintSoft, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="restaurant" size={48} color={theme.tint} />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <ThemedText style={[styles.name, { textAlign: align }]}>{kitchen.name}</ThemedText>

        <View style={[styles.metaRow, { flexDirection: rowDir }]}>
          <Ionicons name="location-outline" size={14} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">
            {gov?.name[lang] ?? t('kitchen_homeChef')}
            {owner && owner.ratingCount > 0 ? ` · ★ ${owner.ratingAvg} (${owner.ratingCount})` : ''}
          </ThemedText>
        </View>

        {kitchen.bio !== '' && (
          <ThemedText style={[styles.bio, { textAlign: align }]}>{kitchen.bio}</ThemedText>
        )}

        {kitchen.cuisines.length > 0 && (
          <View style={[styles.chips, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {kitchen.cuisines.map((c) => (
              <View key={c} style={[styles.chip, { backgroundColor: theme.tintSoft }]}>
                <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>
                  {getCuisine(c)?.name[lang] ?? c}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.actions, { flexDirection: rowDir }]}>
          {isMine ? (
            <PressableScale haptic scaleTo={0.97} accessibilityRole="button" accessibilityLabel={t('kitchen_edit')} onPress={() => router.push('/kitchen/edit')} style={[styles.actionBtn, { backgroundColor: theme.backgroundElement, flexDirection: rowDir }]}>
              <Ionicons name="create-outline" size={18} color={theme.text} />
              <ThemedText style={{ fontWeight: '700' }}>{t('kitchen_edit')}</ThemedText>
            </PressableScale>
          ) : (
            dishes.length > 0 && (
              <PressableScale haptic scaleTo={0.97} accessibilityRole="button" accessibilityLabel={t('kitchen_message')} onPress={messageKitchen} style={[styles.actionBtn, { backgroundColor: theme.tint, flexDirection: rowDir }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={theme.onTint} />
                <ThemedText style={{ color: theme.onTint, fontWeight: '800' }}>{t('kitchen_message')}</ThemedText>
              </PressableScale>
            )
          )}
        </View>

        <ThemedText style={[styles.menuTitle, { textAlign: align }]}>{t('kitchen_menu', { count: dishes.length })}</ThemedText>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: kitchen.name, headerTitleStyle: { fontSize: 17, fontWeight: '800' } }} />
      <FlatList
        data={dishes}
        keyExtractor={(l) => l.id}
        numColumns={2}
        ListHeaderComponent={hero}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyMenu}>
            <ThemedText type="small" themeColor="textSecondary">{t('kitchen_noDishes')}</ThemedText>
          </View>
        }
        renderItem={({ item, index }) => <ListingCard listing={item} index={index} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: Spacing.six },
  coverWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: 'rgba(0,0,0,0.06)' },
  cover: { width: '100%', height: '100%' },
  body: { padding: Spacing.three, gap: Spacing.two },
  name: { fontSize: 22, fontWeight: '800' },
  metaRow: { alignItems: 'center', gap: Spacing.one },
  bio: { fontSize: 14, lineHeight: 20 },
  chips: { flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 2, borderRadius: Radius.pill },
  actions: { gap: Spacing.two, marginTop: Spacing.two },
  actionBtn: { alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderRadius: Radius.pill, boxShadow: Shadow.card },
  menuTitle: { fontSize: 18, fontWeight: '800', marginTop: Spacing.three },
  column: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  emptyMenu: { padding: Spacing.five, alignItems: 'center' },
});
