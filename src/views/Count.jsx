import { useMemo, useState } from "react";
import { DENOMS, yen, signed, fmtAt, today, withRunning, lastBal, bookAt, num } from "../lib";
import { addRow, removeRow } from "../useData";
import { Seal, TwoStep, errMsg } from "../ui";

// 小銭BOX（1箱あたりの金額）
const BOXES = [18580, 18600];
const blank = () => Object.fromEntries(DENOMS.map((d) => [d, ""]));
const blankBox = () => Object.fromEntries(BOXES.map((b) => [b, ""]));

export default function Count({ data, toast }) {
  const { txns, sales, counts, settings } = data;
  const [c, setC] = useState(blank);
  const [box, setBox] = useState(blankBox);
  const [petty, setPetty] = useState("");
  const [note, setNote] = useState("");
  const [pop, setPop] = useState(0);

  const book = lastBal(useMemo(() => withRunning(txns, sales, settings.opening), [txns, sales, settings.opening]), settings.opening);
  const coins = DENOMS.reduce((a, d) => a + d * (parseInt(c[d]) || 0), 0);
  const boxes = BOXES.reduce((a, b) => a + b * (parseInt(box[b]) || 0), 0);
  const pettyV = parseInt(petty) || 0;
  const actual = coins + boxes + pettyV;
  const any = DENOMS.some((d) => c[d] !== "") || BOXES.some((b) => box[b] !== "") || petty !== "";
  const diff = actual - book;
  const hist = useMemo(() => [...counts].sort((a, b) => (b.at || 0) - (a.at || 0)).map((h) => {
    const b = bookAt(txns, sales, settings.opening, h.at);
    return { ...h, book: b, diff: num(h.actual) - b };
  }), [counts, txns, sales, settings.opening]);

  const reset = () => { setC(blank()); setBox(blankBox()); setPetty(""); };

  const save = async () => {
    if (!any) { toast("枚数・小銭BOX・小口のどれかを入力してください"); return; }
    try {
      await addRow("counts", {
        at: Date.now(),
        counts: Object.fromEntries(DENOMS.map((d) => [d, parseInt(c[d]) || 0])),
        boxes: Object.fromEntries(BOXES.map((b) => [b, parseInt(box[b]) || 0])),
        petty: pettyV, actual, book, diff, note: note.trim(),
      });
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
          <button className="small ghost" onClick={reset}>すべて 0 にする</button>
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

        <div style={{ marginTop: 18, marginBottom: 8 }}><strong>小銭BOXの個数を入力</strong></div>
        <div className="tray">
          {BOXES.map((b) => (
            <label className="slot" key={b}>
              <span className="d">{b.toLocaleString()}円</span>
              <input type="number" inputMode="numeric" min="0" placeholder="0" aria-label={`${b}円の小銭BOXの個数`}
                value={box[b]} onChange={(e) => setBox((s) => ({ ...s, [b]: e.target.value }))} />
              <span className="sub num">{yen(b * (parseInt(box[b]) || 0))}</span>
            </label>
          ))}
        </div>

        <div style={{ marginTop: 18, marginBottom: 8 }}><strong>小口</strong></div>
        <div className="tray">
          <label className="slot"><span className="d">小口</span>
            <input type="number" inputMode="numeric" min="0" placeholder="0" aria-label="小口の合計金額" value={petty} onChange={(e) => setPetty(e.target.value)} />
            <span className="sub">合計金額</span></label>
        </div>

        <div className="diffbar">
          <dl className="kv num" style={{ flex: 1, minWidth: 220 }}>
            <dt>金種の合計</dt><dd>{yen(coins)}</dd>
            <dt>小銭BOX</dt><dd>{yen(boxes)}</dd>
            <dt>小口</dt><dd>{yen(pettyV)}</dd>
            <dt><strong>実際の金庫</strong></dt><dd><strong>{yen(actual)}</strong></dd>
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
              <td className="memo">{h.note}</td>
              <td><TwoStep aria-label="このチェックを削除" onConfirm={() => removeRow("counts", h.id).catch((e) => toast(errMsg(e)))} /></td>
            </tr>
          )) : <tr><td colSpan="6" className="empty">まだチェックしていません。金庫の中身を数えて保存すると、ここに残ります。</td></tr>}
        </tbody>
      </table></div>
    </section>
  );
}
