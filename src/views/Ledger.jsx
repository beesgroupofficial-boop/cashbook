import { useMemo, useState } from "react";
import { STORES, CATS, yen, md, today, thisMonth, withRunning, lastBal } from "../lib";
import { addRow, removeRow } from "../useData";
import { TwoStep, errMsg } from "../ui";

export default function Ledger({ data, toast }) {
  const { txns, sales, settings } = data;
  const [f, setF] = useState({ date: today(), cat: CATS[0].k, store: STORES[0], dir: CATS[0].dir, amount: "", memo: "" });
  const [busy, setBusy] = useState(false);
  const [mo, setMo] = useState(thisMonth());
  const [filter, setFilter] = useState("");
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const run = useMemo(() => withRunning(txns, sales, settings.opening), [txns, sales, settings.opening]);
  const bal = lastBal(run, settings.opening);
  const rows = run.filter((t) => !t.sale && (!mo || (t.date || "").startsWith(mo)) && (!filter || t.cat === filter)).reverse();
  const amt = parseInt(f.amount) || 0;

  const add = async () => {
    if (!amt || amt <= 0) { toast("金額を入力してください"); return; }
    if (!f.date) { toast("日付を入力してください"); return; }
    setBusy(true);
    try {
      await addRow("txns", { date: f.date, cat: f.cat, store: f.store, dir: f.dir, amount: amt, memo: f.memo.trim() });
      setF((s) => ({ ...s, amount: "", memo: "" })); toast("記録しました");
    } catch (e) { toast(errMsg(e)); } finally { setBusy(false); }
  };

  const csv = () => {
    const q = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const lines = ["日付,区分,店舗,出金,入金,現金在高,メモ,入力者",
      ...run.map((t) => [t.date, t.cat, q(t.store), t.dir === "out" ? t.amount : "", t.dir === "in" ? t.amount : "", t.bal, q(t.memo), q(t.by)].join(","))];
    const url = URL.createObjectURL(new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `現金出納帳_${today()}.csv` });
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section>
      <div className="panel">
        <div className="row">
          <label className="f">日付<input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></label>
          <label className="f">区分<select value={f.cat} onChange={(e) => {
            const c = CATS.find((x) => x.k === e.target.value);
            setF((s) => ({ ...s, cat: c.k, dir: c.dir, store: c.k === "小口" || c.k === "銀行入金" ? "本部" : s.store }));
          }}>{CATS.map((c) => <option key={c.k}>{c.k}</option>)}</select></label>
          <label className="f">店舗<select value={f.store} onChange={(e) => set("store", e.target.value)}>
            {STORES.map((s) => <option key={s}>{s}</option>)}</select></label>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <div className="f" style={{ flex: "0 0 150px" }}><span>入金 / 出金</span>
            <div className="seg" role="group" aria-label="入金か出金か">
              <button type="button" className="in" aria-pressed={f.dir === "in"} onClick={() => set("dir", "in")}>入金</button>
              <button type="button" className="out" aria-pressed={f.dir === "out"} onClick={() => set("dir", "out")}>出金</button>
            </div></div>
          <label className="f">金額<input type="number" inputMode="numeric" min="0" placeholder="0" value={f.amount} onChange={(e) => set("amount", e.target.value)} /></label>
          <label className="f" style={{ flex: "2 1 200px" }}>メモ<input placeholder="例：ダーツ両替金返却" value={f.memo} onChange={(e) => set("memo", e.target.value)} /></label>
        </div>
        <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}>
          <span className="hint">{amt ? `記録後の現金在高 ${yen(bal + (f.dir === "in" ? amt : -amt))}` : ""}</span>
          <button className="primary" onClick={add} disabled={busy}>記録する</button>
        </div>
      </div>

      <div className="row" style={{ margin: "24px 0 10px", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>入出金の記録</h2>
        <div className="row" style={{ alignItems: "center" }}>
          <input type="month" style={{ width: "auto" }} value={mo} onChange={(e) => setMo(e.target.value)} />
          <select style={{ width: "auto" }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">すべての区分</option>{CATS.map((c) => <option key={c.k}>{c.k}</option>)}</select>
          <button className="small" onClick={csv}>CSV</button>
        </div>
      </div>
      <div className="tbl-wrap"><table>
        <thead><tr><th>日付</th><th>区分</th><th>店舗</th><th className="r">出金</th><th className="r">入金</th><th className="r">現金在高</th><th>メモ</th><th></th></tr></thead>
        <tbody>
          {rows.length ? rows.map((t) => (
            <tr key={t.id}>
              <td className="num">{md(t.date)}</td><td><span className="tag">{t.cat}</span></td><td>{t.store}</td>
              <td className="r num out-t">{t.dir === "out" ? yen(t.amount) : ""}</td>
              <td className="r num in-t">{t.dir === "in" ? yen(t.amount) : ""}</td>
              <td className="r num">{yen(t.bal)}</td>
              <td className="memo">{t.memo}{t.by && <div className="by">{t.by}</div>}</td>
              <td><TwoStep aria-label="この記録を削除" onConfirm={() => removeRow("txns", t.id).catch((e) => toast(errMsg(e)))} /></td>
            </tr>
          )) : <tr><td colSpan="8" className="empty">この月の記録はまだありません。上のフォームから最初の入出金を記録してください。</td></tr>}
        </tbody>
      </table></div>
    </section>
  );
}
