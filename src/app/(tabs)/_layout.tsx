import Feather from "@expo/vector-icons/Feather";
import { router, Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { useColors } from "@/ui/theme";

type Icon = keyof typeof Feather.glyphMap;
const icon =
  (name: Icon) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Feather name={name} color={color as string} size={size} />;

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.divider },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("home") }} />
      <Tabs.Screen name="spending" options={{ title: "Spending", tabBarIcon: icon("list") }} />
      <Tabs.Screen
        name="new"
        options={{ title: "Add", tabBarIcon: icon("plus-circle") }}
        listeners={{
          // Add opens the expense sheet on top instead of switching tabs.
          tabPress: (e) => {
            e.preventDefault();
            router.push("/add");
          },
        }}
      />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: icon("user") }} />
    </Tabs>
  );
}
