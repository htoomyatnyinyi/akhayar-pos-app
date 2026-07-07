// services/bluetooth/bluetoothStorage.ts

import AsyncStorage from "@react-native-async-storage/async-storage";

const BLUETOOTH_ADDRESS_KEY = "@bluetooth_printer_address";

export const bluetoothStorage = {
  // ✅ Bluetooth address သိမ်းခြင်း
  saveAddress: async (address: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(BLUETOOTH_ADDRESS_KEY, address);
      console.log("✅ Bluetooth address saved:", address);
    } catch (error) {
      console.error("❌ Failed to save Bluetooth address:", error);
    }
  },

  // ✅ Bluetooth address ပြန်ရယူခြင်း
  getAddress: async (): Promise<string | null> => {
    try {
      const address = await AsyncStorage.getItem(BLUETOOTH_ADDRESS_KEY);
      console.log("📱 Retrieved Bluetooth address:", address);
      return address;
    } catch (error) {
      console.error("❌ Failed to get Bluetooth address:", error);
      return null;
    }
  },

  // ✅ Bluetooth address ဖျက်ခြင်း
  clearAddress: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(BLUETOOTH_ADDRESS_KEY);
      console.log("🗑️ Bluetooth address cleared");
    } catch (error) {
      console.error("❌ Failed to clear Bluetooth address:", error);
    }
  },
};
