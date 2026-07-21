import "../global.css";
import { useEffect } from "react";
import {
  Slot,
  useRouter,
  useSegments,
  useRootNavigationState,
} from "expo-router";
import { Provider } from "react-redux";
import { store } from "@/services/store/store";
import { SyncInitializer } from "@/components/SyncInitializer";
import { useAppSelector } from "@/services/store/hooks";
import { db, migrations, useMigrations } from "@/services/offline/db";
import { View, ActivityIndicator, Text } from "react-native";

function RootLayoutNav() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    // Wait until the root navigation is mounted before redirecting
    if (!rootNavigationState?.key) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to the login page if not authenticated
      setTimeout(() => router.replace("/(auth)/login"), 1);
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect away from the login page if authenticated
      setTimeout(() => router.replace("/"), 1);
    }
  }, [isAuthenticated, segments, rootNavigationState]);

  return <Slot />;
}

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "red" }}>DB Migration Error: {error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8, color: "#666" }}>Preparing database…</Text>
      </View>
    );
  }

  return (
    <Provider store={store}>
      <SyncInitializer />
      <RootLayoutNav />
    </Provider>
  );
}

