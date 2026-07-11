// ============================================
// FILE: utils/printerService.ts
// ============================================

// ✅ Dynamic import to avoid native module issues at startup
let BluetoothEscposPrinter: any = null;
let BluetoothManager: any = null;

// ✅ Flag to track if library is loaded
let isLibraryLoaded = false;
let libraryLoadAttempted = false;

/**
 * Load the Bluetooth printer library dynamically
 * This prevents the "Cannot set property 'DIRECTION' of null" error
 * when the native module isn't available
 */
const loadPrinterLibrary = async () => {
  if (libraryLoadAttempted) {
    return isLibraryLoaded;
  }

  libraryLoadAttempted = true;

  try {
    // Try to dynamically import the library
    const module =
      await import("@vardrz/react-native-bluetooth-escpos-printer");
    BluetoothEscposPrinter = module.BluetoothEscposPrinter;
    BluetoothManager = module.BluetoothManager;

    // Check if the module is actually available
    if (BluetoothEscposPrinter && BluetoothManager) {
      isLibraryLoaded = true;
      console.log("✅ Bluetooth printer library loaded successfully");
    } else {
      console.warn("⚠️ Bluetooth printer library loaded but objects are null");
    }
  } catch (error) {
    console.warn("⚠️ Bluetooth printer library not available:", error);
    isLibraryLoaded = false;
  }

  return isLibraryLoaded;
};

/**
 * Check if printer library is available
 */
const isPrinterAvailable = () => {
  return !!BluetoothEscposPrinter && !!BluetoothManager;
};

