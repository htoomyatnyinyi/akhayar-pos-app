// components/Field.tsx
import React from "react";
import { Text, TextInput, View } from "react-native";

export default function Field({
  label,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?:
    | "default"
    | "decimal-pad"
    | "numeric"
    | "email-address"
    | "phone-pad";
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        placeholderTextColor="#64748b"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        className={`rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white ${
          multiline ? "min-h-[100px] text-left align-top" : ""
        }`}
      />
    </View>
  );
}
