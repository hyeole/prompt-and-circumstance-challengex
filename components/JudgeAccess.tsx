"use client";

// Judge access-code entry (hosting-free-1; public demo only). Live reviews and PDF uploads need the code; everything
// else on the site is open. The code is checked on the server and never stored in the browser: a correct code starts
// a 12-hour session cookie (httpOnly) bound to this browser's workspace.
import { useState } from "react";
import Icon from "./Icon";

export type AccessState = { required: boolean; configured: boolean; active: boolean };

export default function JudgeAccess({ purpose, onGranted, compact }: { purpose: string; onGranted: () => void; compact?: boolean }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Not a <form>: the new-case page shows this inside its own form, and a nested form made Unlock reload the page
  // (no code check, attached PDF lost). Unlock is a plain button; Enter in the field is handled here and never
  // submits a surrounding form.
  async function submit() {
    if (!code.trim() || busy) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(body.error ?? `The code could not be checked (HTTP ${res.status}).`); return; }
      setCode("");
      onGranted();
    } catch {
      setErr("The code could not be checked. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={`judge-access ${compact ? "compact" : ""}`} role="group" aria-label="Judge access code">
      <div className="judge-access-text"><Icon name="review" size={15} /> <span><strong>{purpose} need the judge access code.</strong> Everything else on this site is open.</span></div>
      <div className="judge-access-row">
        <label htmlFor="judge-code" className="sr-only">Judge access code</label>
        <input id="judge-code" type="password" autoComplete="off" spellCheck={false} value={code} onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void submit(); } }} placeholder="Judge access code" maxLength={200} />
        <button className="btn btn-primary btn-sm" type="button" onClick={() => void submit()} disabled={busy || !code.trim()}>{busy ? "Checking…" : "Unlock"}</button>
      </div>
      {err && <div className="judge-access-err" role="alert">{err}</div>}
    </div>
  );
}
