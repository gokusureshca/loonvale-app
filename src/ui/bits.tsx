import { router } from "expo-router";
import { ChevronDown } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, G, Path } from "react-native-svg";
import { expenseSource, SOURCE_LABEL, TAX_LABEL, type Expense, type Person } from "@/data/sample";
import { receiptTotals, taxRate, usageCaption } from "@/lib/budget";
import { dayLabel, money, money2 } from "@/lib/format";
import { useStore } from "@/store/app-store";
import { font, radius, type, useColors, type Colors } from "./theme";

type Variant = keyof typeof type;
type Weight = "regular" | "medium" | "semibold" | "bold" | "extrabold";

/** Text in the brand fonts and the theme's colour. */
export function T({
  v = "body",
  w,
  muted,
  color,
  style,
  children,
  lines,
  center,
}: {
  v?: Variant;
  w?: Weight;
  muted?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  lines?: number;
  center?: boolean;
}) {
  const c = useColors();
  const defaultMuted = v === "caption";
  return (
    <Text
      numberOfLines={lines}
      style={[
        type[v],
        w ? { fontFamily: font[w] } : null,
        { color: color ?? (muted ?? defaultMuted ? c.muted : c.text) },
        center ? { textAlign: "center" } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** The Loonvale mark: a loon in one line with a red eye, on three ripples narrowing into a V. */
export function LoonMark({ size = 28, color }: { size?: number; color?: string }) {
  const c = useColors();
  const stroke = color ?? c.link;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Path
        fill="none"
        stroke={stroke}
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M113 37 L100 31 C90 25 77 30 77 41 C77 52 70 57 58 57 C42 57 25 60 14 68 L84 68 C93 68 97 61 93 52"
      />
      <Circle cx={90} cy={37} r={2.3} fill="#A62118" />
      <G fill="none" stroke={stroke} strokeWidth={4.5} strokeLinecap="round">
        <Path d="M24 84 H100" />
        <Path d="M40 96 H84" />
        <Path d="M55 108 H69" />
      </G>
    </Svg>
  );
}

export function Logo({ size = 22 }: { size?: number }) {
  const c = useColors();
  return (
    <View accessibilityRole="header" accessibilityLabel="loonvale" style={{ flexDirection: "row", alignItems: "center", gap: size * 0.3 }}>
      <LoonMark size={size * 1.25} />
      <Text style={{ fontFamily: font.display, fontSize: size, letterSpacing: -size * 0.03, color: c.text }}>
        loonvale
      </Text>
    </View>
  );
}

/** A scrolling page: logo, then the eyebrow and serif title, then the content. */
export function Page({
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
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48, gap: 16 }}>
        <Logo />
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 16, marginTop: 8, marginBottom: 4 }}>
          <View style={{ flex: 1 }}>
            {eyebrow ? <T v="caption">{eyebrow}</T> : null}
            <T v="title" style={{ fontSize: 34, lineHeight: 40 }}>
              {title}
            </T>
          </View>
          {right}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function cardStyle(c: Colors): ViewStyle {
  return {
    backgroundColor: c.card,
    borderRadius: radius.card,
    padding: 20,
    ...(c.shadow
      ? { shadowColor: "#1C2326", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 1 }
      : null),
  };
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[cardStyle(c), style]}>{children}</View>;
}

export function Bar({ value, max, over, onHero }: { value: number; max: number; over?: boolean; onHero?: boolean }) {
  const c = useColors();
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : value > 0 ? 100 : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={{ height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: onHero ? c.heroTrack : c.track }}
    >
      <View style={{ width: `${pct}%`, height: "100%", borderRadius: 4, backgroundColor: over ? c.warn : c.onTrack }} />
    </View>
  );
}

/** Red warning words such as "$40 over": red text in light mode, a filled red tag in dark. */
export function AlertTag({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <Text
      style={[
        type.caption,
        { fontFamily: font.bold },
        c.dark
          ? { color: c.onWarn, backgroundColor: c.warn, borderRadius: 999, overflow: "hidden", paddingHorizontal: 8 }
          : { color: c.warn },
      ]}
    >
      {children}
    </Text>
  );
}

/** Bar with its caption under it, always in words. */
export function UsageBar({ spent, budget }: { spent: number; budget: number }) {
  const u = usageCaption(spent, budget, money);
  return (
    <View style={{ gap: 6 }}>
      <Bar value={spent} max={budget} over={!!u.over} />
      <T v="caption">
        {u.text}
        {u.over ? " · " : ""}
        {u.over ? <AlertTag>{u.over}</AlertTag> : null}
      </T>
    </View>
  );
}

export function Avatar({ text, size = 32, onPress }: { text: string; size?: number; onPress?: () => void }) {
  const c = useColors();
  const body = (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: c.secondary }}>
      <T v={size > 40 ? "body" : "caption"} w="bold" muted={false}>
        {text}
      </T>
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={6}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

