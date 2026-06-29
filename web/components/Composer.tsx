"use client";

import { useState, useRef, KeyboardEvent } from "react";
import Box from "@mui/material/Box";
import InputBase from "@mui/material/InputBase";
import IconButton from "@mui/material/IconButton";
import { motion } from "framer-motion";
import SendIcon from "@mui/icons-material/Send";

interface ComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  dark: boolean;
}

export default function Composer({ onSend, disabled, dark }: ComposerProps) {
  const [text, setText]   = useState("");
  const textareaRef       = useRef<HTMLTextAreaElement>(null);
  const canSend           = text.trim().length > 0 && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  };

  return (
    <Box sx={{
      borderRadius: 999,
      border: "1.5px solid",
      borderColor: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
      background: dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.85)",
      backdropFilter: "blur(16px)",
      display: "flex", alignItems: "flex-end", gap: 1,
      px: 2, py: 0.75,
      boxShadow: dark
        ? "0 4px 24px rgba(0,0,0,0.3)"
        : "0 4px 24px rgba(0,0,0,0.08)",
      transition: "border-color 0.2s, box-shadow 0.2s",
      "&:focus-within": {
        borderColor: "#e86020",
        boxShadow: "0 4px 24px rgba(232,96,32,0.15)",
      },
    }}>
      <InputBase
        inputRef={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown as never}
        onInput={handleInput}
        placeholder="ถามอะไรเกี่ยวกับ KMITL ได้เลยครับ…"
        multiline
        maxRows={5}
        disabled={disabled}
        sx={{
          flex: 1,
          fontSize: { xs: "0.875rem", sm: "0.9375rem" },
          color: dark ? "#e6e6e9" : "#1b1b1f",
          lineHeight: 1.6,
          py: 0.75,
          "& textarea::placeholder": { color: dark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.35)" },
        }}
      />

      {/* Send button */}
      <motion.div
        whileTap={{ scale: 0.88 }}
        whileHover={{ scale: canSend ? 1.08 : 1 }}
        style={{ flexShrink: 0 }}
      >
        <IconButton
          onClick={handleSend}
          disabled={!canSend}
          size="small"
          aria-label="Send"
          sx={{
            width: 38, height: 38,
            background: canSend
              ? "linear-gradient(135deg,#e86020,#ff7a45)"
              : dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            color: canSend ? "#fff" : (dark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)"),
            boxShadow: canSend ? "0 3px 12px rgba(232,96,32,0.4)" : "none",
            transition: "all 0.2s ease",
            "&:hover": { background: canSend ? "linear-gradient(135deg,#d4541a,#e86020)" : undefined },
            "&.Mui-disabled": { background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" },
          }}
        >
          <SendIcon sx={{ fontSize: 17, ml: "1px" }} />
        </IconButton>
      </motion.div>
    </Box>
  );
}
