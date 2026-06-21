import { useState } from "react";
import { Button, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGetDashboardOverviewQuery } from "@/services/features/dashboard/dashboardApi";

const index = () => {
  const [count, setCount] = useState<number>(0);
  const { data } = useGetDashboardOverviewQuery();
  console.log(data?.data.total_sales.toLocaleString());
  return (
    <SafeAreaView className="flex-1 justify-center items-center">
      <Text className="text-4xl font-extrabold text-slate-100 tracking-tight mb-3">
        Welcome to Wyl POS
      </Text>
      <Button title="Increment" onPress={() => setCount(count + 1)} />
      <View className="bg-slate-100 p-4 rounded-lg">
        <Text className="text-2xl font-bold text-slate-800">{count}</Text>
      </View>
      {data?.data && (
        <Text className="text-2xl font-bold text-blue-800">
          {data?.data.total_sales.toLocaleString()}
        </Text>
      )}
    </SafeAreaView>
  );
};

export default index;
