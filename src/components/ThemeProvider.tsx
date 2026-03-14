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

// Theme preview colors — each theme has its own accent that differs from the
// base design tokens. These hex values are the identity of each theme variant.
// Preview swatches correspond to --color-accent in globals.css for each [data-theme].
// Holographic (default): --color-accent (#E8B94A amber)
// Pip-Boy:               --color-accent (#20c20e green)  — overrides accent + surface tokens
// CRT:                   --color-accent (#33ff33 phosphor) — overrides accent + adds scanline overlay
// Mainframe:             --color-accent (#00e5ff cyan)   — overrides accent + surface tokens
const THEME_META: Record<Theme, { label: string; description: string; color: string }> = {
  [THEMES.HOLOGRAPHIC]: { label: "Holographic", description: "Default — amber dark mode", color: "#E8B94A" },
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
  const [theme, setThemeState] = useState<Theme>(() => {
    // Can't access localStorage during SSR — default to holographic
    if (typeof window === "undefined") return THEMES.HOLOGRAPHIC;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ALL_THEMES.includes(stored as Theme)) return stored as Theme;
    return THEMES.HOLOGRAPHIC;
  });

  // Apply theme attribute on mount (lazy init sets state but not DOM)
  useEffect(() => {
    if (theme !== THEMES.HOLOGRAPHIC) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
