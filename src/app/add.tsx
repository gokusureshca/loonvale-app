import { randomUUID } from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { Camera, ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react-native";
import { useMemo, useState, type ReactNode } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SCANNED_RECEIPT, TAX_LABEL, type Expense, type Person, type ReceiptItem } from "@/data/sample";
import { nextTax, receiptTotals, taxRate } from "@/lib/budget";
import { dayLabel, money2 } from "@/lib/format";
import { cleanReceipt, totalsDiffer } from "@/lib/receipt";
import { categoriesByUse, guessCategory, topShops } from "@/lib/shops";
import { readReceipt } from "@/lib/supabase";
import { useStore } from "@/store/app-store";
import { Button, Card, cardStyle, Chip, ChipRow, Field, T } from "@/ui/bits";
import { font, type as typo, useColors } from "@/ui/theme";

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
  const isEdit = !!initial;

  const [id] = useState(() => initial?.id ?? randomUUID());
  const [step, setStep] = useState<"form" | "receipt">("form");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [shop, setShop] = useState(initial?.shop ?? "");
  const [more, setMore] = useState(false);
  const [date, setDate] = useState(initial?.date ?? today);
  // Empty until the person picks; until then we use our guess for the shop.
  const [cat, setCat] = useState(initial?.categoryId ?? "");
  const [type, setType] = useState(initial?.type ?? "");
  const [picking, setPicking] = useState(false);
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
  const hasItems = items.length > 0;
  const value = hasItems ? receiptTotals(items).total : Number(amount);
  const needsCategory = shop.trim().length > 0 && !category;
  const canSave = value > 0 && shop.trim().length > 0 && !!category;

  const pick = (v: string) => {
    setCat(v);
    setType(v === catId ? typeVal : "");
    setPicking(false);
  };

  const save = (amt: number, its?: ReceiptItem[]) => {
    const e: Expense = {
      id,
      date,
      shop: shop.trim(),
      amount: Math.round(amt * 100) / 100,
      categoryId: catId,
      who,
      labels: initial?.labels ?? [],
      source: initial?.source ?? (receipt ? "receipt" : "manual"),
      ...(typeVal ? { type: typeVal } : {}),
      ...(its && its.length ? { items: its } : {}),
      ...(receipt ? { receipt } : {}),
    };
    if (isEdit) st.updateExpense(e);
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

  const readPhoto = async (from: "camera" | "library") => {
    if (!householdId) {
      // Not signed in: show what reading looks like, with the sample receipt.
      setItems(SCANNED_RECEIPT.items.map((i) => ({ ...i })));
      if (!shop) setShop(SCANNED_RECEIPT.shop);
      if (!catId) setCat("groceries");
      setStep("receipt");
      Alert.alert("Sample receipt", "This is a sample receipt. Sign in to read your own.");
      return;
    }
    const perm =
      from === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Allow access", "Allow camera or photo access in Settings to scan receipts.");
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1 };
    const res = from === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    const asset = res.canceled ? null : res.assets[0];
    if (!asset) return;
    setReading(true);
    try {
      const { path, raw } = await readReceipt(householdId, id, asset, categories);
      setReceipt(path);
      const r = cleanReceipt(raw, categories, today);
      if (!r) {
        Alert.alert("Couldn't read it", "Try a clearer photo, or type it in.");
        return;
      }
      setItems(r.items);
      if (r.shop && !shop.trim()) setShop(r.shop);
      if (r.date) setDate(r.date);
      setScanCat(r.categoryId);
      setPrinted(r.total);
      setStep("receipt");
    } catch (e) {
      Alert.alert("Couldn't read it", e instanceof Error ? e.message : "Try again");
    } finally {
      setReading(false);
    }
  };

  const scan = () => {
    if (Platform.OS === "ios")
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Take Photo", "Photo Library", "Cancel"], cancelButtonIndex: 2 },
        (i) => (i === 0 ? void readPhoto("camera") : i === 1 ? void readPhoto("library") : undefined),
      );
    else
      Alert.alert("Scan a receipt", undefined, [
        { text: "Take Photo", onPress: () => void readPhoto("camera") },
        { text: "Photo Library", onPress: () => void readPhoto("library") },
        { text: "Cancel", style: "cancel" },
      ]);
  };

  if (reading)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: c.bg, padding: 20 }}>
        <ActivityIndicator size="large" color={c.muted} />
        <T v="heading" w="extrabold">
          Reading your receipt…
        </T>
        <T v="caption">This takes about 20 seconds.</T>
      </View>
    );

  if (step === "receipt")
    return (
      <ReceiptReview
        items={items}
        setItems={setItems}
        shop={shop}
        setShop={setShop}
        grocery={catId === "groceries"}
        printed={printed}
        onBack={() => setStep("form")}
        onSave={(t) => {
          if (category) return save(t, items);
          setStep("form");
          Alert.alert("Pick a category", "Pick a category, then save.");
        }}
      />
    );

  return (
    <Sheet
      left={<TextButton label="Close" onPress={() => router.back()} />}
      title={isEdit ? "Edit expense" : "Add expense"}
      right={
        isEdit ? null : (
          <Pressable
            accessibilityRole="button"
            onPress={scan}
            style={({ pressed }) => [s.scan, { backgroundColor: c.secondary, opacity: pressed ? 0.8 : 1 }]}
          >
            <Camera size={16} color={c.text} />
            <T w="semibold" style={{ fontSize: 15 }}>
              Scan
            </T>
          </Pressable>
        )
      }
      footer={
        <View style={{ gap: 8 }}>
          <Button label={isEdit ? "Save changes" : "Save"} disabled={!canSave} onPress={() => save(value, hasItems ? items : undefined)} />
          {isEdit && (
            <Pressable onPress={remove} style={{ minHeight: 44, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" }}>
              <Trash2 size={16} color={c.muted} />
              <T w="semibold" muted>
                Delete expense
              </T>
            </Pressable>
          )}
        </View>
      }
    >
      <View style={{ alignItems: "center", marginTop: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
          <T v="display" style={{ fontSize: 60, lineHeight: 70, height: 72 }}>
            $
          </T>
          <TextInput
            autoFocus={!isEdit}
            accessibilityLabel="Amount"
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={c.muted}
            value={hasItems ? value.toFixed(2) : amount}
            editable={!hasItems}
            onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ""))}
            style={[
              typo.display,
              {
                fontSize: 60,
                lineHeight: 70,
                height: 72,
                color: c.text,
                padding: 0,
                // Grow with the number, like the web's 6ch box.
                width: Math.max(4, (hasItems ? value.toFixed(2) : amount || "0.00").length) * 34 + 8,
              },
              Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null,
            ]}
          />
        </View>
        <T v="caption">{hasItems ? "Total from receipt items" : "CAD"}</T>
      </View>

      <View style={{ gap: 6, marginTop: 24 }}>
        <T v="caption">Shop</T>
        <Field
          placeholder="Where did you spend?"
          value={shop}
          onChangeText={(t) => {
            setShop(t);
            if (!isEdit) setCat("");
          }}
        />
      </View>
      <View style={{ marginTop: 12 }}>
        <ChipRow>
          {shops.map((x) => (
            <Chip
              key={x}
              label={x}
              active={shop === x}
              onPress={() => {
                setShop(x);
                if (!isEdit) setCat("");
              }}
            />
          ))}
        </ChipRow>
      </View>

      {category && !picking && (
        <View style={[cardStyle(c), { marginTop: 16, padding: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 }]}>
          <View style={{ flex: 1 }}>
            <T v="caption">Category</T>
            <T w="bold" style={{ fontSize: 15 }}>
              {category.name}
              {typeVal ? ` › ${typeVal}` : ""}
              {fromScan || guess ? (
                <T v="caption">
                  {"  "}
                  {fromScan ? "from receipt" : guess?.from === "history" ? "as last time" : "guessed"}
                </T>
              ) : null}
            </T>
          </View>
          <TextButton label="Change" underline onPress={() => setPicking(true)} />
        </View>
      )}

      {(needsCategory || picking) && (
        <View style={{ marginTop: 16, gap: 8 }}>
          <View>
            <T w="bold" style={{ fontSize: 15 }}>
              {picking ? "Pick a category" : "Which category is this?"}
            </T>
            {needsCategory && !picking && <T v="caption">We don't know this shop yet. Pick once and we'll remember.</T>}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {cats.map((x) => (
              <Chip key={x.id} label={x.name} active={catId === x.id} onPress={() => pick(x.id)} />
            ))}
          </View>
        </View>
      )}

      {category && !picking && category.types.length > 1 && (
        <View style={{ marginTop: 12, gap: 6 }}>
          <T v="caption">Type (optional)</T>
          <ChipRow>
            {category.types.map((t) => (
              <Chip
                key={t}
                label={t}
                active={typeVal === t}
                onPress={() => {
                  setCat(catId);
                  setType(typeVal === t ? "" : t);
                }}
              />
            ))}
          </ChipRow>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: more }}
        onPress={() => setMore((m) => !m)}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, marginTop: 16 }}
      >
        <View style={{ transform: [{ rotate: more ? "180deg" : "0deg" }] }}>
          <ChevronDown size={16} color={c.text} />
        </View>
        <T w="semibold" style={{ fontSize: 15 }}>
          More details (optional)
        </T>
      </Pressable>

      {more && (
        <Card style={{ gap: 16, marginTop: 4 }}>
          <View style={{ gap: 6 }}>
            <T v="caption">Date</T>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <RoundBtn label="Day before" onPress={() => setDate(shiftDay(date, -1))}>
                <ChevronLeft size={20} color={c.text} />
              </RoundBtn>
              <T w="bold" center style={{ flex: 1 }}>
                {date === today ? `Today · ${dayLabel(date)}` : dayLabel(date)}
              </T>
              <RoundBtn label="Day after" disabled={date >= today} onPress={() => setDate(shiftDay(date, 1))}>
                <ChevronRight size={20} color={c.text} />
              </RoundBtn>
            </View>
          </View>
          {people.length > 1 && (
            <View style={{ gap: 6 }}>
              <T v="caption">Who paid</T>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {people.map((p) => (
                  <Chip key={p.id} label={p.name} active={who === p.id} onPress={() => setWho(p.id)} style={{ flex: 1 }} />
                ))}
              </View>
            </View>
          )}
          {hasItems ? (
            <Button kind="soft" label={`Edit receipt items (${items.length})`} onPress={() => setStep("receipt")} />
          ) : (
            <View style={{ gap: 6 }}>
              <T v="caption">Receipt photo</T>
              <Button kind="soft" icon={<Camera size={16} color={c.text} />} label="Add photo and read it" onPress={scan} />
            </View>
          )}
        </Card>
      )}
    </Sheet>
  );
}

