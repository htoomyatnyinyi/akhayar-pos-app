import { useState } from "react";
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useVerifyEmailMutation, useResendOtpMutation } from "@/services/features/auth/authApi";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [code, setCode] = useState("");

  const [verifyEmail, { isLoading }] = useVerifyEmailMutation();
  const [resendOtp, { isLoading: isResending }] = useResendOtpMutation();

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      Alert.alert("Invalid Code", "Please enter a valid 6-digit verification code.");
      return;
    }

    try {
      await verifyEmail({ code }).unwrap();
      Alert.alert("Success", "Email verified successfully!");
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Verification Failed", error?.data?.message || "Invalid verification code.");
    }
  };

  const handleResend = async () => {
    try {
      await resendOtp().unwrap();
      Alert.alert("Success", "A new verification code has been sent to your email.");
    } catch (error: any) {
      Alert.alert("Failed", error?.data?.message || "Failed to resend code.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: "center" }}>
          
          <Pressable 
            onPress={() => router.back()}
            className="absolute left-6 top-6 h-10 w-10 items-center justify-center rounded-full bg-white/5"
          >
            <MaterialIcons name="arrow-back" size={20} color="#fff" />
          </Pressable>

          <View className="mb-10 items-center">
            <View className="mb-6 h-20 w-20 items-center justify-center rounded-3xl bg-sky-500/20">
              <MaterialIcons name="mark-email-read" size={40} color="#38bdf8" />
            </View>
            <Text className="text-3xl font-black text-white">Check your email</Text>
            <Text className="mt-3 text-center text-sm text-slate-400">
              We've sent a 6-digit verification code to{"\n"}
              <Text className="font-bold text-sky-400">{email || "your email"}</Text>
            </Text>
          </View>

          <View className="gap-4">
            <View>
              <Text className="mb-2 ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                Verification Code
              </Text>
              <View className="flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-4 focus:border-sky-500/50">
                <MaterialIcons name="dialpad" size={20} color="#94a3b8" />
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  placeholder="000000"
                  placeholderTextColor="#475569"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoCapitalize="none"
                  className="flex-1 py-4 pl-3 text-lg font-bold tracking-[8px] text-white"
                />
              </View>
            </View>

            <Pressable
              onPress={handleVerify}
              disabled={isLoading}
              className={`mt-4 items-center justify-center rounded-2xl py-4 ${
                isLoading ? "bg-sky-500/50" : "bg-sky-500"
              }`}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-bold text-white">Verify Email</Text>
              )}
            </Pressable>
          </View>

          <View className="mt-8 flex-row items-center justify-center gap-2">
            <Text className="text-sm text-slate-400">Didn't receive the code?</Text>
            <Pressable onPress={handleResend} disabled={isResending}>
              <Text className="text-sm font-bold text-sky-400">
                {isResending ? "Sending..." : "Resend"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
