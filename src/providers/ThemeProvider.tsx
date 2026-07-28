import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeState | undefined>(undefined);
const STORAGE_KEY = "forus-theme";

function apply(mode: ThemeMode) {
  const dark =
    mode === "dark" ||
    (mode === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  const theme = document.querySelector('meta[name="theme-color"]');
  if (theme) theme.setAttribute("content", dark ? "#231014" : "#e11d64");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(
    () => (localStorage.getItem(STORAGE_KEY) as ThemeMode) || "system",
  );

  useEffect(() => {
    apply(mode);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const resync = () => {
      if (mode === "system") apply("system");
    };
    // Máy đổi theme -> event 'change'. Đề phòng miss event: re-sync khi quay lại app.
    mq.addEventListener("change", resync);
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("focus", resync);
    return () => {
      mq.removeEventListener("change", resync);
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("focus", resync);
    };
  }, [mode]);

  const value = useMemo<ThemeState>(
    () => ({
      mode,
      setMode: (m) => {
        localStorage.setItem(STORAGE_KEY, m);
        setModeState(m);
      },
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme phải trong <ThemeProvider>");
  return ctx;
}
