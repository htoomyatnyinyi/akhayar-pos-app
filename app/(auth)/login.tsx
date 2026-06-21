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
import { setUser } from "@/services/features/auth/authSlice";

export default function LoginScreen() {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [login, { isLoading }] = useLoginMutation();

  const handleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const user = await login({ email, password }).unwrap();
      dispatch(setUser(user));
      router.replace("/");
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Login failed", error?.data?.message || "Check your credentials and try again.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24, paddingBottom: 36 }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(600).springify()} className="mb-10">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-[24px] bg-sky-500/15 border border-sky-400/20">
              <MaterialIcons name="point-of-sale" size={32} color="#7dd3fc" />
            </View>
            <Text className="text-4xl font-black text-white">Welcome back</Text>
            <Text className="mt-3 max-w-[320px] text-sm leading-5 text-slate-300">
              Sign in to manage sales, stock, and operations from a single dashboard.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(120).springify()} className="rounded-[28px] border border-white/10 bg-slate-900/90 p-5">
            <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="name@company.com"
              placeholderTextColor="#64748b"
              className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
            />

            <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">Password</Text>
            <View className="mb-6 flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-4">
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                className="flex-1 py-4 text-base text-white"
              />
              <Pressable onPress={() => setShowPassword((value) => !value)} className="pl-3">
                <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={22} color="#cbd5e1" />
              </Pressable>
            </View>

            <Pressable onPress={handleLogin} disabled={isLoading} className="items-center rounded-2xl bg-sky-500 px-4 py-4 active:opacity-80">
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text className="text-base font-bold text-white">Sign in</Text>}
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(240).springify()} className="mt-8 flex-row items-center justify-center">
            <Text className="text-sm text-slate-400">Need an account?</Text>
            <Pressable onPress={() => router.push("/register")} className="ml-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1.5">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-sky-200">Register</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

