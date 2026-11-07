import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Line as SvgLine, Path } from "react-native-svg";
import { GROUPS, type Person } from "@/data/sample";
import { budgetFor, firstMonth, leftToSpend, monthlySpend } from "@/lib/budget";
import { dayLabel, money, money2, monthLong, monthShort, nextMonth, prevMonth } from "@/lib/format";
import { byMerchant } from "@/lib/shops";
import { useStore } from "@/store/app-store";
import { AlertTag, Card, Chip, ChipRow, Divider, ExpenseRow, Page, T, UsageBar } from "@/ui/bits";
import { useColors } from "@/ui/theme";

/** How the list is shown: by category or by merchant, or one person's or one label's spending. */
type Filter = "category" | "merchant" | Person | "label";

export default function Spending() {
  const { budgets, expenses, categories, labels, people, month: today } = useStore();
  const c = useColors();
  const [month, setMonth] = useState(today);
  const [filter, setFilter] = useState<Filter>("category");
  const [label, setLabel] = useState(labels[0] ?? "");
  const [open, setOpen] = useState<Record<string, boolean>>({ groceries: true });
  const { budget: b, own } = budgetFor(budgets, month);
  const first = firstMonth(budgets, expenses, today);
  const isNow = month === today;
  const lts = leftToSpend(b, expenses, month, categories);

  // Up to 6 months ending this month, starting no earlier than the first data.
  const chartMonths = [today];
  while (chartMonths.length < 6 && chartMonths[0]! > first) chartMonths.unshift(prevMonth(chartMonths[0]!));
  const chart = monthlySpend(chartMonths, budgets, expenses, categories);

  const list = expenses
    .filter(
      (e) =>
        e.date.startsWith(month) &&
        (filter === "category" || filter === "merchant" || (filter === "label" ? e.labels.includes(label) : e.who === filter)),
    )
    .sort((a, z) => z.date.localeCompare(a.date));
  const cats = categories.filter((x) => x.group !== "investments");
  const withSpend = cats.filter((x) => list.some((e) => e.categoryId === x.id));
  const empty = cats.length - withSpend.length;
  const merchants = filter === "merchant" ? byMerchant(list.filter((e) => cats.some((x) => x.id === e.categoryId))) : [];
  const keys = filter === "merchant" ? merchants.map((m) => `m:${m.key}`) : withSpend.map((x) => x.id);

  return (
    <Page title="Spending">
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: -8 }}>
        <Round label="Previous month" disabled={month <= first} onPress={() => setMonth(prevMonth(month))}>
          <ChevronLeft size={20} color={c.text} />
        </Round>
        <T v="heading" w="extrabold">
          {monthLong(month)}
        </T>
        <Round label="Next month" disabled={isNow} onPress={() => setMonth(nextMonth(month))}>
          <ChevronRight size={20} color={c.text} />
        </Round>
      </View>

      {chart.length > 1 && <MonthChart data={chart} selected={month} onSelect={setMonth} />}

      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <View>
          <T v="caption">{isNow ? "Left to spend" : lts.left < 0 ? "Over budget by" : "Left over"}</T>
          <T v="display" color={lts.left < 0 ? c.alertText : undefined}>
            {money(!isNow && lts.left < 0 ? -lts.left : lts.left)}
          </T>
        </View>
        <T v="caption" style={{ marginBottom: 8 }}>
          {money(lts.spent)} of {money(lts.budget)} used
        </T>
      </View>
      {!own && lts.budget > 0 && (
        <T v="caption" style={{ marginTop: -12 }}>
          {monthLong(month)} had no budget, so this uses your nearest one.
        </T>
      )}

      <MoneyIn month={month} spent={lts.spent} />

      <View style={{ gap: 8 }}>
        <ChipRow>
          <Chip label="By category" active={filter === "category"} onPress={() => setFilter("category")} />
          <Chip label="By merchant" active={filter === "merchant"} onPress={() => setFilter("merchant")} />
          {people.length > 1 &&
            people.map((p) => <Chip key={p.id} label={p.name} active={filter === p.id} onPress={() => setFilter(p.id)} />)}
          {labels.length > 0 && <Chip label="Label" active={filter === "label"} onPress={() => setFilter("label")} />}
        </ChipRow>
        {filter === "label" && (
          <ChipRow>
            {labels.map((l) => (
              <Chip key={l} small label={l} active={label === l} onPress={() => setLabel(l)} />
            ))}
          </ChipRow>
        )}
        <View style={{ flexDirection: "row", gap: 16 }}>
          <Pressable onPress={() => setOpen(Object.fromEntries(keys.map((k) => [k, true])))} style={{ minHeight: 44, justifyContent: "center" }}>
            <T w="semibold" style={{ fontSize: 15 }}>
              Open all
            </T>
          </Pressable>
          <Pressable onPress={() => setOpen({})} style={{ minHeight: 44, justifyContent: "center" }}>
            <T w="semibold" muted style={{ fontSize: 15 }}>
              Close all
            </T>
          </Pressable>
        </View>
      </View>

      {filter === "merchant" && merchants.length === 0 && <Dashed text="No spending yet in this month" />}
      {filter === "merchant" &&
        merchants.map((m) => {
          const k = `m:${m.key}`;
          const isOpen = !!open[k];
          return (
            <Card key={k}>
              <Header open={isOpen} onPress={() => setOpen({ ...open, [k]: !isOpen })} title={m.name} right={<T w="bold">{money(m.total)}</T>} />
              <T v="caption" style={{ marginTop: 4, paddingLeft: 32 }}>
                {m.rows.length} expense{m.rows.length === 1 ? "" : "s"} · {Math.round((m.total / lts.spent) * 100) || "<1"}% of the month
              </T>
              {isOpen && <Rows rows={m.rows} />}
            </Card>
          );
        })}

      {filter !== "merchant" &&
        withSpend.map((cat) => {
          const rows = list.filter((e) => e.categoryId === cat.id);
          const sp = rows.reduce((t, e) => t + e.amount, 0);
          const isOpen = !!open[cat.id];
          return (
            <Card key={cat.id}>
              <Header
                open={isOpen}
                onPress={() => setOpen({ ...open, [cat.id]: !isOpen })}
                title={cat.name}
                right={
                  <T v="caption">
                    {GROUPS.find((g) => g.id === cat.group)?.name} · {rows.length} expense{rows.length === 1 ? "" : "s"}
                  </T>
                }
              />
              <View style={{ marginTop: 12 }}>
                <UsageBar spent={sp} budget={b[cat.id] ?? 0} />
              </View>
              {isOpen && <Rows rows={rows} />}
            </Card>
          );
        })}
      {filter !== "merchant" && empty > 0 && <Dashed text={`No spending yet · ${empty} categories`} />}
    </Page>
  );
}

