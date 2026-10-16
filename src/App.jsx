import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { useData } from "./useData";
import Login from "./views/Login.jsx";
import Home from "./views/Home.jsx";
import Ledger from "./views/Ledger.jsx";
import Count from "./views/Count.jsx";
import Sales from "./views/Sales.jsx";

const TABS = [["home", "ホーム"], ["ledger", "入出金"], ["count", "金庫チェック"], ["sales", "売上"]];

export default function App() {
  const [user, setUser] = useState(undefined);      // undefined = 確認中
  const [member, setMember] = useState(undefined);
  const [view, setView] = useState("home");
  const [msg, setMsg] = useState("");

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u); setMember(undefined);
    if (!u) return;
    try { setMember((await getDoc(doc(db, "members", u.uid))).exists()); } catch { setMember(false); }
  }), []);

  const data = useData(!!member);
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
          <h1>現金出納帳</h1>
          <span className="who">{user.email}<button className="small ghost" onClick={() => signOut(auth)}>ログアウト</button></span>
        </header>
        {data.error && <p className="err">データを読み込めませんでした（{data.error}）。再読み込みしてください。</p>}
        {view === "home" && <Home {...props} />}
        {view === "ledger" && <Ledger {...props} />}
        {view === "count" && <Count {...props} />}
        {view === "sales" && <Sales {...props} />}
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
