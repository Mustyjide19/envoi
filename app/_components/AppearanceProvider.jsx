"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_THEME_KEY = "envoi-theme";
const STORAGE_ACCENT_KEY = "envoi-accent-index";

const LIGHT_ACCENT_PALETTE = [
  {
    id: "blue",
    label: "Blue",
    solid: "#1d4ed8",
    solidHover: "#1e40af",
    soft: "#dbeafe",
    softBorder: "#bfdbfe",
    softText: "#1d4ed8",
    ring: "#bfdbfe",
    avatarBg: "#dbeafe",
    avatarText: "#1d4ed8",
  },
  {
    id: "green",
    label: "Green",
    solid: "#15803d",
    solidHover: "#166534",
    soft: "#dcfce7",
    softBorder: "#86efac",
    softText: "#166534",
    ring: "#86efac",
    avatarBg: "#dcfce7",
    avatarText: "#166534",
  },
  {
    id: "purple",
    label: "Purple",
    solid: "#6d28d9",
    solidHover: "#5b21b6",
    soft: "#ede9fe",
    softBorder: "#c4b5fd",
    softText: "#6d28d9",
    ring: "#c4b5fd",
    avatarBg: "#ede9fe",
    avatarText: "#6d28d9",
  },
  {
    id: "orange",
    label: "Orange",
    solid: "#c2410c",
    solidHover: "#9a3412",
    soft: "#ffedd5",
    softBorder: "#fdba74",
    softText: "#c2410c",
    ring: "#fdba74",
    avatarBg: "#ffedd5",
    avatarText: "#c2410c",
  },
  {
    id: "slate",
    label: "Slate",
    solid: "#334155",
    solidHover: "#1e293b",
    soft: "#e2e8f0",
    softBorder: "#cbd5e1",
    softText: "#334155",
    ring: "#cbd5e1",
    avatarBg: "#e2e8f0",
    avatarText: "#334155",
  },
];

const DARK_ACCENT_PALETTE = [
  {
    id: "electric-blue",
    label: "Electric Blue",
    solid: "#60a5fa",
    solidHover: "#3b82f6",
    soft: "#172554",
    softBorder: "#60a5fa",
    softText: "#bfdbfe",
    ring: "#60a5fa",
    avatarBg: "#1e3a8a",
    avatarText: "#bfdbfe",
  },
  {
    id: "mint-green",
    label: "Mint Green",
    solid: "#4ade80",
    solidHover: "#22c55e",
    soft: "#052e16",
    softBorder: "#4ade80",
    softText: "#bbf7d0",
    ring: "#4ade80",
    avatarBg: "#14532d",
    avatarText: "#bbf7d0",
  },
  {
    id: "violet",
    label: "Violet",
    solid: "#c084fc",
    solidHover: "#a855f7",
    soft: "#3b0764",
    softBorder: "#c084fc",
    softText: "#e9d5ff",
    ring: "#c084fc",
    avatarBg: "#581c87",
    avatarText: "#e9d5ff",
  },
  {
    id: "amber",
    label: "Amber",
    solid: "#fbbf24",
    solidHover: "#f59e0b",
    soft: "#451a03",
    softBorder: "#fbbf24",
    softText: "#fde68a",
    ring: "#fbbf24",
    avatarBg: "#78350f",
    avatarText: "#fde68a",
  },
  {
    id: "sky",
    label: "Sky",
    solid: "#7dd3fc",
    solidHover: "#38bdf8",
    soft: "#082f49",
    softBorder: "#7dd3fc",
    softText: "#bae6fd",
    ring: "#7dd3fc",
    avatarBg: "#0c4a6e",
    avatarText: "#bae6fd",
  },
];

const AppearanceContext = createContext(null);

function getPaletteForTheme(theme) {
  return theme === "dark" ? DARK_ACCENT_PALETTE : LIGHT_ACCENT_PALETTE;
}

function applyAppearance(theme, accentIndex) {
  const root = document.documentElement;
  const paletteList = getPaletteForTheme(theme);
  const palette = paletteList[accentIndex] || paletteList[0];

  root.dataset.theme = theme;
  root.style.setProperty("--accent-solid", palette.solid);
  root.style.setProperty("--accent-solid-hover", palette.solidHover);
  root.style.setProperty("--accent-soft", palette.soft);
  root.style.setProperty("--accent-soft-border", palette.softBorder);
  root.style.setProperty("--accent-soft-text", palette.softText);
  root.style.setProperty("--accent-ring", palette.ring);
  root.style.setProperty("--accent-avatar-bg", palette.avatarBg);
  root.style.setProperty("--accent-avatar-text", palette.avatarText);
}

export function AppearanceProvider({ children }) {
  const [theme, setTheme] = useState("light");
  const [accentIndex, setAccentIndex] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem(STORAGE_THEME_KEY) || "light";
    const storedAccentIndex = Number.parseInt(
      localStorage.getItem(STORAGE_ACCENT_KEY) || "0",
      10
    );
    const nextAccentIndex = Number.isNaN(storedAccentIndex)
      ? 0
      : Math.min(Math.max(storedAccentIndex, 0), LIGHT_ACCENT_PALETTE.length - 1);

    setTheme(storedTheme);
    setAccentIndex(nextAccentIndex);
    applyAppearance(storedTheme, nextAccentIndex);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    localStorage.setItem(STORAGE_THEME_KEY, theme);
    localStorage.setItem(STORAGE_ACCENT_KEY, String(accentIndex));
    applyAppearance(theme, accentIndex);
  }, [theme, accentIndex, ready]);

  const accentOptions = getPaletteForTheme(theme);
  const accent = accentOptions[accentIndex] || accentOptions[0];

  const value = useMemo(
    () => ({
      theme,
      accent,
      accentIndex,
      setTheme,
      setAccentIndex,
      accentOptions,
    }),
    [theme, accent, accentIndex, accentOptions]
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);

  if (!context) {
    throw new Error("useAppearance must be used within AppearanceProvider.");
  }

  return context;
}
