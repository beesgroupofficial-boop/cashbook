import { useEffect, useMemo, useState } from "react";
import { SHOPS, yen, signed, num, thisMonth, fmtAt, allMoves, withRunning, lastBal, bookAt } from "../lib";
import { saveSettings } from "../useData";
import { Seal, errMsg } from "../ui";

export default function Home({ data, toast }) {
  const { txns, sales, counts, settings } = data;
  const [mo, setMo] = useState(thisMonth());
  const [opening, setOpening] = useState("");
  useEffect(() => setOpening(String(settings.opening ?? 0)), [settings.opening]);

  const run = useMemo(() => withRunning(txns, sales, settings.opening), [txns, sales, settings.opening]);
  const bal = lastBal(run, settings.opening);
  const lastRaw = useMemo(() => [...counts].sort((a, b) => (b.at || 0) - (a.at || 0))[0], [counts]);
  const last = lastRaw ? { ...lastRaw, diff: num(lastRaw.actual) - bookAt(txns, sales, settings.opening, lastRaw.at) } : null;

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
      <div className="row" style={{ justifyContent: "flex-end", marginBottom: 10 }}>
        <button className="small" onClick={() => window.location.reload()}>最新の状態に更新</button>
      </div>
      <div className="panel hero">
        <div>
          <div className="lbl">帳簿上の現金在高</div>
          <div className="big num">{yen(bal)}</div>
          <div style={{ borderTop: "1px solid var(--line)", margin: "14px 0 12px" }} />
          <div className="lbl">実際の金庫{last ? `（${fmtAt(last.at)} チェック）` : ""}</div>
          {last ? (
            <>
              <div className="big num">{yen(last.actual)}</div>
              <div className="num" style={{ marginTop: 4, fontWeight: 700, color: last.diff === 0 ? "var(--ok)" : "var(--out)" }}>
                {last.diff === 0 ? "帳簿と一致" : `チェック時の差異 ${signed(last.diff)}`}
              </div>
            </>
          ) : (
            <div className="hint" style={{ marginTop: 4 }}>金庫チェックはまだありません</div>
          )}
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
            : <Row k="区分ごとの内訳" v="記録なし" />}
        </dl></div>
      </div>
      <div className="panel" style={{ marginTop: 12 }}><dl className="kv num">
        <dt style={{ gridColumn: "1/-1", color: "var(--ink)", fontWeight: 700 }}>店舗別の売上</dt>
        {SHOPS.map((s, i) => <Row key={s} k={s} v={yen(shop[i])} cls="in-t" />)}
        <Row k={<strong>合計</strong>} v={<strong>{yen(shop.reduce((a, b) => a + b, 0))}</strong>} />
      </dl></div>

      <h2>設定</h2>
      <div className="panel">
        <div className="row">
          <label className="f">開始時点の現金在高（繰越金）
            <input type="number" inputMode="numeric" value={opening} onChange={(e) => setOpening(e.target.value)} /></label>
          <button onClick={async () => {
            try { await saveSettings({ opening: parseInt(opening) || 0 }); toast("繰越金を保存しました"); } catch (e) { toast(errMsg(e)); }
          }}>繰越金を保存</button>
        </div>
        <p className="hint">スプレッドシートの最終行の現金在高を入れると、そこから続きを記録できます。</p>
      </div>
    </section>
  );
}

function Row({ k, v, cls = "" }) { return <><dt>{k}</dt><dd className={cls}>{v}</dd></>; }
