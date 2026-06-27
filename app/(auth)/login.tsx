import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { MaterialIcons } from "@expo/vector-icons";
import { useLoginMutation } from "@/services/features/auth/authApi";
import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import { setLastTenantCode, setUser } from "@/services/features/auth/authSlice";
import { getAuthErrorMessage } from "@/services/features/auth/authUtils";

export default function LoginScreen() {
  const dispatch = useAppDispatch();
  const savedTenantCode = useAppSelector((state) => state.auth.lastTenantCode);
  const [tenantCode, setTenantCode] = useState(savedTenantCode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [login, { isLoading }] = useLoginMutation();

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedTenantCode = tenantCode.trim().toUpperCase();

    if (!trimmedEmail || !password) {
      Alert.alert("Missing fields", "Enter your email and password.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    dispatch(setLastTenantCode(trimmedTenantCode));

    try {
      const user = await login({
        email: trimmedEmail,
        password,
        tenantCode: trimmedTenantCode || undefined,
      }).unwrap();
      dispatch(setUser(user));
      router.replace("/");
    } catch (error: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Login failed",
        getAuthErrorMessage(
          error,
          "Check your tenant code, email, and password.",
        ),
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950" style={{ flex: 1, backgroundColor: '#020617' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 24,
            paddingBottom: 36,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            entering={FadeInDown.duration(600).springify()}
            className="mb-10"
          >
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-[24px] bg-sky-500/15 border border-sky-400/20">
              <MaterialIcons name="point-of-sale" size={32} color="#7dd3fc" />
            </View>
            <Text className="text-4xl font-black text-white">Welcome back</Text>
            <Text className="mt-3 max-w-[320px] text-sm leading-5 text-slate-300">
              Sign in to your tenant workspace to manage sales, stock, and
              operations.
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(600).delay(120).springify()}
            className="rounded-[28px] border border-white/10 bg-slate-900/90 p-5"
          >
            <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
              Tenant code
            </Text>
            <TextInput
              value={tenantCode}
              onChangeText={(value) => setTenantCode(value.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="MY-STORE"
              placeholderTextColor="#64748b"
              className="mb-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
            />
            <Text className="mb-4 text-xs leading-5 text-slate-500">
              Required when your email is linked to more than one organization.
            </Text>

            <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="name@company.com"
              placeholderTextColor="#64748b"
              className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
            />

            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-xs font-bold uppercase tracking-[3px] text-slate-400">
                Password
              </Text>
              <Pressable onPress={() => router.push("/(auth)/forgot-password")}>
                <Text className="text-xs font-bold text-sky-400">Forgot?</Text>
              </Pressable>
            </View>
            <View className="mb-6 flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-4">
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                className="flex-1 py-4 text-base text-white"
              />
              <Pressable
                onPress={() => setShowPassword((value) => !value)}
                className="pl-3"
              >
                <MaterialIcons
                  name={showPassword ? "visibility-off" : "visibility"}
                  size={22}
                  color="#cbd5e1"
                />
              </Pressable>
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={isLoading}
              className="items-center rounded-2xl bg-sky-500 px-4 py-4 active:opacity-80"
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-bold text-white">Sign in</Text>
              )}
            </Pressable>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(600).delay(240).springify()}
            className="mt-8 flex-row items-center justify-center"
          >
            <Text className="text-sm text-slate-400">
              Need a tenant account?
            </Text>
            <Pressable
              onPress={() => router.push("/register")}
              className="ml-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1.5"
            >
              <Text className="text-xs font-bold uppercase tracking-[2px] text-sky-200">
                Register
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
