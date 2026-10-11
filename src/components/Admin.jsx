import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { seedScholarships } from "../lib/db";
import { btnDanger, btnGold, btnOutline, btnPrimary, input, label } from "../ui";
import { toUrl } from "../lib/url";
import ThemeToggle from "./ThemeToggle";

const LEVELS = ["Undergraduate", "Masters", "PhD"];
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "").trim().toLowerCase();
const BLANK = { name: "", provider: "", where: "", cover: "", link: "", level: ["Undergraduate"], minCgpa: "2.5", maxIncome: "", fields: "any", province: "", docs: "" };

function AdminLogin() {
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    if (!ADMIN_EMAIL) { setBusy(false); return setErr("Admin email is not configured. Set VITE_ADMIN_EMAIL in .env and restart."); }
    if (f.email.trim().toLowerCase() !== ADMIN_EMAIL) { setBusy(false); return setErr("Incorrect email or password."); }
    try { await signInWithEmailAndPassword(auth, f.email.trim(), f.password); }
    catch (x) { setErr("Incorrect email or password."); }
    setBusy(false);
  }
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-ink/10 bg-surface p-8 shadow-lg">
        <div className="flex items-center justify-between"><h1 className="font-display text-2xl font-extrabold">Admin sign in</h1><ThemeToggle className="text-ink" /></div>
        <p className="mt-1 text-sm text-ink/60">Restricted area. Authorised administrators only.</p>
        <div className="mt-6 space-y-4">
          <div><label className={label} htmlFor="ae">Email</label><input id="ae" type="email" required className={input} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></div>
          <div><label className={label} htmlFor="ap">Password</label><input id="ap" type="password" required className={input} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" /></div>
        </div>
        {err && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        <button disabled={busy} className={`${btnPrimary} mt-6 w-full`}>{busy ? "Please wait..." : "Sign in"}</button>
        <a href="/" className="mt-4 block text-center text-sm text-ink/60 underline">Back to website</a>
      </form>
    </main>
  );
}

function Denied({ configured }) {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Access denied</h1>
        <p className="mt-2 text-ink/70">{configured ? "This account is not an administrator." : "Admin email is not configured. Set VITE_ADMIN_EMAIL in your .env file and restart the dev server."}</p>
        <div className="mt-6 flex justify-center gap-3"><button onClick={() => signOut(auth)} className={btnPrimary}>Sign out</button><a href="/" className={btnOutline}>Back to website</a></div>
      </div>
    </main>
  );
}

