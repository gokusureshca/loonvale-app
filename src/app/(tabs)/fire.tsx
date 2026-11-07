import { Flame } from "lucide-react-native";
import { View } from "react-native";
import { computeFire } from "@/lib/fire";
import { money, moneyShort } from "@/lib/format";
import { useStore } from "@/store/app-store";
import { AlertTag, Bar, Card, Divider, Page, T } from "@/ui/bits";
import { useColors } from "@/ui/theme";

/** The FIRE goal result. Answering or changing the 8 questions is on the web for now. */
export default function Fire() {
  const { fire: a, fireSet, assumptions } = useStore();
  const c = useColors();
  const r = computeFire(a, assumptions);
  const goalName = a.goal === "retire" ? "Retire" : "Work optional";

  if (!fireSet)
    return (
      <Page eyebrow="8 short questions" title="Your FIRE goal">
        <Card style={{ backgroundColor: c.hero, padding: 24, gap: 12 }}>
          <Flame size={22} color={c.onHero} />
          <T v="title" color={c.onHero}>
            Set your FIRE goal
          </T>
          <T color={c.onHero} style={{ opacity: 0.8, fontSize: 15 }}>
            Answer 8 short questions on the web app to see how much you need and what to save each month. It shows here
            straight away.
          </T>
        </Card>
      </Page>
    );

  const rows: [string, string][] = [
    ["Goal", goalName],
    ["Age now", String(a.age)],
    ["Goal age", String(a.goalAge)],
    ["Household income", `${money(a.income)}/yr`],
    ["Need each month", money(a.spendMonthly)],
    ["Save each month", money(a.saveMonthly)],
    ["Investments today", money(a.investments)],
    ["Home equity", a.homeEquity ? `${money(a.homeEquity)} (${a.sellHome ? "selling" : "keeping"})` : "None"],
  ];

  return (
    <Page eyebrow={`${goalName} at ${a.goalAge} · in ${r.goalYear}`} title="Your FIRE goal">
      <Card style={{ backgroundColor: c.hero, padding: 24, gap: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Flame size={16} color={c.onHero} opacity={0.8} />
            <T color={c.onHero} style={{ opacity: 0.8, fontSize: 15 }}>
              You need by age {a.goalAge}
            </T>
          </View>
          <View style={{ borderRadius: 999, backgroundColor: c.heroTrack, paddingHorizontal: 12, paddingVertical: 4 }}>
            <T v="caption" w="semibold" color={c.onHero}>
              Target in {r.years} yrs
            </T>
          </View>
        </View>
        <T v="display" color={c.onHero}>
          {moneyShort(r.need)}
        </T>
        <T v="caption" color={c.onHero} style={{ opacity: 0.8 }}>
          Total portfolio incl. pensions and home equity
        </T>
      </Card>

      <Card style={{ padding: 24 }}>
        <T v="caption">Save each month from now</T>
        <T v="title">{money(r.monthlyNeeded)}</T>
        <T v="caption">
          To reach {moneyShort(r.need)} by {a.goalAge}, rising with inflation
        </T>
      </Card>

      <Card style={{ padding: 24, gap: 8 }}>
        <T v="caption">On your current saving of {money(a.saveMonthly)} a month</T>
        <T v="title">
          {moneyShort(r.projected)} by {a.goalAge}
        </T>
        <Bar value={r.pct} max={100} />
        <T v="caption">
          {Math.round(r.pct)}% of your goal
          {r.short > 0 ? " · " : " · on track"}
          {r.short > 0 ? <AlertTag>{moneyShort(r.short)} short</AlertTag> : null}
        </T>
      </Card>

      <Card>
        <T v="heading">What you told us</T>
        {rows.map(([k, v], i) => (
          <View key={k}>
            {i > 0 && <Divider />}
            <View style={{ paddingVertical: 10 }}>
              <T v="caption">{k}</T>
              <T w="semibold">{v}</T>
            </View>
          </View>
        ))}
      </Card>
      <T v="caption" center>
        Change your answers on the web app for now.
      </T>
    </Page>
  );
}
