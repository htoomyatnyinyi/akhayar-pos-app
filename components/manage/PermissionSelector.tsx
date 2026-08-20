// components/PermissionSelector.tsx
import React from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { STAFF_PERMISSIONS } from "@/constants/permissions";

export default function PermissionSelector({
  value,
  onChange,
}: {
  value: string[];
  onChange: (permissions: string[]) => void;
}) {
  const toggle = (permission: string) => {
    onChange(
      value.includes(permission)
        ? value.filter((item) => item !== permission)
        : [...value, permission],
    );
  };

  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
        Permissions
      </Text>
      <View className="rounded-2xl border border-white/10 bg-white/5 p-2">
        {STAFF_PERMISSIONS.map(([permission, label]) => {
          const selected = value.includes(permission);
          return (
            <Pressable
              key={permission}
              onPress={() => toggle(permission)}
              className="flex-row items-center rounded-xl px-2 py-2.5"
            >
              <MaterialIcons
                name={selected ? "check-box" : "check-box-outline-blank"}
                size={22}
                color={selected ? "#34d399" : "#64748b"}
              />
              <Text className="ml-3 flex-1 text-sm text-slate-200">
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
