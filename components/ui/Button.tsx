import { TouchableOpacity, Text, ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "outline" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  className?: string;
  disabled?: boolean;
};

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  isLoading,
  leftIcon,
  className,
  disabled,
}: ButtonProps) {
  const variantStyles = {
    primary: "bg-indigo-600",
    secondary: "bg-gray-700",
    outline: "border border-gray-300 bg-transparent",
    destructive: "bg-red-600",
  };
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };
  const textColors = {
    primary: "text-white",
    secondary: "text-white",
    outline: "text-gray-900",
    destructive: "text-white",
  };
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isLoading}
      className={`rounded-lg items-center justify-center ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {isLoading ? (
        <ActivityIndicator color="white" />
      ) : (
        <View className="flex-row items-center">
          {leftIcon && (
            <Ionicons
              name={leftIcon}
              size={20}
              className="mr-2"
              color="white"
            />
          )}
          <Text className={`font-semibold ${textColors[variant]}`}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