function Rows({ rows }: { rows: Parameters<typeof ExpenseRow>[0]["e"][] }) {
  return (
    <View style={{ marginTop: 12 }}>
      {rows.map((e) => (
        <View key={e.id}>
          <Divider />
          <ExpenseRow e={e} />
        </View>
      ))}
    </View>
  );
}

function Header({ open, onPress, title, right }: { open: boolean; onPress: () => void; title: string; right: React.ReactNode }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 32 }}
    >
      {open ? <ChevronDown size={20} color={c.text} /> : <ChevronRight size={20} color={c.text} />}
      <T v="heading" w="extrabold" lines={1} style={{ flex: 1 }}>
        {title}
      </T>
      {right}
    </Pressable>
  );
}

function Dashed({ text }: { text: string }) {
  const c = useColors();
  return (
    <View style={{ borderRadius: 20, borderWidth: 2, borderStyle: "dashed", borderColor: c.border, padding: 24, alignItems: "center" }}>
      <T v="caption">{text}</T>
    </View>
  );
}

function Round({ label, disabled, onPress, children }: { label: string; disabled: boolean; onPress: () => void; children: React.ReactNode }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: c.secondary, opacity: disabled ? 0.35 : 1 }}
    >
      {children}
    </Pressable>
  );
}

/** Spending per month as bars, the budget as a dashed line. Tap a bar to open that month. */
function MonthChart({ data, selected, onSelect }: { data: { month: string; spent: number; budget: number }[]; selected: string; onSelect: (m: string) => void }) {
  const c = useColors();
  const [w, setW] = useState(0);
  const H = 120;
  const max = Math.max(1, ...data.map((d) => Math.max(d.spent, d.budget))) * 1.08;
  const y = (v: number) => H - (v / max) * H;
  const n = data.length;
  const col = w / n;
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${i * col},${y(d.budget)} L${(i + 1) * col},${y(d.budget)}`).join(" ");
  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <T w="bold">Spending by month</T>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c.primary }} />
            <T v="caption">Spent</T>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Svg width={16} height={4}>
              <SvgLine x1={0} y1={2} x2={16} y2={2} stroke={c.text} strokeWidth={2} strokeDasharray="4 3" />
            </Svg>
            <T v="caption">Budget</T>
          </View>
        </View>
      </View>
      <View style={{ height: H, marginTop: 16 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: c.border }} />
        <View style={{ flexDirection: "row", height: "100%" }}>
          {data.map((d) => {
            const over = d.budget > 0 && d.spent > d.budget;
            return (
              <Pressable
                key={d.month}
                accessibilityRole="button"
                accessibilityLabel={`${monthLong(d.month)}: ${money(d.spent)} spent${d.budget > 0 ? ` of ${money(d.budget)} budget${over ? `, ${money(d.spent - d.budget)} over` : ""}` : ""}`}
                onPress={() => onSelect(d.month)}
                style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", paddingHorizontal: 3 }}
              >
                <View
                  style={{
                    width: "100%",
                    maxWidth: 36,
                    height: Math.max(d.spent > 0 ? 2 : 0, (d.spent / max) * H),
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                    backgroundColor: c.primary,
                    opacity: d.month === selected ? 1 : 0.45,
                  }}
                />
              </Pressable>
            );
          })}
        </View>
        {w > 0 && data.some((d) => d.budget > 0) && (
          <Svg width={w} height={H} style={{ position: "absolute", left: 0, top: 0 }} pointerEvents="none">
            <Path d={line} fill="none" stroke={c.text} strokeWidth={2} strokeDasharray="4 3" />
          </Svg>
        )}
      </View>
      <View style={{ flexDirection: "row", marginTop: 6 }}>
        {data.map((d) => (
          <T key={d.month} v="caption" w={d.month === selected ? "bold" : undefined} muted={d.month !== selected} center style={{ flex: 1, fontSize: 12 }}>
            {monthShort(d.month)}
          </T>
        ))}
      </View>
    </Card>
  );
}

/** Money in next to what was spent, for one month. */
function MoneyIn({ month, spent }: { month: string; spent: number }) {
  const { incomes, people } = useStore();
  const c = useColors();
  const [open, setOpen] = useState(false);
  const list = incomes.filter((i) => i.date.startsWith(month)).sort((a, z) => z.date.localeCompare(a.date));
  const total = list.reduce((t, i) => t + i.amount, 0);
  const kept = total - spent;
  const name = (p: Person) => people.find((x) => x.id === p)?.name ?? "";
  return (
    <Card style={{ padding: 16 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Money in for ${monthLong(month)}`}
        onPress={() => setOpen(!open)}
        style={{ flexDirection: "row", gap: 8 }}
      >
        <Stat label="Money in" value={money(total)} />
        <Stat label="Spent" value={money(spent)} />
        <View style={{ flex: 1.2, flexDirection: "row" }}>
          <Stat label={kept < 0 ? "Spent more by" : "Kept"} value={money(Math.abs(kept))} alert={kept < 0} />
          <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }], height: 18 }}>
            <ChevronDown size={16} color={c.text} />
          </View>
        </View>
      </Pressable>
      {total === 0 && !open && (
        <T v="caption" style={{ marginTop: 8 }}>
          No money in yet. Add pay on the web, by hand or from a bank statement.
        </T>
      )}
      {open && (
        <View style={{ marginTop: 12 }}>
          {list.length === 0 && <T v="caption">Nothing in {monthLong(month)} yet.</T>}
          {list.map((i) => (
            <View key={i.id}>
              <Divider />
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <T w="semibold" lines={1}>
                    {i.source}
                  </T>
                  <T v="caption">
                    {dayLabel(i.date)}
                    {people.length > 1 ? ` · ${name(i.who)}` : ""}
                  </T>
                </View>
                <T w="bold">{money2(i.amount)}</T>
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function Stat({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <T muted style={{ fontSize: 15, lineHeight: 20 }}>
        {label}
      </T>
      {alert && c.dark ? (
        <AlertTag>{value}</AlertTag>
      ) : (
        <T v="heading" w="extrabold" color={alert ? c.warn : undefined}>
          {value}
        </T>
      )}
    </View>
  );
}
