"use client";
import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import ChatScreen from "@/components/ChatScreen";

export default function Home() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(saved ? saved === "dark" : preferred);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <Box
      sx={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: dark
          ? "linear-gradient(135deg,#1a0a05 0%,#1f1320 50%,#0d0f1a 100%)"
          : "linear-gradient(135deg,#fff0eb 0%,#f5eeff 40%,#eef0ff 70%,#fff0eb 100%)",
        transition: "background 0.4s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative gradient orbs */}
      <Box sx={{
        position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden",
        "& .orb": {
          position: "absolute", borderRadius: "50%",
          filter: "blur(80px)", opacity: dark ? 0.15 : 0.3,
        },
      }}>
        <Box className="orb" sx={{ width: 400, height: 400, top: "-10%", left: "-10%",
          background: "radial-gradient(circle,#e86020,transparent)" }} />
        <Box className="orb" sx={{ width: 350, height: 350, top: "20%", right: "5%",
          background: "radial-gradient(circle,#b07cf8,transparent)" }} />
        <Box className="orb" sx={{ width: 300, height: 300, bottom: "5%", left: "30%",
          background: "radial-gradient(circle,#f472b6,transparent)" }} />
      </Box>

      {/* Header */}
      <Box
        sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          px: 2.5, py: 1.5, position: "relative", zIndex: 10,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{
            width: 34, height: 34, borderRadius: "50%",
            background: "linear-gradient(135deg,#e86020,#ff9a60)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 700, fontSize: 15,
            boxShadow: "0 2px 8px rgba(232,96,32,0.4)",
          }}>K</Box>
          <Box sx={{ fontWeight: 700, fontSize: 16,
            color: dark ? "#e6e6e9" : "#1b1b1f" }}>
            KMITL One Portal
          </Box>
        </Box>
        <Tooltip title={dark ? "Light mode" : "Dark mode"}>
          <IconButton onClick={toggle} size="small"
            sx={{ color: dark ? "#a3a3ab" : "#5f6368",
              bgcolor: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
              "&:hover": { bgcolor: dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.09)" },
              transition: "all 0.2s" }}>
            {dark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Chat */}
      <Box sx={{ flex: 1, overflow: "hidden", position: "relative", zIndex: 5 }}>
        <ChatScreen dark={dark} />
      </Box>
    </Box>
  );
}
