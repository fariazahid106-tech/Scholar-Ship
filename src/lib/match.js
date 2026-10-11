// Rule-based eligibility engine (instant, deterministic). AI only explains the results.
export function evaluate(p, s) {
  const reasons = [];
  const gaps = [];
  const test = (ok, yes, no) => (ok ? reasons.push(yes) : gaps.push(no));

  test(s.level.includes(p.level), `Open to ${p.level} students`, `Only for ${s.level.join(" / ")} students`);
  test(Number(p.cgpa) >= s.minCgpa, `Your CGPA ${p.cgpa} meets the ${s.minCgpa} minimum`, `Needs a CGPA of at least ${s.minCgpa}`);
  if (s.maxIncome) test(Number(p.income) <= s.maxIncome, "Your family income is within the limit", `Family income must be under PKR ${s.maxIncome.toLocaleString()} per month`);
  if (!s.fields.includes("any")) test(s.fields.includes(p.field), `Supports ${p.field}`, `Limited to: ${s.fields.join(", ")}`);
  if (s.province) test(s.province === p.province, `Matches your ${p.province} domicile`, `Requires ${s.province} domicile`);

  const total = reasons.length + gaps.length;
  return { eligible: gaps.length === 0, reasons, gaps, score: Math.round((reasons.length / total) * 100) };
}

export function rank(profile, list) {
  return list
    .map((s) => ({ s, r: evaluate(profile, s) }))
    .sort((a, b) => Number(b.r.eligible) - Number(a.r.eligible) || b.r.score - a.r.score);
}
