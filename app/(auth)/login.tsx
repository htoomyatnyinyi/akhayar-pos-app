import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import {
  useLoginMutation,
  usePlatformLoginMutation,
} from "@/services/features/auth/authApi";
import { useAppDispatch } from "@/services/store/hooks";
import { setCredentials } from "@/services/features/auth/authSlice";
import { saveToken, saveTenantId, saveUser } from "@/utils/secureStorage";
import { Ionicons } from "@expo/vector-icons";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantCode, setTenantCode] = useState("");
  const [isPlatform, setIsPlatform] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [login, { isLoading: loginLoading }] = useLoginMutation();
  const [platformLogin, { isLoading: platformLoading }] =
    usePlatformLoginMutation();

  const isLoading = loginLoading || platformLoading;

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (!isPlatform && !tenantCode) {
      Alert.alert("Error", "Tenant code is required.");
      return;
    }

    try {
      let result: any;
      if (isPlatform) {
        result = await platformLogin({ email, password }).unwrap();
        const userData = {
          id: result.admin.id,
          name: result.admin.name,
          email: result.admin.email,
          role: result.admin.role,
          stores: [],
          tenantId: null,
        };
        await saveToken(result.token);
        await saveUser(userData);
        dispatch(
          setCredentials({
            user: userData,
            token: result.token,
            tenantId: userData.tenantId,
          }),
        );
      } else {
        result = await login({
          email,
          password,
          tenantCode: tenantCode.trim(),
        }).unwrap();
        await saveToken(result.token);
        await saveTenantId(result.user.tenantId);
        await saveUser(result.user);
        dispatch(
          setCredentials({
            user: result.user,
            token: result.token,
            tenantId: result.user.tenantId,
            stores: result.user.stores || [],
          }),
        );
      }
      router.replace("/");
    } catch (err: any) {
      const message = err.data?.message || err.message || "Login failed";
      Alert.alert("Login Failed", message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerClassName="flex-1 justify-center px-6">
        <View className="items-center mb-8">
          <Text className="text-3xl font-bold text-indigo-600">Oasis POS</Text>
          <Text className="text-gray-500 mt-1">ERP & POS System</Text>
        </View>

        <View className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <Text className="text-xl font-bold mb-6 text-center">
            {isPlatform ? "Platform Admin Login" : "Tenant Login"}
          </Text>

          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Email
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                placeholder="admin@demo.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Password
              </Text>
              <View className="flex-row items-center border border-gray-300 rounded-lg">
                <TextInput
                  className="flex-1 px-4 py-3 text-base"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="px-3"
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {!isPlatform && (
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Tenant Code
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                  placeholder="e.g., DEMO-TNT"
                  value={tenantCode}
                  onChangeText={setTenantCode}
                  autoCapitalize="characters"
                />
              </View>
            )}

            <View className="flex-row items-center justify-between mt-2">
              <View className="flex-row items-center">
                <Switch
                  value={isPlatform}
                  onValueChange={setIsPlatform}
                  trackColor={{ false: "#D1D5DB", true: "#6366F1" }}
                />
                <Text className="ml-2 text-sm text-gray-600">
                  Platform Admin
                </Text>
              </View>
              <TouchableOpacity>
                <Text className="text-sm text-indigo-600">
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isLoading}
              className={`bg-indigo-600 py-3 rounded-lg mt-4 ${isLoading ? "opacity-50" : ""}`}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-bold text-base">
                  {isPlatform ? "Sign In as Admin" : "Sign In"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text className="text-center text-gray-400 text-xs mt-6">
          v1.0.0 • Offline-First POS
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
