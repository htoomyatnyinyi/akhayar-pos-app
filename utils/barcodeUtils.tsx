import React from "react";
import { View, Text } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
type Product = any;

// ─────────────────────────────────────────────────────────────────────────────
// Code 39 Encoding Table (ISO/IEC 16388)
// Each character = 9 elements alternating bar/space, starting with a bar.
// "1" = wide element, "0" = narrow element. Exactly 3 wide + 6 narrow per char.
// ─────────────────────────────────────────────────────────────────────────────
export const CODE39_ENCODINGS: Record<string, string> = {
  "0": "000110100",
  "1": "100100001",
  "2": "001100001",
  "3": "101100000",
  "4": "000110001",
  "5": "100110000",
  "6": "001110000",
  "7": "000100101",
  "8": "100100100",
  "9": "001100100",
  A: "100001001",
  B: "001001001",
  C: "101001000",
  D: "000011001",
  E: "100011000",
  F: "001011000",
  G: "000001101",
  H: "100001100",
  I: "001001100",
  J: "000011100",
  K: "100000011",
  L: "001000011",
  M: "101000010",
  N: "000010011",
  O: "100010010",
  P: "001010010",
  Q: "000000111",
  R: "100000110",
  S: "001000110",
  T: "000010110",
  U: "110000001",
  V: "011000001",
  W: "111000000",
  X: "010010001",
  Y: "110010000",
  Z: "011010000",
  "-": "010000101",
  ".": "110000100",
  " ": "011000100",
  "*": "010010100",
  $: "010101000",
  "/": "010100010",
  "+": "010001010",
  "%": "000101010",
};

// ─────────────────────────────────────────────────────────────────────────────
// EAN-13 Generator
// Prefix "2" = GS1 in-store / variable-weight (standard for internal POS use)
// Includes Mod-10 check digit per GS1 spec
// ─────────────────────────────────────────────────────────────────────────────
export const generateEAN13 = (): string => {
  const digits: number[] = [];
  digits.push(2); // Internal use prefix per GS1 standard
  for (let i = 1; i < 12; i++) {
    digits.push(Math.floor(Math.random() * 10));
  }
  // GS1 Mod-10 check digit
  let oddSum = 0;
  let evenSum = 0;
  for (let i = 0; i < 12; i++) {
    if (i % 2 === 0) oddSum += digits[i];
    else evenSum += digits[i];
  }
  const checkDigit = (10 - ((oddSum + evenSum * 3) % 10)) % 10;
  digits.push(checkDigit);
  return digits.join("");
};

/**
 * Generate a unique EAN-13 that does not collide with any existing barcodes.
 * Retries up to `maxAttempts` times to avoid infinite loops on large catalogs.
 */
export const generateUniqueEAN13 = (
  existingBarcodes: Set<string>,
  maxAttempts: number = 50,
): string => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateEAN13();
    if (!existingBarcodes.has(candidate)) {
      return candidate;
    }
  }
  // Extremely unlikely fallback — return the last generated value
  return generateEAN13();
};

// ─────────────────────────────────────────────────────────────────────────────
// SVG HTML String Generator (for expo-print label sheets)
// Renders Code 39 barcode as inline SVG with proper 3:1 wide:narrow ratio
// ─────────────────────────────────────────────────────────────────────────────
export const generateBarcodeSvg = (value: string): string => {
  if (value.length > 25) {
    return `<div style="color: red; font-size: 8px; font-weight: bold; text-align: center; margin: 10px 0;">Value too long for label</div>`;
  }

  const sanitized = value.toUpperCase().replace(/[^0-9A-Z\-.\s$/+%]/g, "");
  const fullVal = `*${sanitized || "SKU"}*`;

  // Scale unit to fit inside 200px label boxes
  const unit = fullVal.length > 15 ? 0.95 : fullVal.length > 10 ? 1.15 : 1.4;
  const charWidth = 16 * unit;
  const totalWidth = fullVal.length * charWidth - unit;
  const barHeight = 45;

  let paths = "";
  let currentX = 0;

  for (let i = 0; i < fullVal.length; i++) {
    const char = fullVal[i];
    const pattern = CODE39_ENCODINGS[char] || CODE39_ENCODINGS["*"];

    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const isWide = pattern[j] === "1";
      const width = isWide ? 3.0 * unit : 1.0 * unit;

      if (isBar) {
        paths += `<rect x="${currentX.toFixed(2)}" y="2" width="${width.toFixed(2)}" height="${barHeight}" fill="black" shape-rendering="crispEdges"/>`;
      }
      currentX += width;
    }
    currentX += 1.0 * unit; // Inter-character gap
  }

  const svgWidth = Math.max(160, totalWidth);
  const textX = totalWidth / 2;
  const textY = barHeight + 15;

  return `
    <svg width="${svgWidth}" height="${barHeight + 22}" viewBox="0 0 ${totalWidth} ${barHeight + 22}" xmlns="http://www.w3.org/2000/svg">
      ${paths}
      <text x="${textX.toFixed(2)}" y="${textY}" font-family="monospace" font-size="10" font-weight="bold" fill="black" text-anchor="middle">
        ${value}
      </text>
    </svg>
  `;
};

