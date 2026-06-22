import { useEffect, useState } from "react";
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
import { useRegisterMutation } from "@/services/features/auth/authApi";
import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
import { setUser } from "@/services/features/auth/authSlice";
import {
  getAuthErrorMessage,
  slugifyTenantCode,
} from "@/services/features/auth/authUtils";

export default function RegisterScreen() {
  const dispatch = useAppDispatch();
  const [tenantName, setTenantName] = useState("");
  const [tenantCode, setTenantCode] = useState("");
  const [tenantCodeEdited, setTenantCodeEdited] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [register, { isLoading }] = useRegisterMutation();

  useEffect(() => {
    if (tenantCodeEdited) return;
    setTenantCode(slugifyTenantCode(tenantName));
  }, [tenantName, tenantCodeEdited]);

  const handleRegister = async () => {
    const trimmedTenantName = tenantName.trim();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedTenantCode = tenantCode.trim().toUpperCase();

    if (!trimmedTenantName || !trimmedName || !trimmedEmail || !password) {
      Alert.alert(
        "Missing fields",
        "Fill in your business, account, and sign-in details.",
      );
      return;
    }

    if (password.length < 8) {
      Alert.alert("Password too short", "Use at least 8 characters.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const user = await register({
        name: trimmedName,
        email: trimmedEmail,
        password,
        tenantName: trimmedTenantName,
        tenantCode: trimmedTenantCode || undefined,
      }).unwrap();

      dispatch(setUser(user));

      Alert.alert(
        "Tenant created",
        user.tenant?.code
          ? `Your organization code is ${user.tenant.code}. We sent a verification code to your email.`
          : "Registration successful. Check your email for a verification code.",
        [{ text: "Continue", onPress: () => router.replace("/") }],
      );
    } catch (error: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Registration failed",
        getAuthErrorMessage(error, "Please try again."),
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
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
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-500/15 border border-emerald-400/20">
              <MaterialIcons name="storefront" size={32} color="#86efac" />
            </View>
            <Text className="text-4xl font-black text-white">
              Create tenant
            </Text>
            <Text className="mt-3 max-w-[320px] text-sm leading-5 text-slate-300">
              Register a new organization, default store, and admin account in
              one step.
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(600).delay(120).springify()}
            className="rounded-[28px] border border-white/10 bg-slate-900/90 p-5"
          >
            <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
              Business name
            </Text>
            <TextInput
              value={tenantName}
              onChangeText={setTenantName}
              placeholder="Sunrise Retail Group"
              placeholderTextColor="#64748b"
              className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
            />

            <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
              Tenant code
            </Text>
            <TextInput
              value={tenantCode}
              onChangeText={(value) => {
                setTenantCodeEdited(true);
                setTenantCode(value.toUpperCase());
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="SUNRISE-RETAIL"
              placeholderTextColor="#64748b"
              className="mb-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
            />
            <Text className="mb-4 text-xs leading-5 text-slate-500">
              Used at sign-in. Leave blank to auto-generate one.
            </Text>

            <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
              Admin name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Jane Doe"
              placeholderTextColor="#64748b"
              className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
            />

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

            <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
              Password
            </Text>
            <View className="mb-1 flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-4">
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="At least 8 characters"
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
            <Text className="mb-6 text-xs leading-5 text-slate-500">
              Minimum 8 characters.
            </Text>

            <Pressable
              onPress={handleRegister}
              disabled={isLoading}
              className="items-center rounded-2xl bg-emerald-500 px-4 py-4 active:opacity-80"
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-bold text-white">
                  Create tenant
                </Text>
              )}
            </Pressable>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(600).delay(240).springify()}
            className="mt-8 flex-row items-center justify-center"
          >
            <Text className="text-sm text-slate-400">Already have access?</Text>
            <Pressable
              onPress={() => router.push("/login")}
              className="ml-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5"
            >
              <Text className="text-xs font-bold uppercase tracking-[2px] text-emerald-200">
                Sign in
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
