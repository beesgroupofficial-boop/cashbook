import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, addDoc, deleteDoc, setDoc } from "firebase/firestore";
import { db, auth } from "./firebase";

export function useData(enabled) {
  const [state, setState] = useState({ txns: [], counts: [], sales: [], settings: { opening: 0 }, error: null });
  useEffect(() => {
    if (!enabled) return;
    const onErr = (e) => setState((s) => ({ ...s, error: e.code || "error" }));
    const subs = ["txns", "counts", "sales"].map((col) =>
      onSnapshot(collection(db, col), (snap) =>
        setState((s) => ({ ...s, [col]: snap.docs.map((d) => ({ ...d.data(), id: d.id })) })), onErr));
    subs.push(onSnapshot(doc(db, "settings", "main"), (snap) =>
      setState((s) => ({ ...s, settings: snap.exists() ? snap.data() : { opening: 0 } })), onErr));
    return () => subs.forEach((u) => u());
  }, [enabled]);
  return state;
}

const by = () => auth.currentUser?.email || "";
export const addRow = (col, obj) => addDoc(collection(db, col), { ...obj, createdAt: obj.createdAt || Date.now(), by: by() });
export const removeRow = (col, id) => deleteDoc(doc(db, col, id));
export const saveSettings = (obj) => setDoc(doc(db, "settings", "main"), obj, { merge: true });
