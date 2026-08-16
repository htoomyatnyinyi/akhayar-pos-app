import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { MaterialIcons } from "@expo/vector-icons";

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  continuous?: boolean;
  allowModeToggle?: boolean;
  mode?: "single" | "continuous";
  onModeChange?: (mode: "single" | "continuous") => void;
  bottomContent?: React.ReactNode;
}

export function BarcodeScannerModal({
  visible,
  onClose,
  onScan,
  continuous = false,
  allowModeToggle = false,
  mode = "single",
  onModeChange,
  bottomContent,
}: BarcodeScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = React.useState(false);
  const [lastScanned, setLastScanned] = React.useState<string | null>(null);
  const lastScannedRef = React.useRef<string | null>(null);

  // Reset scanned state when modal opens
  React.useEffect(() => {
    if (visible) {
      setScanned(false);
      setLastScanned(null);
      lastScannedRef.current = null;
    }
  }, [visible]);

  if (!visible) return null;

  if (!permission) {
    // Camera permissions are still loading.
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View className="flex-1 bg-black justify-center items-center">
          <Text className="text-white">Requesting camera permission...</Text>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View className="flex-1 bg-black justify-center items-center px-6">
          <Text className="text-white text-center text-lg mb-6">
            We need your permission to show the camera
          </Text>
          <TouchableOpacity
            className="bg-sky-500 px-6 py-3 rounded-full mb-4"
            onPress={requestPermission}
          >
            <Text className="text-white font-bold">Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-white/10 px-6 py-3 rounded-full"
            onPress={onClose}
          >
            <Text className="text-white font-bold">Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  const isContinuous = allowModeToggle ? mode === "continuous" : continuous;

  const handleBarCodeScanned = ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    if (isContinuous) {
      if (lastScannedRef.current === data) {
        return; // Prevent rapid duplicate scans of the same item
      }
      lastScannedRef.current = data;
      setLastScanned(data);
      onScan(data);

      // Clear the duplicate prevention lock after 2.5 seconds
      setTimeout(() => {
        lastScannedRef.current = null;
        setLastScanned(null);
      }, 2500);
    } else {
      if (scanned) return;
      setScanned(true);
      onScan(data);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black">
        {/* Header / Close Button */}
        <View className="absolute top-12 left-5 z-10">
          <TouchableOpacity
            className="bg-black/50 p-3 rounded-full"
            onPress={onClose}
          >
            <MaterialIcons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <View className="absolute top-12 right-5 left-0 z-0 items-center justify-center">
          {allowModeToggle ? (
            <View className="flex-row bg-black/60 rounded-full p-1 border border-white/20">
              <TouchableOpacity
                onPress={() => onModeChange?.("single")}
                className={`px-4 py-2 rounded-full ${mode === "single" ? "bg-sky-500" : ""}`}
              >
                <Text
                  className={`font-bold ${mode === "single" ? "text-white" : "text-white/60"}`}
                >
                  Single
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onModeChange?.("continuous")}
                className={`px-4 py-2 rounded-full ${mode === "continuous" ? "bg-sky-500" : ""}`}
              >
                <Text
                  className={`font-bold ${mode === "continuous" ? "text-white" : "text-white/60"}`}
                >
                  Continuous
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text className="text-white font-bold text-lg bg-black/50 px-4 py-2 rounded-full">
              Scan Barcode / QR Code
            </Text>
          )}
        </View>

        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: [
              "qr",
              "ean13",
              "ean8",
              "upc_e",
              "upc_a",
              "code128",
              "code39",
            ],
          }}
        />

        {/* Scanner Overlay Guide */}
        <View
          style={StyleSheet.absoluteFillObject}
          className="items-center justify-center pointer-events-none"
        >
          <View className="w-64 h-64 border-2 border-sky-400/80 rounded-3xl" />
        </View>

        {/* Continuous Scan Feedback */}
        {isContinuous && lastScanned && !bottomContent && (
          <View className="absolute bottom-20 left-0 right-0 items-center pointer-events-none">
            <View className="bg-emerald-500/90 px-6 py-3 rounded-full flex-row items-center">
              <MaterialIcons name="check-circle" size={20} color="white" />
              <Text className="text-white font-bold ml-2">
                Scanned: {lastScanned}
              </Text>
            </View>
          </View>
        )}

        {/* Custom Bottom Content (e.g. Preview List) */}
        {bottomContent && (
          <View className="absolute bottom-0 left-0 right-0 max-h-[50%]">
            {bottomContent}
          </View>
        )}
      </View>
    </Modal>
  );
}
