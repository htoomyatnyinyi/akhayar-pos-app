import { OfflineSyncStatus } from "@/components/offline-sync-status";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  initializeOfflineSystem,
  syncNow,
} from "@/services/offline/syncManager";
import { persistor, store } from "@/services/store/store";
import { PreventRemoveContext } from "@react-navigation/core";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, AppState, Text, View } from "react-native";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import "../global.css";

// NavigationGuard runs *inside* the Stack so router hooks have the navigation context they need.
function NavigationGuard() {
  const { user } = useAppSelector((state) => state.auth);
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!navigationState?.key) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/login");
    }

    if (user && inAuthGroup) {
      router.replace("/");
    }

    // Mark ready after first navigation decision
    setIsReady(true);
  }, [user, segments, navigationState?.key, router]);

  // Show a loading screen until navigation is resolved
  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#020617",
        }}
      >
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return null;
}

function RootNavigator() {
  const colorScheme = useColorScheme();

  // Provide the PreventRemoveContext that @react-navigation/native-stack v7
  // requires but expo-router's NavigationContainer doesn't supply.
  const setPreventRemove = useCallback(() => {}, []);
  const preventRemoveContextValue = useMemo(
    () => ({ setPreventRemove, preventedRoutes: {} }),
    [setPreventRemove],
  );

  useEffect(() => {
    initializeOfflineSystem(store.dispatch, store.getState).catch((error) => {
      console.warn("Offline system failed to initialize", error);
    });
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void syncNow(store.dispatch, store.getState);
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <PreventRemoveContext.Provider value={preventRemoveContextValue}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
        </Stack>
        <OfflineSyncStatus />
      </PreventRemoveContext.Provider>
      <NavigationGuard />
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate
        loading={
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#020617",
            }}
          >
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={{ color: "#94a3b8", marginTop: 12 }}>Loading...</Text>
          </View>
        }
        persistor={persistor}
      >
        <RootNavigator />
      </PersistGate>
    </Provider>
  );
}
