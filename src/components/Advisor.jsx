import { useEffect, useRef, useState } from "react";
import { chatAI } from "../lib/ai";
import { btnPrimary, input } from "../ui";

const SUGGESTIONS = ["Which scholarship should I apply to first?", "How can I improve my chances?", "What documents should I prepare now?"];

export default function Advisor({ profile, list, summary, loading, error }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const end = useRef(null);

  useEffect(() => {
    if (end.current && msgs.length) end.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs, busy]);

  async function send(q) {
    const question = (q ?? text).trim();
    if (!question || busy) return;
    const next = [...msgs, { role: "user", text: question }];
    setMsgs(next);
    setText("");
    setBusy(true);
    setErr("");
    try {
      const reply = await chatAI(next, profile, list);
      setMsgs([...next, { role: "model", text: reply }]);
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  return (
    <div className="mb-6 rounded-2xl border border-acc/40 bg-surface p-5">
      <h2 className="font-display text-lg font-extrabold text-acc">AI advisor</h2>
      {loading && <p className="mt-2 text-sm text-ink/70">Analysing your profile...</p>}
      {summary && <p className="mt-2 text-sm leading-relaxed">{summary}</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-700">Match summary unavailable: {error}</p>}

      <div className="mt-4 max-h-80 space-y-3 overflow-y-auto" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed ${m.role === "user" ? "bg-pk text-white" : "bg-mist text-ink"}`}>{m.text}</p>
          </div>
        ))}
        {busy && <p className="text-sm text-ink/60">Advisor is typing...</p>}
        <div ref={end} />
      </div>
      {err && <p role="alert" className="mt-2 text-sm text-red-700">{err}</p>}

      {msgs.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} className="rounded-full border border-acc/40 px-3 py-1 text-xs font-semibold text-acc hover:bg-mist">{s}</button>
          ))}
        </div>
      )}
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input className={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask the advisor anything about scholarships..." aria-label="Ask the AI advisor" />
        <button type="submit" disabled={busy || !text.trim()} className={btnPrimary}>Send</button>
      </form>
    </div>
  );
}
