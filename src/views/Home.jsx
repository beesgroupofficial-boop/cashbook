import { useEffect, useMemo, useState } from "react";
import { SHOPS, yen, signed, num, thisMonth, fmtAt, allMoves, withRunning, lastBal } from "../lib";
import { saveSettings } from "../useData";
import { Seal, errMsg } from "../ui";

export default function Home({ data, toast }) {
  const { txns, sales, counts, settings } = data;
  const [mo, setMo] = useState(thisMonth());
  const [opening, setOpening] = useState("");
  useEffect(() => setOpening(String(settings.opening ?? 0)), [settings.opening]);

  const run = useMemo(() => withRunning(txns, sales, settings.opening), [txns, sales, settings.opening]);
  const bal = lastBal(run, settings.opening);
  const last = useMemo(() => [...counts].sort((a, b) => (b.at || 0) - (a.at || 0))[0], [counts]);

  const tx = allMoves(txns, sales).filter((t) => (t.date || "").startsWith(mo));
  const inn = tx.filter((t) => t.dir === "in").reduce((a, t) => a + num(t.amount), 0);
  const out = tx.filter((t) => t.dir === "out").reduce((a, t) => a + num(t.amount), 0);
  const before = run.filter((t) => (t.date || "") < mo + "-01");
  const upto = run.filter((t) => (t.date || "").slice(0, 7) <= mo);
  const openB = lastBal(before, settings.opening), closeB = lastBal(upto, settings.opening);
  const byCat = {};
  tx.forEach((t) => { byCat[t.cat] = (byCat[t.cat] || 0) + (t.dir === "in" ? num(t.amount) : -num(t.amount)); });
  const shop = SHOPS.map((s) => sales.filter((r) => r.store === s && (r.date || "").startsWith(mo)).reduce((a, r) => a + num(r.amount), 0));

  return (
    <section>
      <div className="panel hero">
        <div>
          <div className="lbl">帳簿上の現金在高</div>
          <div className="big num">{yen(bal)}</div>
          <div className="lbl">{last ? `最終チェック ${fmtAt(last.at)}（実際 ${yen(last.actual)}）` : "金庫チェックはまだありません"}</div>
        </div>
        <Seal diff={last ? last.diff : null} />
      </div>

      <div className="row" style={{ margin: "28px 0 10px", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>{mo.slice(0, 4)}年{Number(mo.slice(5))}月の動き</h2>
        <input type="month" style={{ width: "auto" }} value={mo} onChange={(e) => setMo(e.target.value || thisMonth())} aria-label="表示する月" />
      </div>
      <div className="split">
        <div className="panel"><dl className="kv num">
          <Row k="月初の現金在高" v={yen(openB)} />
          <Row k="入金" v={yen(inn)} cls="in-t" />
          <Row k="出金" v={yen(out)} cls="out-t" />
          <Row k="差し引き" v={signed(inn - out)} />
          <Row k={<strong>{mo === thisMonth() ? "現在の現金在高" : "月末の現金在高"}</strong>} v={<strong>{yen(closeB)}</strong>} />
        </dl></div>
        <div className="panel"><dl className="kv num">
          {Object.keys(byCat).length
            ? Object.entries(byCat).map(([k, v]) => <Row key={k} k={k} v={signed(v)} cls={v < 0 ? "out-t" : "in-t"} />)
