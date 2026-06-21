import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import {
  Stack,
  useRouter,
  useSegments,
  useRootNavigationState,
} from "expo-router";
import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import Animated, {
  FadeInDown,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "@/services/store/store";
import { initializeOfflineSystem } from "@/services/offline/syncManager";
import "../global.css";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as SplashScreen from "expo-splash-screen";

// // Prevent native splash screen from auto-hiding
// SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { user } = useAppSelector((state) => state.auth);
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const router = useRouter();

  const [showSplash, setShowSplash] = useState(true);
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Hide static splash screen once React Native has mounted
    SplashScreen.hideAsync().catch(() => {});
    initializeOfflineSystem(store.dispatch, store.getState).catch((error) => {
      console.warn("Offline system failed to initialize", error);
    });
  }, []);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1500, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  useEffect(() => {
    if (!navigationState?.key) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/login");
    } else if (user && inAuthGroup) {
      router.replace("/");
    }
  }, [user, segments, navigationState?.key]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" />

          <Stack.Screen name="(auth)" />
        </Stack>

        <StatusBar style="light" />

        {showSplash && (
          <Animated.View
            exiting={FadeOut.duration(600)}
            className="absolute inset-0 bg-[#0b0c10] items-center justify-center z-[99999]"
          >
            <View className="items-center relative">
              {/* Background Glows */}
              <View className="absolute w-64 h-64 bg-[#4f46e5]/10 rounded-full blur-3xl -top-12" />
              <View className="absolute w-48 h-48 bg-[#0284c7]/5 rounded-full blur-3xl -bottom-12" />

              {/* Glowing Icon Container */}
              <Animated.View
                entering={FadeInDown.duration(800).springify()}
                className="w-28 h-28 bg-[#161925] rounded-[36px] items-center justify-center shadow-2xl border border-[#2a2e43] mb-8 relative z-10"
              >
                <MaterialIcons name="store" size={54} color="#60a5fa" />
              </Animated.View>

              {/* Brand Logo Text */}
              <Animated.Text
                entering={FadeInDown.duration(800).delay(200).springify()}
                className="text-4xl font-extrabold text-slate-100 tracking-tight mb-3"
              >
                MidnightCorner
              </Animated.Text>

              {/* Security Indicator */}
              <Animated.View
                entering={FadeInDown.duration(800).delay(400).springify()}
                className="bg-[#4f46e5]/10 px-4 py-1.5 rounded-full border border-[#4f46e5]/20"
              >
                <Text className="text-[#818cf8] font-black tracking-[4px] uppercase text-[9px]">
                  Terminal Security Gateway
                </Text>
              </Animated.View>

              {/* Orbiting Cyber Loader */}
              <Animated.View
                entering={FadeInDown.duration(800).delay(600).springify()}
                className="items-center mt-16"
              >
                <Animated.View
                  style={spinnerStyle}
                  className="w-12 h-12 rounded-full border border-[#4f46e5]/20 items-center justify-center"
                >
                  <View className="w-2.5 h-2.5 rounded-full bg-[#818cf8] absolute top-0 -left-1 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                </Animated.View>
                <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-[3px] mt-6">
                  Establishing Encrypted Link...
                </Text>
              </Animated.View>
            </View>
          </Animated.View>
        )}
      </View>
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
// import { useEffect } from "react";
// import {
//   DarkTheme,
//   DefaultTheme,
//   ThemeProvider,
// } from "@react-navigation/native";
// import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
// import { StatusBar } from "expo-status-bar";
// import "react-native-reanimated";
// import { Provider } from "react-redux";
// import { store } from "@/services/store/store";
// import "../global.css";
// import { useColorScheme } from "@/hooks/use-color-scheme";
// import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";

// export const unstable_settings = {
//   anchor: "(tabs)",
// };

// function InitialLayout() {
//   const colorScheme = useColorScheme();
//   const { user } = useAppSelector((state) => state.auth);
//   const segments = useSegments();
//   const router = useRouter();
//   const navigationState = useRootNavigationState();

//   useEffect(() => {
//     if (!navigationState?.key) return;

//     const inAuthGroup = segments[0] === "(auth)";

//     if (!user && !inAuthGroup) {
//       // Redirect to login if not authenticated and not in auth group
//       router.replace("/login");
//     } else if (user && inAuthGroup) {
//       // Redirect to home if authenticated and in auth group
//       router.replace("/");
//     }
//   }, [user, segments, router, navigationState?.key]);

//   return (
//     <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
//       <Stack screenOptions={{ headerShown: false }}>
//         <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
//         <Stack.Screen name="(auth)" options={{ headerShown: false }} />
//         <Stack.Screen
//           name="modal"
//           options={{ presentation: "modal", title: "Modal" }}
//         />
//       </Stack>
//       <StatusBar style="auto" />
//     </ThemeProvider>
//   );
// }

// export default function RootLayout() {
//   return (
//     <Provider store={store}>
//       <InitialLayout />
//     </Provider>
//   );
// }
