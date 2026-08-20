// components/DateField.tsx
import React, { useState } from "react";
import { Modal, Platform, Text, TouchableOpacity, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialIcons } from "@expo/vector-icons";

export default function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const parsed = value ? new Date(value) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;

  if (open && Platform.OS === "android") {
    return (
      <View className="mb-4">
        <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
          {label}
        </Text>
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            if (selectedDate) onChange(selectedDate.toISOString());
            setOpen(false);
          }}
          onDismiss={() => setOpen(false)}
        />
      </View>
    );
  }

  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
        {label}
      </Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
      >
        <Text className={value ? "text-white" : "text-slate-500"}>
          {value ? date.toLocaleDateString() : "Select date"}
        </Text>
        <MaterialIcons name="event" size={20} color="#94a3b8" />
      </TouchableOpacity>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onDismiss={() => setOpen(false)}
        onRequestClose={() => setOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/70 px-6">
          <View className="w-full rounded-3xl border border-white/10 bg-slate-900 p-5">
            <Text className="mb-3 text-lg font-black text-white">{label}</Text>
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              onChange={(event, selectedDate) => {
                if (selectedDate) onChange(selectedDate.toISOString());
              }}
              onDismiss={() => setOpen(false)}
              themeVariant="dark"
            />
            <View className="mt-4 flex-row gap-3">
              <TouchableOpacity
                onPress={() => setOpen(false)}
                className="flex-1 rounded-xl bg-white/10 py-3"
              >
                <Text className="text-center font-bold text-slate-300">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                className="flex-1 rounded-xl bg-sky-500 py-3"
              >
                <Text className="text-center font-bold text-white">Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
