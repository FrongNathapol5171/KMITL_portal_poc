"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Fade from "@mui/material/Fade";
import { AnimatePresence } from "framer-motion";
import MessageBubble, { Message } from "./MessageBubble";
import Composer from "./Composer";
import SuggestionChips from "./SuggestionChips";
import AuthSheet from "./AuthSheet";
import EmptyState from "./EmptyState";
import { streamChat } from "@/lib/api";

const SUGGESTIONS = [
  "เหลืออีกกี่หน่วยกิตถึงจบ?",
  "ตรวจสอบเกรดของฉัน",
  "กำหนดส่งวิทยานิพนธ์เมื่อไหร่?",
  "ทุน กยศ. ต้องเกรดขั้นต่ำเท่าไหร่?",
  "วิธีถอนรายวิชา",
];

interface ChatScreenProps {
  dark: boolean;
  onLogin?: (studentId: string) => void;
}

export default function ChatScreen({ dark, onLogin }: ChatScreenProps) {
  const [messages, setMessages]           = useState<Message[]>([]);
  const [loading, setLoading]             = useState(false);
  const [showAuth, setShowAuth]           = useState(false);
  const [pendingMessage, setPendingMsg]   = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    const asstId = (Date.now() + 1).toString();

    setMessages((m) => [...m, userMsg, {
      id: asstId, role: "assistant", content: "", streaming: true,
    }]);
    setLoading(true);
    abortRef.current = new AbortController();

    try {
      for await (const chunk of streamChat(text, "th", abortRef.current.signal)) {
        if (chunk.type === "auth_required") {
          setPendingMsg(text);
          setShowAuth(true);
          setMessages((m) => m.filter((msg) => msg.id !== asstId));
          break;
        }
        if (chunk.type === "token") {
          setMessages((m) => m.map((msg) =>
            msg.id === asstId ? { ...msg, content: msg.content + chunk.text } : msg
          ));
        }
        if (chunk.type === "card") {
          setMessages((m) => m.map((msg) =>
            msg.id === asstId ? { ...msg, card: chunk } : msg
          ));
        }
        if (chunk.type === "source") {
          setMessages((m) => m.map((msg) =>
            msg.id === asstId ? { ...msg, sources: [...(msg.sources ?? []), chunk] } : msg
          ));
        }
        if (chunk.type === "done") {
          setMessages((m) => m.map((msg) =>
            msg.id === asstId ? { ...msg, streaming: false } : msg
          ));
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setMessages((m) => m.map((msg) =>
          msg.id === asstId
            ? { ...msg, content: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง", streaming: false }
            : msg
        ));
      }
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleAuthSuccess = useCallback(() => {
    setShowAuth(false);
    if (pendingMessage) { handleSend(pendingMessage); setPendingMsg(null); }
  }, [pendingMessage, handleSend]);

  const isEmpty = messages.length === 0;

  return (
    <Box sx={{
      height: "100%", display: "flex", flexDirection: "column",
      maxWidth: 720, mx: "auto", px: { xs: 1.5, sm: 2 },
    }}>
      {/* Message thread */}
      <Box sx={{ flex: 1, overflowY: "auto", py: 2,
        scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" },
      }}>
        {isEmpty ? (
          <Fade in timeout={600}>
            <Box sx={{ height: "100%", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center" }}>
              <EmptyState dark={dark} />
            </Box>
          </Fade>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} dark={dark} />
            ))}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </Box>

      {/* Suggestions — always above composer, compact scroll when chat active */}
      <Box sx={{ pb: 1 }}>
        {isEmpty ? (
          <Fade in timeout={800}>
            <Box>
              <SuggestionChips suggestions={SUGGESTIONS} onSelect={handleSend}
                disabled={loading} dark={dark} />
            </Box>
          </Fade>
        ) : (
          <SuggestionChips suggestions={SUGGESTIONS} onSelect={handleSend}
            disabled={loading} dark={dark} compact />
        )}
      </Box>

      {/* Composer */}
      <Box sx={{ pb: "max(12px, env(safe-area-inset-bottom))" }}>
        <Composer onSend={handleSend} disabled={loading} dark={dark} />
      </Box>

      {/* Auth sheet */}
      {showAuth && (
        <AuthSheet
          dark={dark}
          onSuccess={handleAuthSuccess}
          onLogin={onLogin}
          onDismiss={() => { setShowAuth(false); setPendingMsg(null); }}
        />
      )}
    </Box>
  );
}
