import Feather from "@expo/vector-icons/Feather";
import { randomUUID } from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  SCANNED_RECEIPT,
  TAX_LABEL,
  type Expense,
  type Person,
  type ReceiptItem,
} from "@/data/sample";
import { nextTax, receiptTotals, taxRate } from "@/lib/budget";
import { dayLabel, money2 } from "@/lib/format";
import { cleanReceipt, totalsDiffer } from "@/lib/receipt";
import { categoriesByUse, guessCategory, topShops } from "@/lib/shops";
import { readReceipt } from "@/lib/supabase";
import { useStore } from "@/store/app-store";
import { Button, Card, T } from "@/ui/bits";
import { type as typo, useColors } from "@/ui/theme";

const shiftDay = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export default function AddExpense() {
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const st = useStore();
  const { expenses, categories, people, today, householdId } = st;
  const c = useColors();
  const initial = editId ? expenses.find((e) => e.id === editId) : undefined;

  const [id] = useState(() => initial?.id ?? randomUUID());
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [shop, setShop] = useState(initial?.shop ?? "");
  const [date, setDate] = useState(initial?.date ?? today);
  // Empty until the person picks; until then we use our guess for the shop.
  const [cat, setCat] = useState(initial?.categoryId ?? "");
  const [type, setType] = useState(initial?.type ?? "");
  const [who, setWho] = useState<Person>(initial?.who ?? "G");
  const [items, setItems] = useState<ReceiptItem[]>(initial?.items ?? []);
  const [receipt, setReceipt] = useState(initial?.receipt ?? "");
  const [reading, setReading] = useState(false);
  const [scanCat, setScanCat] = useState("");
  const [printed, setPrinted] = useState(0);

  const others = useMemo(() => expenses.filter((e) => e.id !== initial?.id), [expenses, initial]);
  const shops = useMemo(() => topShops(others), [others]);
  const cats = useMemo(() => categoriesByUse(others, categories), [others, categories]);
  const guess = cat ? null : guessCategory(shop, others, categories);
  // Your own history wins, then what the receipt reader picked, then a guess.
  const fromScan = !cat && guess?.from !== "history" && scanCat ? scanCat : "";
  const catId = cat || fromScan || guess?.categoryId || "";
  const typeVal = cat ? type : fromScan ? "" : (guess?.type ?? "");
  const category = categories.find((x) => x.id === catId);
  const totals = receiptTotals(items);
  const value = items.length ? totals.total : Number(amount.replace(/[^0-9.]/g, ""));
  const canSave = value > 0 && shop.trim().length > 0 && !!category;

  const save = () => {
    const e: Expense = {
      id,
      date,
      shop: shop.trim(),
      amount: Math.round(value * 100) / 100,
      categoryId: catId,
      who,
      labels: initial?.labels ?? [],
      source: initial?.source ?? (receipt ? "receipt" : "manual"),
      ...(typeVal ? { type: typeVal } : {}),
      ...(items.length ? { items } : {}),
      ...(receipt ? { receipt } : {}),
    };
    if (initial) st.updateExpense(e);
    else st.addExpense(e);
    router.back();
  };

  const remove = () =>
    initial &&
    Alert.alert(`Delete ${initial.shop}?`, money2(initial.amount), [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          st.deleteExpense(initial.id);
          router.back();
        },
      },
    ]);

  const scan = async (from: "camera" | "library") => {
    if (!householdId) {
      // Not signed in: show what reading looks like, with the sample receipt.
      setItems(SCANNED_RECEIPT.items.map((i) => ({ ...i })));
      if (!shop) setShop(SCANNED_RECEIPT.shop);
      if (!catId) setCat("groceries");
      Alert.alert("Loonvale", "This is a sample receipt. Sign in to read your own.");
      return;
    }
    const perm =
      from === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Loonvale", "Allow photo access in Settings to scan receipts.");
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1 };
    const res =
      from === "camera"
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
    const asset = res.canceled ? null : res.assets[0];
    if (!asset) return;
    setReading(true);
    try {
      const { path, raw } = await readReceipt(householdId, id, asset, categories);
      setReceipt(path);
      const r = cleanReceipt(raw, categories, today);
      if (!r) {
        Alert.alert("Loonvale", "We couldn't read that receipt. Try a clearer photo, or type it in.");
        return;
      }
      setItems(r.items);
      if (r.shop && !shop.trim()) setShop(r.shop);
      if (r.date) setDate(r.date);
      setScanCat(r.categoryId);
      setPrinted(r.total);
    } catch (e) {
      Alert.alert("Loonvale", e instanceof Error ? e.message : "Couldn't read the receipt. Try again");
    } finally {
      setReading(false);
    }
  };

  const input = [
    typo.body,
    { color: c.text, backgroundColor: c.surface2, borderRadius: 12, paddingHorizontal: 14, minHeight: 48 },
  ];

  if (reading)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: c.bg }}>
        <ActivityIndicator size="large" color={c.accent} />
        <T v="heading">Reading your receipt…</T>
        <T v="caption" muted>
          This takes about 20 seconds.
        </T>
      </View>
    );

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <T v="title">{initial ? "Change expense" : "Add expense"}</T>
            <Pressable accessibilityLabel="Close" onPress={() => router.back()} hitSlop={12}>
              <Feather name="x" size={26} color={c.text} />
            </Pressable>
          </View>

          {items.length === 0 ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <T v="display">$</T>
                <TextInput
                  autoFocus={!initial}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={c.muted}
                  accessibilityLabel="Amount"
                  style={[typo.display, { color: c.text, flex: 1 }]}
                />
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button kind="secondary" label="Scan receipt" onPress={() => void scan("camera")} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button kind="secondary" label="Pick photo" onPress={() => void scan("library")} />
                </View>
              </View>
            </>
          ) : (
            <ReceiptLines items={items} setItems={setItems} printed={printed} onClear={() => setItems([])} />
          )}

          <View style={{ gap: 8 }}>
            <T v="caption" muted>
              Shop
            </T>
            <TextInput
              value={shop}
              onChangeText={setShop}
              placeholder="Where did you spend?"
              placeholderTextColor={c.muted}
              style={input}
            />
            <Chips options={shops.map((x) => ({ id: x, label: x }))} value={shop} onChange={setShop} />
          </View>

          <View style={{ gap: 8 }}>
            <T v="caption" muted>
              Category{guess && !cat ? " · guessed from the shop" : ""}
            </T>
            <Chips
              options={cats.map((x) => ({ id: x.id, label: x.name }))}
              value={catId}
              onChange={(v) => {
                setCat(v);
                setType(v === catId ? typeVal : "");
              }}
            />
            {category && category.types.length > 0 && (
              <Chips
                options={category.types.map((x) => ({ id: x, label: x }))}
                value={typeVal}
                onChange={(v) => {
                  setCat(catId);
                  setType(v);
                }}
              />
            )}
          </View>

          <View style={{ gap: 8 }}>
            <T v="caption" muted>
              Who paid
            </T>
            <Chips
              options={people.map((p) => ({ id: p.id, label: p.name }))}
              value={who}
              onChange={(v) => setWho(v as Person)}
            />
          </View>

          <View style={{ gap: 8 }}>
            <T v="caption" muted>
              Date
            </T>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <DayButton icon="chevron-left" onPress={() => setDate(shiftDay(date, -1))} label="Day before" />
              <T style={{ flex: 1, textAlign: "center", fontWeight: "700" }}>
                {date === today ? "Today" : dayLabel(date)}
              </T>
              <DayButton
                icon="chevron-right"
                onPress={() => setDate(shiftDay(date, 1))}
                label="Day after"
                disabled={date >= today}
              />
            </View>
          </View>

          <Button
            label={canSave ? `Save ${money2(value)}` : "Save"}
            onPress={save}
            disabled={!canSave}
          />
          {initial && <Button kind="secondary" label="Delete expense" onPress={remove} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ReceiptLines({
  items,
  setItems,
  printed,
  onClear,
}: {
  items: ReceiptItem[];
  setItems: (i: ReceiptItem[]) => void;
  printed: number;
  onClear: () => void;
}) {
  const c = useColors();
  const t = receiptTotals(items);
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <T v="heading">Receipt</T>
        <Pressable onPress={onClear} hitSlop={8}>
          <T v="caption" style={{ fontWeight: "700" }}>
            Type amount instead
          </T>
        </Pressable>
      </View>
      {items.map((it, i) => (
        <View key={`${it.name}-${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <T lines={1}>{it.name}</T>
            <T v="caption" muted>
              {it.qty > 1 ? `${it.qty} × ${money2(it.price)}` : money2(it.price)}
            </T>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Tax for ${it.name}: ${TAX_LABEL[taxRate(it)]}. Tap to change`}
            onPress={() => setItems(items.map((x, j) => (j === i ? { ...x, ...nextTax(x) } : x)))}
            style={{
              paddingHorizontal: 10,
              minHeight: 32,
              borderRadius: 16,
              justifyContent: "center",
              backgroundColor: taxRate(it) ? c.text : c.surface2,
            }}
          >
            <T v="caption" color={taxRate(it) ? c.bg : c.text} style={{ fontWeight: "700" }}>
              {TAX_LABEL[taxRate(it)]}
            </T>
          </Pressable>
        </View>
      ))}
      <View style={{ borderTopWidth: 1, borderTopColor: c.divider, paddingTop: 8, gap: 2 }}>
        <T v="caption" muted>
          Subtotal {money2(t.subtotal)} · Tax {money2(t.hst)}
        </T>
        <T v="heading">Total {money2(t.total)}</T>
        {totalsDiffer(printed, t.total) && (
          <T v="caption" muted>
            The receipt says {money2(printed)}. Check the lines and tax.
          </T>
        )}
      </View>
    </Card>
  );
}

function Chips({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.id)}
            style={{
              paddingHorizontal: 14,
              minHeight: 40,
              borderRadius: 20,
              justifyContent: "center",
              backgroundColor: on ? c.accent : c.surface2,
            }}
          >
            <T v="caption" color={on ? c.onAccent : c.text} style={{ fontWeight: on ? "700" : "500" }}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

function DayButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: "chevron-left" | "chevron-right";
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
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
