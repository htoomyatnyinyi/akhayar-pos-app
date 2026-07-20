import { View, Text, ScrollView, TouchableOpacity } from "react-native";

interface Category {
  id: string;
  name: string;
}

interface CategoryPillsProps {
  categories: Category[] | undefined;
  selected: string | null;
  onSelect: (id: string | null) => void;
  isLoading?: boolean;
}

export function CategoryPills({
  categories,
  selected,
  onSelect,
  isLoading,
}: CategoryPillsProps) {
  if (isLoading) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="py-2 px-4 bg-white border-b border-gray-100"
      >
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            className="bg-gray-100 rounded-full mr-2 px-6 py-2"
            style={{ width: 80, height: 34 }}
          />
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="py-2 px-4 bg-white border-b border-gray-100"
      contentContainerStyle={{ paddingRight: 16 }}
    >
      <TouchableOpacity
        onPress={() => onSelect(null)}
        className={`px-4 py-2 rounded-full mr-2 ${
          selected === null
            ? "bg-indigo-600"
            : "bg-gray-100 border border-gray-200"
        }`}
      >
        <Text
          className={`font-medium ${
            selected === null ? "text-white" : "text-gray-700"
          }`}
        >
          All
        </Text>
      </TouchableOpacity>

      {categories?.map((category) => (
        <TouchableOpacity
          key={category.id}
          onPress={() => onSelect(category.id)}
          className={`px-4 py-2 rounded-full mr-2 ${
            selected === category.id
              ? "bg-indigo-600"
              : "bg-gray-100 border border-gray-200"
          }`}
        >
          <Text
            className={`font-medium ${
              selected === category.id ? "text-white" : "text-gray-700"
            }`}
          >
            {category.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