export const printerService = {
  /**
   * Initialize printer and enable Bluetooth
   */
  async init(): Promise<boolean> {
    // First, try to load the library
    await loadPrinterLibrary();

    if (!isPrinterAvailable()) {
      console.warn("⚠️ Bluetooth printer library not available");
      return false;
    }

    try {
      await BluetoothManager.enableBluetooth();
      return true;
    } catch (error) {
      console.error("Failed to initialize printer:", error);
      return false;
    }
  },

  /**
   * Check if Bluetooth is enabled
   */
  async isBluetoothEnabled(): Promise<boolean> {
    await loadPrinterLibrary();

    if (!isPrinterAvailable()) {
      return false;
    }

    try {
      const enabled = await BluetoothManager.isEnabled();
      return enabled;
    } catch (error) {
      console.error("Failed to check Bluetooth status:", error);
      return false;
    }
  },

  /**
   * Get paired Bluetooth devices
   */
  async getPairedDevices(): Promise<any[]> {
    await loadPrinterLibrary();

    if (!isPrinterAvailable()) {
      return [];
    }

    try {
      // Try different possible method names
      let devices = [];

      if (typeof BluetoothManager.getPairedDevices === "function") {
        devices = await BluetoothManager.getPairedDevices();
      } else if (typeof BluetoothManager.getBondedDevices === "function") {
        devices = await BluetoothManager.getBondedDevices();
      } else if (typeof BluetoothManager.getDeviceList === "function") {
        devices = await BluetoothManager.getDeviceList();
      } else {
        console.warn("⚠️ No known method to get paired devices");
        return [];
      }

      return devices || [];
    } catch (error) {
      console.error("Failed to get paired devices:", error);
      return [];
    }
  },

  /**
   * Print receipt data
   */
  async printReceipt(data: any): Promise<boolean> {
    await loadPrinterLibrary();

    if (!isPrinterAvailable()) {
      console.warn("⚠️ Printer not available");
      return false;
    }

    try {
      const { order, items, customer, store } = data;

      // Build receipt content
      let receiptContent = "";

      // Header
      receiptContent += "=".repeat(32) + "\n";
      receiptContent += "      RECEIPT\n";
      receiptContent += "=".repeat(32) + "\n\n";

      // Store Info
      if (store) {
        receiptContent += `${store.name || "Store"}\n`;
        if (store.address) receiptContent += `${store.address}\n`;
        if (store.phone) receiptContent += `Tel: ${store.phone}\n`;
        receiptContent += "\n";
      }

      // Order Info
      receiptContent += `Order #: ${order.orderNumber || order.id}\n`;
      receiptContent += `Date: ${new Date(order.createdAt).toLocaleString()}\n`;
      if (order.paymentMethod) {
        receiptContent += `Payment: ${order.paymentMethod}\n`;
      }
      receiptContent += "\n";
      receiptContent += "-".repeat(32) + "\n";

      // Items
      receiptContent += "ITEM          QTY   PRICE\n";
      receiptContent += "-".repeat(32) + "\n";

      if (items && items.length > 0) {
        for (const item of items) {
          const name = (item.productName || item.product?.name || "Item").slice(
            0,
            12,
          );
          const qty = String(item.quantity).padStart(5);
          const price = `$${item.unitPrice.toFixed(2)}`.padStart(10);
          receiptContent += `${name.padEnd(12)} ${qty} ${price}\n`;

          const total = (item.quantity * item.unitPrice).toFixed(2);
          receiptContent += `  Subtotal: $${total}\n`;
        }
      }

      receiptContent += "-".repeat(32) + "\n";

      // Totals
      receiptContent += `Subtotal:     $${order.subTotal.toFixed(2)}\n`;
      if (order.taxAmount > 0) {
        receiptContent += `Tax:          $${order.taxAmount.toFixed(2)}\n`;
      }
      if (order.discountAmount > 0) {
        receiptContent += `Discount:    -$${order.discountAmount.toFixed(2)}\n`;
      }
      receiptContent += "=".repeat(32) + "\n";
      receiptContent += `TOTAL:        $${order.grandTotal.toFixed(2)}\n`;
      receiptContent += "=".repeat(32) + "\n";

      if (order.paidAmount > 0) {
        receiptContent += `Paid:         $${order.paidAmount.toFixed(2)}\n`;
      }
      if (order.changeAmount > 0) {
        receiptContent += `Change:       $${order.changeAmount.toFixed(2)}\n`;
      }

      receiptContent += "\n";

      // Customer Info
      if (customer) {
        receiptContent += `Customer: ${customer.name || customer.id}\n`;
        if (customer.phone) receiptContent += `Phone: ${customer.phone}\n`;
        receiptContent += "\n";
      }

      // Footer
      receiptContent += "-".repeat(32) + "\n";
      receiptContent += "  Thank you for your purchase!\n";
      receiptContent += "  Please come again!\n";
      receiptContent += "-".repeat(32) + "\n";
      receiptContent += `  ${new Date().toLocaleString()}\n`;
      receiptContent += "=".repeat(32) + "\n";

      // Print the receipt
      await BluetoothEscposPrinter.printText(receiptContent, {
        encoding: "GBK",
        codepage: 0,
        width: 1,
        height: 1,
      });

      // Cut paper if available
      try {
        if (typeof BluetoothEscposPrinter.printAndFeedPaper === "function") {
          await BluetoothEscposPrinter.printAndFeedPaper();
        }
        if (typeof BluetoothEscposPrinter.cutPaper === "function") {
          await BluetoothEscposPrinter.cutPaper();
        }
      } catch (cutError) {
        console.log("Paper cut not available:", cutError);
      }

      return true;
    } catch (error) {
      console.error("Failed to print receipt:", error);
      return false;
    }
  },

  /**
   * Print text directly
   */
  async printText(text: string): Promise<boolean> {
    await loadPrinterLibrary();

    if (!isPrinterAvailable()) {
      console.warn("⚠️ Printer not available");
      return false;
    }

    try {
      await BluetoothEscposPrinter.printText(text, {
        encoding: "GBK",
        codepage: 0,
        width: 1,
        height: 1,
      });
      return true;
    } catch (error) {
      console.error("Failed to print text:", error);
      return false;
    }
  },

  /**
   * Print receipt and cut paper
   */
  async printReceiptWithCut(data: any): Promise<boolean> {
    const success = await this.printReceipt(data);
    if (success) {
      try {
        if (typeof BluetoothEscposPrinter.printAndFeedPaper === "function") {
          await BluetoothEscposPrinter.printAndFeedPaper();
        }
        if (typeof BluetoothEscposPrinter.cutPaper === "function") {
          await BluetoothEscposPrinter.cutPaper();
        }
      } catch (error) {
        console.log("Paper cut not available:", error);
      }
    }
    return success;
  },

  /**
   * Get Bluetooth status
   */
  async getStatus(): Promise<{
    available: boolean;
    enabled: boolean;
    devices: any[];
  }> {
    await loadPrinterLibrary();

    const available = isPrinterAvailable();
    if (!available) {
      return { available: false, enabled: false, devices: [] };
    }

    try {
      const enabled = await this.isBluetoothEnabled();
      const devices = enabled ? await this.getPairedDevices() : [];
      return { available: true, enabled, devices };
    } catch (error) {
      console.error("Failed to get printer status:", error);
      return { available: true, enabled: false, devices: [] };
    }
  },
};

