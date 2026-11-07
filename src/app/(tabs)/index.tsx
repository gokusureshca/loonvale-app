import { router } from "expo-router";
import { ArrowRight, ChevronRight, Flame, ShoppingBag, Store, TrendingUp } from "lucide-react-native";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { GROUPS } from "@/data/sample";
import { leftToSpend, spentByCategory } from "@/lib/budget";
import { computeFire } from "@/lib/fire";
import { money, money2, monthLong } from "@/lib/format";
import { planLine } from "@/lib/plans";
import { useStore } from "@/store/app-store";
import { Avatar, Bar, Card, cardStyle, Divider, Page, PersonTag, T, UsageBar } from "@/ui/bits";
import { useColors } from "@/ui/theme";

export default function Overview() {
  const st = useStore();
  const c = useColors();
  const { budgets, expenses, categories, month, fire, fireSet, assumptions, email, people, plans } = st;

  if (!st.ready)
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: c.bg }}>
        <ActivityIndicator color={c.primary} />
      </View>
    );

  const initials = people
    .filter((p) => p.id !== "J")
    .map((p) => p.tag[0])
    .join("");

  if (email && !st.householdId)
    return (
      <Page title="Almost there" right={<Avatar text={initials || "?"} size={52} onPress={() => router.push("/settings")} />}>
        <Card style={{ gap: 8 }}>
          <T v="heading">Set up your household on the web first</T>
          <T muted>
            Open firis.lovable.app, sign in with {email} and answer the setup questions. Then come back here and
            your budget will be waiting.
          </T>
        </Card>
      </Page>
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
  const pf = st.portfolio ?? (fireSet ? { investments: fire.investments, homeEquity: fire.homeEquity } : null);

  return (
    <Page
      eyebrow={monthLong(month)}
      title="Overview"
      right={<Avatar text={initials || "?"} size={52} onPress={() => router.push("/settings")} />}
    >
      {!email && (
        <Pressable onPress={() => router.push("/sign-in")}>
          <View style={{ borderRadius: 16, padding: 14, backgroundColor: c.secondary, flexDirection: "row", gap: 8, alignItems: "center" }}>
            <T v="caption" muted={false} style={{ flex: 1 }}>
              You're looking at a sample family. Sign in to see your own household.
            </T>
            <T v="caption" w="bold" color={c.link}>
              Sign in
            </T>
          </View>
        </Pressable>
      )}

      <Pressable onPress={() => router.navigate("/fire")} style={[cardStyle(c), { backgroundColor: c.hero, padding: 24, gap: 12 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <T color={c.onHero} style={{ opacity: 0.8, fontSize: 15 }}>
            {fireSet ? `${fire.goal === "retire" ? "Retire" : "Work optional"} at ${fire.goalAge}` : "Your north star"}
          </T>
          <Flame size={20} color={c.onHero} opacity={0.7} />
        </View>
        {fireSet ? (
          <>
            <T v="display" color={c.onHero}>
              ${(r.need / 1e6).toFixed(2)}M
            </T>
            <View style={{ gap: 8, marginTop: 20 }}>
              <Bar value={r.pct} max={100} onHero />
              <T v="caption" color={c.onHero} style={{ opacity: 0.8 }}>
                {Math.round(r.pct)}% on track · save {money(r.monthlyNeeded)}/mo to get there
              </T>
            </View>
          </>
        ) : (
          <>
            <T v="title" color={c.onHero}>
              Set your FIRE goal
            </T>
            <T color={c.onHero} style={{ opacity: 0.8, fontSize: 15 }}>
              8 short questions. See how much you need and what to save each month.
            </T>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 20 }}>
              <T w="bold" color={c.onHero}>
                Start
              </T>
              <ArrowRight size={16} color={c.onHero} />
            </View>
          </>
        )}
      </Pressable>

      <Card style={{ padding: 24, gap: 12 }}>
        <CardTop label="Left to spend this month" icon={<ShoppingBag size={20} color={c.muted} />} />
        <T v="display" color={lts.left < 0 ? c.alertText : undefined}>
          {money(lts.left)}
        </T>
        <View style={{ gap: 8, marginTop: 20 }}>
          <Bar value={lts.spent} max={lts.budget} over={lts.left < 0} />
          <T v="caption">of {money(lts.budget)} spending budget · investments not included</T>
        </View>
      </Card>

      <Card style={{ padding: 24, gap: 12 }}>
        <CardTop label="Portfolio today" icon={<TrendingUp size={20} color={c.muted} />} />
        {pf ? (
          <>
            <T v="display">{money(pf.investments + pf.homeEquity)}</T>
            <View style={{ gap: 8, marginTop: 20 }}>
              <Bar value={100} max={100} />
              <T v="caption">
                Investments {money(pf.investments)} · Home equity {money(pf.homeEquity)}
              </T>
            </View>
          </>
        ) : (
          <>
            <T v="title" muted>
              Not added yet
            </T>
            <T v="caption" style={{ marginTop: 20 }}>
              Answer the FIRE goal questions to add your investments and home equity.
            </T>
          </>
        )}
      </Card>

      <Card style={{ padding: 24, gap: 20 }}>
        <SectionTop title="Budget by category" note={`${monthLong(month).split(" ")[0]} spend`} />
        {cats.map((cat) => {
          const sp = spent[cat.id] ?? 0;
          const over = sp > (b[cat.id] ?? 0);
          return (
            <View key={cat.id} style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <T w="semibold" lines={1} style={{ flexShrink: 1 }}>
                  {cat.name}
                </T>
                <T v="caption" w={over ? "bold" : undefined} color={over ? c.alertText : undefined}>
                  {GROUPS.find((g) => g.id === cat.group)?.name} · {money(b[cat.id] ?? 0)}
                </T>
              </View>
              <UsageBar spent={sp} budget={b[cat.id] ?? 0} />
            </View>
          );
        })}
        <Divider />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <T v="caption">Each month keeps its own budget</T>
          <LinkText label="See budget" onPress={() => router.navigate("/budget")} />
        </View>
      </Card>

      {plans.length > 0 && (
        <Card style={{ padding: 24, gap: 16 }}>
          <SectionTop title="Plans" />
          {plans.slice(0, 3).map((p) => (
            <View key={p.id} style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <T w="bold" lines={1} style={{ flexShrink: 1, fontSize: 15 }}>
                  {p.name}
                </T>
                <T style={{ fontSize: 15 }}>
                  {money(p.saved)} of {money(p.target)}
                </T>
              </View>
              <Bar value={p.saved} max={p.target} />
              <T v="caption">{planLine(p, month)}</T>
            </View>
          ))}
        </Card>
      )}

      <Card style={{ padding: 24, gap: 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <T v="heading">Recent spending</T>
          <LinkText label="View all" arrow onPress={() => router.navigate("/spending")} />
        </View>
        {recent.length === 0 && <T v="caption">No spending yet this month. Tap the + button to add one.</T>}
        {recent.map((e, i) => {
          const cat = categories.find((x) => x.id === e.categoryId);
          return (
            <View key={e.id}>
              {i > 0 && <Divider />}
              <Pressable
                onPress={() => router.push({ pathname: "/add", params: { id: e.id } })}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, opacity: pressed ? 0.6 : 1 })}
              >
                <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: c.secondary }}>
                  <Store size={20} color={c.text} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T w="semibold" lines={1}>
                    {e.shop}
                  </T>
                  <T v="caption" lines={1}>
                    {cat?.name ?? "Other"}
                    {e.type ? ` · ${e.type}` : ""}
                  </T>
                </View>
                <PersonTag who={e.who} />
                <T w="bold" style={{ minWidth: 84, textAlign: "right" }}>
                  {money2(e.amount)}
                </T>
              </Pressable>
            </View>
          );
        })}
      </Card>
    </Page>
  );
}

function CardTop({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <T muted style={{ fontSize: 15 }}>
        {label}
      </T>
      {icon}
    </View>
  );
}

function SectionTop({ title, note }: { title: string; note?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
      <T v="heading">{title}</T>
      {note ? <T v="caption">{note}</T> : null}
    </View>
  );
}

function LinkText({ label, onPress, arrow }: { label: string; onPress: () => void; arrow?: boolean }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} hitSlop={10} style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44 }}>
      <T w="bold" style={{ fontSize: 15 }}>
        {label}
      </T>
      {arrow ? <ArrowRight size={16} color={c.text} /> : <ChevronRight size={16} color={c.text} />}
    </Pressable>
  );
}
