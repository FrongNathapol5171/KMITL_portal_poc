"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import { motion } from "framer-motion";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AnswerCard from "./AnswerCard";
import SourceChip from "./SourceChip";

export type Source = { doc: string; section: string; url?: string; conf: number };
export type CardData = { card_type: string; data: Record<string, unknown>[] };

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  sources?: Source[];
  card?: CardData;
}

function ThinkingDots({ dark }: { dark: boolean }) {
  return (
    <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", py: 0.5, px: 0.5 }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        >
          <Box sx={{
            width: 8, height: 8, borderRadius: "50%",
            background: "linear-gradient(135deg,#e86020,#ff9a60)",
          }} />
        </motion.div>
      ))}
    </Box>
  );
}

interface Props { message: Message; dark: boolean }

export default function MessageBubble({ message, dark }: Props) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Box sx={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-end",
        gap: 1,
        mb: 1.5,
        px: 0.5,
      }}>
        {/* Avatar */}
        {!isUser && (
          <Avatar sx={{
            width: 30, height: 30, flexShrink: 0,
            background: "linear-gradient(135deg,#e86020,#b07cf8)",
            boxShadow: "0 2px 8px rgba(232,96,32,0.3)",
          }}>
            <AutoAwesomeIcon sx={{ fontSize: 15, color: "#fff" }} />
          </Avatar>
        )}

        {/* Bubble */}
        <Box sx={{
          maxWidth: "80%",
          background: isUser
            ? "linear-gradient(135deg,#e86020,#ff7a45)"
            : dark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          border: isUser ? "none" : `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)"}`,
          borderRadius: isUser ? "20px 20px 4px 20px" : "4px 20px 20px 20px",
          px: 2, py: 1.25,
          boxShadow: isUser
            ? "0 4px 16px rgba(232,96,32,0.3)"
            : dark ? "0 2px 12px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.06)",
        }}>
          {/* Text */}
          {message.content && (
            <Typography variant="body1" sx={{
              color: isUser ? "#fff" : (dark ? "#e6e6e9" : "#1b1b1f"),
              whiteSpace: "pre-wrap", lineHeight: 1.6,
              fontSize: { xs: "0.875rem", sm: "0.9375rem" },
            }}>
              {message.content}
              {/* Streaming cursor */}
              {message.streaming && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  style={{ display: "inline-block", width: 2, height: "1em",
                    background: isUser ? "rgba(255,255,255,0.8)" : "#e86020",
                    marginLeft: 3, verticalAlign: "middle", borderRadius: 1 }}
                />
              )}
            </Typography>
          )}

          {/* Thinking dots */}
          {message.streaming && !message.content && !message.card && (
            <ThinkingDots dark={dark} />
          )}

          {/* Structured card */}
          {message.card && <AnswerCard card={message.card} dark={dark} />}

          {/* Source chips */}
          {message.sources && message.sources.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.25 }}>
              {message.sources.map((s, i) => <SourceChip key={i} source={s} dark={dark} />)}
            </Box>
          )}
        </Box>
      </Box>
    </motion.div>
  );
}
