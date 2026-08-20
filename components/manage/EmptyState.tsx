// components/EmptyState.tsx
import React from "react";
import { Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export default function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <View className="items-center justify-center py-12 px-6">
      <MaterialIcons name={icon as any} size={56} color="#475569" />
      <Text className="mt-4 text-xl font-bold text-white">{title}</Text>
      <Text className="mt-2 text-center text-sm text-slate-400">
        {description}
      </Text>
    </View>
  );
}
