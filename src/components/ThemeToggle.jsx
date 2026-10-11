import { useState } from "react";
import { applyTheme, getTheme } from "../lib/theme";

export default function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState(getTheme());
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => { applyTheme(next); setTheme(next); }}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={`rounded-lg border border-current/30 px-3 py-1.5 text-sm font-semibold hover:bg-white/10 ${className}`}
    >
      {theme === "dark" ? "☀ Light" : "☾ Dark"}
    </button>
  );
}
