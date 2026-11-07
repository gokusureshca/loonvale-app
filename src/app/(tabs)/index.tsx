import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, View } from "react-native";
import { GROUPS } from "@/data/sample";
import { leftToSpend, spentByCategory } from "@/lib/budget";
import { computeFire } from "@/lib/fire";
import { money, money2, monthLong } from "@/lib/format";
import { useStore } from "@/store/app-store";
import { Bar, Card, ExpenseRow, s, Screen, T, UsageBar } from "@/ui/bits";
import { useColors } from "@/ui/theme";

export default function Home() {
  const st = useStore();
  const c = useColors();
  const { budgets, expenses, categories, month, fire, fireSet, assumptions, email } = st;

  if (!st.ready)
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: c.bg }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );

  if (email && !st.householdId)
    return (
      <Screen title="Almost there">
        <Card>
          <T v="heading">Set up your household on the web first</T>
          <T muted>
            Open firis.lovable.app on a computer, sign in with {email}, and answer the setup
            questions. Then come back here and your budget will be waiting.
          </T>
        </Card>
      </Screen>
    );

  const b = budgets[month] ?? {};
  const lts = leftToSpend(b, expenses, month, categories);
  const spent = spentByCategory(expenses, month);
  const cats = categories.filter((x) => x.group !== "investments");
  const recent = expenses
    .filter((e) => e.date.startsWith(month))
    .sort((a, z) => z.date.localeCompare(a.date))
    .slice(0, 5);
  const r = computeFire(fire, assumptions);

  return (
    <Screen
      eyebrow={monthLong(month)}
      title="Home"
      right={
        !email ? (
          <Pressable onPress={() => router.push("/sign-in")} hitSlop={8}>
            <T v="caption" style={{ fontWeight: "700" }}>
              Sign in
            </T>
          </Pressable>
        ) : null
      }
    >
      {!email && (
        <Card style={{ backgroundColor: c.surface2 }}>
          <T v="caption">
            You're looking at a sample family. Sign in to see your own household.
          </T>
        </Card>
      )}

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <T v="caption" muted>
            Left to spend this month
          </T>
          <Feather name="shopping-bag" size={18} color={c.muted} />
        </View>
        <T v="display" color={lts.left < 0 ? c.accent : undefined}>
          {money(lts.left)}
        </T>
        <Bar value={lts.spent} max={lts.budget} over={lts.left < 0} />
        <T v="caption" muted>
          of {money(lts.budget)} spending budget · investments not included
        </T>
      </Card>

      {fireSet && (
        <Card style={{ backgroundColor: c.hero }}>
          <T v="caption" color={c.onHero}>
            {fire.goal === "retire" ? "Retire" : "Work optional"} at {fire.goalAge}
          </T>
          <T v="display" color={c.onHero}>
            ${(r.need / 1e6).toFixed(2)}M
          </T>
          <Bar value={r.pct} max={100} />
          <T v="caption" color={c.onHero}>
            {Math.round(r.pct)}% on track · save {money(r.monthlyNeeded)}/mo to get there
          </T>
        </Card>
      )}

      <Card>
        <T v="heading">Budget by category</T>
        {cats.map((cat) => (
          <View key={cat.id} style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <T style={{ fontWeight: "600", flexShrink: 1 }} lines={1}>
                {cat.name}
              </T>
              <T v="caption" muted>
                {GROUPS.find((g) => g.id === cat.group)?.name}
              </T>
            </View>
            <UsageBar spent={spent[cat.id] ?? 0} budget={b[cat.id] ?? 0} />
          </View>
        ))}
      </Card>

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <T v="heading">Recent spending</T>
          <Pressable onPress={() => router.navigate("/spending")} hitSlop={8} style={s.row}>
            <T v="caption" style={{ fontWeight: "700" }}>
              View all
            </T>
          </Pressable>
        </View>
        {recent.length === 0 ? (
          <T v="caption" muted>
            No spending yet this month. Tap Add to record one.
          </T>
        ) : (
          recent.map((e) => <ExpenseRow key={e.id} e={e} amount={money2(e.amount)} />)
        )}
      </Card>
    </Screen>
  );
}
