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
  return (
    <Provider store={store}>
      <SyncInitializer />
      <RootLayoutNav />
    </Provider>
  );
}
