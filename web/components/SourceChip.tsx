"use client";

import { Source } from "./MessageBubble";

export default function SourceChip({ source }: { source: Source }) {
  const content = (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-[var(--radius-sm)] border transition-colors"
      style={{
        background: "var(--color-primary-tint)",
        borderColor: "var(--color-primary)",
        color: "var(--color-primary-text)",
      }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      {source.doc}
      {source.section && ` · ${source.section}`}
    </span>
  );

  if (source.url) {
    return <a href={source.url} target="_blank" rel="noopener noreferrer">{content}</a>;
  }
  return content;
}
