import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { useData } from "./useData";
import Login from "./views/Login.jsx";
import Home from "./views/Home.jsx";
import Ledger from "./views/Ledger.jsx";
import Count from "./views/Count.jsx";
import { ORGS, orgInfo } from "./lib";

const TABS = [["home", "ホーム"], ["ledger", "入出金"], ["count", "金庫チェック"]];

export default function App() {
  const [user, setUser] = useState(undefined);      // undefined = 確認中
  const [member, setMember] = useState(undefined);
  const [orgs, setOrgs] = useState([]);          // 使える会社の一覧
  const [orgSel, setOrgSel] = useState(() => { try { return localStorage.getItem("cashbook.org") || ""; } catch { return ""; } });
  const [view, setView] = useState("home");
  const [msg, setMsg] = useState("");

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u); setMember(undefined);
    if (!u) return;
    try {
      const snap = await getDoc(doc(db, "members", u.uid));
      // members/{uid}.orgs に ["bees","bamboo"] のように会社を並べる。無ければ従来どおり bees のみ
      const list = snap.exists() ? (Array.isArray(snap.data().orgs) ? snap.data().orgs : ["bees"]).filter((o) => ORGS[o]) : [];
      setOrgs(list); setMember(list.length > 0);
    } catch { setMember(false); }
  }), []);

  const org = orgs.includes(orgSel) ? orgSel : orgs[0] || "bees";
  const chooseOrg = (o) => { setOrgSel(o); setView("home"); try { localStorage.setItem("cashbook.org", o); } catch {} };
  const data = useData(!!member, org);
  const toast = useCallback((m) => { setMsg(m); clearTimeout(toast.t); toast.t = setTimeout(() => setMsg(""), 2200); }, []);

  if (user === undefined || (user && member === undefined)) return <div className="wrap"><p className="hint">読み込み中…</p></div>;
  if (!user) return <Login />;
  if (!member) return (
    <div className="wrap"><div className="panel login">
      <h1>利用登録がまだです</h1>
      <p>{user.email} はまだ現金出納帳の利用者に登録されていません。次の ID を管理者に伝えてください。</p>
      <p className="num" style={{ wordBreak: "break-all", fontWeight: 700 }}>{user.uid}</p>
      <button onClick={() => signOut(auth)}>ログアウト</button>
    </div></div>
  );

  const props = { data, toast };
  return (
    <>
      <div className="wrap">
        <header className="top">
          <h1>現金出納帳{orgs.length <= 1 && <small style={{ fontSize: ".6em", fontWeight: 500, marginLeft: 8 }}>{orgInfo(org).name}</small>}</h1>
          {orgs.length > 1 && (
            <select aria-label="会社を切り替え" value={org} onChange={(e) => chooseOrg(e.target.value)} style={{ width: "auto" }}>
              {orgs.map((o) => <option key={o} value={o}>{ORGS[o].name}</option>)}
            </select>
          )}
          <span className="who">{user.email}<button className="small ghost" onClick={() => signOut(auth)}>ログアウト</button></span>
        </header>
        {data.error && <p className="err">データを読み込めませんでした（{data.error}）。再読み込みしてください。</p>}
        {view === "home" && <Home key={org} {...props} />}
        {view === "ledger" && <Ledger key={org} {...props} />}
        {view === "count" && <Count key={org} {...props} />}
      </div>
      <nav className="tabs" aria-label="画面切り替え"><div className="inner">
        {TABS.map(([k, l]) => (
          <button key={k} aria-current={view === k ? "page" : undefined}
            onClick={() => { setView(k); window.scrollTo(0, 0); }}>{l}</button>
        ))}
      </div></nav>
      <div className={"toast" + (msg ? " show" : "")} role="status">{msg}</div>
    </>
  );
}
