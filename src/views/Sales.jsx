import { useState } from "react";
import { SHOPS, yen, md, num, today, thisMonth, inDate } from "../lib";
import { addRow, removeRow } from "../useData";
import { TwoStep, errMsg } from "../ui";

export default function Sales({ data, toast }) {
  const { sales } = data;
  const [f, setF] = useState({ date: today(), store: SHOPS[0], amount: "", memo: "" });
  const [mo, setMo] = useState(thisMonth());
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const save = async () => {
    const amount = parseInt(f.amount);
    if (!f.date) { toast("売上日を入力してください"); return; }
    if (!amount || amount <= 0) { toast("売上合計を入力してください"); return; }
    setBusy(true);
    try { await addRow("sales", { date: f.date, store: f.store, amount, memo: f.memo.trim() }); setF((s) => ({ ...s, amount: "", memo: "" })); toast("売上を保存しました"); }
    catch (e) { toast(errMsg(e)); } finally { setBusy(false); }
  };

  const rows = sales.filter((s) => (s.date || "").startsWith(mo))
    .sort((a, b) => (a.date === b.date ? (b.createdAt || 0) - (a.createdAt || 0) : a.date < b.date ? 1 : -1));
  const tot = SHOPS.map((s) => rows.filter((r) => r.store === s).reduce((a, r) => a + num(r.amount), 0));
  const batch = sales.filter((s) => inDate(s).startsWith(mo));
  const dates = [...new Set(batch.map(inDate))].sort().reverse();

  return (
    <section>
      <div className="panel">
        <div className="row">
          <label className="f">売上日<input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></label>
          <label className="f">店舗<select value={f.store} onChange={(e) => set("store", e.target.value)}>
            {SHOPS.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="f">売上合計<input type="number" inputMode="numeric" min="0" placeholder="0" value={f.amount} onChange={(e) => set("amount", e.target.value)} /></label>
          <label className="f" style={{ flex: "2 1 200px" }}>メモ<input placeholder="例：10/1〜10/3" value={f.memo} onChange={(e) => set("memo", e.target.value)} /></label>
        </div>
        <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}>
          <span className="hint">売上は集計用です。現金在高には反映されません。</span>
          <button className="primary" onClick={save} disabled={busy}>売上を保存</button>
        </div>
      </div>

      <div className="row" style={{ margin: "24px 0 10px", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>店舗別の売上合計</h2>
        <input type="month" style={{ width: "auto" }} value={mo} onChange={(e) => setMo(e.target.value || thisMonth())} />
      </div>
      <div className="panel"><dl className="kv num">
        {SHOPS.map((s, i) => <Fragment2 key={s} k={s} v={yen(tot[i])} />)}
        <dt><strong>合計</strong></dt><dd><strong>{yen(tot.reduce((a, b) => a + b, 0))}</strong></dd>
      </dl></div>

      <h2>まとめて入力した日ごとの店舗別合計</h2>
      <div className="tbl-wrap"><table>
        <thead><tr><th>入力日</th><th>対象の売上日</th>{SHOPS.map((s) => <th key={s} className="r">{s}</th>)}<th className="r">合計</th></tr></thead>
        <tbody>
          {dates.length ? dates.map((d) => {
            const g = batch.filter((r) => inDate(r) === d);
            const sd = g.map((r) => r.date).filter(Boolean).sort();
            const span = sd.length ? (sd[0] === sd[sd.length - 1] ? md(sd[0]) : `${md(sd[0])}〜${md(sd[sd.length - 1])}`) : "";
            const v = SHOPS.map((s) => g.filter((r) => r.store === s).reduce((a, r) => a + num(r.amount), 0));
            return (
              <tr key={d}><td className="num">{md(d)}</td><td className="num">{span}</td>
                {v.map((x, i) => <td key={i} className="r num">{x ? yen(x) : "—"}</td>)}
                <td className="r num"><strong>{yen(v.reduce((a, b) => a + b, 0))}</strong></td></tr>
            );
          }) : <tr><td colSpan={SHOPS.length + 3} className="empty">この月に入力した売上はまだありません。</td></tr>}
        </tbody>
      </table></div>

      <h2>売上の記録</h2>
      <div className="tbl-wrap"><table>
        <thead><tr><th>売上日</th><th>店舗</th><th className="r">売上</th><th>メモ</th><th></th></tr></thead>
        <tbody>
          {rows.length ? rows.map((r) => (
            <tr key={r.id}><td className="num">{md(r.date)}</td><td>{r.store}</td>
              <td className="r num in-t">{yen(num(r.amount))}</td>
              <td className="memo">{r.memo}</td>
              <td><TwoStep aria-label="この売上を削除" onConfirm={() => removeRow("sales", r.id).catch((e) => toast(errMsg(e)))} /></td></tr>
          )) : <tr><td colSpan="5" className="empty">この月の売上はまだ入っていません。上のフォームから店舗ごとの合計を入れてください。</td></tr>}
        </tbody>
      </table></div>
    </section>
  );
}

function Fragment2({ k, v }) { return <><dt>{k}</dt><dd className="in-t">{v}</dd></>; }
