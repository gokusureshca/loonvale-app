import { router } from "expo-router";
import { Tabs, type BottomTabBarProps } from "expo-router/tabs";
import { Flame, Home, PieChart, Plus, Wallet, type LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { T } from "@/ui/bits";
import { useColors } from "@/ui/theme";

const TABS: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: "Home", icon: Home },
  budget: { label: "Budget", icon: Wallet },
  spending: { label: "Spending", icon: PieChart },
  fire: { label: "FIRE", icon: Flame },
};

/** Home, Budget, a raised + for adding an expense, Spending, FIRE. Same as the web app on a phone. */
function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const c = useColors();
  const tab = (i: number) => {
    const r = state.routes[i]!;
    const t = TABS[r.name]!;
    const on = state.index === i;
    const color = on ? c.link : c.muted;
    return (
      <Pressable
        key={r.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        accessibilityLabel={t.label}
        onPress={() => navigateToTab(r.key)}
        style={s.tab}
      >
        <t.icon size={24} color={color} strokeWidth={on ? 2.2 : 1.8} />
        <T v="caption" w="semibold" color={color}>
          {t.label}
        </T>
      </Pressable>
    );
  };
  return (
    <View
      style={[
        s.bar,
        { backgroundColor: c.card, borderTopColor: c.border, paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      {tab(0)}
      {tab(1)}
      <View style={s.tab}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add expense"
          onPress={() => router.push("/add")}
          style={({ pressed }) => [
            s.plus,
            { backgroundColor: c.primary, transform: [{ scale: pressed ? 0.95 : 1 }] },
          ]}
        >
          <Plus size={30} color={c.onPrimary} strokeWidth={2.5} />
        </Pressable>
      </View>
      {tab(2)}
      {tab(3)}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="budget" />
      <Tabs.Screen name="spending" />
      <Tabs.Screen name="fire" />
    </Tabs>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tab: { flex: 1, minHeight: 52, alignItems: "center", justifyContent: "center", gap: 2 },
  plus: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginTop: -32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1C2326",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
