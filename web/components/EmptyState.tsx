"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { motion } from "framer-motion";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

interface EmptyStateProps { dark: boolean }

export default function EmptyState({ dark }: EmptyStateProps) {
  return (
    <Box sx={{ textAlign: "center", userSelect: "none", py: 4 }}>
      {/* Animated sparkle icon */}
      <motion.div
        animate={{ scale: [1, 1.12, 1], rotate: [0, 10, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{ display: "inline-block", marginBottom: 20 }}
      >
        <Box sx={{
          width: 64, height: 64, borderRadius: "50%",
          background: "linear-gradient(135deg,#e86020 0%,#ff9a60 50%,#b07cf8 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 32px rgba(232,96,32,0.35)",
          mx: "auto",
        }}>
          <AutoAwesomeIcon sx={{ color: "#fff", fontSize: 32 }} />
        </Box>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Typography variant="h5" sx={{
          fontWeight: 700, mb: 1,
          color: dark ? "#e6e6e9" : "#1b1b1f",
          fontSize: { xs: "1.3rem", sm: "1.5rem" },
        }}>
          KMITL One Portal
        </Typography>
        <Typography variant="body2" sx={{ color: dark ? "#a3a3ab" : "#5f6368", maxWidth: 320, mx: "auto" }}>
          ถามเรื่องหลักสูตร เกรด วิทยานิพนธ์ หรือข้อมูลนักศึกษาได้เลยครับ
        </Typography>
      </motion.div>
    </Box>
  );
}
