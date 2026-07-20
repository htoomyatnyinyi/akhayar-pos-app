import { TextInput, View, Text } from "react-native";

export function Input({ label, error, className, ...props }) {
  return (
    <View className="w-full">
      {label && (
        <Text className="text-sm font-medium mb-1 text-gray-700">{label}</Text>
      )}
      <TextInput
        className={`border border-gray-300 rounded-lg px-4 py-2 text-base ${className}`}
        placeholderTextColor="#9CA3AF"
        {...props}
      />
      {error && <Text className="text-red-500 text-sm mt-1">{error}</Text>}
    </View>
  );
}
