import { View, Text } from "react-native";
import React from "react";

const resetPassword = () => {
  return (
    <View>
      <Text>reset-password</Text>
    </View>
  );
};

export default resetPassword;
// import { useState } from "react";
// import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { useRouter, useLocalSearchParams } from "expo-router";
// import { MaterialIcons } from "@expo/vector-icons";
// import { useResetPasswordMutation } from "@/services/features/auth/authApi";

// export default function ResetPasswordScreen() {
//   const router = useRouter();
//   const { email } = useLocalSearchParams();

//   const [code, setCode] = useState("");
//   const [newPassword, setNewPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);

//   const [resetPassword, { isLoading }] = useResetPasswordMutation();

//   const handleReset = async () => {
//     if (!code || !newPassword) {
//       Alert.alert("Required", "Please fill in all fields.");
//       return;
//     }

//     try {
//       await resetPassword({
//         email: email as string,
//         code,
//         newPassword
//       }).unwrap();

//       Alert.alert("Success", "Your password has been reset successfully. Please log in.");
//       router.replace("/(auth)/login");
//     } catch (error: any) {
//       Alert.alert("Failed", error?.data?.message || "Failed to reset password.");
//     }
//   };

//   return (
//     <SafeAreaView className="flex-1 bg-slate-950">
//       <KeyboardAvoidingView
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//         className="flex-1"
//       >
//         <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: "center" }}>

//           <Pressable
//             onPress={() => router.back()}
//             className="absolute left-6 top-6 h-10 w-10 items-center justify-center rounded-full bg-white/5"
//           >
//             <MaterialIcons name="arrow-back" size={20} color="#fff" />
//           </Pressable>

//           <View className="mb-10 items-center">
//             <View className="mb-6 h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/20">
//               <MaterialIcons name="vpn-key" size={40} color="#10b981" />
//             </View>
//             <Text className="text-3xl font-black text-white">Create New Password</Text>
//             <Text className="mt-3 text-center text-sm text-slate-400">
//               Enter the code sent to <Text className="font-bold text-emerald-400">{email}</Text> and your new password.
//             </Text>
//           </View>

//           <View className="gap-4">
//             <View>
//               <Text className="mb-2 ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">
//                 Verification Code
//               </Text>
//               <View className="flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-4 focus:border-emerald-500/50">
//                 <MaterialIcons name="dialpad" size={20} color="#94a3b8" />
//                 <TextInput
//                   value={code}
//                   onChangeText={setCode}
//                   placeholder="000000"
//                   placeholderTextColor="#475569"
//                   keyboardType="number-pad"
//                   autoCapitalize="none"
//                   className="flex-1 py-4 pl-3 text-base font-bold tracking-[4px] text-white"
//                 />
//               </View>
//             </View>

//             <View>
//               <Text className="mb-2 ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">
//                 New Password
//               </Text>
//               <View className="flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-4 focus:border-emerald-500/50">
//                 <MaterialIcons name="lock" size={20} color="#94a3b8" />
//                 <TextInput
//                   value={newPassword}
//                   onChangeText={setNewPassword}
//                   placeholder="Min. 8 characters"
//                   placeholderTextColor="#475569"
//                   secureTextEntry={!showPassword}
//                   className="flex-1 py-4 pl-3 text-base text-white"
//                 />
//                 <Pressable onPress={() => setShowPassword(!showPassword)} className="p-2">
//                   <MaterialIcons
//                     name={showPassword ? "visibility-off" : "visibility"}
//                     size={20}
//                     color="#94a3b8"
//                   />
//                 </Pressable>
//               </View>
//             </View>

//             <Pressable
//               onPress={handleReset}
//               disabled={isLoading}
//               className={`mt-4 items-center justify-center rounded-2xl py-4 ${
//                 isLoading ? "bg-emerald-500/50" : "bg-emerald-500"
//               }`}
//             >
//               {isLoading ? (
//                 <ActivityIndicator color="#fff" />
//               ) : (
//                 <Text className="text-base font-bold text-white">Reset Password</Text>
//               )}
//             </Pressable>
//           </View>

//         </ScrollView>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }
