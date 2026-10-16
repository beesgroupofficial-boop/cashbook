import { useEffect, useRef, useState } from "react";
import { signed } from "./lib";

export function Seal({ diff, empty, pop }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!pop || !ref.current) return;
    ref.current.classList.remove("pop"); void ref.current.offsetWidth; ref.current.classList.add("pop");
  }, [pop]);
  if (empty) return <div className="seal none"><b>—</b><small>未入力</small></div>;
  if (diff === null || diff === undefined) return <div className="seal none"><b>未</b><small>確認</small></div>;
  if (diff === 0) return <div ref={ref} className="seal ok"><b>一致</b><small>差異なし</small></div>;
  return <div ref={ref} className="seal"><b>差異</b><small className="num">{signed(diff)}</small></div>;
}

// 1回目で「本当に削除」に変わり、3秒以内にもう一度押すと実行
export function TwoStep({ onConfirm, label = "削除", armedLabel = "本当に削除", className = "small ghost", ...rest }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3500); return () => clearTimeout(t); }, [armed]);
  return (
    <button type="button" {...rest} disabled={busy}
      className={className + (armed ? " danger" : "")}
      onClick={async () => {
        if (!armed) { setArmed(true); return; }
        setBusy(true);
        try { await onConfirm(); } finally { setBusy(false); setArmed(false); }
      }}>{armed ? armedLabel : label}</button>
  );
}

export const errMsg = (e) =>
  e?.code === "permission-denied" ? "権限がありません。管理者に確認してください" : "保存できませんでした。通信を確認してください";
