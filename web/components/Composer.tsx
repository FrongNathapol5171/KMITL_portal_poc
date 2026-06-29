"use client";

import { useState, useRef, KeyboardEvent } from "react";

interface ComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function Composer({ onSend, disabled }: ComposerProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  return (
    <div
      className="shrink-0 px-3 py-3 border-t"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg)",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
      }}
    >
      <div
        className="flex items-end gap-2 rounded-[var(--radius-pill)] border px-4 py-2"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface)",
          boxShadow: "var(--shadow-1)",
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="ถามอะไรก็ได้เกี่ยวกับ KMITL…"
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed py-1"
          style={{
            color: "var(--text)",
            minHeight: "24px",
            maxHeight: "160px",
          }}
        />
        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          aria-label="Send message"
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-150 disabled:opacity-40"
          style={{
            background: text.trim() && !disabled ? "var(--color-primary)" : "var(--surface-2)",
            color: text.trim() && !disabled ? "white" : "var(--text-muted)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" /><path d="M22 2L15 22 11 13 2 9l20-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
