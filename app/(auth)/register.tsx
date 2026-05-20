import { useState } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useRegisterMutation } from "@/services/features/auth/authApi";
import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
import { setUser } from "@/services/features/auth/authSlice";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { MaterialIcons } from "@expo/vector-icons";

export default function RegisterScreen() {
  const dispatch = useAppDispatch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeInput, setActiveInput] = useState<string | null>(null);

  const [register, { isLoading }] = useRegisterMutation();

  const handleRegister = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const user = await register({ name, email, password }).unwrap();
      dispatch(setUser(user));
      router.replace("/");
    } catch (error: any) {
      console.error("Registration failed:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Registration Failed",
        error?.data?.message ||
          error?.message ||
          "An unexpected error occurred. Please try again.",
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b0c10" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 32,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            entering={FadeInDown.duration(800).springify()}
            className="items-center mb-12 relative"
          >
            <View className="absolute w-32 h-32 bg-indigo-600/20 rounded-full blur-3xl" />
            <View className="w-20 h-20 bg-[#1f2232] rounded-[28px] items-center justify-center shadow-2xl border border-[#2a2e43] mb-6 relative z-10">
              {/* <Text className="text-4xl">✨</Text> */}
              <MaterialIcons name="add-business" size={48} color="#60a5fa" />
            </View>
            <Text className="text-4xl font-extrabold text-slate-100 tracking-tight mb-2">
              Create Account
            </Text>
            <View className="bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/20">
              <Text className="text-indigo-400 font-black tracking-[4px] uppercase text-[9px]">
                Terminal Enrollment
              </Text>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(800).delay(200).springify()}
            className="bg-[#1f2232] p-8 rounded-[40px] border border-[#2a2e43] shadow-2xl"
          >
            <View className="mb-5">
              <Text className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2.5 ml-2">
                Full Name
              </Text>
              <TextInput
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#475569"
                onFocus={() => setActiveInput("name")}
                onBlur={() => setActiveInput(null)}
                className={`bg-[#121420] px-6 py-5 rounded-[20px] text-slate-100 font-bold border transition-colors ${activeInput === "name" ? "border-indigo-500/50 bg-[#161826]" : "border-[#222736]"}`}
              />
            </View>

            <View className="mb-5">
              <Text className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2.5 ml-2">
                Email Address
              </Text>
              <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#475569"
                onFocus={() => setActiveInput("email")}
                onBlur={() => setActiveInput(null)}
                className={`bg-[#121420] px-6 py-5 rounded-[20px] text-slate-100 font-bold border transition-colors ${activeInput === "email" ? "border-indigo-500/50 bg-[#161826]" : "border-[#222736]"}`}
              />
            </View>

            <View className="mb-8 relative">
              <Text className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2.5 ml-2">
                Password
              </Text>
              <TextInput
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                placeholderTextColor="#475569"
                onFocus={() => setActiveInput("password")}
                onBlur={() => setActiveInput(null)}
                className={`bg-[#121420] px-6 py-5 rounded-[20px] text-slate-100 font-bold border pr-14 transition-colors ${activeInput === "password" ? "border-indigo-500/50 bg-[#161826]" : "border-[#222736]"}`}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-[44px]"
              >
                <Text className="text-xl opacity-60">
                  {showPassword ? (
                    <MaterialIcons
                      name="visibility-off"
                      size={18}
                      color={"#ffffff"}
                      className="absolute right-5 opacity-70"
                    />
                  ) : (
                    <MaterialIcons
                      name="visibility"
                      size={18}
                      color={"#ffffff"}
                      className="absolute right-5 opacity-70"
                    />
                  )}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleRegister}
              disabled={isLoading}
              className={`py-5 rounded-[24px] items-center shadow-2xl border border-white/10 ${isLoading ? "bg-slate-800" : "bg-indigo-600 shadow-indigo-600/30"}`}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-black text-lg text-white tracking-wide">
                  Register Terminal
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(800).delay(400).springify()}
            className="items-center mt-10"
          >
            <TouchableOpacity
              onPress={() => router.push("/login")}
              className="p-4 flex-row items-center gap-2"
            >
              <Text className="text-slate-500 font-bold text-sm tracking-wide">
                Already registered?
              </Text>
              <View className="bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20">
                <Text className="text-indigo-400 font-bold text-xs tracking-wide">
                  Sign In
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
