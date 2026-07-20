import { Slot } from "expo-router";
import { Provider } from "react-redux";
import { store } from "@/services/store/store";
import { SyncInitializer } from "@/components/SyncInitializer";
// import { NativeWindStyleSheet } from "nativewind";

// NativeWindStyleSheet.setOutput({
//   default: "native",
// });

export default function RootLayout() {
  return (
    <Provider store={store}>
      <SyncInitializer />
      <Slot />
    </Provider>
  );
}
