import { btnGold, btnPrimary } from "../ui";
import ThemeToggle from "./ThemeToggle";

const steps = [
  ["Build your profile", "Add your degree level, CGPA, field, province and family income. It is saved securely to your account."],
  ["Get matched", "We check your profile against every scholarship published by our team and show exactly why you qualify or what is missing."],
  ["Apply with confidence", "Get a document checklist, an AI action plan and a first draft of your personal statement."],
];
const faqs = [
  ["Is ScholarshipMatch AI free?", "Yes. Creating an account, matching and AI assistance are free."],
  ["How is my data used?", "Your profile is stored in your private account. It is sent to the AI only when you ask for an explanation, plan or draft."],
  ["Can I submit the AI-written statement as it is?", "No. It is a starting draft. Replace the [bracketed] parts with your real experiences and edit it in your own voice."],
  ["Are the scholarship details final?", "They are a curated starting list. Always confirm deadlines and criteria on the official website before applying."],
];

export default function Landing({ go }) {
  return (
    <div className="min-h-screen bg-surface">
      <section className="relative overflow-hidden bg-pk text-white">
        <div aria-hidden className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-gold/20" />
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="font-display text-xl font-extrabold">ScholarshipMatch AI</span>
          <nav className="flex items-center gap-3">
            <ThemeToggle className="text-white" />
            <a href="/admin" className="rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold hover:bg-surface/10">Admin</a>
            <button onClick={() => go("login")} className="rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold hover:bg-surface/10">Log in</button>
            <button onClick={() => go("signup")} className={btnGold}>Sign up</button>
          </nav>
        </header>
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-24 pt-16 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h1 className="font-display text-5xl font-extrabold leading-[1.05] md:text-6xl">Find scholarships you truly qualify for.</h1>
            <p className="mt-6 max-w-xl text-lg text-white/85">Enter your academic record and financial situation once. Our AI matches you with funded opportunities for Pakistani students, explains every result and helps you apply.</p>
            <div className="mt-9 flex flex-wrap gap-4">
              <button onClick={() => go("signup")} className={`${btnGold} px-7 py-3 text-base`}>Create free account</button>
              <button onClick={() => go("login")} className="rounded-lg px-7 py-3 text-base font-semibold underline underline-offset-4 hover:bg-surface/10">I already have an account</button>
            </div>
            <dl className="mt-12 flex gap-10">
              {[["3", "degree levels"], ["100%", "free to use"]].map(([n, t]) => (
                <div key={t}><dt className="font-display text-3xl font-extrabold">{n}</dt><dd className="text-sm text-white/70">{t}</dd></div>
              ))}
            </dl>
          </div>
          <div className="rounded-2xl bg-surface p-5 text-ink shadow-2xl" aria-label="Example match">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-display text-lg font-bold">HEC Need Based Scholarship</p><p className="text-sm text-ink/60">HEC Pakistan · Pakistan</p></div>
              <span className="rounded-full bg-pk px-2.5 py-0.5 text-xs font-semibold text-white">Eligible</span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-ink/10"><div className="h-2 w-full rounded-full bg-pk" /></div>
            <p className="mt-1 text-xs text-ink/60">100% match</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              {["Open to Undergraduate students", "Your CGPA 3.2 meets the 2.0 minimum", "Your family income is within the limit"].map((t) => <li key={t} className="flex gap-2"><span className="text-acc">✓</span>{t}</li>)}
            </ul>
            <p className="mt-4 rounded-lg bg-mist p-3 text-sm text-ink/80"><b>AI advisor:</b> A strong fit. Your grades and income profile meet every requirement, so prepare your income certificate first.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-3xl font-extrabold">How it works</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {steps.map(([t, d], i) => (
            <li key={t} className="rounded-2xl border border-ink/10 bg-mist p-6">
              <span className="font-display text-3xl font-extrabold text-gold">{i + 1}</span>
              <h3 className="mt-2 text-lg font-bold">{t}</h3>
              <p className="mt-1 text-sm text-ink/70">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-mist px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl font-extrabold">Frequently asked questions</h2>
          {faqs.map(([q, a]) => (
            <details key={q} className="mt-4 rounded-xl border border-ink/10 bg-surface p-4">
              <summary className="cursor-pointer font-semibold">{q}</summary>
              <p className="mt-2 text-sm text-ink/70">{a}</p>
            </details>
          ))}
          <div className="mt-10 text-center"><button onClick={() => go("signup")} className={`${btnPrimary} px-8 py-3 text-base`}>Get started free</button></div>
        </div>
      </section>

      <footer className="bg-pk px-6 py-6 text-center text-sm text-white/80">ScholarshipMatch AI · Always verify criteria and deadlines on the official scholarship website. · <a href="/admin" className="underline">Admin</a></footer>
    </div>
  );
}