// ============================================
// Export individual functions for convenience
// ============================================

export const initPrinter = printerService.init.bind(printerService);
export const printReceipt = printerService.printReceipt.bind(printerService);
export const printText = printerService.printText.bind(printerService);
export const getPrinterStatus = printerService.getStatus.bind(printerService);
export const getPairedDevices =
  printerService.getPairedDevices.bind(printerService);

export default printerService;

// // ============================================
// // FILE: utils/printerService.ts
// // ============================================

// import {
//   BluetoothEscposPrinter,
//   BluetoothManager,
// } from "@vardrz/react-native-bluetooth-escpos-printer";

// // ✅ Check if printer library is available
// const isPrinterAvailable = () => {
//   try {
//     return !!BluetoothEscposPrinter && !!BluetoothManager;
//   } catch {
//     return false;
//   }
// };

// export const printerService = {
//   /**
//    * Initialize printer and enable Bluetooth
//    */
//   async init(): Promise<boolean> {
//     if (!isPrinterAvailable()) {
//       console.warn("⚠️ Bluetooth printer library not available");
//       return false;
//     }
//     try {
//       await BluetoothManager.enableBluetooth();
//       return true;
//     } catch (error) {
//       console.error("Failed to initialize printer:", error);
//       return false;
//     }
//   },

//   /**
//    * Check if Bluetooth is enabled
//    */
//   async isBluetoothEnabled(): Promise<boolean> {
//     if (!isPrinterAvailable()) {
//       return false;
//     }
//     try {
//       const enabled = await BluetoothManager.isEnabled();
//       return enabled;
//     } catch (error) {
//       console.error("Failed to check Bluetooth status:", error);
//       return false;
//     }
//   },

//   /**
//    * Get paired Bluetooth devices
//    * Note: Some libraries use different method names
//    */
//   async getPairedDevices(): Promise<any[]> {
//     if (!isPrinterAvailable()) {
//       return [];
//     }
//     try {
//       // Try different possible method names
//       let devices = [];

//       // Method 1: getPairedDevices (most common)
//       if (typeof BluetoothManager.getPairedDevices === "function") {
//         devices = await BluetoothManager.getPairedDevices();
//       }
//       // Method 2: getBondedDevices
//       else if (typeof BluetoothManager.getBondedDevices === "function") {
//         devices = await BluetoothManager.getBondedDevices();
//       }
//       // Method 3: getDeviceList
//       else if (typeof BluetoothManager.getDeviceList === "function") {
//         devices = await BluetoothManager.getDeviceList();
//       }
//       // Method 4: scanDevices
//       else {
//         console.warn("⚠️ No known method to get paired devices");
//         return [];
//       }

//       return devices || [];
//     } catch (error) {
//       console.error("Failed to get paired devices:", error);
//       return [];
//     }
//   },

//   /**
//    * Print receipt data
//    */
//   async printReceipt(data: any): Promise<boolean> {
//     if (!isPrinterAvailable()) {
//       console.warn("⚠️ Printer not available");
//       return false;
//     }

//     try {
//       const { order, items, customer, store } = data;

//       // Build receipt content
//       let receiptContent = "";

//       // Header
//       receiptContent += "=".repeat(32) + "\n";
//       receiptContent += "      RECEIPT\n";
//       receiptContent += "=".repeat(32) + "\n\n";

//       // Store Info
//       if (store) {
//         receiptContent += `${store.name || "Store"}\n`;
//         if (store.address) receiptContent += `${store.address}\n`;
//         if (store.phone) receiptContent += `Tel: ${store.phone}\n`;
//         receiptContent += "\n";
//       }

