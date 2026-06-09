import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IoniconName; color: ColorValue; size: number }) {
  return <Ionicons name={name} color={color} size={size} />;
}

const tabIcon =
  (name: IoniconName) =>
  function TabIconRenderer({ color, size }: { color: ColorValue; size: number }) {
    return <TabIcon name={name} color={color} size={size} />;
  };

export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
      }}>
      <Tabs.Screen name="index" options={{ title: t('tab_home'), tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="search" options={{ title: t('tab_search'), tabBarIcon: tabIcon('search') }} />
      <Tabs.Screen name="sell" options={{ title: t('tab_sell'), tabBarIcon: tabIcon('add-circle') }} />
      <Tabs.Screen name="chats" options={{ title: t('tab_chats'), tabBarIcon: tabIcon('chatbubble-ellipses') }} />
      <Tabs.Screen name="profile" options={{ title: t('tab_profile'), tabBarIcon: tabIcon('person') }} />
    </Tabs>
  );
}