function ScholarshipForm({ initial, onClose }) {
  const [f, setF] = useState(initial ? { ...initial, minCgpa: String(initial.minCgpa), maxIncome: initial.maxIncome ? String(initial.maxIncome) : "", fields: (initial.fields || ["any"]).join(", "), province: initial.province || "", docs: (initial.docs || []).join("\n") } : BLANK);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggleLevel = (l) => setF({ ...f, level: f.level.includes(l) ? f.level.filter((x) => x !== l) : [...f.level, l] });

  async function submit(e) {
    e.preventDefault();
    if (!f.name.trim() || !f.provider.trim()) return setErr("Name and provider are required.");
    if (f.level.length === 0) return setErr("Select at least one degree level.");
    const cg = Number(f.minCgpa);
    if (Number.isNaN(cg) || cg < 0 || cg > 4) return setErr("Minimum CGPA must be between 0 and 4.");
    const data = {
      name: f.name.trim(), provider: f.provider.trim(), where: f.where.trim() || "Not specified", cover: f.cover.trim() || "See website", link: toUrl(f.link),
      level: f.level, minCgpa: cg, maxIncome: f.maxIncome ? Number(f.maxIncome) : null,
      fields: f.fields.split(",").map((x) => x.trim()).filter(Boolean).length ? f.fields.split(",").map((x) => x.trim()).filter(Boolean) : ["any"],
      docs: f.docs.split("\n").map((x) => x.trim()).filter(Boolean),
      ...(f.province.trim() ? { province: f.province.trim() } : {}),
    };
    setBusy(true); setErr("");
    try {
      if (initial) await setDoc(doc(db, "scholarships", initial.id), data);
      else await addDoc(collection(db, "scholarships"), data);
      onClose();
    } catch (x) { setErr("Could not save. Check your Firestore rules."); setBusy(false); }
  }

  const t = (k, lab, ph, type = "text") => <div><label className={label} htmlFor={`f-${k}`}>{lab}</label><input id={`f-${k}`} type={type} className={input} value={f[k]} onChange={set(k)} placeholder={ph} /></div>;
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl">
        <h2 className="font-display text-2xl font-extrabold">{initial ? "Edit scholarship" : "Add scholarship"}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {t("name", "Scholarship name *", "e.g. HEC Need Based Scholarship")}
          {t("provider", "Provider *", "e.g. HEC Pakistan")}
          {t("where", "Country / location", "e.g. Pakistan")}
          {t("cover", "What it covers", "e.g. Tuition + stipend")}
          {t("minCgpa", "Minimum CGPA (0 to 4)", "e.g. 3.0", "number")}
          {t("maxIncome", "Max monthly income, PKR (blank = no limit)", "e.g. 60000", "number")}
          {t("fields", "Fields (comma separated, or 'any')", "e.g. Engineering, Computer Science")}
          {t("province", "Required province (optional)", "e.g. Punjab")}
        </div>
        <div className="mt-3">{t("link", "Official website URL", "https://...")}</div>
        <fieldset className="mt-3"><legend className={label}>Degree levels *</legend><div className="flex gap-4">{LEVELS.map((l) => <label key={l} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.level.includes(l)} onChange={() => toggleLevel(l)} />{l}</label>)}</div></fieldset>
        <div className="mt-3"><label className={label} htmlFor="f-docs">Required documents (one per line)</label><textarea id="f-docs" rows={4} className={input} value={f.docs} onChange={set("docs")} /></div>
        {err && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={onClose} className={btnOutline}>Cancel</button><button disabled={busy} className={btnPrimary}>{busy ? "Saving..." : "Save scholarship"}</button></div>
      </form>
    </div>
  );
}

