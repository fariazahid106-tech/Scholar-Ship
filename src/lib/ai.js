// Google AI Studio (Gemini) client
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MODELS = ["gemini-3.8-flash"]; // primary, fallback
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function parseJSON(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch (e) {
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("The AI reply could not be read. Please try again.");
  }
}

// Low-level call with model fallback and retry on temporary errors
async function generate({ contents, system, json = false }) {
  const key = (import.meta.env.VITE_GEMINI_API_KEY || "").trim();
  if (!key) throw new Error("Missing Gemini API key. Add VITE_GEMINI_API_KEY to your .env file and restart the dev server.");
  const body = {
    contents,
    generationConfig: { temperature: json ? 0.4 : 0.7, maxOutputTokens: 4096, ...(json ? { responseMimeType: "application/json" } : {}) },
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
  };
  let lastError = new Error("AI request failed.");
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`${BASE}/${model}:generateContent?key=${encodeURIComponent(key)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err = new Error(data?.error?.message || `Request failed (${res.status})`);
          err.status = res.status;
          throw err;
        }
        if (data?.promptFeedback?.blockReason) throw new Error("The request was blocked by the AI safety filter. Try rephrasing.");
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const text = parts.filter((p) => !p.thought).map((p) => p.text || "").join("").trim();
        if (!text) throw new Error("The AI returned an empty response. Please try again.");
        return json ? parseJSON(text) : text;
      } catch (e) {
        lastError = e;
        if (/api key/i.test(e.message)) throw e; // wrong key: other models will not help
        if ((e.status === 429 || e.status === 503) && attempt === 0) { await wait(1200); continue; }
        break; // go to the next model
      }
    }
  }
  throw lastError;
}

export const askAI = (prompt, { json = false } = {}) =>
  generate({ contents: [{ role: "user", parts: [{ text: prompt }] }], json });

// Conversational advisor. history = [{ role: "user" | "model", text }]
export function chatAI(history, profile, list) {
  const catalog = list.map((s) => ({ name: s.name, provider: s.provider, where: s.where, levels: s.level, minCgpa: s.minCgpa, maxMonthlyIncomePKR: s.maxIncome, fields: s.fields, province: s.province || null, covers: s.cover }));
  const system = `You are the AI scholarship advisor inside ScholarshipMatch AI, helping Pakistani students. Answer in clear, friendly English, in under 180 words, using short paragraphs or "-" bullets.
Student profile: ${JSON.stringify({ name: profile.fullName, level: profile.level, cgpa: profile.cgpa, monthlyIncomePKR: profile.income, field: profile.field, province: profile.province, city: profile.city, institution: profile.institution, program: profile.program, goals: profile.goals })}
Scholarship database (only recommend from this list, never invent scholarships): ${JSON.stringify(catalog)}
If the profile is incomplete, say what is missing. Never promise acceptance. Remind the student to verify deadlines and criteria on official websites when relevant.`;
  return generate({ system, contents: history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })) });
}

export async function explainMatches(profile, top) {
  const prompt = `You are a scholarship advisor for Pakistani students. Be specific, encouraging and honest. Write in English.
Student profile: ${JSON.stringify({ level: profile.level, cgpa: profile.cgpa, monthlyIncomePKR: profile.income, field: profile.field, province: profile.province, goals: profile.goals })}
Eligible scholarships: ${JSON.stringify(top.map((m) => ({ id: String(m.s.id), name: m.s.name, country: m.s.where, covers: m.s.cover, matched: m.r.reasons })))}
Return ONLY JSON in this shape: {"summary":"2-3 sentence overview of this student's chances and what to prioritise","matches":[{"id":"<the id string exactly as given>","reason":"1-2 sentences on why this student is a strong fit"}]}`;
  return askAI(prompt, { json: true });
}

export function checklistPrompt(profile, s) {
  return `Create a practical application plan in English for this student applying to "${s.name}" (${s.provider}, ${s.where}).
Student: ${JSON.stringify(profile)}
Required documents: ${(s.docs || []).join(", ")}
Format as short sections with bullet points: 1) Documents to prepare, 2) Steps in order, 3) A realistic timeline (weeks before the deadline), 4) Common mistakes to avoid. Remind the student to confirm dates and criteria on the official website. Keep it under 300 words. Use plain text with "-" bullets.`;
}

export function statementPrompt(profile, s) {
  return `Write a first draft of a personal statement in English (250-300 words) for "${s.name}" (${s.provider}, ${s.where}).
Student: ${JSON.stringify(profile)}
Use the student's goals. Do NOT invent achievements, names or numbers; use [square brackets] where the student must add real details. Tone: sincere, specific, professional. Plain text, no headings.`;
}
