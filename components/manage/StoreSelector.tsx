// components/StoreSelector.tsx
import React, { useState, useMemo } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export default function StoreSelector({
  value,
  onChange,
  stores,
  label = "Store",
}: {
  value: string;
  onChange: (storeId: string, storeName: string) => void;
  stores: any[];
  label?: string;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchText, setSearchText] = useState("");

  const filteredStores = useMemo(() => {
    if (!searchText.trim()) return stores;
    return stores.filter(
      (store) =>
        store.name.toLowerCase().includes(searchText.toLowerCase()) ||
        store.code?.toLowerCase().includes(searchText.toLowerCase()),
    );
  }, [stores, searchText]);

  const selectedStore = stores.find(
    (store) => store.id === value || (store.remoteId && store.remoteId === value),
  );

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
          <View className="flex-row items-center flex-1">
            <MaterialIcons
              name="storefront"
              size={20}
              color={selectedStore ? "#38bdf8" : "#64748b"}
            />
            <Text
              className={`ml-2 text-base ${selectedStore ? "text-white font-semibold" : "text-slate-400"}`}
            >
              {selectedStore ? `${selectedStore.name}${selectedStore.code ? ` (${selectedStore.code})` : ""}` : "Select a store..."}
            </Text>
          </View>
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
            placeholder="Search stores..."
            placeholderTextColor="#64748b"
            className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
          />
          <ScrollView
            className="max-h-48"
            showsVerticalScrollIndicator
            nestedScrollEnabled
          >
            {filteredStores.length > 0 ? (
              filteredStores.map((store) => {
                const isSelected =
                  value === store.id || (store.remoteId && value === store.remoteId);
                return (
                  <Pressable
                    key={store.id}
                    onPress={() => {
                      onChange(store.id, store.name);
                      setShowDropdown(false);
                      setSearchText("");
                    }}
                    className={`rounded-xl px-4 py-3 mb-1 flex-row items-center justify-between ${
                      isSelected
                        ? "bg-sky-500/20 border border-sky-500/30"
                        : "bg-white/5"
                    }`}
                  >
                    <View className="flex-1">
                      <Text className="text-white font-semibold">{store.name}</Text>
                      <Text className="text-xs text-slate-400">
                        {store.code ? `Code: ${store.code} • ` : ""}{store.address || "No address"}
                      </Text>
                    </View>
                    {isSelected && (
                      <MaterialIcons name="check" size={18} color="#38bdf8" />
                    )}
                  </Pressable>
                );
              })
            ) : (
              <Text className="py-4 text-center text-slate-400">
                No stores found
              </Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
