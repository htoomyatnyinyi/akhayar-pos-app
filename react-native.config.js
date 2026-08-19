module.exports = {
  dependencies: {
    // POS-5890U-L uses Android Bluetooth Classic/RFCOMM. Do not add the
    // library's unrelated iOS External Accessory implementation to Pods.
    "react-native-bluetooth-classic": {
      platforms: {
        ios: null,
      },
    },
  },
};
