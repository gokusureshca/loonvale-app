import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { expenseSource, SOURCE_LABEL, type Expense, type Person } from "@/data/sample";
import { dayLabel } from "@/lib/format";
import { usageCaption } from "@/lib/budget";
import { money } from "@/lib/format";
import { useStore } from "@/store/app-store";
import { type, useColors } from "./theme";

type Variant = keyof typeof type;

/** Text in the theme's colour. `muted` for labels and hints. */
export function T({
  v = "body",
  muted,
  color,
  style,
  children,
  lines,
}: {
  v?: Variant;
  muted?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  lines?: number;
}) {
  const c = useColors();
  return (
    <Text
      numberOfLines={lines}
      style={[type[v], { color: color ?? (muted ? c.muted : c.text) }, style]}
    >
      {children}
    </Text>
  );
}

/** A scrolling page with the title on top. */
export function Screen({
  eyebrow,
  title,
  right,
  children,
}: {
  eyebrow?: string;
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  const c = useColors();
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16 }}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            {eyebrow ? <T v="caption" muted>{eyebrow}</T> : null}
            <T v="title">{title}</T>
          </View>
          {right}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[s.card, { backgroundColor: c.surface }, style]}>{children}</View>;
}

export function Bar({ value, max, over }: { value: number; max: number; over?: boolean }) {
  const c = useColors();
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : value > 0 ? 100 : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={[s.track, { backgroundColor: c.surface2 }]}
    >
      <View
        style={{
          width: `${pct}%`,
          height: "100%",
          borderRadius: 4,
          backgroundColor: over ? c.accent : c.onTrack,
        }}
      />
    </View>
  );
}

/** Bar with a caption under it, always in words. */
export function UsageBar({ spent, budget }: { spent: number; budget: number }) {
  const c = usageCaption(spent, budget, money);
  return (
    <View style={{ gap: 6 }}>
      <Bar value={spent} max={budget} over={!!c.over} />
      <T v="caption" muted>
        {c.text}
        {c.over ? <Overflow text={c.over} /> : null}
      </T>
    </View>
  );
}

function Overflow({ text }: { text: string }) {
  const c = useColors();
  // In dark mode red is never text on black, so it's a filled tag.
  return (
    <Text style={[type.caption, { color: c.onAccent, backgroundColor: c.accent, fontWeight: "700" }]}>
      {"  "}
      {text}
      {" "}
    </Text>
  );
}

export function PersonTag({ who }: { who: Person }) {
  const { people } = useStore();
  const c = useColors();
  const p = people.find((x) => x.id === who);
  return (
    <View
      accessibilityLabel={p?.name ?? who}
      style={[s.tag, { backgroundColor: c.surface2 }]}
    >
      <T v="caption" style={{ fontWeight: "700" }}>
        {p?.tag ?? who}
      </T>
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = "primary",
  busy,
  disabled,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "secondary";
  busy?: boolean;
  disabled?: boolean;
}) {
  const c = useColors();
  const primary = kind === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: primary ? c.accent : c.surface2,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={primary ? c.onAccent : c.text} />
      ) : (
        <T color={primary ? c.onAccent : c.text} style={{ fontWeight: "700" }}>
          {label}
        </T>
      )}
    </Pressable>
  );
}

/** A row of choices; one is picked. */
export function Segments<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  const c = useColors();
  return (
    <View style={[s.segments, { backgroundColor: c.surface2 }]}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.id)}
            style={[s.segment, on && { backgroundColor: c.surface }]}
          >
            <T v="caption" style={{ fontWeight: on ? "700" : "500" }}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** One expense: shop, category, who, amount. Tap to change it. */
export function ExpenseRow({ e, amount, showDate }: { e: Expense; amount: string; showDate?: boolean }) {
  const { categories } = useStore();
  const c = useColors();
  const cat = categories.find((x) => x.id === e.categoryId);
  const src = expenseSource(e);
  const sub = [
    showDate ? dayLabel(e.date) : null,
    cat?.name ?? "Other",
    e.type,
    src !== "manual" ? SOURCE_LABEL[src] : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${e.shop}, ${amount}`}
      onPress={() => router.push({ pathname: "/add", params: { id: e.id } })}
      style={({ pressed }) => [s.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={[s.icon, { backgroundColor: c.surface2 }]}>
        <Feather name={src === "receipt" ? "file-text" : "shopping-bag"} size={18} color={c.text} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T style={{ fontWeight: "600" }} lines={1}>
          {e.shop}
        </T>
        <T v="caption" muted lines={1}>
          {sub}
        </T>
      </View>
      <PersonTag who={e.who} />
      <T style={{ fontWeight: "700", minWidth: 84, textAlign: "right", fontVariant: ["tabular-nums"] }}>
        {amount}
      </T>
    </Pressable>
  );
}

export const s = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "flex-end", gap: 16, marginBottom: 8 },
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: "#292321",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  track: { height: 8, borderRadius: 4, overflow: "hidden", width: "100%" },
  tag: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  button: { height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  segments: { flexDirection: "row", borderRadius: 12, padding: 4, gap: 4 },
  segment: { flex: 1, minHeight: 36, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56 },
});
