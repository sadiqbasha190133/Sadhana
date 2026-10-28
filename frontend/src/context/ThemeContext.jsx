import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "sadhana-theme";
const ThemeContext = createContext(null);

function readSavedTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "dark" || saved === "light" ? saved : null;
  } catch {
    return null;
  }
}

function getSystemTheme() {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }) {
  // A saved choice always wins. Otherwise follow the operating system.
  const [theme, setThemeState] = useState(
    () => readSavedTheme() ?? getSystemTheme()
  );
  const [hasChoice, setHasChoice] = useState(() => readSavedTheme() !== null);

  // Apply the theme to <html>. Tailwind's `dark:` variants and our CSS
  // variables (index.css) both key off the "dark" class.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  }, [theme]);

  // Until the user picks a theme themselves, follow OS changes live.
  useEffect(() => {
    if (hasChoice || !window.matchMedia) return undefined;

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event) => setThemeState(event.matches ? "dark" : "light");

    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [hasChoice]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    setHasChoice(true);

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The theme still switches for this session without localStorage.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({ theme, isDark: theme === "dark", setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
