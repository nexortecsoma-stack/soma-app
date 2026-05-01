import * as Font from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/hooks/AuthContext";
import { UIProvider } from "@/hooks/UIContext";
import { CustomModal } from "@/components/ui/CustomModal";
import { AppDrawer } from "@/components/ui/AppDrawer";
import { AppToast } from "@/components/ui/AppToast";
import { initializeRevenueCat, SubscriptionProvider } from "@/lib/revenuecat";
import "@/services/background-location-task";

/*
 * Fontes carregadas a partir de assets/fonts/ (copiadas dos pacotes npm).
 * O Metro serve esses arquivos como URLs relativas acessíveis pelo proxy do Replit,
 * então funciona tanto na web quanto no native sem depender de CDN externo.
 *
 * Ionicons: usa o método canônico Ionicons.loadFont() para evitar conflito com o
 * asset pré-bundled no Expo Go Android.
 */
const INTER_FONTS = {
  Inter_400Regular: require("../assets/fonts/Inter_400Regular.ttf"),
  Inter_500Medium: require("../assets/fonts/Inter_500Medium.ttf"),
  Inter_600SemiBold: require("../assets/fonts/Inter_600SemiBold.ttf"),
  Inter_700Bold: require("../assets/fonts/Inter_700Bold.ttf"),
};

// initializeRevenueCat já trata todos os erros internamente
initializeRevenueCat();

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 1000 * 30 },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F4F7FB" } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(public)" />
      <Stack.Screen name="(private)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function load() {
      // Timeout de segurança: nunca bloquear a UI por mais de 2s.
      // As fontes do CDN (+html.tsx) servem de backup enquanto o Metro carrega.
      const timeout = new Promise<void>((res) => setTimeout(res, 2000));
      try {
        await Promise.race([
          Promise.all([Font.loadAsync(INTER_FONTS), Ionicons.loadFont()]),
          timeout,
        ]);
      } catch (e) {
        if (__DEV__) console.warn("[fonts] falha ao carregar fontes:", e);
      } finally {
        setReady(true);
        SplashScreen.hideAsync();
      }
    }
    void load();
  }, []);

  // Aguarda carregamento de fontes em todas as plataformas.
  // Assets são servidos localmente pelo Metro — delay é imperceptível.
  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <SubscriptionProvider>
                  <UIProvider>
                    <StatusBar style="light" />
                    <RootLayoutNav />
                    <AppDrawer />
                    <CustomModal />
                    <AppToast />
                  </UIProvider>
                </SubscriptionProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
