import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, addDoc, deleteDoc, setDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "./firebase";

// 会社(組織)ごとの保存場所。bees は従来どおりルート直下、それ以外は orgs/{org}/ 配下
let currentOrg = "bees";
export const setOrg = (o) => { currentOrg = o || "bees"; };
const colRef = (col, org = currentOrg) => (org === "bees" ? collection(db, col) : collection(db, "orgs", org, col));
const docRef = (col, id, org = currentOrg) => (org === "bees" ? doc(db, col, id) : doc(db, "orgs", org, col, id));

export function useData(enabled, org = "bees") {
  const [state, setState] = useState({ org, txns: [], counts: [], sales: [], settings: { opening: 0 }, error: null });
  useEffect(() => {
    setOrg(org);
    setState({ org, txns: [], counts: [], sales: [], settings: { opening: 0 }, error: null });
    if (!enabled) return;
    const onErr = (e) => setState((s) => ({ ...s, error: e.code || "error" }));
    const subs = ["txns", "counts", "sales"].map((col) =>
      onSnapshot(colRef(col, org), (snap) =>
        setState((s) => ({ ...s, [col]: snap.docs.map((d) => ({ ...d.data(), id: d.id })) })), onErr));
    subs.push(onSnapshot(docRef("settings", "main", org), (snap) =>
      setState((s) => ({ ...s, settings: snap.exists() ? snap.data() : { opening: 0 } })), onErr));
    return () => subs.forEach((u) => u());
  }, [enabled, org]);
  return state;
}

const by = () => auth.currentUser?.email || "";
export const addRow = (col, obj) => addDoc(colRef(col), { ...obj, createdAt: obj.createdAt || Date.now(), by: by() });
// 編集時は元の入力日時・入力者を残し、更新日時・更新者を追記する
export const updateRow = (col, id, obj) => updateDoc(docRef(col, id), { ...obj, updatedAt: Date.now(), updatedBy: by() });
export const removeRow = (col, id) => deleteDoc(docRef(col, id));
export const saveSettings = (obj) => setDoc(docRef("settings", "main"), obj, { merge: true });
