import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Card,
  Header,
  Pill,
  Screen,
  SectionTitle,
  StatRow,
} from "@/components/app-ui";

const channels = [
  { label: "Cash", value: "52%", tone: "emerald" as const },
  { label: "Card", value: "31%", tone: "sky" as const },
  { label: "Mobile", value: "17%", tone: "amber" as const },
];

const tasks = [
  "Review shift close for branch 01",
  "Approve 3 low-stock reorder suggestions",
  "Check pending returns before 6 PM",
  "Send daily summary to management",
];

export default function DashboardScreen() {
  return (
    <Screen>
      <SafeAreaView className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <Header
            eyebrow="Insights"
            title="Dashboard"
            subtitle="A clean view for managers: revenue, channel mix, staffing, and pending tasks."
            right={<Pill label="Management" tone="sky" />}
          />

          <View className="mb-4 flex-row gap-3">
            <View className="flex-1">
              <Card>
                <StatRow label="Revenue" value="$14,360" />
                <StatRow label="Margin" value="32.4%" />
              </Card>
            </View>
            <View className="flex-1">
              <Card>
                <StatRow label="Transactions" value="128" />
                <StatRow label="Avg ticket" value="$112.18" />
              </Card>
            </View>
          </View>

          <SectionTitle title="Payment mix" />
          <Card className="mb-4">
            {channels.map((channel, index) => (
              <View key={channel.label}>
                <View className="flex-row items-center justify-between py-1">
                  <Pill label={channel.label} tone={channel.tone} />
                  <Pill label={channel.value} tone={channel.tone} />
                </View>
                {index < channels.length - 1 ? <View className="my-2 h-px bg-white/8" /> : null}
              </View>
            ))}
          </Card>

          <SectionTitle title="Manager checklist" action="Today" />
          <Card>
            {tasks.map((task, index) => (
              <View key={task}>
                <StatRow label={task} value={index === 0 ? "Priority" : "Pending"} />
                {index < tasks.length - 1 ? <View className="my-2 h-px bg-white/8" /> : null}
              </View>
            ))}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

