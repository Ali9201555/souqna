import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';
import { useI18n } from '@/i18n/LanguageProvider';

export default function TabsLayout() {
  const { t } = useI18n();

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: t('tab_home') }} />
      <Tabs.Screen name="search" options={{ title: t('tab_search') }} />
      <Tabs.Screen name="sell" options={{ title: t('tab_sell') }} />
      <Tabs.Screen name="chats" options={{ title: t('tab_chats') }} />
      <Tabs.Screen name="profile" options={{ title: t('tab_profile') }} />
    </Tabs>
  );
}
