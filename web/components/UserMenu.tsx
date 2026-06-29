"use client";

import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import EditIcon from "@mui/icons-material/Edit";
import PaletteIcon from "@mui/icons-material/Palette";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import CheckIcon from "@mui/icons-material/Check";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { motion } from "framer-motion";
import { logout } from "@/lib/api";

export interface UserInfo {
  studentId: string;
  name: string;
  gradientIndex: number;
}

const GRADIENTS = [
  "linear-gradient(135deg,#e86020,#ff9a60)",   // KMITL orange
  "linear-gradient(135deg,#7c3aed,#a78bfa)",   // purple
  "linear-gradient(135deg,#2563eb,#60a5fa)",   // blue
  "linear-gradient(135deg,#059669,#34d399)",   // green
  "linear-gradient(135deg,#db2777,#f472b6)",   // pink
  "linear-gradient(135deg,#dc2626,#f87171)",   // red
  "linear-gradient(135deg,#4338ca,#818cf8)",   // indigo
  "linear-gradient(135deg,#0d9488,#2dd4bf)",   // teal
];

interface UserMenuProps {
  user: UserInfo | null;
  dark: boolean;
  onToggleDark: () => void;
  onUserChange: (u: UserInfo | null) => void;
}

export default function UserMenu({ user, dark, onToggleDark, onUserChange }: UserMenuProps) {
  const [anchorEl,      setAnchorEl]      = useState<HTMLElement | null>(null);
  const [editNameOpen,  setEditNameOpen]  = useState(false);
  const [editAvtOpen,   setEditAvtOpen]   = useState(false);
  const [nameInput,     setNameInput]     = useState("");
  const [pickedGradient, setPicked]       = useState(0);

  useEffect(() => {
    if (user) {
      setNameInput(user.name);
      setPicked(user.gradientIndex);
    }
  }, [user]);

  const open = Boolean(anchorEl);
  const initial = user ? (user.name.charAt(0) || user.studentId.charAt(0) || "U").toUpperCase() : "";
  const gradient = GRADIENTS[user?.gradientIndex ?? 0];

  const handleLogout = async () => {
    setAnchorEl(null);
    try { await logout(); } catch { /* ignore */ }
    localStorage.removeItem("kmitl_user");
    onUserChange(null);
  };

  const handleSaveName = () => {
    if (!user || !nameInput.trim()) return;
    const updated: UserInfo = { ...user, name: nameInput.trim() };
    localStorage.setItem("kmitl_user", JSON.stringify(updated));
    onUserChange(updated);
    setEditNameOpen(false);
  };

  const handleSaveAvatar = () => {
    if (!user) return;
    const updated: UserInfo = { ...user, gradientIndex: pickedGradient };
    localStorage.setItem("kmitl_user", JSON.stringify(updated));
    onUserChange(updated);
    setEditAvtOpen(false);
  };

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        {/* Dark mode toggle */}
        <Tooltip title={dark ? "Light mode" : "Dark mode"}>
          <IconButton onClick={onToggleDark} size="small" sx={{
            color: dark ? "#a3a3ab" : "#5f6368",
            bgcolor: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
            "&:hover": { bgcolor: dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.09)" },
            transition: "all 0.2s",
          }}>
            {dark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        {/* User avatar button */}
        <Tooltip title={user ? user.name : "เข้าสู่ระบบ"}>
          <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small" sx={{ p: 0 }}>
              <Avatar sx={{
                width: 34, height: 34,
                background: user ? gradient : (dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"),
                fontSize: 14, fontWeight: 700,
                color: user ? "#fff" : (dark ? "#a3a3ab" : "#5f6368"),
                boxShadow: user ? "0 2px 10px rgba(0,0,0,0.2)" : "none",
                border: "2px solid",
                borderColor: user ? "rgba(255,255,255,0.25)" : (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"),
                transition: "all 0.2s",
              }}>
                {user ? initial : <PersonOutlineIcon sx={{ fontSize: 18 }} />}
              </Avatar>
            </IconButton>
          </motion.div>
        </Tooltip>
      </Box>

      {/* Dropdown menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1, minWidth: 220, borderRadius: "16px",
              background: dark ? "rgba(26,14,8,0.96)" : "rgba(255,255,255,0.97)",
              backdropFilter: "blur(20px)",
              border: "1px solid",
              borderColor: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
              overflow: "visible",
            },
          },
        }}
      >
        {/* Profile header */}
        <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{
            width: 42, height: 42, background: user ? gradient : "rgba(0,0,0,0.1)",
            fontSize: 18, fontWeight: 700, color: "#fff",
          }}>
            {user ? initial : <PersonOutlineIcon />}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700,
              color: dark ? "#e6e6e9" : "#1b1b1f", lineHeight: 1.3 }}>
              {user ? user.name : "ยังไม่ได้เข้าสู่ระบบ"}
            </Typography>
            {user && (
              <Typography variant="caption" sx={{ color: dark ? "#a3a3ab" : "#5f6368" }}>
                รหัส {user.studentId}
              </Typography>
            )}
          </Box>
        </Box>

        <Divider sx={{ borderColor: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }} />

        {user && (
          <>
            <MenuItem onClick={() => { setAnchorEl(null); setNameInput(user.name); setEditNameOpen(true); }}
              sx={{ py: 1.25, mx: 0.5, borderRadius: "10px",
                color: dark ? "#e6e6e9" : "#1b1b1f",
                "&:hover": { bgcolor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" } }}>
              <ListItemIcon sx={{ color: dark ? "#a3a3ab" : "#5f6368", minWidth: 36 }}>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="แก้ไขชื่อที่แสดง" slotProps={{ primary: { sx: { fontSize: "0.875rem" } } }} />
            </MenuItem>

            <MenuItem onClick={() => { setAnchorEl(null); setPicked(user.gradientIndex); setEditAvtOpen(true); }}
              sx={{ py: 1.25, mx: 0.5, borderRadius: "10px",
                color: dark ? "#e6e6e9" : "#1b1b1f",
                "&:hover": { bgcolor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" } }}>
              <ListItemIcon sx={{ color: dark ? "#a3a3ab" : "#5f6368", minWidth: 36 }}>
                <PaletteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="เปลี่ยนสี Avatar" slotProps={{ primary: { sx: { fontSize: "0.875rem" } } }} />
            </MenuItem>

            <Divider sx={{ my: 0.5, borderColor: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }} />

            <MenuItem onClick={handleLogout}
              sx={{ py: 1.25, mx: 0.5, mb: 0.5, borderRadius: "10px", color: "#d93025",
                "&:hover": { bgcolor: "rgba(217,48,37,0.08)" } }}>
              <ListItemIcon sx={{ color: "#d93025", minWidth: 36 }}>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="ออกจากระบบ" slotProps={{ primary: { sx: { fontSize: "0.875rem" } } }} />
            </MenuItem>
          </>
        )}

        {!user && (
          <MenuItem disabled sx={{ py: 1.25, mx: 0.5, borderRadius: "10px",
            color: dark ? "#a3a3ab" : "#5f6368", fontSize: "0.875rem" }}>
            กรุณาถามเรื่องส่วนตัวเพื่อเข้าสู่ระบบ
          </MenuItem>
        )}
      </Menu>

      {/* Edit name dialog */}
      <Dialog open={editNameOpen} onClose={() => setEditNameOpen(false)}
        slotProps={{ paper: { sx: {
          borderRadius: "20px", minWidth: 320,
          background: dark ? "#1c1c20" : "#fff",
          backgroundImage: "none",
        }}}}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1,
          color: dark ? "#e6e6e9" : "#1b1b1f" }}>
          แก้ไขชื่อที่แสดง
        </DialogTitle>
        <DialogContent sx={{ pt: "8px !important" }}>
          <TextField
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); }}
            fullWidth autoFocus
            placeholder="ชื่อที่ต้องการแสดง"
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                color: dark ? "#e6e6e9" : "#1b1b1f",
                background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                "& fieldset": { borderColor: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)" },
                "&.Mui-focused fieldset": { borderColor: "#e86020" },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setEditNameOpen(false)} sx={{ borderRadius: "10px",
            color: dark ? "#a3a3ab" : "#5f6368", textTransform: "none" }}>
            ยกเลิก
          </Button>
          <Button onClick={handleSaveName} variant="contained" sx={{
            borderRadius: "10px", textTransform: "none",
            background: "linear-gradient(135deg,#e86020,#ff7a45)",
            boxShadow: "0 3px 12px rgba(232,96,32,0.3)",
            "&:hover": { background: "linear-gradient(135deg,#d4541a,#e86020)" },
          }}>
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>

      {/* Avatar color picker dialog */}
      <Dialog open={editAvtOpen} onClose={() => setEditAvtOpen(false)}
        slotProps={{ paper: { sx: {
          borderRadius: "20px", minWidth: 300,
          background: dark ? "#1c1c20" : "#fff",
          backgroundImage: "none",
        }}}}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1,
          color: dark ? "#e6e6e9" : "#1b1b1f" }}>
          เลือกสี Avatar
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1.5 }}>
            {GRADIENTS.map((g, i) => (
              <motion.div key={i} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Box onClick={() => setPicked(i)} sx={{
                  width: 56, height: 56, borderRadius: "50%", cursor: "pointer",
                  background: g,
                  boxShadow: pickedGradient === i
                    ? "0 0 0 3px #e86020, 0 4px 12px rgba(0,0,0,0.2)"
                    : "0 2px 8px rgba(0,0,0,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "box-shadow 0.2s",
                }}>
                  {pickedGradient === i && <CheckIcon sx={{ color: "#fff", fontSize: 22 }} />}
                </Box>
              </motion.div>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setEditAvtOpen(false)} sx={{ borderRadius: "10px",
            color: dark ? "#a3a3ab" : "#5f6368", textTransform: "none" }}>
            ยกเลิก
          </Button>
          <Button onClick={handleSaveAvatar} variant="contained" sx={{
            borderRadius: "10px", textTransform: "none",
            background: "linear-gradient(135deg,#e86020,#ff7a45)",
            boxShadow: "0 3px 12px rgba(232,96,32,0.3)",
            "&:hover": { background: "linear-gradient(135deg,#d4541a,#e86020)" },
          }}>
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
