"use client";
import Icon from "./Icon";
export default function PrintButton({ label }: { label: string }) {
  return <button className="btn btn-primary" onClick={() => window.print()}><Icon name="download" size={14} /> {label}</button>;
}
