import { MaterialIcons } from "@expo/vector-icons";
import { ReactNode } from "react";
import {
  Pressable,
  Text,
  View,
  type ViewStyle,
} from "react-native";

export function Screen({
  children,
  padded = true,
}: {
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <View className="flex-1 bg-slate-950">
      <View className="absolute inset-0">
        <View className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-sky-500/10" />
        <View className="absolute top-32 -right-24 h-72 w-72 rounded-full bg-emerald-500/10" />
        <View className="absolute bottom-0 left-1/4 h-56 w-56 rounded-full bg-amber-500/10" />
      </View>
      <View className={`flex-1 ${padded ? "px-4 pt-4" : ""}`}>{children}</View>
    </View>
  );
}

export function Header({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View className="mb-5 flex-row items-start justify-between">
      <View className="flex-1 pr-3">
        <Text className="text-[11px] font-bold uppercase tracking-[4px] text-sky-300/80">
          {eyebrow}
        </Text>
        <Text className="mt-2 text-3xl font-black tracking-tight text-white">
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-2 text-sm leading-5 text-slate-300">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

export function Card({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: ViewStyle;
}) {
  return (
    <View
      style={style}
      className={`rounded-[28px] border border-white/10 bg-slate-900/90 p-4 ${className}`}
    >
      {children}
    </View>
  );
}

export function MetricCard({
  icon,
  label,
  value,
  delta,
  tone = "sky",
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  delta?: string;
  tone?: "sky" | "emerald" | "amber" | "rose";
}) {
  const tones: Record<
    string,
    { bg: string; fg: string; border: string; glow: string }
  > = {
    sky: {
      bg: "bg-sky-500/10",
      fg: "text-sky-200",
      border: "border-sky-500/20",
      glow: "bg-sky-500/15",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      fg: "text-emerald-200",
      border: "border-emerald-500/20",
      glow: "bg-emerald-500/15",
    },
    amber: {
      bg: "bg-amber-500/10",
      fg: "text-amber-200",
      border: "border-amber-500/20",
      glow: "bg-amber-500/15",
    },
    rose: {
      bg: "bg-rose-500/10",
      fg: "text-rose-200",
      border: "border-rose-500/20",
      glow: "bg-rose-500/15",
    },
  };
  const t = tones[tone];

  return (
    <View className={`flex-1 rounded-[24px] border ${t.border} bg-white/5 p-4`}>
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-xs font-bold uppercase tracking-[3px] text-slate-400">
            {label}
          </Text>
          <Text className="mt-3 text-2xl font-black text-white">{value}</Text>
          {delta ? (
            <Text className={`mt-2 text-xs font-semibold ${t.fg}`}>
              {delta}
            </Text>
          ) : null}
        </View>
        <View className={`rounded-2xl border ${t.border} ${t.bg} p-3`}>
          <MaterialIcons name={icon} size={22} color="#fff" />
        </View>
      </View>
      <View className={`mt-4 h-1.5 rounded-full ${t.glow}`} />
    </View>
  );
}

export function ActionButton({
  title,
  icon,
  accent = "sky",
  onPress,
}: {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  accent?: "sky" | "emerald" | "amber" | "rose";
  onPress?: () => void;
}) {
  const styles: Record<string, { bg: string; border: string }> = {
    sky: { bg: "bg-sky-500/10", border: "border-sky-500/20" },
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/20" },
    rose: { bg: "bg-rose-500/10", border: "border-rose-500/20" },
  };
  const s = styles[accent];

  return (
    <Pressable
      onPress={onPress}
      className={`min-h-[92px] flex-1 rounded-[24px] border ${s.border} ${s.bg} p-4 active:opacity-80`}
    >
      <MaterialIcons name={icon} size={22} color="#fff" />
      <Text className="mt-4 text-sm font-bold text-white">{title}</Text>
    </Pressable>
  );
}

export function RowItem({
  title,
  subtitle,
  right,
  icon,
}: {
  title: string;
  subtitle?: string;
  right?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-[20px] border border-white/8 bg-white/4 px-4 py-3">
      {icon ? (
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/8">
          <MaterialIcons name={icon} size={20} color="#e2e8f0" />
        </View>
      ) : null}
      <View className="flex-1">
        <Text className="text-sm font-semibold text-white">{title}</Text>
        {subtitle ? <Text className="mt-1 text-xs text-slate-400">{subtitle}</Text> : null}
      </View>
      {right ? <Text className="text-sm font-bold text-slate-200">{right}</Text> : null}
    </View>
  );
}

export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: string;
}) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <Text className="text-sm font-bold uppercase tracking-[3px] text-slate-400">
        {title}
      </Text>
      {action ? <Text className="text-xs font-semibold text-sky-300">{action}</Text> : null}
    </View>
  );
}

export function Pill({
  label,
  tone = "sky",
}: {
  label: string;
  tone?: "sky" | "emerald" | "amber" | "rose";
}) {
  const tones: Record<string, { bg: string; border: string; fg: string }> = {
    sky: { bg: "bg-sky-500/10", border: "border-sky-500/20", fg: "text-sky-200" },
    emerald: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      fg: "text-emerald-200",
    },
    amber: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      fg: "text-amber-200",
    },
    rose: { bg: "bg-rose-500/10", border: "border-rose-500/20", fg: "text-rose-200" },
  };
  const t = tones[tone];
  return (
    <View className={`self-start rounded-full border px-3 py-1.5 ${t.bg} ${t.border}`}>
      <Text className={`text-[10px] font-black uppercase tracking-[3px] ${t.fg}`}>
        {label}
      </Text>
    </View>
  );
}

export function SmallLabel({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1">
      <Text className="text-[10px] font-bold uppercase tracking-[3px] text-slate-500">
        {label}
      </Text>
      <Text className="mt-2 text-base font-bold text-white">{value}</Text>
    </View>
  );
}

export function Divider() {
  return <View className="my-4 h-px bg-white/8" />;
}

export function StatRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-sm text-slate-300">{label}</Text>
      <Text className="text-sm font-semibold text-white">{value}</Text>
    </View>
  );
}
