import { useState } from "react";
import { Button, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const index = () => {
  const [count, setCount] = useState<number>(0);
  return (
    <SafeAreaView className="flex-1 justify-center items-center">
      <Text className="text-4xl font-extrabold text-slate-100 tracking-tight mb-3">
        Welcome to Wyl POS
      </Text>
      <Button title="Increment" onPress={() => setCount(count + 1)} />
      <View className="bg-slate-100 p-4 rounded-lg">
        <Text className="text-2xl font-bold text-slate-800">{count}</Text>
      </View>
    </SafeAreaView>
  );
};

export default index;
