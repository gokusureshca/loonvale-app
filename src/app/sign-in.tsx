import { router } from "expo-router";
import { X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store/app-store";
import { Button, Field, Logo, T } from "@/ui/bits";
import { useColors } from "@/ui/theme";

/** Sign in with the same email as the web app. We email a 6-digit code. */
export default function SignIn() {
  const { signIn, verifyCode } = useStore();
  const c = useColors();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (f: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await f();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ padding: 20, gap: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Logo />
          <Pressable accessibilityLabel="Close" onPress={() => router.back()} hitSlop={12}>
            <X size={26} color={c.text} />
          </Pressable>
        </View>
        <T v="title">Sign in</T>
        {!sent ? (
          <>
            <T muted>Use the same email as on the web. We'll send you a code.</T>
            <Field
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              placeholderTextColor={c.muted}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              
            />
            <Button
              label="Email me a code"
              busy={busy}
              disabled={!/^\S+@\S+\.\S+$/.test(email.trim())}
              onPress={() =>
                void run(async () => {
                  await signIn(email.trim());
                  setSent(true);
                })
              }
            />
          </>
        ) : (
          <>
            <T muted>We sent a code to {email.trim()}. Type it here.</T>
            <Field
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              placeholderTextColor={c.muted}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={10}
              style={{ letterSpacing: 6, textAlign: "center" }}
            />
            <Button
              label="Sign in"
              busy={busy}
              disabled={code.trim().length < 6}
              onPress={() =>
                void run(async () => {
                  await verifyCode!(email.trim(), code);
                  router.back();
                })
              }
            />
            <Button kind="soft" label="Use a different email" onPress={() => setSent(false)} />
          </>
        )}
        {error ? <T v="caption" w="bold" color={c.alertText}>{error}</T> : null}
      </View>
    </SafeAreaView>
  );
}
