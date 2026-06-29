"use client";
import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import ChatScreen from "@/components/ChatScreen";
import UserMenu, { UserInfo } from "@/components/UserMenu";

export default function Home() {
  const [dark, setDark] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(saved ? saved === "dark" : preferred);

    const savedUser = localStorage.getItem("kmitl_user");
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch { /* ignore */ }
    }
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const handleLogin = (studentId: string) => {
    const existing = localStorage.getItem("kmitl_user");
    if (existing) {
      try {
        const parsed = JSON.parse(existing) as UserInfo;
        if (parsed.studentId === studentId) { setUser(parsed); return; }
      } catch { /* ignore */ }
    }
    const newUser: UserInfo = { studentId, name: studentId, gradientIndex: 0 };
    localStorage.setItem("kmitl_user", JSON.stringify(newUser));
    setUser(newUser);
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

        <UserMenu
          user={user}
          dark={dark}
          onToggleDark={toggle}
          onUserChange={setUser}
        />
      </Box>

      {/* Chat */}
      <Box sx={{ flex: 1, overflow: "hidden", position: "relative", zIndex: 5 }}>
        <ChatScreen dark={dark} onLogin={handleLogin} />
      </Box>
    </Box>
  );
}
