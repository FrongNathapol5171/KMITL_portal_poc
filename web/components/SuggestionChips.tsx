"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ButtonBase from "@mui/material/ButtonBase";
import { motion } from "framer-motion";

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
  disabled?: boolean;
  dark: boolean;
  compact?: boolean;
}

export default function SuggestionChips({ suggestions, onSelect, disabled, dark, compact }: SuggestionChipsProps) {
  return (
    <Box>
      {!compact && (
        <Typography variant="caption" sx={{
          display: "block", mb: 1.25, textAlign: "center",
          color: dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)",
          letterSpacing: 0.5, fontWeight: 500,
        }}>
          Suggestions on what to ask
        </Typography>
      )}

      <Box sx={compact ? {
        display: "flex", gap: 1, overflowX: "auto", px: 1,
        scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" },
        pb: 0.5,
      } : {
        display: "flex", flexWrap: "wrap", gap: 1,
        justifyContent: "center", px: 1,
      }}>
        {suggestions.map((s, i) => (
          <motion.div
            key={s}
            initial={{ opacity: 0, y: compact ? 0 : 10, x: compact ? 8 : 0 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.25 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            style={compact ? { flexShrink: 0 } : undefined}
          >
            <ButtonBase
              onClick={() => !disabled && onSelect(s)}
              disabled={disabled}
              sx={{
                borderRadius: compact ? "20px" : "12px",
                border: "1.5px solid",
                borderColor: dark ? "rgba(255,255,255,0.1)" : "rgba(232,96,32,0.25)",
                background: dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.75)",
                backdropFilter: "blur(8px)",
                color: dark ? "#e6e6e9" : "#1b1b1f",
                px: compact ? 1.75 : 2,
                py: compact ? 0.6 : 1,
                fontSize: compact ? "0.775rem" : "0.8125rem",
                fontWeight: 500,
                textAlign: "left",
                lineHeight: 1.4,
                whiteSpace: compact ? "nowrap" : "normal",
                transition: "all 0.2s",
                "&:hover": {
                  borderColor: "#e86020",
                  background: dark ? "rgba(232,96,32,0.12)" : "rgba(232,96,32,0.06)",
                  color: dark ? "#ff9a60" : "#e86020",
                  boxShadow: "0 4px 16px rgba(232,96,32,0.15)",
                },
                "&.Mui-disabled": { opacity: 0.4 },
              }}
            >
              {s}
            </ButtonBase>
          </motion.div>
        ))}
      </Box>
    </Box>
  );
}
