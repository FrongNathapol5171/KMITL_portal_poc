"use client";

import { useState } from "react";
import { login } from "@/lib/api";

interface AuthSheetProps {
  onSuccess: () => void;
  onDismiss: () => void;
}

export default function AuthSheet({ onSuccess, onDismiss }: AuthSheetProps) {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) return;
    setLoading(true);
    setError("");
    try {
      await login(studentId.trim(), password || studentId.trim());
      onSuccess();
    } catch {
      setError("ไม่พบรหัสนักศึกษา กรุณาตรวจสอบอีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 z-40"
        onClick={onDismiss}
        aria-hidden
      />
      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 z-50 rounded-t-[var(--radius-lg)] p-6 space-y-4"
        style={{ background: "var(--bg)", boxShadow: "0 -4px 24px rgba(0,0,0,.12)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
            เข้าสู่ระบบ
          </h2>
          <button
            onClick={onDismiss}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
          >
            ×
          </button>
        </div>

        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          คำถามนี้ต้องการข้อมูลส่วนตัวของคุณ — กรุณาเข้าสู่ระบบก่อนครับ
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="รหัสนักศึกษา (เช่น 6300001)"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border px-4 py-3 text-sm outline-none"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
            }}
            autoFocus
          />

          {error && (
            <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !studentId.trim()}
            className="w-full py-3 rounded-[var(--radius-pill)] text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: "var(--color-primary)" }}
          >
            {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </>
  );
}
