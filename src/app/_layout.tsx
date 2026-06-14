import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRootNavigationState, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/data/AuthProvider';
import { ChatProvider } from '@/data/ChatProvider';
import { KitchensProvider } from '@/data/KitchensProvider';
import { ListingsProvider } from '@/data/ListingsProvider';
import { LanguageProvider } from '@/i18n/LanguageProvider';

/**
 * Sends a not-signed-in visitor to the welcome screen once per cold launch.
 * Authenticated users (restored session) skip straight to the app. Runs after
 * the session restore resolves so we never flash welcome at a returning user.
 */
function OnboardingGate() {
  const { status } = useAuth();
  const router = useRouter();
  const navState = useRootNavigationState();
  const decided = useRef(false);

  useEffect(() => {
    // Wait for both session-restore AND the root navigator to mount — replacing
    // before navState.key exists silently no-ops on first paint.
    if (decided.current || status === 'loading' || !navState?.key) return;
    decided.current = true;
    if (status === 'guest') router.replace('/welcome');
  }, [status, navState?.key, router]);

  return null;
}

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
                    <OnboardingGate />
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen name="welcome" options={{ animation: 'fade', gestureEnabled: false }} />
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