//       // Order Info
//       receiptContent += `Order #: ${order.orderNumber || order.id}\n`;
//       receiptContent += `Date: ${new Date(order.createdAt).toLocaleString()}\n`;
//       if (order.paymentMethod) {
//         receiptContent += `Payment: ${order.paymentMethod}\n`;
//       }
//       receiptContent += "\n";
//       receiptContent += "-".repeat(32) + "\n";

//       // Items
//       receiptContent += "ITEM          QTY   PRICE\n";
//       receiptContent += "-".repeat(32) + "\n";

//       if (items && items.length > 0) {
//         for (const item of items) {
//           const name = (item.productName || item.product?.name || "Item").slice(
//             0,
//             12,
//           );
//           const qty = String(item.quantity).padStart(5);
//           const price = `$${item.unitPrice.toFixed(2)}`.padStart(10);
//           receiptContent += `${name.padEnd(12)} ${qty} ${price}\n`;

//           const total = (item.quantity * item.unitPrice).toFixed(2);
//           receiptContent += `  Subtotal: $${total}\n`;
//         }
//       }

//       receiptContent += "-".repeat(32) + "\n";

//       // Totals
//       receiptContent += `Subtotal:     $${order.subTotal.toFixed(2)}\n`;
//       if (order.taxAmount > 0) {
//         receiptContent += `Tax:          $${order.taxAmount.toFixed(2)}\n`;
//       }
//       if (order.discountAmount > 0) {
//         receiptContent += `Discount:    -$${order.discountAmount.toFixed(2)}\n`;
//       }
//       receiptContent += "=".repeat(32) + "\n";
//       receiptContent += `TOTAL:        $${order.grandTotal.toFixed(2)}\n`;
//       receiptContent += "=".repeat(32) + "\n";

//       if (order.paidAmount > 0) {
//         receiptContent += `Paid:         $${order.paidAmount.toFixed(2)}\n`;
//       }
//       if (order.changeAmount > 0) {
//         receiptContent += `Change:       $${order.changeAmount.toFixed(2)}\n`;
//       }

//       receiptContent += "\n";

//       // Customer Info
//       if (customer) {
//         receiptContent += `Customer: ${customer.name || customer.id}\n`;
//         if (customer.phone) receiptContent += `Phone: ${customer.phone}\n`;
//         receiptContent += "\n";
//       }

//       // Footer
//       receiptContent += "-".repeat(32) + "\n";
//       receiptContent += "  Thank you for your purchase!\n";
//       receiptContent += "  Please come again!\n";
//       receiptContent += "-".repeat(32) + "\n";
//       receiptContent += `  ${new Date().toLocaleString()}\n`;
//       receiptContent += "=".repeat(32) + "\n";

//       // Print the receipt
//       await BluetoothEscposPrinter.printText(receiptContent, {
//         encoding: "GBK",
//         codepage: 0,
//         width: 1,
//         height: 1,
//       });

//       // Cut paper if available
//       try {
//         await BluetoothEscposPrinter.printAndFeedPaper();
//       } catch (cutError) {
//         console.log("Paper cut not available:", cutError);
//       }

//       return true;
//     } catch (error) {
//       console.error("Failed to print receipt:", error);
//       return false;
//     }
//   },

//   /**
//    * Print text directly
//    */
//   async printText(text: string): Promise<boolean> {
//     if (!isPrinterAvailable()) {
//       console.warn("⚠️ Printer not available");
//       return false;
//     }

//     try {
//       await BluetoothEscposPrinter.printText(text, {
//         encoding: "GBK",
//         codepage: 0,
//         width: 1,
//         height: 1,
//       });
//       return true;
//     } catch (error) {
//       console.error("Failed to print text:", error);
//       return false;
//     }
//   },

//   /**
//    * Print receipt and cut paper
//    */
//   async printReceiptWithCut(data: any): Promise<boolean> {
//     const success = await this.printReceipt(data);
//     if (success) {
//       try {
//         await BluetoothEscposPrinter.printAndFeedPaper();
//         await BluetoothEscposPrinter.cutPaper();
//       } catch (error) {
//         console.log("Paper cut not available:", error);
//       }
//     }
//     return success;
//   },

