import { useState } from "react";
import { askAI, checklistPrompt, statementPrompt } from "../lib/ai";
import { toUrl } from "../lib/url";
import { btnGold, btnOutline, btnPrimary } from "../ui";

export default function Detail({ s: sch, r, profile, onClose }) {
  const s = { ...sch, docs: sch.docs || [] };
  const [tab, setTab] = useState("checklist");
  const [done, setDone] = useState({});
  const [plan, setPlan] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate(kind) {
    setLoading(kind);
    setError("");
    try {
      if (kind === "plan") setPlan(await askAI(checklistPrompt(profile, s)));
      else setDraft(await askAI(statementPrompt(profile, s)));
    } catch (e) {
      setError(e.message);
    }
    setLoading("");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setError("Copy failed. Select the text and copy it manually.");
    }
  }

  const doneCount = s.docs.filter((d) => done[d]).length;
  const tabClass = (t) => `border-b-2 px-4 py-2 text-sm font-semibold ${tab === t ? "border-pk text-acc" : "border-transparent text-ink/60 hover:text-ink"}`;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={s.name} onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-extrabold">{s.name}</h2>
            <p className="text-sm text-ink/60">{s.provider} · {s.where}</p>
            <p className="mt-1 text-sm"><b>Covers:</b> {s.cover}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg px-2 text-2xl leading-none text-ink/50 hover:bg-mist">×</button>
        </div>

        {r && !r.browse && r.reasons.length > 0 && (
          <ul className="mt-4 space-y-1 rounded-lg bg-mist p-3 text-sm">
            {r.reasons.map((t) => <li key={t} className="flex gap-2"><span className="text-acc">✓</span>{t}</li>)}
          </ul>
        )}

        <div className="mt-5 flex border-b border-ink/10" role="tablist">
          <button role="tab" aria-selected={tab === "checklist"} className={tabClass("checklist")} onClick={() => setTab("checklist")}>Checklist and plan</button>
          <button role="tab" aria-selected={tab === "statement"} className={tabClass("statement")} onClick={() => setTab("statement")}>Personal statement</button>
        </div>

        {tab === "checklist" ? (
          <div className="mt-4">
            <p className="text-sm text-ink/70">Documents ready: {doneCount} of {s.docs.length}</p>
            <ul className="mt-2 space-y-2">
              {s.docs.map((d) => (
                <li key={d}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-ink/10 px-3 py-2 text-sm">
                    <input type="checkbox" className="h-4 w-4 accent-[#0B5D3B]" checked={!!done[d]} onChange={() => setDone({ ...done, [d]: !done[d] })} />
                    <span className={done[d] ? "text-ink/40 line-through" : ""}>{d}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={() => generate("plan")} disabled={!!loading} className={btnPrimary}>{loading === "plan" ? "Generating..." : plan ? "Regenerate AI plan" : "Generate AI action plan"}</button>
              {toUrl(s.link) && <a href={toUrl(s.link)} target="_blank" rel="noreferrer" className={btnOutline}>Official website</a>}
            </div>
            {plan && <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-mist p-4 font-sans text-sm leading-relaxed">{plan}</pre>}
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-ink/70">The AI writes a first draft from your profile and goals. Replace anything in [brackets] with your real details.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button onClick={() => generate("statement")} disabled={!!loading} className={btnGold}>{loading === "statement" ? "Writing..." : draft ? "Rewrite draft" : "Generate draft"}</button>
              {draft && <button onClick={copy} className={btnOutline}>{copied ? "Copied" : "Copy text"}</button>}
            </div>
            {draft && <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={14} className="mt-4 w-full rounded-lg border border-ink/15 p-3 text-sm leading-relaxed focus:border-pk focus:outline-none focus:ring-2 focus:ring-pk/30" aria-label="Personal statement draft" />}
          </div>
        )}
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}
