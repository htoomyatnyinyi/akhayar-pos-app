// components/RoleSelector.tsx
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export default function RoleSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (role: string) => void;
}) {
  const roles = [
    { label: "Admin", value: "ADMIN", description: "Full system access" },
    {
      label: "Manager",
      value: "MANAGER",
      description: "Manage store operations",
    },
    {
      label: "Cashier",
      value: "CASHIER",
      description: "Process sales and transactions",
    },
    {
      label: "Accountant",
      value: "ACCOUNTANT",
      description: "Financial and reporting access",
    },
  ];

  const [showDropdown, setShowDropdown] = useState(false);
  const selectedRole = roles.find((r) => r.value === value);

  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
        Role
      </Text>
      <Pressable
        onPress={() => setShowDropdown(!showDropdown)}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
      >
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-base ${selectedRole ? "text-white" : "text-slate-400"}`}
          >
            {selectedRole ? selectedRole.label : "Select a role..."}
          </Text>
          <MaterialIcons
            name={showDropdown ? "expand-less" : "expand-more"}
            size={24}
            color="#64748b"
          />
        </View>
      </Pressable>

      {showDropdown && (
        <View className="mt-2 rounded-2xl border border-white/10 bg-slate-900 p-2">
          <ScrollView className="max-h-48" nestedScrollEnabled>
            {roles.map((role) => (
              <Pressable
                key={role.value}
                onPress={() => {
                  onChange(role.value);
                  setShowDropdown(false);
                }}
                className={`rounded-xl px-4 py-3 ${
                  value === role.value ? "bg-emerald-500/20" : ""
                }`}
              >
                <Text className="text-white">{role.label}</Text>
                <Text className="text-xs text-slate-400">
                  {role.description}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
