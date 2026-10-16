export const STORES = ["本部", "BERO BERO BAR", "BAR MASH", "Lounge Bee"];
export const SHOPS = STORES.slice(1);
export const CATS = [
  { k: "売上金", dir: "in" }, { k: "両替金", dir: "out" }, { k: "銀行入金", dir: "out" }, { k: "銀行出金", dir: "in" },
  { k: "小口", dir: "out" }, { k: "女の子給与", dir: "out" }, { k: "社員給与", dir: "out" },
  { k: "立替金", dir: "out" }, { k: "現金過不足", dir: "in" }, { k: "その他", dir: "out" },
];
export const DENOMS = [10000, 5000, 2000, 1000, 500, 100, 50, 10, 5, 1];

export const num = (v) => Number(v) || 0;
export const yen = (n) => (n < 0 ? "−¥" : "¥") + Math.abs(Math.round(n || 0)).toLocaleString("ja-JP");
export const signed = (n) => (n > 0 ? "+" : "") + yen(n);
export const localDate = (ms) => { const d = new Date(ms); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
export const today = () => localDate(Date.now());
export const thisMonth = () => today().slice(0, 7);
export const md = (d) => { if (!d) return ""; const [, m, day] = d.split("-"); return `${Number(m)}/${Number(day)}`; };
export const fmtAt = (at) => { if (!at) return ""; const d = new Date(at); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

// 売上は「入力した日」に金庫へ入金されたものとして扱う
export const inDate = (s) => (s.createdAt ? localDate(s.createdAt) : s.date || "");

export function allMoves(txns, sales) {
  return txns.concat(sales.map((s) => ({
    id: "s_" + s.id, date: inDate(s), cat: "売上金", store: s.store, dir: "in",
    amount: num(s.amount), memo: s.memo || "", createdAt: s.createdAt || 0, sale: true,
  })));
}

export function withRunning(txns, sales, opening) {
  let b = num(opening);
  return allMoves(txns, sales)
    .sort((x, y) => (x.date === y.date ? (x.createdAt || 0) - (y.createdAt || 0) : x.date < y.date ? -1 : 1))
    .map((t) => { const a = num(t.amount); b += t.dir === "in" ? a : -a; return { ...t, amount: a, bal: b }; });
}

export const lastBal = (run, opening) => (run.length ? run[run.length - 1].bal : num(opening));

export function changeLoans(txns) {
  const m = Object.fromEntries(SHOPS.map((s) => [s, 0]));
  txns.filter((t) => t.cat === "両替金" && t.store !== "本部")
    .forEach((t) => { m[t.store] = (m[t.store] || 0) + (t.dir === "out" ? num(t.amount) : -num(t.amount)); });
  return m;
}
