import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { btnPrimary, input, label } from "../ui";
import ThemeToggle from "./ThemeToggle";

const messages = {
  "auth/email-already-in-use": "An account with this email already exists. Please log in.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
  "auth/network-request-failed": "Network error. Please check your connection.",
  "auth/operation-not-allowed": "Email/Password sign-in is not enabled in your Firebase project.",
};

export default function AuthForm({ mode, go, lock, notice }) {
  const signup = mode === "signup";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (signup && form.email.trim().toLowerCase() === (import.meta.env.VITE_ADMIN_EMAIL || "").trim().toLowerCase() && form.email.trim()) {
      setError("This email is reserved. Please use a different email.");
      return;
    }
    setBusy(true);
    try {
      if (signup) {
        lock.current = true;
        const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
        await updateProfile(cred.user, { displayName: form.name.trim() });
        const now = new Date().toISOString();
        try {
          await setDoc(doc(db, "users", cred.user.uid), { uid: cred.user.uid, name: form.name.trim(), email: form.email.trim().toLowerCase(), createdAt: now, lastLogin: now });
        } catch (e) { /* signup still succeeds; Home retries on first login */ }
        await signOut(auth);
        lock.current = false;
        go("login", "Account created successfully. Please log in to continue.");
      } else {
        await signInWithEmailAndPassword(auth, form.email.trim(), form.password);
      }
    } catch (err) {
      lock.current = false;
      setError(messages[err.code] || "Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden bg-pk p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <button onClick={() => go("landing")} className="text-left font-display text-xl font-extrabold">ScholarshipMatch AI</button>
        <div>
          <h2 className="max-w-md font-display text-4xl font-extrabold leading-tight">Find the scholarships you actually qualify for.</h2>
          <p className="mt-4 max-w-md text-white/80">Build your profile once. Get matched with funded opportunities, clear eligibility reasons and AI help with your application.</p>
        </div>
        <p className="text-sm text-white/60">Always verify deadlines and criteria on the official scholarship website.</p>
      </section>
      <section className="relative grid place-items-center px-4 py-12">
        <ThemeToggle className="absolute right-4 top-4 text-ink" />
        <form onSubmit={submit} className="w-full max-w-sm">
          <button type="button" onClick={() => go("landing")} className="mb-8 text-sm text-ink/60 underline lg:hidden">Back to home</button>
          <h1 className="font-display text-3xl font-extrabold">{signup ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-1 text-sm text-ink/60">{signup ? "It takes less than a minute." : "Log in to see your scholarship matches."}</p>
          {notice && <p role="status" className="mt-4 rounded-lg bg-pk/10 px-3 py-2 text-sm text-acc">{notice}</p>}
          <div className="mt-6 space-y-4">
            {signup && (
              <div><label className={label} htmlFor="name">Full name</label><input id="name" className={input} required value={form.name} onChange={set("name")} placeholder="e.g. Ayesha Khan" autoComplete="name" /></div>
            )}
            <div><label className={label} htmlFor="email">Email</label><input id="email" className={input} type="email" required value={form.email} onChange={set("email")} placeholder="you@example.com" autoComplete="email" /></div>
            <div><label className={label} htmlFor="password">Password</label><input id="password" className={input} type="password" required minLength={6} value={form.password} onChange={set("password")} placeholder="At least 6 characters" autoComplete={signup ? "new-password" : "current-password"} /></div>
          </div>
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className={`${btnPrimary} mt-6 w-full`}>{busy ? "Please wait..." : signup ? "Sign up" : "Log in"}</button>
          <p className="mt-5 text-center text-sm text-ink/70">
            {signup ? "Already have an account?" : "New here?"}{" "}
            <button type="button" onClick={() => go(signup ? "login" : "signup")} className="font-semibold text-acc underline">{signup ? "Log in" : "Create an account"}</button>
          </p>
        </form>
      </section>
    </main>
  );
}
