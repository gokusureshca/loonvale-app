// Loonvale design tokens, matched to the web app (firis-family-finance src/styles.css).
// A loon on a still lake: lake teal for the brand and buttons, loon ink for text,
// vale mist for the page, valley sage for "on track", loon-eye red for warnings only.
import { useColorScheme, type TextStyle } from "react-native";

export const light = {
  bg: "#F6F4EE", // vale mist
  text: "#1C2326", // loon ink
  card: "#FFFFFF", // birch
  primary: "#1E4D4A", // lake teal: buttons, selected item
  onPrimary: "#F6F4EE",
  link: "#1E4D4A",
  warn: "#A62118", // loon-eye red, warnings only
  onWarn: "#FFFFFF",
  /** Red warning text. In dark mode it becomes plain text plus a filled tag. */
  alertText: "#A62118",
  secondary: "#ECE9E0", // plate: chips, soft buttons, inputs
  muted: "#5B6668",
  border: "#DCD9CF",
  track: "#ECE9E0",
  onTrack: "#B8D4B0", // valley sage
  hero: "#1E4D4A",
  onHero: "#F6F4EE",
  heroTrack: "rgba(246, 244, 238, 0.18)",
  overlay: "rgba(28, 35, 38, 0.4)",
  shadow: true,
  dark: false,
};

export type Colors = typeof light;

export const dark: Colors = {
  bg: "#0F1415",
  text: "#E9E7E0",
  card: "#161D1E",
  primary: "#2B6A66",
  onPrimary: "#F6F4EE",
  link: "#B8D4B0",
  warn: "#A62118",
  onWarn: "#FFFFFF",
  alertText: "#E9E7E0",
  secondary: "#232C2D",
  muted: "#9AA5A5",
  border: "#293233",
  track: "#232C2D",
  onTrack: "#B8D4B0",
  hero: "#1E4D4A",
  onHero: "#F6F4EE",
  heroTrack: "rgba(246, 244, 238, 0.18)",
  overlay: "rgba(0, 0, 0, 0.6)",
  shadow: false,
  dark: true,
};

export function useColors(): Colors {
  return useColorScheme() === "dark" ? dark : light;
}

// Fraunces for display and titles; Plus Jakarta Sans for everything else.
// Custom fonts need one family per weight on iOS and Android.
export const font = {
  display: "Fraunces_400Regular",
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extrabold: "PlusJakartaSans_800ExtraBold",
};

const num: TextStyle["fontVariant"] = ["tabular-nums"];

export const type = {
  display: { fontFamily: font.display, fontSize: 48, lineHeight: 54, letterSpacing: -0.96, fontVariant: num },
  title: { fontFamily: font.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.3 },
  heading: { fontFamily: font.bold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: font.medium, fontSize: 17, lineHeight: 24, fontVariant: num },
  label: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, fontVariant: num },
} satisfies Record<string, TextStyle>;

export const radius = { field: 12, card: 20, sheet: 28, pill: 999 };
