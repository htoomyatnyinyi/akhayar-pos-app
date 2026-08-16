// services/bluetooth/printerService.ts

import {
  BluetoothEscposPrinter,
  BluetoothManager,
} from "@vardrz/react-native-bluetooth-escpos-printer";
import { PermissionsAndroid, Platform } from "react-native";

export interface BluetoothDevice {
  address: string;
  name: string;
  type?: number;
}

class BluetoothPrinterService {
  private isConnected: boolean = false;
  private connectedDevice: BluetoothDevice | null = null;

  // ✅ Bluetooth Permissions စစ်ဆေးခြင်း
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const allGranted = Object.values(granted).every(
          (status) => status === PermissionsAndroid.RESULTS.GRANTED,
        );

        if (!allGranted) {
          console.warn("⚠️ Some Bluetooth permissions not granted");
          return false;
        }
        return true;
      } catch (err) {
        console.error("❌ Permission error:", err);
        return false;
      }
    }
    return true;
  }

  // ✅ Bluetooth Enable ဖြစ်မဖြစ် စစ်ဆေးခြင်း
  async enableBluetooth(): Promise<boolean> {
    try {
      await BluetoothManager.enableBluetooth();
      return true;
    } catch (error) {
      console.error("❌ Failed to enable Bluetooth:", error);
      return false;
    }
  }

  // ✅ အနီးရှိ Printer များကို Scan လုပ်ခြင်း
  async scanDevices(): Promise<BluetoothDevice[]> {
    try {
      const devices = await BluetoothManager.scanDevices();
      // JSON string ကို parse လုပ်ပါ
      const parsed = typeof devices === "string" ? JSON.parse(devices) : devices;
      // Handle both { paired: [], found: [] } and flat array formats
      const paired = parsed?.paired || [];
      const found = parsed?.found || [];
      const allDevices: BluetoothDevice[] = [...paired, ...found];

      // De-duplicate by address
      const seen = new Set<string>();
      const unique = allDevices.filter((d: any) => {
        if (seen.has(d.address)) return false;
        seen.add(d.address);
        return true;
      });

      return unique;
    } catch (error) {
      console.error("❌ Scan error:", error);
      return [];
    }
  }

  // ✅ Printer ချိတ်ဆက်ခြင်း
  async connectDevice(address: string): Promise<boolean> {
    try {
      await BluetoothManager.connect(address);
      this.isConnected = true;
      this.connectedDevice = { address, name: "" };
      console.log("✅ Printer connected:", address);
      return true;
    } catch (error) {
      console.error("❌ Connection failed:", error);
      this.isConnected = false;
      return false;
    }
  }

  // ✅ ချိတ်ဆက်မှု ဖြုတ်ခြင်း
  async disconnect(): Promise<boolean> {
    try {
      await BluetoothManager.disconnect();
      this.isConnected = false;
      this.connectedDevice = null;
      console.log("✅ Printer disconnected");
      return true;
    } catch (error) {
      console.error("❌ Disconnect failed:", error);
      return false;
    }
  }

  // ✅ Check connection status
  isPrinterConnected(): boolean {
    return this.isConnected;
  }

  // ✅ Get connected device
  getConnectedDevice(): BluetoothDevice | null {
    return this.connectedDevice;
  }

  // ✅ Thermal Receipt ထုတ်ခြင်း (POS-5890U)
  async printThermalReceipt(receiptText: string): Promise<boolean> {
    if (!this.isConnected) {
      console.error("❌ Printer not connected");
      return false;
    }

    try {
      // POS-5890U အတွက် encoding settings
      await BluetoothEscposPrinter.printText(receiptText, {
        encoding: "GBK", // သို့မဟုတ် 'UTF-8'
        // ထပ်ဆောင်း settings
        // fontSize: 1,
        // fontType: 0,
      });

      // Auto-cut paper (optional)
      await BluetoothEscposPrinter.printText("\n\n\n\n\n", { encoding: "GBK" });

      console.log("✅ Receipt printed successfully");
      return true;
    } catch (error) {
      console.error("❌ Print error:", error);
      return false;
    }
  }

  // ✅ Raw ESC/POS Commands ပို့ခြင်း (Advanced)
  async sendRawCommand(command: string): Promise<boolean> {
    if (!this.isConnected) {
      console.error("❌ Printer not connected");
      return false;
    }

    try {
      await BluetoothEscposPrinter.sendRawData(command);
      return true;
    } catch (error) {
      console.error("❌ Send command failed:", error);
      return false;
    }
  }
}

export const bluetoothPrinterService = new BluetoothPrinterService();
