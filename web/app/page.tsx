"use client";

import { useState, useEffect } from "react";
import ChatScreen from "@/components/ChatScreen";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const initial = saved ?? preferred;
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  };

  return (
    <main className="h-full flex flex-col">
      <header
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold select-none"
            style={{ background: "var(--color-primary)" }}
          >
            K
          </div>
          <span className="font-semibold text-base" style={{ color: "var(--text)" }}>
            AskKMITL
          </span>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>
      <ChatScreen />
    </main>
  );
}
