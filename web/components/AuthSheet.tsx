"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Backdrop from "@mui/material/Backdrop";
import CloseIcon from "@mui/icons-material/Close";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { motion, AnimatePresence } from "framer-motion";
import { login } from "@/lib/api";

interface AuthSheetProps {
  onSuccess: () => void;
  onDismiss: () => void;
  onLogin?: (studentId: string) => void;
  dark: boolean;
}

export default function AuthSheet({ onSuccess, onDismiss, onLogin, dark }: AuthSheetProps) {
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) return;
    setLoading(true); setError("");
    try {
      await login(studentId.trim(), studentId.trim());
      onLogin?.(studentId.trim());
      onSuccess();
    } catch {
      setError("ไม่พบรหัสนักศึกษา กรุณาตรวจสอบอีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <Backdrop open onClick={onDismiss} sx={{ zIndex: 40, backdropFilter: "blur(4px)" }} />

      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 50,
          borderRadius: "24px 24px 0 0",
        }}
      >
        <Box sx={{
          background: dark ? "rgba(26,10,5,0.95)" : "rgba(255,255,255,0.97)",
          backdropFilter: "blur(20px)",
          borderRadius: "24px 24px 0 0",
          border: "1px solid",
          borderColor: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)",
          px: 3, pt: 2.5, pb: "max(24px, env(safe-area-inset-bottom))",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <Box sx={{
                width: 36, height: 36, borderRadius: "50%",
                background: "linear-gradient(135deg,#e86020,#ff7a45)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <LockOutlinedIcon sx={{ fontSize: 18, color: "#fff" }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1rem",
                color: dark ? "#e6e6e9" : "#1b1b1f" }}>
                เข้าสู่ระบบ
              </Typography>
            </Box>
            <IconButton onClick={onDismiss} size="small"
              sx={{ color: dark ? "#a3a3ab" : "#5f6368",
                bgcolor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Typography variant="body2" sx={{ color: dark ? "#a3a3ab" : "#5f6368", mb: 2.5 }}>
            คำถามนี้ต้องการข้อมูลส่วนตัว — กรุณาเข้าสู่ระบบก่อนครับ
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <TextField
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="รหัสนักศึกษา เช่น 6300001"
              autoFocus
              size="small"
              fullWidth
              error={!!error}
              helperText={error}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                  color: dark ? "#e6e6e9" : "#1b1b1f",
                  "& fieldset": { borderColor: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)" },
                  "&:hover fieldset": { borderColor: "#e86020" },
                  "&.Mui-focused fieldset": { borderColor: "#e86020" },
                },
                "& input::placeholder": { color: dark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.35)" },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading || !studentId.trim()}
              sx={{
                borderRadius: "12px", py: 1.25, fontWeight: 600,
                background: "linear-gradient(135deg,#e86020,#ff7a45)",
                boxShadow: "0 4px 16px rgba(232,96,32,0.35)",
                "&:hover": { background: "linear-gradient(135deg,#d4541a,#e86020)" },
                "&.Mui-disabled": { background: "rgba(0,0,0,0.1)", color: "rgba(0,0,0,0.3)" },
              }}
            >
              {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
            </Button>
          </Box>
        </Box>
      </motion.div>
    </AnimatePresence>
  );
}
