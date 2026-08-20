I’ll add an Android-only Bluetooth Classic path for the POS-5890U-L while retaining the existing BLE path for
compatible printers and iOS. First I’m checking the maintained library API and Expo integration requirements so the
native build stays compatible.

• Searching the web

• Searched the web for site:github.com kenjdavidson react-native-bluetooth-classic React Native Android API list paired
devices write ...

• Searching the web

• Searched the web for https://raw.githubusercontent.com/kenjdavidson/react-native-bluetooth-classic/main/package.json

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• The current release supports React Native 0.73+, so it fits this app’s 0.81 version and includes Android 12+ Classic
Bluetooth permissions. I’ll install it, then wire the receipt screen to list already-paired printers (the reliable
path for SPP) and send ESC/POS bytes over the Classic connection.

• Implemented Android Bluetooth Classic printing for the POS-5890U-L.

- Added react-native-bluetooth-classic (compatible with RN 0.81).
- Android now lists paired and newly discovered Classic/Spp printers, connects through RFCOMM, and sends ESC/POS
  receipt bytes.

- BLE remains used on iOS/BLE-capable printers only.
- Added required Android Bluetooth and location permissions.
- Excluded the Classic library from iOS Pods.

Files: app/receipt/[id].tsx, app.json, react-native.config.js.

How to test on Android:

1. In Android Settings → Bluetooth, pair POS-5890 / your printer first. Try PIN 0000 or 1234 if asked.
2. Build a new Android development app; Expo Go cannot load this native module.
3. In Receipt → Connect → Scan for Printers, select the paired printer.
4. Tap Print.

The Android native project was generated with BLUETOOTH_SCAN, BLUETOOTH_CONNECT, and location permissions, and
autolinking confirms the Classic module is registered. I could not install/run Android here because this machine has
no Android SDK or adb.

This path is Android-only because Bluetooth Classic RFCOMM/SPP is not publicly available to normal iOS apps. The
library’s Android support and RN 0.73+ compatibility are documented in its package metadata
(https://raw.githubusercontent.com/kenjdavidson/react-native-bluetooth-classic/main/package.json).
