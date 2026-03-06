"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";

// ─── Theme constants ─────────────────────────────────────────────────────────

export const THEMES = {
  HOLOGRAPHIC: "holographic",
  PIP_BOY: "pip-boy",
  CRT: "crt",
  MAINFRAME: "mainframe",
} as const;

export type Theme = (typeof THEMES)[keyof typeof THEMES];

const THEME_META: Record<Theme, { label: string; description: string; color: string }> = {
  [THEMES.HOLOGRAPHIC]: { label: "Holographic", description: "Default — cyber cyan dark mode", color: "#00E5FF" },
  [THEMES.PIP_BOY]: { label: "Pip-Boy", description: "Monochrome green terminal", color: "#20c20e" },
  [THEMES.CRT]: { label: "CRT", description: "Phosphor green with scanlines", color: "#33ff33" },
  [THEMES.MAINFRAME]: { label: "Mainframe", description: "Corporate dark cyan", color: "#00e5ff" },
};

export const ALL_THEMES = Object.values(THEMES);
export { THEME_META };

const STORAGE_KEY = "endstate-theme";

// ─── Context ─────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: THEMES.HOLOGRAPHIC,
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(THEMES.HOLOGRAPHIC);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ALL_THEMES.includes(stored as Theme)) {
      setThemeState(stored as Theme);
      document.documentElement.setAttribute("data-theme", stored);
    }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    if (t === THEMES.HOLOGRAPHIC) {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", t);
    }
  }, []);

  return (
    <ThemeContext value={{ theme, setTheme }}>
      {children}
    </ThemeContext>
  );
}
