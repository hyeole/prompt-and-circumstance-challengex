"use client";

// Shared frame for every page: navigation rail with active-page labels, brand header with breadcrumbs, and footer credit.
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

export type Crumb = { label: string; href?: string };

function NavItem({ href, icon, label, active }: { href: string; icon: string; label: string; active: boolean }) {
  return (
    <Link href={href} className={`rail-link ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>
      <Icon name={icon} size={19} />
      <span>{label}</span>
    </Link>
  );
}

export default function AppShell({ crumbs, actions, children, caseId }: { crumbs: Crumb[]; actions?: React.ReactNode; children: React.ReactNode; caseId?: string }) {
  const path = usePathname() ?? "/";
  const reviewHref = caseId ? `/review/${encodeURIComponent(caseId)}` : null;
  return (
    <div className="shell">
      <nav className="rail no-print" aria-label="Main">
        <NavItem href="/" icon="home" label="Workspace" active={path === "/"} />
        <NavItem href="/cases" icon="folder" label="Cases" active={path.startsWith("/cases")} />
        {reviewHref && <NavItem href={reviewHref} icon="doc" label="Review" active={path === reviewHref} />}
        {reviewHref && <NavItem href={`${reviewHref}/history`} icon="history" label="History" active={path.endsWith("/history")} />}
        <NavItem href="/references" icon="book" label="References" active={path.startsWith("/references")} />
        <div className="rail-spacer" />
        <div className="rail-credit" title="Built by Prompt & Circumstance" aria-label="Built by Prompt and Circumstance">P&amp;C</div>
      </nav>
      <div className="main">
        <header className="header no-print">
          <Link href="/" className="brand" aria-label="NarrativeCheck workspace">
            <div className="brand-mark" aria-hidden>NC</div>
            <div>
              <div className="wordmark">Narrative<span>Check</span></div>
              <div className="tagline">Charge documentation review</div>
            </div>
          </Link>
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <ol>
              {crumbs.map((c, i) => (
                <li key={i}>
                  {i > 0 && <Icon name="chevronRight" size={11} />}
                  {c.href && i < crumbs.length - 1 ? <Link href={c.href}>{c.label}</Link> : <span aria-current={i === crumbs.length - 1 ? "page" : undefined}>{c.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
          {actions && <div className="header-actions">{actions}</div>}
        </header>
        {children}
        <footer className="footer no-print">
          <span>Decision support only. Findings are not legal determinations; the officer keeps the narrative and the charge.</span>
          <span className="credit">Built by Prompt &amp; Circumstance</span>
        </footer>
      </div>
    </div>
  );
}
