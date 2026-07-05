// Add this utility for better thermal printer support

import * as Print from "expo-print";

export async function printThermalReceiptWithPOS5890U(
  html: string,
): Promise<void> {
  try {
    // POS-5890U typically works with:
    // - 80mm paper width
    // - Monochrome printing
    // - Direct thermal

    await Print.printAsync({
      html: html,
      // POS-5890U specific settings
      printerOptions: {
        paperWidth: 80, // mm
        density: 1.0,
        cutPaper: true,
      },
    });
  } catch (error) {
    throw error;
  }
}