//   /**
//    * Get Bluetooth status
//    */
//   async getStatus(): Promise<{
//     available: boolean;
//     enabled: boolean;
//     devices: any[];
//   }> {
//     const available = isPrinterAvailable();
//     if (!available) {
//       return { available: false, enabled: false, devices: [] };
//     }

//     try {
//       const enabled = await this.isBluetoothEnabled();
//       const devices = enabled ? await this.getPairedDevices() : [];
//       return { available: true, enabled, devices };
//     } catch (error) {
//       console.error("Failed to get printer status:", error);
//       return { available: true, enabled: false, devices: [] };
//     }
//   },
// };

// // ============================================
// // Export individual functions for convenience
// // ============================================

// export const initPrinter = printerService.init.bind(printerService);
// export const printReceipt = printerService.printReceipt.bind(printerService);
// export const printText = printerService.printText.bind(printerService);
// export const getPrinterStatus = printerService.getStatus.bind(printerService);
// export const getPairedDevices =
//   printerService.getPairedDevices.bind(printerService);

// export default printerService;

// // // ============================================
// // // FILE: utils/printerService.ts
// // // ============================================

// // import {
// //   BluetoothEscposPrinter,
// //   BluetoothManager,
// // } from "@vardrz/react-native-bluetooth-escpos-printer";

// // // ✅ Add null check for the library
// // const isPrinterAvailable = () => {
// //   try {
// //     return !!BluetoothEscposPrinter && !!BluetoothManager;
// //   } catch {
// //     return false;
// //   }
// // };

// // export const printerService = {
// //   async init() {
// //     if (!isPrinterAvailable()) {
// //       console.warn("⚠️ Bluetooth printer not available");
// //       return false;
// //     }
// //     try {
// //       await BluetoothManager.enableBluetooth();
// //       return true;
// //     } catch (error) {
// //       console.error("Failed to initialize printer:", error);
// //       return false;
// //     }
// //   },

// //   async printReceipt(data: any) {
// //     if (!isPrinterAvailable()) {
// //       console.warn("⚠️ Printer not available");
// //       return false;
// //     }
// //     try {
// //       // Your print logic here
// //       return true;
// //     } catch (error) {
// //       console.error("Failed to print receipt:", error);
// //       return false;
// //     }
// //   },

// //   async getPairedDevices() {
// //     if (!isPrinterAvailable()) {
// //       return [];
// //     }
// //     try {
// //       const devices = await BluetoothManager.getPairedDevices();
// //       return devices || [];
// //     } catch (error) {
// //       console.error("Failed to get paired devices:", error);
// //       return [];
// //     }
// //   },
// // };

// // // import {
// // //   BluetoothEscposPrinter,
// // //   BluetoothManager,
// // // } from "@vardrz/react-native-bluetooth-escpos-printer";
// // // import { PermissionsAndroid, Platform } from "react-native";

// // // export interface BluetoothDevice {
// // //   address: string;
// // //   name: string;
// // //   type?: number;
// // // }

// // // class BluetoothPrinterService {
// // //   private isConnected: boolean = false;
// // //   private connectedDevice: BluetoothDevice | null = null;

// // //   // ✅ Bluetooth Permissions စစ်ဆေးခြင်း
// // //   async requestPermissions(): Promise<boolean> {
// // //     if (Platform.OS === "android") {
// // //       try {
// // //         const granted = await PermissionsAndroid.requestMultiple([
// // //           PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
// // //           PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
// // //           PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
// // //         ]);

// // //         const allGranted = Object.values(granted).every(
// // //           (status) => status === PermissionsAndroid.RESULTS.GRANTED,
// // //         );

// // //         if (!allGranted) {
// // //           console.warn("⚠️ Some Bluetooth permissions not granted");
// // //           return false;
// // //         }
// // //         return true;
// // //       } catch (err) {
// // //         console.error("❌ Permission error:", err);
// // //         return false;
// // //       }
// // //     }
// // //     return true;
// // //   }

// // //   // ✅ Bluetooth Enable ဖြစ်မဖြစ် စစ်ဆေးခြင်း
// // //   async enableBluetooth(): Promise<boolean> {
// // //     try {
// // //       await BluetoothManager.enableBluetooth();
// // //       return true;
// // //     } catch (error) {
// // //       console.error("❌ Failed to enable Bluetooth:", error);
// // //       return false;
// // //     }
// // //   }

