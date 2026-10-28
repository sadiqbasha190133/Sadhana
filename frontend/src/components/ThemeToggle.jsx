import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ showLabel = false, className = "" }) {
  const { isDark, toggleTheme } = useTheme();
  const label = `Switch to ${isDark ? "light" : "dark"} mode`;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-ink shadow-sm transition hover:bg-soft ${className}`}
    >
      {isDark ? (
        <Sun size={18} className="text-amber-300" aria-hidden="true" />
      ) : (
        <Moon size={18} className="text-brand" aria-hidden="true" />
      )}
      {showLabel && <span>{isDark ? "Light" : "Dark"}</span>}
    </button>
  );
}
