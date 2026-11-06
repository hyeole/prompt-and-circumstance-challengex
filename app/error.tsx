"use client";

// Shown when a page cannot load (hosting-free-1), for example while the demo's storage is unavailable or its monthly
// allowance is used up. Pages fail closed: nothing is shown from another workspace and nothing is changed.
import Link from "next/link";

export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="page" id="main" style={{ minHeight: "100dvh" }}>
      <div className="page-inner" style={{ maxWidth: 640 }}>
        <h1 className="page-title">This page could not load</h1>
        <p className="lede">
          The workspace storage may be unavailable, or the demo&apos;s storage allowance may be used up. Nothing was changed
          and nothing was saved. Try again in a few minutes.
        </p>
        <div className="toolbar">
          <button className="btn btn-primary" onClick={reset}>Try again</button>
          <Link className="btn btn-secondary" href="/references">Open the references (no storage needed)</Link>
        </div>
      </div>
    </main>
  );
}
