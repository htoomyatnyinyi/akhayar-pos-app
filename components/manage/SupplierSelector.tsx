// components/SupplierSelector.tsx
import React, { useState, useMemo } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export default function SupplierSelector({
  value,
  onChange,
  suppliers,
  label = "Supplier",
}: {
  value: string;
  onChange: (supplierId: string, supplierName: string) => void;
  suppliers: any[];
  label?: string;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchText, setSearchText] = useState("");

  const filteredSuppliers = useMemo(() => {
    if (!searchText.trim()) return suppliers;
    return suppliers.filter(
      (sup) =>
        sup.name.toLowerCase().includes(searchText.toLowerCase()) ||
        sup.code?.toLowerCase().includes(searchText.toLowerCase()),
    );
  }, [suppliers, searchText]);

  const selectedSupplier = suppliers.find((sup) => sup.id === value);

  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
        {label}
      </Text>

      <Pressable
        onPress={() => setShowDropdown(!showDropdown)}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
      >
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-base ${selectedSupplier ? "text-white" : "text-slate-400"}`}
          >
            {selectedSupplier ? selectedSupplier.name : "Select a supplier..."}
          </Text>
          <MaterialIcons
            name={showDropdown ? "expand-less" : "expand-more"}
            size={24}
            color="#64748b"
          />
        </View>
      </Pressable>

      {showDropdown && (
        <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search suppliers..."
            placeholderTextColor="#64748b"
            className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
          />

          <ScrollView
            className="max-h-48"
            showsVerticalScrollIndicator
            nestedScrollEnabled
          >
            {filteredSuppliers.length > 0 ? (
              filteredSuppliers.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    onChange(item.id, item.name);
                    setShowDropdown(false);
                    setSearchText("");
                  }}
                  className={`rounded-xl px-4 py-3 ${
                    value === item.id ? "bg-emerald-500/20" : ""
                  }`}
                >
                  <Text className="text-white">{item.name}</Text>
                  <Text className="text-xs text-slate-400">
                    {item.code} • {item.phone || "No phone"}
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text className="py-4 text-center text-slate-400">
                No suppliers found
              </Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
