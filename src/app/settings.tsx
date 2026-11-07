import { router } from "expo-router";
import { X } from "lucide-react-native";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store/app-store";
import { Avatar, Button, Card, Logo, T } from "@/ui/bits";
import { useColors } from "@/ui/theme";

export default function Settings() {
  const { email, household, people, signOut } = useStore();
  const c = useColors();
  const names = household.partner ? `${household.me} & ${household.partner}` : household.me;
  const initials = people
    .filter((p) => p.id !== "J")
    .map((p) => p.tag[0])
    .join("");
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <T v="title">Settings</T>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={12}>
            <X size={26} color={c.text} />
          </Pressable>
        </View>
        <Card style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Avatar text={initials || "?"} size={52} />
          <View style={{ flex: 1 }}>
            <T w="bold">{names || "Not set up yet"}</T>
            {household.city ? <T v="caption">{household.city}</T> : null}
          </View>
        </Card>
        <Card style={{ gap: 12 }}>
          <T v="heading">Account</T>
          {email ? (
            <>
              <T muted>Signed in as {email}. Your phone and the web app share the same data.</T>
              <Button
                kind="soft"
                label="Sign out"
                onPress={() =>
                  Alert.alert("Sign out?", "Your data stays safe in your account.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Sign out", style: "destructive", onPress: () => void signOut() },
                  ])
                }
              />
            </>
          ) : (
            <>
              <T muted>You're looking at a sample family. Sign in to see your own.</T>
              <Button label="Sign in" onPress={() => router.push("/sign-in")} />
            </>
          )}
        </Card>
        <View style={{ alignItems: "center", gap: 6, marginTop: 24 }}>
          <Logo size={20} />
          <T v="caption">From landing to freedom.</T>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
