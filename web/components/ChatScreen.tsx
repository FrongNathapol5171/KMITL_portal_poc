"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import MessageBubble, { Message } from "./MessageBubble";
import Composer from "./Composer";
import SuggestionChips from "./SuggestionChips";
import AuthSheet from "./AuthSheet";
import { streamChat } from "@/lib/api";

const SUGGESTIONS = [
  "เหลืออีกกี่หน่วยกิตถึงจบ?",
  "ตรวจสอบเกรดของฉัน",
  "กำหนดส่งวิทยานิพนธ์เมื่อไหร่?",
  "ทุน กยศ. ต้องเกรดขั้นต่ำเท่าไหร่?",
  "วิธีถอนรายวิชา",
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((m) => [...m, {
      id: assistantId, role: "assistant", content: "", streaming: true,
    }]);

    abortRef.current = new AbortController();

    try {
      for await (const chunk of streamChat(text, "th", abortRef.current.signal)) {
        if (chunk.type === "auth_required") {
          setPendingMessage(text);
          setShowAuth(true);
          setMessages((m) => m.filter((msg) => msg.id !== assistantId));
          break;
        }

        if (chunk.type === "token") {
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: msg.content + chunk.text }
                : msg
            )
          );
        }

        if (chunk.type === "card") {
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantId
                ? { ...msg, card: chunk }
                : msg
            )
          );
        }

        if (chunk.type === "source") {
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantId
                ? { ...msg, sources: [...(msg.sources ?? []), chunk] }
                : msg
            )
          );
        }

        if (chunk.type === "done") {
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantId ? { ...msg, streaming: false } : msg
            )
          );
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง", streaming: false }
              : msg
          )
        );
      }
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleAuthSuccess = useCallback(() => {
    setAuthed(true);
    setShowAuth(false);
    if (pendingMessage) {
      handleSend(pendingMessage);
      setPendingMessage(null);
    }
  }, [pendingMessage, handleSend]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative"
         style={{ background: "var(--bg)" }}>
      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
           style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-16">
            <div className="text-center space-y-2">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto"
                style={{ background: "var(--color-primary)" }}
              >
                K
              </div>
              <h2 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
                สวัสดีครับ! ผม AskKMITL
              </h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                ถามเรื่องการศึกษา หลักสูตร หรือข้อมูลส่วนตัวได้เลยครับ
              </p>
            </div>
            <SuggestionChips
              suggestions={SUGGESTIONS}
              onSelect={handleSend}
              disabled={loading}
            />
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips (above composer, after first message) */}
      {messages.length > 0 && messages.length < 4 && (
        <div className="px-4 pb-2">
          <SuggestionChips
            suggestions={SUGGESTIONS.slice(0, 3)}
            onSelect={handleSend}
            disabled={loading}
          />
        </div>
      )}

      {/* Composer */}
      <Composer onSend={handleSend} disabled={loading} />

      {/* Auth sheet */}
      {showAuth && (
        <AuthSheet
          onSuccess={handleAuthSuccess}
          onDismiss={() => { setShowAuth(false); setPendingMessage(null); }}
        />
      )}
    </div>
  );
}
