const KEY = "scholarshipmatch-theme";
export function getTheme() {
  try { const s = localStorage.getItem(KEY); if (s === "dark" || s === "light") return s; } catch (e) { /* storage unavailable */ }
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
export function applyTheme(t) {
  document.documentElement.classList.toggle("dark", t === "dark");
  try { localStorage.setItem(KEY, t); } catch (e) { /* ignore */ }
}
applyTheme(getTheme()); // runs on import, before first paint
