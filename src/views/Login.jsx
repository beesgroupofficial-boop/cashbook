import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try { await signInWithEmailAndPassword(auth, email.trim(), pw); }
    catch (e) {
      setErr(e.code === "auth/too-many-requests" ? "試行回数が多すぎます。しばらく待ってからもう一度お試しください"
        : "メールアドレスかパスワードが違います");
    } finally { setBusy(false); }
  };
  return (
    <div className="wrap"><form className="panel login" onSubmit={submit}>
      <h1>現金出納帳</h1>
      <label className="f">メールアドレス<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label className="f" style={{ marginTop: 10 }}>パスワード<input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></label>
      {err && <p className="err">{err}</p>}
      <button className="primary" style={{ marginTop: 16, width: "100%" }} disabled={busy}>{busy ? "ログイン中…" : "ログイン"}</button>
    </form></div>
  );
}