export function PersonTag({ who }: { who: Person }) {
  const { people } = useStore();
  const p = people.find((x) => x.id === who);
  return (
    <View accessibilityLabel={p?.name ?? who}>
      <Avatar text={p?.tag ?? who} size={34} />
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = "primary",
  busy,
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "soft";
  busy?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const c = useColors();
  const primary = kind === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        {
          minHeight: primary ? 56 : 48,
          borderRadius: radius.field,
          flexDirection: "row",
          gap: 8,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 20,
          backgroundColor: primary ? c.primary : c.secondary,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={primary ? c.onPrimary : c.text} />
      ) : (
        <>
          {icon}
          <T w={primary ? "bold" : "semibold"} color={primary ? c.onPrimary : c.text}>
            {label}
          </T>
        </>
      )}
    </Pressable>
  );
}

/** A rounded choice. Active is filled lake teal. */
export function Chip({
  label,
  active,
  onPress,
  small,
  icon,
  style,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  small?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: small ? 34 : 44,
          paddingHorizontal: small ? 12 : 18,
          borderRadius: 999,
          flexDirection: "row",
          gap: 6,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: active ? c.hero : c.secondary,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icon}
      <T v={small ? "caption" : "label"} w={small ? "bold" : "semibold"} color={active ? c.onHero : c.text} lines={1}>
        {label}
      </T>
    </Pressable>
  );
}

/** Chips in one line that scroll sideways, edge to edge. */
export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -20, flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Field(props: TextInputProps) {
  const c = useColors();
  return (
    <TextInput
      placeholderTextColor={c.muted}
      {...props}
      style={[type.body, { minHeight: 52, borderRadius: radius.field, backgroundColor: c.secondary, color: c.text, paddingHorizontal: 16 }, props.style]}
    />
  );
}

/** A small rounded label, e.g. "Receipt". */
export function Pill({ children, strong }: { children: ReactNode; strong?: boolean }) {
  const c = useColors();
  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 9, paddingVertical: 1, backgroundColor: strong ? c.hero : c.secondary }}>
      <T v="caption" w="bold" color={strong ? c.onHero : c.text} style={{ fontSize: 12 }}>
        {children}
      </T>
    </View>
  );
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }} />;
}

/** One expense: shop, date, who, amount and where it came from. Receipts open to show their lines. */
export function ExpenseRow({ e }: { e: Expense }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const t = e.items ? receiptTotals(e.items) : null;
  const sub = [dayLabel(e.date), t ? `${e.items!.length} items · Tax ${money2(t.hst)}` : e.type, ...e.labels]
    .filter(Boolean)
    .join(" · ");
  const edit = () => router.push({ pathname: "/add", params: { id: e.id } });
  return (
    <View style={{ paddingVertical: 12 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${e.shop}, ${money2(e.amount)}`}
        accessibilityState={e.items ? { expanded: open } : undefined}
        onPress={() => (e.items ? setOpen(!open) : edit())}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.6 : 1 })}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <T w="semibold" lines={1}>
            {e.shop}
          </T>
          <T v="caption" lines={1}>
            {sub}
          </T>
        </View>
        <PersonTag who={e.who} />
        <View style={{ width: 92, alignItems: "flex-end", gap: 2 }}>
          <T w="bold">{money2(e.amount)}</T>
          <Pill>{SOURCE_LABEL[expenseSource(e)]}</Pill>
        </View>
        <View style={{ width: 16, transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
          {e.items ? <ChevronDown size={16} color={c.text} /> : null}
        </View>
      </Pressable>
      {open && e.items && t && (
        <View style={{ marginTop: 12, gap: 6, borderRadius: 12, backgroundColor: c.bg, padding: 12 }}>
          {e.items.map((it, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <T lines={1} style={{ flex: 1, fontSize: 15 }}>
                {it.name}
              </T>
              {it.hst ? <Pill>{TAX_LABEL[taxRate(it)]}</Pill> : null}
              <T v="caption">×{it.qty}</T>
              <T style={{ width: 76, textAlign: "right", fontSize: 15 }}>{money2(it.qty * it.price)}</T>
            </View>
          ))}
          <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, marginTop: 4, paddingTop: 6 }}>
            <Line k="Subtotal" v={money2(t.subtotal)} />
            <Line k="Tax" v={money2(t.hst)} />
            <Line k="Total" v={money2(t.total)} strong />
          </View>
          <Button kind="soft" label="Edit or delete" onPress={edit} />
        </View>
      )}
    </View>
  );
}

function Line({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <T v="caption" w={strong ? "bold" : undefined} muted={!strong}>
        {k}
      </T>
      <T v="caption" w={strong ? "bold" : undefined} muted={!strong}>
        {v}
      </T>
    </View>
  );
}
