import { useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useScholarships } from "../lib/db";
import { rank } from "../lib/match";
import { explainMatches } from "../lib/ai";
import { toUrl } from "../lib/url";
import { btnOutline, btnPrimary, input, label } from "../ui";
import Detail from "./Detail";
import Advisor from "./Advisor";
import ThemeToggle from "./ThemeToggle";

const LEVELS = ["Undergraduate", "Masters", "PhD"];
const FIELDS = ["Computer Science", "Engineering", "Medicine", "Business", "Natural Sciences", "Social Sciences", "Arts"];
const PROVINCES = ["Punjab", "Sindh", "KPK", "Balochistan", "Islamabad", "Gilgit-Baltistan", "Azad Kashmir"];
const EMPTY = { fullName: "", phone: "", city: "", institution: "", program: "", gradYear: "", level: "Undergraduate", cgpa: "", income: "", field: "Computer Science", province: "Punjab", goals: "", saved: [] };

export default function Home({ user }) {
  const { list, loading: listLoading, error } = useScholarships();
  const [p, setP] = useState({ ...EMPTY, fullName: user.displayName || "" });
  const [stored, setStored] = useState(false);
  const [results, setResults] = useState(null); // null = browsing, array = personalised matches
  const [ai, setAi] = useState({ loading: false, summary: "", reasons: {}, error: "" });
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(null);
  const [note, setNote] = useState("");

  const isAdmin = !!user.email && user.email.toLowerCase() === (import.meta.env.VITE_ADMIN_EMAIL || "").trim().toLowerCase();
  const ref = useMemo(() => doc(db, "profiles", user.uid), [user.uid]);
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });

  // what is still missing (the button stays clickable and tells the student what to fill)
  const problems = [];
  if (p.cgpa === "" || Number(p.cgpa) < 0 || Number(p.cgpa) > 4) problems.push("CGPA (between 0 and 4)");
  if (p.income === "" || Number(p.income) < 0) problems.push("monthly family income");
  const valid = problems.length === 0;

  // saved scholarships live in their own state (and in the browser), so a slow profile load can never wipe them
  const [savedList, setSavedList] = useState(() => {
    try { return JSON.parse(localStorage.getItem("saved_" + user.uid) || "[]").map(String); } catch (e) { return []; }
  });
  const savedIds = savedList;

  useEffect(() => {
    getDoc(ref)
      .then((d) => { if (d.exists()) { setP({ ...EMPTY, fullName: user.displayName || "", ...d.data() }); setSavedList((old) => [...new Set([...old, ...(d.data().saved || []).map(String)])]); setStored(true); } })
      .catch(() => setNote("Could not load your saved profile. Check your Firestore rules."));
  }, [ref, user.displayName]);

  useEffect(() => {
    if (isAdmin) return;
    const created = user.metadata && user.metadata.creationTime ? new Date(user.metadata.creationTime).toISOString() : new Date().toISOString();
    setDoc(doc(db, "users", user.uid), { uid: user.uid, email: (user.email || "").toLowerCase(), name: user.displayName || "", createdAt: created, lastLogin: new Date().toISOString() }, { merge: true }).catch(() => {});
  }, [user, isAdmin]);

  async function persist(next, ids = savedIds) {
    try {
      await setDoc(ref, { ...next, saved: ids, email: user.email, updatedAt: new Date().toISOString() });
      setStored(true);
      return true;
    } catch (e) {
      setNote("Could not save. Check your Firestore rules and connection.");
      return false;
    }
  }
  async function saveProfile() { if (await persist(p)) setNote("Profile saved."); }
  async function deleteProfile() {
    if (!window.confirm("Delete your saved profile?")) return;
    try { await deleteDoc(ref); setP({ ...EMPTY, fullName: user.displayName || "" }); setSavedList([]); try { localStorage.removeItem("saved_" + user.uid); } catch (e) {} setStored(false); setResults(null); setNote("Profile deleted."); }
    catch (e) { setNote("Could not delete the profile."); }
  }
  function toggleSave(id) {
    const has = savedIds.includes(String(id));
    const ids = has ? savedIds.filter((x) => x !== String(id)) : [...savedIds, String(id)];
    setSavedList(ids);
    try { localStorage.setItem("saved_" + user.uid, JSON.stringify(ids)); } catch (e) {}
    setNote(has ? "Removed from saved." : "Scholarship saved. Open the Saved tab to see it.");
    persist(p, ids);
  }

  async function findMatches() {
    if (!valid) { setNote("Please fill in: " + problems.join(" and ") + "."); return; }
    setNote("");
    persist(p); // save in the background so a slow connection can never block the search
    const ranked = rank(p, list);
    setResults(ranked);
    setFilter("all");
    const top = ranked.filter((m) => m.r.eligible).slice(0, 6);
    if (top.length === 0) {
      setAi({ loading: false, summary: "No scholarship in the database matches every criterion yet. Check the gaps shown on each card, or ask the advisor how to improve your chances.", reasons: {}, error: "" });
      return;
    }
    setAi({ loading: true, summary: "", reasons: {}, error: "" });
    try {
      const out = await Promise.race([
        explainMatches(p, top),
        new Promise((_, reject) => setTimeout(() => reject(new Error("The AI explanation took too long, so matches are shown without it.")), 15000)),
      ]);
      const reasons = {};
      (out.matches || []).forEach((m) => { reasons[String(m.id)] = m.reason; });
      setAi({ loading: false, summary: out.summary || "", reasons, error: "" });
    } catch (e) {
      setAi({ loading: false, summary: "", reasons: {}, error: e.message });
    }
  }

  const base = results || list.map((s) => ({ s, r: { eligible: true, browse: true, reasons: [s.cover], gaps: [], score: 0 } }));
  const shown = base.filter(({ s, r }) => {
    if (filter === "eligible" && !r.eligible) return false;
    if (filter === "saved" && !savedIds.includes(String(s.id))) return false;
    return `${s.name} ${s.provider} ${s.where}`.toLowerCase().includes(query.toLowerCase());
  });
  const eligibleCount = results ? results.filter((m) => m.r.eligible).length : 0;
  const chip = (k, text) => (
    <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${filter === k ? "bg-pk text-white" : "bg-surface text-ink/70 ring-1 ring-ink/15 hover:bg-mist"}`}>{text}</button>
  );
  const text = (id, lab, ph, type = "text") => (
    <div><label className={label} htmlFor={id}>{lab}</label><input id={id} type={type} className={input} value={p[id]} onChange={set(id)} placeholder={ph} /></div>
  );
  const select = (id, lab, opts) => (
    <div><label className={label} htmlFor={id}>{lab}</label><select id={id} className={input} value={p[id]} onChange={set(id)}>{opts.map((x) => <option key={x}>{x}</option>)}</select></div>
  );

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-20 bg-pk text-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <span className="font-display text-lg font-extrabold">ScholarshipMatch AI</span>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline">{p.fullName || user.email}</span>
            <ThemeToggle />
            {isAdmin && <a href="/admin" className="rounded-lg bg-gold px-3 py-1.5 font-semibold text-[#0F1F17] hover:brightness-95">Admin</a>}
            <button onClick={() => signOut(auth)} className="rounded-lg border border-white/40 px-3 py-1.5 font-semibold hover:bg-white/10">Log out</button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="font-display text-3xl font-extrabold">Welcome{p.fullName ? `, ${p.fullName.split(" ")[0]}` : ""}</h1>
        <p className="mt-1 text-ink/70">Complete your profile, then let the AI find and explain the scholarships you qualify for.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[[list.length, "Scholarships available"], [results ? eligibleCount : "-", "You are eligible for"], [savedIds.length, "Saved by you"]].map(([n, t]) => (
            <div key={t} className="rounded-xl border border-ink/10 bg-surface p-4"><p className="font-display text-3xl font-extrabold text-acc">{n}</p><p className="text-sm text-ink/60">{t}</p></div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr]">
          <section className="h-fit rounded-2xl border border-ink/10 bg-surface p-5" aria-label="Student profile">
            <h2 className="font-display text-xl font-extrabold">Your profile</h2>
            <p className="mt-1 text-xs text-ink/60">Signed in as {user.email}</p>
            <h3 className="mt-4 text-sm font-bold text-acc">Personal details</h3>
            <div className="mt-2 space-y-3">
              {text("fullName", "Full name", "e.g. Ayesha Khan")}
              {text("phone", "Phone number", "e.g. 0300 1234567", "tel")}
              {text("city", "City", "e.g. Karachi")}
            </div>
            <h3 className="mt-5 text-sm font-bold text-acc">Academic and financial</h3>
            <div className="mt-2 space-y-3">
              {text("institution", "University / college", "e.g. NED University")}
              {text("program", "Program / major", "e.g. BS Software Engineering")}
              {text("gradYear", "Expected graduation year", "e.g. 2027", "number")}
              {select("level", "Degree level", LEVELS)}
              {text("cgpa", "CGPA (0 to 4.0) *", "e.g. 3.4", "number")}
              {text("income", "Monthly family income (PKR) *", "e.g. 50000", "number")}
              {select("field", "Field of study", FIELDS)}
              {select("province", "Province / domicile", PROVINCES)}
              <div><label className={label} htmlFor="goals">Your goals (used for your statement)</label><textarea id="goals" rows={3} className={input} value={p.goals} onChange={set("goals")} placeholder="e.g. Study AI and build healthcare tools for rural Pakistan" /></div>
            </div>
            <button onClick={findMatches} disabled={ai.loading} className={`${btnPrimary} mt-5 w-full`}>{ai.loading ? "Finding matches..." : "Find my scholarships"}</button>
            {!valid && <p className="mt-2 text-xs text-red-700">Still needed: {problems.join(" and ")}.</p>}
            <div className="mt-4 flex items-center justify-between text-sm">
              <button onClick={saveProfile} className="font-semibold text-acc underline">Save profile</button>
              {stored && <button onClick={deleteProfile} className="text-red-700 underline">Delete profile</button>}
            </div>
            {note && <p role="status" className="mt-3 text-xs text-ink/70">{note}</p>}
          </section>

          <section aria-label="Scholarships">
            <Advisor profile={p} list={list} summary={ai.summary} loading={ai.loading} error={ai.error} />

            <div className="flex flex-wrap items-center gap-3">
              {chip("all", `All (${base.length})`)}
              {results && chip("eligible", `Eligible (${eligibleCount})`)}
              {chip("saved", `Saved (${savedIds.length})`)}
              <input className={`${input} ml-auto max-w-xs`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or country" aria-label="Search scholarships" />
              {results && <button onClick={() => setResults(null)} className="text-sm text-ink/70 underline">Show all unranked</button>}
            </div>
            {error && <p role="alert" className="mt-2 text-xs text-red-700">Could not load scholarships. Check your connection and Firestore rules.</p>}
            {!error && !listLoading && list.length === 0 && <p className="mt-2 text-xs text-ink/60">No scholarships have been published yet. Please check back soon.</p>}

            {shown.length === 0 && <p className="mt-10 text-center text-ink/60">No scholarships to show. Try another filter or search.</p>}
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {shown.map(({ s, r }) => (
                <article key={s.id} className={`flex flex-col rounded-2xl border bg-surface p-5 ${r.eligible && !r.browse ? "border-acc/60" : "border-ink/10"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-base font-bold leading-snug">{s.name}</h3>
                    <button onClick={() => toggleSave(s.id)} aria-label={savedIds.includes(String(s.id)) ? "Remove from saved" : "Save scholarship"} aria-pressed={savedIds.includes(String(s.id))} className="shrink-0 rounded-full border border-gold px-3 py-1 text-xs font-bold text-gold hover:bg-gold/10">{savedIds.includes(String(s.id)) ? "★ Saved" : "☆ Save"}</button>
                  </div>
                  <p className="text-sm text-ink/60">{s.provider} · {s.where}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-mist px-2 py-0.5">{s.level.join(" / ")}</span>
                    {!r.browse && <span className={`rounded-full px-2 py-0.5 ${r.eligible ? "bg-pk text-white" : "bg-red-50 text-red-700"}`}>{r.eligible ? "Eligible" : "Not eligible"}</span>}
                  </div>
                  {r.browse ? (
                    <p className="mt-3 text-sm text-ink/80">Covers: {s.cover}. Minimum CGPA {s.minCgpa}{s.maxIncome ? `, income under PKR ${Number(s.maxIncome).toLocaleString()}` : ""}.</p>
                  ) : (
                    <>
                      <div className="mt-3 h-1.5 rounded-full bg-ink/10"><div className={`h-1.5 rounded-full ${r.eligible ? "bg-pk" : "bg-gold"}`} style={{ width: `${r.score}%` }} /></div>
                      <p className="mt-1 text-xs text-ink/60">{r.score}% match</p>
                      {r.eligible ? (
                        <p className="mt-2 text-sm text-ink/80">{ai.reasons[String(s.id)] || r.reasons.join(". ") + "."}</p>
                      ) : (
                        <ul className="mt-2 space-y-1 text-sm text-red-700">{r.gaps.map((g) => <li key={g}>• {g}</li>)}</ul>
                      )}
                    </>
                  )}
                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    {r.eligible && <button onClick={() => setSel({ s, r })} className={`${btnOutline} flex-1`}>Checklist and statement</button>}
                    {toUrl(s.link) ? <a href={toUrl(s.link)} target="_blank" rel="noreferrer" className={`${btnPrimary} flex-1`}>Visit website</a> : <span className="text-xs text-ink/50">No website listed</span>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
      <footer className="px-6 py-8 text-center text-sm text-ink/60">Scholarship details are managed by the admin. Always verify criteria and deadlines on the official website.</footer>
      {sel && <Detail s={sel.s} r={sel.r} profile={p} onClose={() => setSel(null)} />}
    </div>
  );
}