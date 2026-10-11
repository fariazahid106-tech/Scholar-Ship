import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { scholarships as seed } from "../data/scholarships";

const byName = (a, b) => a.name.localeCompare(b.name);

// Live scholarships for students, straight from Firestore (no hard-coded fallback).
export function useScholarships() {
  const [state, setState] = useState({ list: [], loading: true, error: false });
  useEffect(
    () =>
      onSnapshot(
        collection(db, "scholarships"),
        (snap) => {
          const list = snap.docs.map((d) => ({ ...d.data(), id: d.id })).sort(byName);
          setState({ list, loading: false, error: false });
        },
        () => setState({ list: [], loading: false, error: true })
      ),
    []
  );
  return state;
}

export async function seedScholarships() {
  const batch = writeBatch(db);
  seed.forEach((s) => {
    const { id, ...rest } = s;
    batch.set(doc(db, "scholarships", String(id)), rest);
  });
  await batch.commit();
}