// // //   // ✅ အနီးရှိ Printer များကို Scan လုပ်ခြင်း
// // //   async scanDevices(): Promise<BluetoothDevice[]> {
// // //     try {
// // //       const devices = await BluetoothManager.scanDevices();
// // //       // JSON string ကို parse လုပ်ပါ
// // //       const parsed =
// // //         typeof devices === "string" ? JSON.parse(devices) : devices;
// // //       // Handle both { paired: [], found: [] } and flat array formats
// // //       const paired = parsed?.paired || [];
// // //       const found = parsed?.found || [];
// // //       const allDevices: BluetoothDevice[] = [...paired, ...found];

// // //       // De-duplicate by address
// // //       const seen = new Set<string>();
// // //       const unique = allDevices.filter((d: any) => {
// // //         if (seen.has(d.address)) return false;
// // //         seen.add(d.address);
// // //         return true;
// // //       });

// // //       return unique;
// // //     } catch (error) {
// // //       console.error("❌ Scan error:", error);
// // //       return [];
// // //     }
// // //   }

// // //   // ✅ Printer ချိတ်ဆက်ခြင်း
// // //   async connectDevice(address: string): Promise<boolean> {
// // //     try {
// // //       await BluetoothManager.connect(address);
// // //       this.isConnected = true;
// // //       this.connectedDevice = { address, name: "" };
// // //       console.log("✅ Printer connected:", address);
// // //       return true;
// // //     } catch (error) {
// // //       console.error("❌ Connection failed:", error);
// // //       this.isConnected = false;
// // //       return false;
// // //     }
// // //   }

// // //   // ✅ ချိတ်ဆက်မှု ဖြုတ်ခြင်း
// // //   async disconnect(): Promise<boolean> {
// // //     try {
// // //       await BluetoothManager.disconnect();
// // //       this.isConnected = false;
// // //       this.connectedDevice = null;
// // //       console.log("✅ Printer disconnected");
// // //       return true;
// // //     } catch (error) {
// // //       console.error("❌ Disconnect failed:", error);
// // //       return false;
// // //     }
// // //   }

// // //   // ✅ Check connection status
// // //   isPrinterConnected(): boolean {
// // //     return this.isConnected;
// // //   }

// // //   // ✅ Get connected device
// // //   getConnectedDevice(): BluetoothDevice | null {
// // //     return this.connectedDevice;
// // //   }

// // //   // ✅ Thermal Receipt ထုတ်ခြင်း (POS-5890U)
// // //   async printThermalReceipt(receiptText: string): Promise<boolean> {
// // //     if (!this.isConnected) {
// // //       console.error("❌ Printer not connected");
// // //       return false;
// // //     }

// // //     try {
// // //       // POS-5890U အတွက် encoding settings
// // //       await BluetoothEscposPrinter.printText(receiptText, {
// // //         encoding: "GBK", // သို့မဟုတ် 'UTF-8'
// // //         // ထပ်ဆောင်း settings
// // //         // fontSize: 1,
// // //         // fontType: 0,
// // //       });

// // //       // Auto-cut paper (optional)
// // //       await BluetoothEscposPrinter.printText("\n\n\n\n\n", { encoding: "GBK" });

// // //       console.log("✅ Receipt printed successfully");
// // //       return true;
// // //     } catch (error) {
// // //       console.error("❌ Print error:", error);
// // //       return false;
// // //     }
// // //   }

// // //   // ✅ Raw ESC/POS Commands ပို့ခြင်း (Advanced)
// // //   async sendRawCommand(command: string): Promise<boolean> {
// // //     if (!this.isConnected) {
// // //       console.error("❌ Printer not connected");
// // //       return false;
// // //     }

// // //     try {
// // //       await BluetoothEscposPrinter.sendRawData(command);
// // //       return true;
// // //     } catch (error) {
// // //       console.error("❌ Send command failed:", error);
// // //       return false;
// // //     }
// // //   }
// // // }

// // // export const bluetoothPrinterService = new BluetoothPrinterService();
