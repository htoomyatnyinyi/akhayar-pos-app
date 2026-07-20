import { View, Text, ScrollView, TouchableOpacity } from "react-native";

interface CategoryPillsProps {
  categories: any[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export function CategoryPills({
  categories,
  selected,
  onSelect,
}: CategoryPillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="py-2 px-4 bg-white border-b border-gray-200"
    >
      <TouchableOpacity
        onPress={() => onSelect(null)}
        className={`px-4 py-2 rounded-full mr-2 ${selected === null ? "bg-indigo-600" : "bg-gray-100"}`}
      >
        <Text className={selected === null ? "text-white" : "text-gray-700"}>
          All
        </Text>
      </TouchableOpacity>

      {categories?.map((category: any) => (
        <TouchableOpacity
          key={category.id}
          onPress={() => onSelect(category.id)}
          className={`px-4 py-2 rounded-full mr-2 ${selected === category.id ? "bg-indigo-600" : "bg-gray-100"}`}
        >
          <Text
            className={
              selected === category.id ? "text-white" : "text-gray-700"
            }
          >
            {category.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
