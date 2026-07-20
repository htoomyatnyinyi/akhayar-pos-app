// import { useState } from "react";
// import {
//   View,
//   Text,
//   TextInput,
//   Pressable,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
//   Alert,
//   ActivityIndicator,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { useRouter } from "expo-router";
// import { MaterialIcons } from "@expo/vector-icons";
// import { useForgotPasswordMutation } from "@/services/features/auth/authApi";

// export default function ForgotPasswordScreen() {
//   const router = useRouter();
//   const [email, setEmail] = useState("");

//   const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

//   const handleReset = async () => {
//     if (!email) {
//       Alert.alert("Required", "Please enter your email address.");
//       return;
//     }

//     try {
//       await forgotPassword({ email }).unwrap();
//       Alert.alert(
//         "Success",
//         "Instructions to reset your password have been sent to your email.",
//       );
//       router.push({ pathname: "/(auth)/reset-password", params: { email } });
//     } catch (error: any) {
//       Alert.alert(
//         "Reset Failed",
//         error?.data?.message || "Failed to send reset instructions.",
//       );
//     }
//   };

//   return (
//     <SafeAreaView className="flex-1 bg-slate-950">
//       <KeyboardAvoidingView
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//         className="flex-1"
//       >
//         <ScrollView
//           contentContainerStyle={{
//             flexGrow: 1,
//             padding: 24,
//             justifyContent: "center",
//           }}
//         >
//           <Pressable
//             onPress={() => router.back()}
//             className="absolute left-6 top-6 h-10 w-10 items-center justify-center rounded-full bg-white/5"
//           >
//             <MaterialIcons name="arrow-back" size={20} color="#fff" />
//           </Pressable>

//           <View className="mb-10 items-center">
//             <View className="mb-6 h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/20">
//               <MaterialIcons name="lock-reset" size={40} color="#fbbf24" />
//             </View>
//             <Text className="text-3xl font-black text-white">
//               Reset Password
//             </Text>
//             <Text className="mt-3 text-center text-sm text-slate-400">
//               Enter the email address associated with your account and we'll
//               send you a link to reset your password.
//             </Text>
//           </View>

//           <View className="gap-4">
//             <View>
//               <Text className="mb-2 ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">
//                 Email Address
//               </Text>
//               <View className="flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-4 focus:border-amber-500/50">
//                 <MaterialIcons name="email" size={20} color="#94a3b8" />
//                 <TextInput
//                   value={email}
//                   onChangeText={setEmail}
//                   placeholder="name@company.com"
//                   placeholderTextColor="#475569"
//                   keyboardType="email-address"
//                   autoCapitalize="none"
//                   className="flex-1 py-4 pl-3 text-base text-white"
//                 />
//               </View>
//             </View>

//             <Pressable
//               onPress={handleReset}
//               disabled={isLoading}
//               className={`mt-4 items-center justify-center rounded-2xl py-4 ${
//                 isLoading ? "bg-amber-500/50" : "bg-amber-500"
//               }`}
//             >
//               {isLoading ? (
//                 <ActivityIndicator color="#fff" />
//               ) : (
//                 <Text className="text-base font-bold text-white">
//                   Send Instructions
//                 </Text>
//               )}
//             </Pressable>
//           </View>
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }
