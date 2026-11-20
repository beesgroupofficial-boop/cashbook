import { Fragment, useMemo, useState } from "react";
import { DENOMS, yen, signed, fmtAt, today, md, localDate, withRunning, lastBal, bookAt, num, matchSubsets, signedAmt } from "../lib";
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

  // 数える前の確認用: 直近3日間の入金（記録済み）を新しい順に表示
  const since = localDate(Date.now() - 2 * 86400000);
  const recentIn = useMemo(() => txns.filter((t) => t.dir === "in" && (t.date || "") >= since)
    .sort((x, y) => (x.date === y.date ? (y.createdAt || 0) - (x.createdAt || 0) : x.date < y.date ? 1 : -1)), [txns, since]);
  const recentInSum = recentIn.reduce((a, t) => a + num(t.amount), 0);
  // クリックで選んだ入金の合計（店舗ごとの内訳つき）
  const [selIn, setSelIn] = useState(() => new Set());
  const shown = recentIn.slice(0, 15);
  const pickedIn = recentIn.filter((t) => selIn.has(t.id));
  const pickedSum = pickedIn.reduce((a, t) => a + num(t.amount), 0);
  const pickedByStore = {};
  pickedIn.forEach((t) => { const k = t.store || "—"; pickedByStore[k] = (pickedByStore[k] || 0) + num(t.amount); });
  const toggleIn = (id) => setSelIn((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allInOn = shown.length > 0 && shown.every((t) => selIn.has(t.id));
  const toggleAllIn = () => setSelIn((s) => { const n = new Set(s); shown.forEach((t) => (allInOn ? n.delete(t.id) : n.add(t.id))); return n; });

  // 差異の原因候補（現在の入力）: 直近3日の記録のうち、差異と逆の合計になる組み合わせ
  // （記録したのに金庫へ入れていない／出金したのに金庫に残っている）
  const recentAll = useMemo(() => txns.filter((t) => (t.date || "") >= since)
    .sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0)).map((t) => ({ t, s: signedAmt(t) })), [txns, since]);
  const liveHints = any && diff !== 0 ? matchSubsets(recentAll, -diff) : [];
  const [open, setOpen] = useState(null);
  const beforeOf = (h) => txns.filter((t) => (t.createdAt || 0) <= h.at && (t.date || "") >= localDate(h.at - 2 * 86400000))
    .sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0));
  const errNote = (g) => (g.err ? `（金額は ${yen(Math.abs(g.err))} ${g.err > 0 ? "多い" : "少ない"}）` : "（金額がぴったり一致）");
  const lateOf = (h) => txns.filter((t) => (t.createdAt || 0) > h.at && (t.date || "") <= localDate(h.at))
    .sort((x, y) => (x.createdAt || 0) - (y.createdAt || 0));

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
      <div className="panel" style={{ marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <strong>直近の入金（記録済み）</strong>
          <span className="hint num">{recentIn.length ? `合計 ${yen(recentInSum)}` : ""}</span>
        </div>
        <div className="hint" style={{ margin: "0 0 8px", lineHeight: 1.7 }}>
          <div>金庫に入れたお金がここに無いときは、先に「入出金」で記録してから数えてください。</div>
          <div>帳簿上の現金在高: <b className="out-t num" style={{ fontSize: 16 }}>{yen(book)}</b>　行をクリックすると、選んだ入金の合計が出ます。</div>
        </div>
        {recentIn.length ? (
          <div className="tbl-wrap"><table>
            <thead><tr><th style={{ width: 28 }}><input type="checkbox" aria-label="表示中をすべて選択" checked={allInOn} onChange={toggleAllIn} /></th><th>日付</th><th>区分</th><th>店舗</th><th className="r">入金</th><th>メモ</th><th>記録した時刻</th></tr></thead>
            <tbody>{shown.map((t) => (
              <tr key={t.id} style={selIn.has(t.id) ? { background: "#FFF6D6", color: "#222" } : undefined} onClick={(e) => { if (!e.target.closest("input, button")) toggleIn(t.id); }}>
                <td><input type="checkbox" aria-label="合計に入れる" checked={selIn.has(t.id)} onChange={() => toggleIn(t.id)} /></td><td className="num">{md(t.date)}</td><td>{t.cat}</td><td>{t.store}</td>
                <td className="r num in-t">{yen(t.amount)}</td><td className="memo">{t.memo}</td><td className="num">{fmtAt(t.createdAt)}</td></tr>
            ))}</tbody>
          </table></div>
        ) : <p className="hint" style={{ margin: 0 }}>この3日間の入金の記録はまだありません。</p>}
        {recentIn.length > 15 && <p className="hint" style={{ margin: "6px 0 0" }}>ほかに {recentIn.length - 15} 件あります（入出金の画面で確認できます）</p>}
      </div>
      {pickedIn.length > 0 && (
        <div className="selbar" role="status" aria-label="選んだ入金の合計">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <strong>{pickedIn.length}件を選択</strong>
            <button className="small" onClick={() => setSelIn(new Set())}>選択を解除</button>
          </div>
          <div className="num selsum"><span>入金合計 <b className="in-t">{yen(pickedSum)}</b></span></div>
          {Object.keys(pickedByStore).length > 1 && (
            <div className="num selstore">{Object.entries(pickedByStore).map(([k, v]) => <span key={k}>{k} <b>{yen(v)}</b></span>)}</div>
          )}
        </div>
      )}
      {pickedIn.length > 0 && <div style={{ height: 130 }} />}
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
        {liveHints.length > 0 && (
          <div className="hintbox" role="note">
            <strong>差異 {signed(diff)} の原因かもしれない記録</strong>
            {liveHints.map((g, i) => (
              <div key={i} style={{ marginTop: 4 }}>
                <span className="hint">{errNote(g)}</span>
                {g.map((x) => <span key={x.t.id} style={{ display: "block" }}>・{md(x.t.date)} {x.t.cat} {x.t.store} {x.t.dir === "in" ? "入金" : "出金"} {yen(x.t.amount)}{x.t.memo ? `（${x.t.memo}）` : ""}</span>)}
              </div>
            ))}
            <span className="hint" style={{ display: "block", marginTop: 4 }}>記録はしたが、実際の金庫に反映されていない（入金したお金を入れていない／出金したのに金庫に残っている）可能性があります。</span>
          </div>
        )}
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
          {hist.length ? hist.map((h) => {
            const isOpen = open === h.id;
            const late = isOpen ? lateOf(h) : [];
            const hints = isOpen && h.diff !== 0 ? matchSubsets(late.map((t) => ({ t, s: signedAmt(t) })), h.diff) : [];
            const bHints = isOpen && h.diff !== 0 && !hints.length ? matchSubsets(beforeOf(h).map((t) => ({ t, s: signedAmt(t) })), -h.diff) : [];
            const cnt = h.counts || {}, bx = h.boxes || {};
            return (
            <Fragment key={h.id}>
            <tr style={{ cursor: "pointer", background: isOpen ? "var(--sunk)" : undefined }}
              onClick={(e) => { if (!e.target.closest("button")) setOpen(isOpen ? null : h.id); }} aria-expanded={isOpen}>
              <td className="num">{isOpen ? "▾ " : "▸ "}{fmtAt(h.at)}</td><td className="r num">{yen(h.actual)}</td><td className="r num">{yen(h.book)}</td>
              <td className={"r num " + (h.diff === 0 ? "" : h.diff > 0 ? "in-t" : "out-t")}>{h.diff === 0 ? "一致" : signed(h.diff)}</td>
              <td className="memo">{h.note}</td>
              <td><TwoStep aria-label="このチェックを削除" onConfirm={() => removeRow("counts", h.id).catch((e) => toast(errMsg(e)))} /></td>
            </tr>
            {isOpen && (
              <tr><td colSpan="6" style={{ whiteSpace: "normal", background: "var(--sunk)" }}>
                <div className="detail">
                  <div className="detail-grid num">
                    <div>
                      <strong>金種ごとの枚数</strong>
                      <dl className="kv">
                        {DENOMS.filter((d) => num(cnt[d])).map((d) => <Fragment key={d}><dt>{d.toLocaleString()}円 × {num(cnt[d])}枚</dt><dd>{yen(d * num(cnt[d]))}</dd></Fragment>)}
                        {!DENOMS.some((d) => num(cnt[d])) && <><dt>枚数の入力なし</dt><dd></dd></>}
                        <dt>金種の合計</dt><dd>{yen(DENOMS.reduce((a, d) => a + d * num(cnt[d]), 0))}</dd>
                      </dl>
                    </div>
                    <div>
                      <strong>小銭BOX・小口</strong>
                      <dl className="kv">
                        {Object.keys(bx).filter((b) => num(bx[b])).map((b) => <Fragment key={b}><dt>小銭BOX {Number(b).toLocaleString()}円 × {num(bx[b])}個</dt><dd>{yen(Number(b) * num(bx[b]))}</dd></Fragment>)}
                        <dt>小口</dt><dd>{yen(h.petty)}</dd>
                      </dl>
                      <strong style={{ display: "block", marginTop: 10 }}>結果</strong>
                      <dl className="kv">
                        <dt>実際の金庫</dt><dd>{yen(h.actual)}</dd>
                        <dt>帳簿上（このチェックの時点）</dt><dd>{yen(h.book)}</dd>
                        <dt>差異</dt><dd className={h.diff === 0 ? "" : h.diff > 0 ? "in-t" : "out-t"}>{h.diff === 0 ? "一致" : signed(h.diff)}</dd>
                      </dl>
                    </div>
                  </div>
                  <p className="hint" style={{ margin: "8px 0 0" }}>{fmtAt(h.at)} に記録{h.by ? `（${h.by}）` : ""}{h.note ? `　メモ：${h.note}` : ""}</p>
                  {hints.length > 0 && (
                    <div className="hintbox" role="note">
                      <strong>差異 {signed(h.diff)} は、このチェックのあとに記録された次の記録と一致します</strong>
                      {hints.map((g, i) => (
                        <div key={i} style={{ marginTop: 4 }}>
                          <span className="hint">{errNote(g)}</span>
                          {g.map((x) => <span key={x.t.id} style={{ display: "block" }}>・{md(x.t.date)} {x.t.cat} {x.t.store} {x.t.dir === "in" ? "入金" : "出金"} {yen(x.t.amount)}{x.t.memo ? `（${x.t.memo}）` : ""}　記録 {fmtAt(x.t.createdAt)}</span>)}
                        </div>
                      ))}
                      <span className="hint" style={{ display: "block", marginTop: 4 }}>数えた時点ではすでに金庫にあったお金を、数えたあとに記録した可能性が高いです。</span>
                    </div>
                  )}
                  {bHints.length > 0 && (
                    <div className="hintbox" role="note">
                      <strong>差異 {signed(h.diff)} は、このチェックの前に記録された次の記録と一致します</strong>
                      {bHints.map((g, i) => (
                        <div key={i} style={{ marginTop: 4 }}>
                          <span className="hint">{errNote(g)}</span>
                          {g.map((x) => <span key={x.t.id} style={{ display: "block" }}>・{md(x.t.date)} {x.t.cat} {x.t.store} {x.t.dir === "in" ? "入金" : "出金"} {yen(x.t.amount)}{x.t.memo ? `（${x.t.memo}）` : ""}　記録 {fmtAt(x.t.createdAt)}</span>)}
                        </div>
                      ))}
                      <span className="hint" style={{ display: "block", marginTop: 4 }}>記録はしたが、数えた金庫には入っていなかった（入金を入れずに数えた／出金したのに金庫に残っていた）可能性があります。</span>
                    </div>
                  )}
                  {late.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <strong>このチェックのあとに記録された、この日までの記録</strong>
                      {late.slice(0, 10).map((t) => <span key={t.id} className="num" style={{ display: "block" }}>・{md(t.date)} {t.cat} {t.store} {t.dir === "in" ? "入金" : "出金"} {yen(t.amount)}{t.memo ? `（${t.memo}）` : ""}　記録 {fmtAt(t.createdAt)}</span>)}
                    </div>
                  )}
                </div>
              </td></tr>
            )}
            </Fragment>
            );
          }) : <tr><td colSpan="6" className="empty">まだチェックしていません。金庫の中身を数えて保存すると、ここに残ります。</td></tr>}
        </tbody>
      </table></div>
    </section>
  );
}
