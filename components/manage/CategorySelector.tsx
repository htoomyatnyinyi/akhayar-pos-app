// components/CategorySelector.tsx
import React, { useState, useMemo } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export default function CategorySelector({
  value,
  onChange,
  categories,
  onAddCategory,
  label = "Category",
}: {
  value: string;
  onChange: (categoryId: string, categoryName: string) => void;
  categories: any[];
  onAddCategory: () => void;
  label?: string;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchText, setSearchText] = useState("");

  const filteredCategories = useMemo(() => {
    if (!searchText.trim()) return categories;
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(searchText.toLowerCase()),
    );
  }, [categories, searchText]);

  const selectedCategory = categories.find((cat) => cat.id === value);

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
            className={`text-base ${selectedCategory ? "text-white" : "text-slate-400"}`}
          >
            {selectedCategory ? selectedCategory.name : "Select a category..."}
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
            placeholder="Search categories..."
            placeholderTextColor="#64748b"
            className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
          />

          <ScrollView
            className="max-h-48"
            showsVerticalScrollIndicator
            nestedScrollEnabled
          >
            {filteredCategories.length > 0 ? (
              filteredCategories.map((item) => (
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
                  {item.description && (
                    <Text className="text-xs text-slate-400">
                      {item.description}
                    </Text>
                  )}
                </Pressable>
              ))
            ) : (
              <View className="py-4">
                <Text className="text-center text-slate-400">
                  No categories found
                </Text>
                {searchText.trim() && (
                  <Pressable
                    onPress={() => {
                      onAddCategory();
                      setShowDropdown(false);
                      setSearchText("");
                    }}
                    className="mt-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3"
                  >
                    <Text className="text-center text-emerald-200">
                      Create "{searchText.trim()}"
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
