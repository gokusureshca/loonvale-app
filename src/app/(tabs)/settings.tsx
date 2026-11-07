import { router } from "expo-router";
import { Alert, View } from "react-native";
import { useStore } from "@/store/app-store";
import { Button, Card, Screen, T } from "@/ui/bits";

export default function Settings() {
  const { email, household, people, signOut } = useStore();
  return (
    <Screen title="Settings">
      <Card>
        <T v="heading">Household</T>
        <T muted>
          {people
            .filter((p) => p.id !== "J")
            .map((p) => p.name)
            .join(" and ") || "Not set up yet"}
          {household.city ? ` · ${household.city}` : ""}
        </T>
      </Card>
      <Card>
        <T v="heading">Account</T>
        {email ? (
          <View style={{ gap: 12 }}>
            <T muted>Signed in as {email}. Your phone and the web app share the same data.</T>
            <Button
              kind="secondary"
              label="Sign out"
              onPress={() =>
                Alert.alert("Sign out?", "Your data stays safe in your account.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Sign out", style: "destructive", onPress: () => void signOut() },
                ])
              }
            />
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <T muted>You're looking at a sample family. Sign in to see your own.</T>
            <Button label="Sign in" onPress={() => router.push("/sign-in")} />
          </View>
        )}
      </Card>
      <T v="caption" muted>
        Budget changes, plans and the FIRE goal are on the web app for now.
      </T>
    </Screen>
  );
}
