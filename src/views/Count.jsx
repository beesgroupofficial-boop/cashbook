import { useMemo, useState } from "react";
import { DENOMS, yen, signed, fmtAt, today, withRunning, lastBal } from "../lib";
import { addRow, removeRow } from "../useData";
import { Seal, TwoStep, errMsg } from "../ui";

const blank = () => Object.fromEntries(DENOMS.map((d) => [d, ""]));

export default function Count({ data, toast }) {
  const { txns, sales, counts, settings } = data;
  const [c, setC] = useState(blank);
  const [petty, setPetty] = useState("");
  const [note, setNote] = useState("");
  const [pop, setPop] = useState(0);

  const book = lastBal(useMemo(() => withRunning(txns, sales, settings.opening), [txns, sales, settings.opening]), settings.opening);
  const coins = DENOMS.reduce((a, d) => a + d * (parseInt(c[d]) || 0), 0);
  const pettyV = parseInt(petty) || 0;
  const actual = coins + pettyV;
  const any = DENOMS.some((d) => c[d] !== "") || petty !== "";
  const diff = actual - book;
  const hist = useMemo(() => [...counts].sort((a, b) => (b.at || 0) - (a.at || 0)), [counts]);

  const save = async () => {
    if (!any) { toast("枚数か小口の金額を入力してください"); return; }
    try {
      await addRow("counts", { at: Date.now(), counts: Object.fromEntries(DENOMS.map((d) => [d, parseInt(c[d]) || 0])), petty: pettyV, actual, book, diff, note: note.trim() });
      setPop((p) => p + 1); setNote(""); toast(diff === 0 ? "一致を記録しました" : "差異を記録しました");
    } catch (e) { toast(errMsg(e)); }
  };
  const adjust = async () => {
    try {
      await addRow("txns", { date: today(), cat: "現金過不足", store: "本部", dir: diff > 0 ? "in" : "out", amount: Math.abs(diff), memo: note.trim() || "金庫チェックの差異" });
      toast("現金過不足を記録しました");
    } catch (e) { toast(errMsg(e)); }
  };

  return (
    <section>
      <div className="panel">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <strong>金種ごとの枚数を入力</strong>
          <button className="small ghost" onClick={() => { setC(blank()); setPetty(""); }}>すべて 0 にする</button>
        </div>
        <div className="tray">
          {DENOMS.map((d) => (
            <label className="slot" key={d}>
              <span className={"d" + (d >= 1000 ? " bill" : "")}>{d.toLocaleString()}円</span>
              <input type="number" inputMode="numeric" min="0" placeholder="0" aria-label={`${d}円の枚数`}
                value={c[d]} onChange={(e) => setC((s) => ({ ...s, [d]: e.target.value }))} />
              <span className="sub num">{yen(d * (parseInt(c[d]) || 0))}</span>
            </label>
          ))}
        </div>
        <div className="tray" style={{ marginTop: 8 }}>
          <label className="slot"><span className="d">小口</span>
            <input type="number" inputMode="numeric" min="0" placeholder="0" aria-label="小口の合計金額" value={petty} onChange={(e) => setPetty(e.target.value)} />
            <span className="sub">合計金額</span></label>
        </div>
        <div className="diffbar">
          <dl className="kv num" style={{ flex: 1, minWidth: 220 }}>
            <dt>金種の合計</dt><dd>{yen(coins)}</dd>
            <dt>小口</dt><dd>{yen(pettyV)}</dd>
            <dt>実際の金庫</dt><dd>{yen(actual)}</dd>
            <dt>帳簿上</dt><dd>{yen(book)}</dd>
            <dt>差異</dt><dd style={{ fontSize: 20 }} className={!any || diff === 0 ? "" : diff > 0 ? "in-t" : "out-t"}>{any ? signed(diff) : "—"}</dd>
          </dl>
          <Seal empty={!any} diff={diff} pop={pop} />
        </div>
        <label className="f" style={{ marginTop: 12 }}>メモ（差異の理由など）
          <input placeholder="例：BAR MASH 両替金 未返却分" value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <div className="row" style={{ marginTop: 12, justifyContent: "flex-end" }}>
          {any && diff !== 0 && <TwoStep className="" label="差異を「現金過不足」として記録"
            armedLabel={`もう一度押すと 現金過不足 ${signed(diff)} を記録`} onConfirm={adjust} />}
          <button className="primary" onClick={save}>チェックを保存</button>
        </div>
      </div>

      <h2>チェック履歴</h2>
      <div className="tbl-wrap"><table>
        <thead><tr><th>日時</th><th className="r">実際</th><th className="r">帳簿</th><th className="r">差異</th><th>メモ</th><th></th></tr></thead>
        <tbody>
          {hist.length ? hist.map((h) => (
            <tr key={h.id}>
              <td className="num">{fmtAt(h.at)}</td><td className="r num">{yen(h.actual)}</td><td className="r num">{yen(h.book)}</td>
              <td className={"r num " + (h.diff === 0 ? "" : h.diff > 0 ? "in-t" : "out-t")}>{h.diff === 0 ? "一致" : signed(h.diff)}</td>
              <td className="memo">{h.note}{h.by && <div className="by">{h.by}</div>}</td>
              <td><TwoStep aria-label="このチェックを削除" onConfirm={() => removeRow("counts", h.id).catch((e) => toast(errMsg(e)))} /></td>
            </tr>
          )) : <tr><td colSpan="6" className="empty">まだチェックしていません。金庫の中身を数えて保存すると、ここに残ります。</td></tr>}
        </tbody>
      </table></div>
    </section>
  );
}
