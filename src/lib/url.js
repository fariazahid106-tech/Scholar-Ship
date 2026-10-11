// Makes sure a website link opens correctly (adds https:// if missing)
export function toUrl(link) {
  const t = (link || "").trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}
