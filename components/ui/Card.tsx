import { View } from "react-native";

export function Card({ children, className = "" }) {
  return (
    <View className={`bg-white rounded-xl shadow p-4 ${className}`}>
      {children}
    </View>
  );
}
