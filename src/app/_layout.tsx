import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppStoreProvider } from "@/store/app-store";
import { useColors } from "@/ui/theme";

export default function Root() {
  const c = useColors();
  return (
    <AppStoreProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add" options={{ presentation: "modal" }} />
        <Stack.Screen name="sign-in" options={{ presentation: "modal" }} />
      </Stack>
    </AppStoreProvider>
  );
}
