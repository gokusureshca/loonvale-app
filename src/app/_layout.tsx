import { Fraunces_400Regular } from "@expo-google-fonts/fraunces";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { AppStoreProvider } from "@/store/app-store";
import { useColors } from "@/ui/theme";

export default function Root() {
  const c = useColors();
  const [loaded] = useFonts({
    Fraunces_400Regular,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  return (
    <AppStoreProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add" options={{ presentation: "formSheet", sheetCornerRadius: 28, sheetGrabberVisible: true, sheetAllowedDetents: [1] }} />
        <Stack.Screen name="settings" options={{ presentation: "modal" }} />
        <Stack.Screen name="sign-in" options={{ presentation: "modal" }} />
      </Stack>
    </AppStoreProvider>
  );
}
