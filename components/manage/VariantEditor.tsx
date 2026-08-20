// components/VariantEditor.tsx
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Field from "./Field";
import { generateBarcode } from "@/utils/manage/helpers";

export default function VariantEditor({
  variants,
  editable,
  showInitialStock,
  onChange,
  onScanBarcode,
}: {
  variants: any[];
  editable: boolean;
  showInitialStock: boolean;
  onChange: (variants: any[]) => void;
  onScanBarcode?: (index: number) => void;
}) {
  const update = (index: number, key: string, value: any) => {
    onChange(
      variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [key]: value } : variant,
      ),
    );
  };

  return (
    <View className="mb-5">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-xs font-bold uppercase tracking-[3px] text-slate-400">
          Sellable options
        </Text>
        {editable && (
          <TouchableOpacity
            onPress={() =>
              onChange([
                ...variants,
                {
                  name: "",
                  sku: "",
                  barcode: "",
                  price: 0,
                  costPrice: 0,
                  color: "",
                  size: "",
                  initialStock: 0,
                },
              ])
            }
            className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1.5"
          >
            <Text className="text-xs font-bold text-amber-200">
              + Add option
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {!variants.length ? (
        <Text className="text-xs text-slate-500">
          No options. This product is sold as a single item.
        </Text>
      ) : (
        variants.map((variant, index) => (
          <View
            key={variant.id ?? index}
            className="mb-3 rounded-2xl border border-white/10 bg-white/5 p-3"
          >
            {editable ? (
              <>
                <Field
                  label="Option name"
                  value={variant.name ?? ""}
                  onChangeText={(value) => update(index, "name", value)}
                />
                <Field
                  label="Option SKU"
                  value={variant.sku ?? ""}
                  onChangeText={(value) => update(index, "sku", value)}
                />
                <Field
                  label="Option Barcode"
                  value={variant.barcode ?? ""}
                  onChangeText={(value) => update(index, "barcode", value)}
                />
                <View className="mb-3 flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => onScanBarcode?.(index)}
                    className="flex-1 rounded-xl border border-sky-400/30 bg-sky-500/15 py-3"
                  >
                    <Text className="text-center text-xs font-bold text-sky-200">
                      Scan barcode / QR
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => update(index, "barcode", generateBarcode())}
                    className="flex-1 rounded-xl border border-amber-400/30 bg-amber-500/15 py-3"
                  >
                    <Text className="text-center text-xs font-bold text-amber-200">
                      Auto-generate
                    </Text>
                  </TouchableOpacity>
                </View>
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Field
                      label="Price"
                      value={String(variant.price ?? 0)}
                      keyboardType="decimal-pad"
                      onChangeText={(value) =>
                        update(index, "price", Number(value) || 0)
                      }
                    />
                  </View>
                  <View className="flex-1">
                    <Field
                      label="Cost"
                      value={String(variant.costPrice ?? 0)}
                      keyboardType="decimal-pad"
                      onChangeText={(value) =>
                        update(index, "costPrice", Number(value) || 0)
                      }
                    />
                  </View>
                </View>
                {showInitialStock ? (
                  <Field
                    label="Initial stock"
                    value={String(variant.initialStock ?? 0)}
                    keyboardType="numeric"
                    onChangeText={(value) =>
                      update(index, "initialStock", Number(value) || 0)
                    }
                  />
                ) : (
                  <Text className="mb-3 text-xs text-amber-300">
                    Stock is managed separately in Inventory.
                  </Text>
                )}
                <TouchableOpacity
                  onPress={() =>
                    onChange(variants.filter((_, i) => i !== index))
                  }
                  className="self-end rounded-xl bg-rose-500/15 px-3 py-2"
                >
                  <Text className="text-xs font-bold text-rose-300">
                    Remove variant
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View>
                <Text className="font-bold text-white">{variant.name}</Text>
                <Text className="mt-1 text-xs text-slate-400">
                  SKU: {variant.sku} • ${Number(variant.price ?? 0).toFixed(2)}
                </Text>
                <Text className="mt-1 text-xs text-amber-300">
                  Manage quantity from Inventory
                </Text>
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );
}
