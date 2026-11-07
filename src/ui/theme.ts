// Loonvale colours and type, from the design system (firis/04-design-system.md).
import { useColorScheme } from "react-native";

export const light = {
  bg: "#FFF9F0",
  surface: "#FFFFFF",
  surface2: "#F1E5D2",
  text: "#292321",
  muted: "rgba(41, 35, 33, 0.6)",
  divider: "#F1E5D2",
  accent: "#A62118",
  onAccent: "#FFF9F0",
  onTrack: "#B6E2A7",
  hero: "#292321",
  onHero: "#FFF9F0",
};

export type Colors = typeof light;

export const dark: Colors = {
  bg: "#000000",
  surface: "#101010",
  surface2: "#2B2C30",
  text: "#E5E5E5",
  muted: "rgba(229, 229, 229, 0.6)",
  divider: "#2B2C30",
  accent: "#A62118",
  onAccent: "#FFF9F0",
  onTrack: "#B6E2A7",
  hero: "#A62118",
  onHero: "#FFF9F0",
};

export function useColors(): Colors {
  return useColorScheme() === "dark" ? dark : light;
}

export const type = {
  display: { fontSize: 48, lineHeight: 52, fontWeight: "700" as const, fontVariant: ["tabular-nums" as const] },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "700" as const },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: "600" as const },
  body: { fontSize: 17, lineHeight: 24, fontWeight: "500" as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "500" as const },
};
