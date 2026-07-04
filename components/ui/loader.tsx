import { View, ActivityIndicator } from "react-native";

const Loader = () => {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="blue" />
    </View>
  );
};
export default Loader;