function ReceiptReview({
  items,
  setItems,
  shop,
  setShop,
  grocery,
  printed,
  onBack,
  onSave,
}: {
  items: ReceiptItem[];
  setItems: (i: ReceiptItem[]) => void;
  shop: string;
  setShop: (s: string) => void;
  grocery: boolean;
  printed: number;
  onBack: () => void;
  onSave: (total: number) => void;
}) {
  const c = useColors();
  const { categories } = useStore();
  const t = receiptTotals(items);
  const types = categories.find((x) => x.id === "groceries")?.types ?? [];
  const upd = (i: number, p: Partial<ReceiptItem>) => setItems(items.map((it, j) => (j === i ? { ...it, ...p } : it)));
  const cell = [typo.body, { fontSize: 15, minHeight: 48, borderRadius: 12, backgroundColor: c.secondary, color: c.text, paddingHorizontal: 12 }];
  return (
    <Sheet
      left={<TextButton label="Back" onPress={onBack} />}
      title="Receipt review"
      footer={<Button label={`Save ${money2(t.total)}`} disabled={!shop.trim() || t.total <= 0} onPress={() => onSave(t.total)} />}
    >
      <View style={{ gap: 12 }}>
        <T v="caption">Check each line. Fix anything we read wrong.</T>
        <View style={{ gap: 6 }}>
          <T v="caption">Shop</T>
          <Field value={shop} onChangeText={setShop} />
        </View>
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <T v="caption" style={{ flex: 1 }}>
              Item
            </T>
            <T v="caption" style={{ width: 56 }}>
              Qty
            </T>
            <T v="caption" style={{ width: 84 }}>
              Price
            </T>
          </View>
          {items.map((it, i) => (
            <View key={i} style={{ gap: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput accessibilityLabel="Item name" value={it.name} onChangeText={(v) => upd(i, { name: v })} style={[cell, { flex: 1 }]} />
                <TextInput
                  accessibilityLabel="Quantity"
                  keyboardType="number-pad"
                  value={String(it.qty)}
                  onChangeText={(v) => upd(i, { qty: Number(v.replace(/\D/g, "")) || 0 })}
                  style={[cell, { width: 56, textAlign: "center" }]}
                />
                <TextInput
                  accessibilityLabel="Price"
                  keyboardType="decimal-pad"
                  value={String(it.price)}
                  onChangeText={(v) => upd(i, { price: Number(v.replace(/[^0-9.]/g, "")) || 0 })}
                  style={[cell, { width: 84, textAlign: "right" }]}
                />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Tax: ${TAX_LABEL[taxRate(it)]}. Tap to change`}
                  onPress={() => upd(i, nextTax(it))}
                  style={{ minHeight: 36, borderRadius: 999, paddingHorizontal: 14, justifyContent: "center", backgroundColor: it.hst ? c.hero : c.secondary }}
                >
                  <T v="caption" w="bold" color={it.hst ? c.onHero : c.muted}>
                    {TAX_LABEL[taxRate(it)]}
                  </T>
                </Pressable>
                {grocery && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Type: ${it.type ?? "none"}. Tap to change`}
                    onPress={() => {
                      // Tap through the grocery types, then back to none.
                      const k = it.type ? types.indexOf(it.type) : -1;
                      upd(i, { type: types[k + 1] });
                    }}
                    style={{ flex: 1, minHeight: 36, borderRadius: 999, paddingHorizontal: 14, justifyContent: "center", backgroundColor: c.secondary }}
                  >
                    <T v="caption" w="semibold" muted={!it.type} lines={1}>
                      {it.type ?? "Type"}
                    </T>
                  </Pressable>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove line"
                  onPress={() => setItems(items.filter((_, j) => j !== i))}
                  style={{ marginLeft: "auto", width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
                >
                  <Trash2 size={18} color={c.muted} />
                </Pressable>
              </View>
            </View>
          ))}
          <Button
            kind="soft"
            icon={<Plus size={16} color={c.text} />}
            label="Add line"
            onPress={() => setItems([...items, { name: "", qty: 1, price: 0, hst: false }])}
          />
        </Card>
        <Card style={{ gap: 4 }}>
          <Total k="Subtotal" v={money2(t.subtotal)} />
          <Total k="Tax" v={money2(t.hst)} />
          <Total k="Total" v={money2(t.total)} strong />
          {totalsDiffer(printed, t.total) && (
            <T v="caption" style={{ paddingTop: 8 }}>
              The receipt says {money2(printed)}. If that's different, check the lines above.
            </T>
          )}
        </Card>
      </View>
    </Sheet>
  );
}

/** A sheet: Close or Back on the left, the title in the middle, an action on the right, and a fixed footer. */
function Sheet({ left, title, right, footer, children }: { left: ReactNode; title: string; right?: ReactNode; footer: ReactNode; children: ReactNode }) {
  const c = useColors();
  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
          <View style={{ flex: 1, alignItems: "flex-start" }}>{left}</View>
          <T v="heading" w="extrabold">
            {title}
          </T>
          <View style={{ flex: 1, alignItems: "flex-end" }}>{right}</View>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          {footer}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TextButton({ label, onPress, underline }: { label: string; onPress: () => void; underline?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={10} style={{ minHeight: 44, justifyContent: "center" }}>
      <T muted={!underline} w={underline ? "semibold" : undefined} style={underline ? { textDecorationLine: "underline", fontFamily: font.semibold } : null}>
        {label}
      </T>
    </Pressable>
  );
}

function RoundBtn({ label, onPress, disabled, children }: { label: string; onPress: () => void; disabled?: boolean; children: ReactNode }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: c.secondary, opacity: disabled ? 0.35 : 1 }}
    >
      {children}
    </Pressable>
  );
}

function Total({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <T v={strong ? "heading" : "body"} w={strong ? "extrabold" : undefined} muted={!strong}>
        {k}
      </T>
      <T v={strong ? "heading" : "body"} w={strong ? "extrabold" : undefined} muted={!strong}>
        {v}
      </T>
    </View>
  );
}

const s = StyleSheet.create({
  scan: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 16, borderRadius: 999 },
});