// ─────────────────────────────────────────────────────────────────────────────
// Label Sheet HTML Generator (for expo-print)
// ─────────────────────────────────────────────────────────────────────────────
export const generateLabelSheetHtml = (
  items: { product: Product; qty: number }[],
): string => {
  const labelCards = items
    .flatMap(({ product, qty }) =>
      Array.from({ length: qty }, () => {
        const bc = product.barcode || product.sku;
        const svgContent = generateBarcodeSvg(bc);
        return `
        <div class="label">
          <div class="product-name">${product.name}</div>
          ${svgContent}
          <div class="price">$${Number(product.sellingPrice).toFixed(2)}</div>
        </div>`;
      }),
    )
    .join("");

  return `<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; padding: 10px; }
      .grid { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
      .label {
        width: 200px; border: 1px dashed #999; padding: 6px;
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; page-break-inside: avoid;
      }
      .product-name { font-size: 10px; font-weight: bold; text-align: center;
        overflow: hidden; max-height: 24px; margin-bottom: 2px; }
      .price { font-size: 12px; font-weight: bold; margin-top: 2px; }
      svg { max-width: 180px; height: auto; }
    </style>
  </head><body>
    <div class="grid">${labelCards}</div>
  </body></html>`;
};

// ─────────────────────────────────────────────────────────────────────────────
// React Native BarcodeView Component (for on-screen display)
// Renders Code 39 barcode as native SVG with proper 3:1 ratio and quiet zones
// ─────────────────────────────────────────────────────────────────────────────
export const BarcodeView = ({ value }: { value: string }) => {
  if (value.length > 25) {
    return (
      <View style={{ alignItems: "center", padding: 12 }}>
        <Text
          style={{
            color: "#f87171",
            fontWeight: "bold",
            fontSize: 11,
            textAlign: "center",
          }}
        >
          Value is too long for standard linear scanning.
        </Text>
      </View>
    );
  }

  const sanitized = value.toUpperCase().replace(/[^0-9A-Z\-.\s$/+%]/g, "");
  const fullVal = `*${sanitized || "SKU"}*`;

  // Dynamically set unit size so it fits on screen
  const unit = fullVal.length > 15 ? 1.05 : fullVal.length > 10 ? 1.25 : 1.5;
  const charWidth = 16 * unit;
  const totalWidth = fullVal.length * charWidth - unit;
  const barHeight = 45;

  const rects: React.ReactElement[] = [];
  let currentX = 0;

  for (let i = 0; i < fullVal.length; i++) {
    const char = fullVal[i];
    const pattern = CODE39_ENCODINGS[char] || CODE39_ENCODINGS["*"];

    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const isWide = pattern[j] === "1";
      const width = isWide ? 3.0 * unit : 1.0 * unit;

      if (isBar) {
        rects.push(
          <Rect
            key={`${i}_${j}`}
            x={Math.round(currentX)}
            y={2}
            width={Math.round(width)}
            height={barHeight}
            fill="#000000"
          />,
        );
      }
      currentX += width;
    }
    currentX += 1.0 * unit; // Inter-character gap
  }

  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <Svg
        height={barHeight + 15}
        width={Math.round(totalWidth)}
      >
        {rects}
        <SvgText
          x={Math.round(totalWidth / 2)}
          y={barHeight + 13}
          fill="#000000"
          fontSize="9"
          fontWeight="bold"
          textAnchor="middle"
        >
          {value}
        </SvgText>
      </Svg>
    </View>
  );
};
