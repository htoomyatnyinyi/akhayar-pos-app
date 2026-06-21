import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRootNavigationState, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import "../global.css";
import { store, persistor } from "@/services/store/store";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { initializeOfflineSystem } from "@/services/offline/syncManager";

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { user } = useAppSelector((state) => state.auth);
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const router = useRouter();

  useEffect(() => {
    initializeOfflineSystem(store.dispatch, store.getState).catch((error) => {
      console.warn("Offline system failed to initialize", error);
    });
  }, []);

  useEffect(() => {
    if (!navigationState?.key) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/login");
    }

    if (user && inAuthGroup) {
      router.replace("/");
    }
  }, [user, segments, navigationState?.key, router]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <RootNavigator />
      </PersistGate>
    </Provider>
  );
}

