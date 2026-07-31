import NetInfo from "@react-native-community/netinfo";

export async function isOnline() {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

export function subscribeToOnlineStatus(listener: (online: boolean) => void) {
  return NetInfo.addEventListener((state) => {
    listener(Boolean(state.isConnected && state.isInternetReachable !== false));
  });
}

/*

// services/offline/network.ts
import NetInfo from "@react-native-community/netinfo";
import { POS_API_URL } from "@/services/api/remoteApi";

let lastOnlineStatus = false;

export async function isOnline(): Promise<boolean> {
  try {
    // 1. Quick NetInfo check (fast)
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      lastOnlineStatus = false;
      return false;
    }

    // 2. Verify with a real HTTP request to the server
    //    This confirms the server is actually reachable.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(POS_API_URL + "/health", {
      // or any lightweight endpoint
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const online = response.ok;
    lastOnlineStatus = online;
    return online;
  } catch (error) {
    // If fetch fails (timeout, network error), assume offline.
    console.warn("⚠️ isOnline check failed:", error);
    lastOnlineStatus = false;
    return false;
  }
}

// Subscribe to network changes (for UI updates)
export function subscribeToOnlineStatus(callback: (online: boolean) => void) {
  const unsubscribe = NetInfo.addEventListener((state) => {
    // Use the same robust check when network changes
    isOnline().then(callback);
  });
  // Immediately check once
  isOnline().then(callback);
  return unsubscribe;
}

*/
