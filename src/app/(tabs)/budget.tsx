import { Lock } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { GROUPS } from "@/data/sample";
import { spendingBudget, spentByCategory } from "@/lib/budget";
import { money, monthShort } from "@/lib/format";
import { useStore } from "@/store/app-store";
import { Card, cardStyle, Chip, ChipRow, Divider, Page, T, UsageBar } from "@/ui/bits";
import { useColors } from "@/ui/theme";

/** Each month's budget by group, and how spending compares. Changing amounts is on the web for now. */
export default function Budget() {
  const { budgets, categories, expenses, month: thisMonth } = useStore();
  const c = useColors();
  const months = Object.keys(budgets).sort();
  const [month, setMonth] = useState(thisMonth);
  const [tab, setTab] = useState<"plan" | "vs">("plan");
  const b = budgets[month] ?? {};
  const spent = spentByCategory(expenses, month);

  return (
    <Page
      title="Budget"
      right={
        <View style={[cardStyle(c), { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999 }]}>
          <T muted style={{ fontSize: 15 }}>
            Spending {money(spendingBudget(b, categories))}
          </T>
        </View>
      }
    >
      <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 4, padding: 4, borderRadius: 12, backgroundColor: c.secondary }}>
        {(["plan", "vs"] as const).map((t) => (
          <Pressable
            key={t}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            onPress={() => setTab(t)}
            style={[{ flex: 1, minHeight: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" }, tab === t ? cardStyle(c) : null, tab === t ? { padding: 0 } : null]}
          >
            <T w="semibold" muted={tab !== t} style={{ fontSize: 15 }}>
              {t === "plan" ? "Budget" : "Budget vs spend"}
            </T>
          </Pressable>
        ))}
      </View>
      <View style={{ gap: 8 }}>
        <ChipRow>
          {months.map((m) => (
            <Chip
              key={m}
              label={`${monthShort(m)}${m < thisMonth ? " · locked" : m === thisMonth ? " · this month" : ""}`}
              active={m === month}
              icon={m < thisMonth ? <Lock size={14} color={m === month ? c.onHero : c.text} /> : undefined}
              onPress={() => setMonth(m)}
            />
          ))}
        </ChipRow>
        <T v="caption">Each month keeps its own budget. Past months are locked.</T>
      </View>

      {GROUPS.map((g) => {
        const cats = categories.filter((x) => x.group === g.id);
        if (!cats.length) return null;
        return (
          <Card key={g.id} style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <T v="heading">{g.name}</T>
                <T v="caption">{g.note}</T>
              </View>
              <T v="heading" w="extrabold">
                {money(cats.reduce((t, x) => t + (b[x.id] ?? 0), 0))}
              </T>
            </View>
            <Divider />
            {cats.map((x) =>
              tab === "vs" && g.id !== "investments" ? (
                <View key={x.id} style={{ gap: 6 }}>
                  <T w="semibold" lines={1}>
                    {x.name}
                  </T>
                  <UsageBar spent={spent[x.id] ?? 0} budget={b[x.id] ?? 0} />
                </View>
              ) : (
                <View key={x.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <T lines={1} style={{ flex: 1 }}>
                    {x.name}
                  </T>
                  <T w="semibold">{money(b[x.id] ?? 0)}</T>
                </View>
              ),
            )}
          </Card>
        );
      })}
      <T v="caption" center>
        Change amounts and categories on the web app for now.
      </T>
    </Page>
  );
}