function Dashboard({ user }) {
  const [tab, setTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null); // null | {} (new) | scholarship
  const [view, setView] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const u = onSnapshot(collection(db, "users"), (x) => setUsers(x.docs.map((d) => ({ ...d.data(), uid: d.id }))), () => setMsg("Cannot read users. Check your Firestore rules."));
    const a = onSnapshot(collection(db, "profiles"), (x) => setProfiles(x.docs.map((d) => ({ ...d.data(), uid: d.id }))), () => setMsg("Cannot read profiles. Check your Firestore rules."));
    const b = onSnapshot(collection(db, "scholarships"), (x) => setList(x.docs.map((d) => ({ ...d.data(), id: d.id })).sort((m, n) => m.name.localeCompare(n.name))), () => setMsg("Cannot read scholarships. Check your Firestore rules."));
    return () => { u(); a(); b(); };
  }, []);

  const students = useMemo(() => {
    const pm = new Map(profiles.map((p) => [p.uid, p]));
    const um = new Map(users.map((u) => [u.uid, u]));
    return [...new Set([...um.keys(), ...pm.keys()])].filter((uid) => String((um.get(uid) || {}).email || (pm.get(uid) || {}).email || "").toLowerCase() !== ADMIN_EMAIL).map((uid) => {
      const u = um.get(uid) || {};
      const p = pm.get(uid) || {};
      return { ...p, uid, fullName: p.fullName || u.name || "", email: u.email || p.email || "", signedUp: u.createdAt, lastLogin: u.lastLogin, hasProfile: pm.has(uid) };
    }).sort((x, y) => String(y.lastLogin || "").localeCompare(String(x.lastLogin || "")));
  }, [users, profiles]);
  const withProfile = students.filter((s) => s.hasProfile);
  const avg = withProfile.length ? (withProfile.reduce((n, s) => n + Number(s.cgpa || 0), 0) / withProfile.length).toFixed(2) : "-";
  const fs = useMemo(() => students.filter((s) => `${s.fullName} ${s.email} ${s.city} ${s.institution}`.toLowerCase().includes(q.toLowerCase())), [students, q]);
  const fl = useMemo(() => list.filter((s) => `${s.name} ${s.provider} ${s.where}`.toLowerCase().includes(q.toLowerCase())), [list, q]);
  const run = async (fn, ok) => { try { await fn(); setMsg(ok); } catch (e) { setMsg("Action failed. Check your Firestore rules."); } };
  const tabBtn = (k, t) => <button key={k} onClick={() => { setTab(k); setQ(""); }} className={`border-b-2 px-4 py-2 text-sm font-semibold ${tab === k ? "border-gold text-white" : "border-transparent text-white/70 hover:text-white"}`}>{t}</button>;
  const th = "px-3 py-2 text-left text-xs font-bold text-ink/60";
  const td = "px-3 py-2 text-sm";

  return (
    <div className="min-h-screen">
      <nav className="bg-pk text-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <span className="font-display text-lg font-extrabold">Admin panel</span>
          <div className="flex items-center gap-3 text-sm"><span className="hidden sm:inline">{user.email}</span><ThemeToggle /><a href="/" className="rounded-lg border border-white/40 px-3 py-1.5 font-semibold hover:bg-white/10">Website</a><button onClick={() => signOut(auth)} className="rounded-lg border border-white/40 px-3 py-1.5 font-semibold hover:bg-white/10">Sign out</button></div>
        </div>
        <div className="mx-auto flex max-w-7xl px-4">{tabBtn("overview", "Overview")}{tabBtn("students", `Users (${students.length})`)}{tabBtn("scholarships", `Scholarships (${list.length})`)}</div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {msg && <p role="status" className="mb-4 rounded-lg bg-pk/10 px-3 py-2 text-sm text-acc">{msg} <button onClick={() => setMsg("")} className="ml-2 underline">Dismiss</button></p>}

        {tab === "overview" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[[students.length, "Registered users"], [withProfile.length, "Profiles saved"], [list.length, "Scholarships published"], [avg, "Average CGPA"]].map(([n, t]) => (
              <div key={t} className="rounded-xl border border-ink/10 bg-surface p-5"><p className="font-display text-4xl font-extrabold text-acc">{n}</p><p className="text-sm text-ink/60">{t}</p></div>
            ))}
          </div>
        )}

        {tab !== "overview" && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input className={`${input} max-w-xs`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." aria-label="Search" />
            {tab === "scholarships" && <div className="ml-auto flex gap-3">{list.length === 0 && <button onClick={() => run(seedScholarships, "Starter scholarships imported.")} className={btnOutline}>Import starter list (24)</button>}<button onClick={() => setForm({})} className={btnGold}>+ Add scholarship</button></div>}
          </div>
        )}

        {tab === "students" && (
          <div className="overflow-x-auto rounded-xl border border-ink/10 bg-surface">
            <table className="w-full"><thead><tr className="border-b border-ink/10"><th className={th}>Name</th><th className={th}>Email</th><th className={th}>Signed up</th><th className={th}>Last login</th><th className={th}>Profile</th><th className={th}>CGPA</th><th className={th}>Level</th><th className={th}>Actions</th></tr></thead>
              <tbody>{fs.map((s) => (
                <tr key={s.uid} className="border-b border-ink/5">
                  <td className={td}>{s.fullName || "-"}</td><td className={td}>{s.email || "-"}</td>
                  <td className={td}>{s.signedUp ? new Date(s.signedUp).toLocaleDateString() : "-"}</td>
                  <td className={td}>{s.lastLogin ? new Date(s.lastLogin).toLocaleString() : "-"}</td>
                  <td className={td}>{s.hasProfile ? "Saved" : "Not yet"}</td><td className={td}>{s.cgpa || "-"}</td><td className={td}>{s.level || "-"}</td>
                  <td className={`${td} whitespace-nowrap`}><button onClick={() => setView(s)} className="font-semibold text-acc underline">View</button>{" "}<button onClick={() => window.confirm(`Delete the records of ${s.fullName || s.email}? Their login account stays in Firebase Authentication.`) && run(async () => { await deleteDoc(doc(db, "profiles", s.uid)); await deleteDoc(doc(db, "users", s.uid)); }, "User records deleted.")} className="ml-2 text-red-700 underline">Delete</button></td>
                </tr>))}
              </tbody></table>
            {fs.length === 0 && <p className="p-6 text-center text-sm text-ink/60">No users yet. Students appear here as soon as they sign up or log in.</p>}
          </div>
        )}

        {tab === "scholarships" && (
          <div className="overflow-x-auto rounded-xl border border-ink/10 bg-surface">
            <table className="w-full"><thead><tr className="border-b border-ink/10"><th className={th}>Name</th><th className={th}>Provider</th><th className={th}>Location</th><th className={th}>Levels</th><th className={th}>Min CGPA</th><th className={th}>Max income</th><th className={th}>Actions</th></tr></thead>
              <tbody>{fl.map((s) => (
                <tr key={s.id} className="border-b border-ink/5">
                  <td className={td}>{s.name}</td><td className={td}>{s.provider}</td><td className={td}>{s.where}</td><td className={td}>{(s.level || []).join(", ")}</td><td className={td}>{s.minCgpa}</td><td className={td}>{s.maxIncome ? Number(s.maxIncome).toLocaleString() : "None"}</td>
                  <td className={`${td} whitespace-nowrap`}>{toUrl(s.link) && <a href={toUrl(s.link)} target="_blank" rel="noreferrer" className="mr-2 text-acc underline">Visit</a>}<button onClick={() => setForm(s)} className="font-semibold text-acc underline">Edit</button>{" "}<button onClick={() => window.confirm(`Delete "${s.name}"?`) && run(() => deleteDoc(doc(db, "scholarships", s.id)), "Scholarship deleted.")} className="ml-2 text-red-700 underline">Delete</button></td>
                </tr>))}
              </tbody></table>
            {fl.length === 0 && <p className="p-6 text-center text-sm text-ink/60">No scholarships yet. Import the starter list or add one.</p>}
          </div>
        )}
      </div>

      {form && <ScholarshipForm initial={form.id ? form : null} onClose={() => setForm(null)} />}
      {view && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" onClick={() => setView(null)}>
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between"><h2 className="font-display text-2xl font-extrabold">{view.fullName || "Student"}</h2><button onClick={() => setView(null)} aria-label="Close" className="text-2xl leading-none">×</button></div>
            <dl className="mt-4 space-y-2 text-sm">
              {[["Email", view.email], ["Signed up", view.signedUp ? new Date(view.signedUp).toLocaleString() : "-"], ["Last login", view.lastLogin ? new Date(view.lastLogin).toLocaleString() : "-"], ["Profile saved", view.hasProfile ? "Yes" : "Not yet"], ["Phone", view.phone], ["City", view.city], ["Province", view.province], ["University", view.institution], ["Program", view.program], ["Graduation year", view.gradYear], ["Degree level", view.level], ["CGPA", view.cgpa], ["Monthly income (PKR)", view.income], ["Field", view.field], ["Goals", view.goals], ["Saved scholarships", (view.saved || []).length]].map(([k, v]) => <div key={k} className="flex gap-3"><dt className="w-40 shrink-0 font-semibold text-ink/60">{k}</dt><dd>{v === undefined || v === "" ? "-" : String(v)}</dd></div>)}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const [user, setUser] = useState(undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  if (user === undefined) return <div className="grid min-h-screen place-items-center text-ink/60">Checking access...</div>;
  if (!user) return <AdminLogin />;
  if (!ADMIN_EMAIL || (user.email || "").toLowerCase() !== ADMIN_EMAIL) return <Denied configured={!!ADMIN_EMAIL} />;
  return <Dashboard user={user} />;
}
