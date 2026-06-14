import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider } from '@/data/AuthProvider';
import { ChatProvider } from '@/data/ChatProvider';
import { KitchensProvider } from '@/data/KitchensProvider';
import { ListingsProvider } from '@/data/ListingsProvider';
import { LanguageProvider } from '@/i18n/LanguageProvider';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <LanguageProvider>
            <AuthProvider>
              <ListingsProvider>
                <ChatProvider>
                  <KitchensProvider>
                    <AnimatedSplashOverlay />
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen name="listing/[id]" options={{ headerShown: true }} />
                      <Stack.Screen name="section/[category]" options={{ headerShown: true }} />
                      <Stack.Screen name="chat/[id]" options={{ headerShown: true }} />
                      <Stack.Screen name="kitchen/[id]" options={{ headerShown: true }} />
                      <Stack.Screen name="kitchen/edit" options={{ presentation: 'modal', headerShown: false }} />
                      <Stack.Screen name="saved" options={{ headerShown: true }} />
                      <Stack.Screen name="discover" options={{ headerShown: false }} />
                      <Stack.Screen name="auth" options={{ presentation: 'modal', headerShown: false }} />
                      <Stack.Screen name="reset-password" options={{ headerShown: true }} />
                    </Stack>
                    <StatusBar style="auto" />
                  </KitchensProvider>
                </ChatProvider>
              </ListingsProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
