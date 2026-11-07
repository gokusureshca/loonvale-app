import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { budgetFor, firstMonth, leftToSpend, monthlySpend } from "@/lib/budget";
import { money, money2, monthLong, monthShort, nextMonth, prevMonth } from "@/lib/format";
import { byMerchant } from "@/lib/shops";
import { useStore } from "@/store/app-store";
import { Card, ExpenseRow, Screen, Segments, T, UsageBar } from "@/ui/bits";
import { useColors } from "@/ui/theme";

type View3 = "date" | "category" | "merchant";

export default function Spending() {
  const { budgets, expenses, categories, month: today } = useStore();
  const c = useColors();
  const [month, setMonth] = useState(today);
  const [by, setBy] = useState<View3>("date");
  const { budget: b, own } = budgetFor(budgets, month);
  const first = firstMonth(budgets, expenses, today);
  const isNow = month === today;
  const lts = leftToSpend(b, expenses, month, categories);

  // Up to 6 months ending this month, no earlier than the first data.
  const chartMonths = [today];
  while (chartMonths.length < 6 && chartMonths[0]! > first) chartMonths.unshift(prevMonth(chartMonths[0]!));
  const chart = monthlySpend(chartMonths, budgets, expenses, categories);
  const top = Math.max(1, ...chart.map((m) => Math.max(m.spent, m.budget)));

  const cats = categories.filter((x) => x.group !== "investments");
  const list = expenses
    .filter((e) => e.date.startsWith(month) && cats.some((x) => x.id === e.categoryId))
    .sort((a, z) => z.date.localeCompare(a.date));

  return (
    <Screen title="Spending">
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Round
          icon="chevron-left"
          label="Previous month"
          disabled={month <= first}
          onPress={() => setMonth(prevMonth(month))}
        />
        <T v="heading" style={{ fontWeight: "700" }}>
          {monthLong(month)}
        </T>
        <Round
          icon="chevron-right"
          label="Next month"
          disabled={isNow}
          onPress={() => setMonth(nextMonth(month))}
        />
      </View>

      {chart.length > 1 && (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "flex-end", height: 120, gap: 8 }}>
            {chart.map((m) => {
              const on = m.month === month;
              const over = m.spent > m.budget;
              return (
                <Pressable
                  key={m.month}
                  accessibilityRole="button"
                  accessibilityLabel={`${monthLong(m.month)}: ${money(m.spent)} of ${money(m.budget)}`}
                  onPress={() => setMonth(m.month)}
                  style={{ flex: 1, alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}
                >
                  <View
                    style={{
                      width: "70%",
                      height: `${Math.max(2, (m.spent / top) * 100)}%`,
                      borderRadius: 6,
                      backgroundColor: over ? c.accent : c.onTrack,
                      opacity: on ? 1 : 0.45,
                    }}
                  />
                  <T v="caption" muted={!on} style={{ fontWeight: on ? "700" : "500" }}>
                    {monthShort(m.month)}
                  </T>
                </Pressable>
              );
            })}
          </View>
        </Card>
      )}

      <View>
        <T v="caption" muted>
          {isNow ? "Left to spend" : lts.left < 0 ? "Over budget by" : "Left over"}
        </T>
        <T v="display" color={lts.left < 0 ? c.accent : undefined}>
          {money(!isNow && lts.left < 0 ? -lts.left : lts.left)}
        </T>
        <T v="caption" muted>
          {money(lts.spent)} of {money(lts.budget)} used
          {!own && lts.budget > 0 ? " · uses your nearest budget" : ""}
        </T>
      </View>

      <Segments
        value={by}
        onChange={setBy}
        options={[
          { id: "date", label: "By date" },
          { id: "category", label: "By category" },
          { id: "merchant", label: "By merchant" },
        ]}
      />

      {list.length === 0 && (
        <Card>
          <T muted>No spending in {monthLong(month)}.</T>
        </Card>
      )}

      {by === "date" && list.length > 0 && (
        <Card style={{ gap: 0 }}>
          {list.map((e) => (
            <ExpenseRow key={e.id} e={e} amount={money2(e.amount)} showDate />
          ))}
        </Card>
      )}

      {by === "category" &&
        cats
          .filter((cat) => list.some((e) => e.categoryId === cat.id))
          .map((cat) => {
            const rows = list.filter((e) => e.categoryId === cat.id);
            const spent = rows.reduce((t, e) => t + e.amount, 0);
            return (
              <Card key={cat.id} style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <T v="heading" lines={1} style={{ flexShrink: 1 }}>
                    {cat.name}
                  </T>
                  <T style={{ fontWeight: "700" }}>{money2(spent)}</T>
                </View>
                <UsageBar spent={spent} budget={b[cat.id] ?? 0} />
                {rows.map((e) => (
                  <ExpenseRow key={e.id} e={e} amount={money2(e.amount)} showDate />
                ))}
              </Card>
            );
          })}

      {by === "merchant" &&
        byMerchant(list).map((m) => (
          <Card key={m.key} style={{ gap: 0 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <T v="heading" lines={1} style={{ flexShrink: 1 }}>
                {m.name}
              </T>
              <T style={{ fontWeight: "700" }}>{money2(m.total)}</T>
            </View>
            <T v="caption" muted>
              {m.rows.length} {m.rows.length === 1 ? "visit" : "visits"}
            </T>
            {m.rows.map((e) => (
              <ExpenseRow key={e.id} e={e} amount={money2(e.amount)} showDate />
            ))}
          </Card>
        ))}
    </Screen>
  );
}

function Round({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: "chevron-left" | "chevron-right";
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.surface2,
        opacity: disabled ? 0.3 : 1,
      }}
    >
      <Feather name={icon} size={20} color={c.text} />
    </Pressable>
  );
}
