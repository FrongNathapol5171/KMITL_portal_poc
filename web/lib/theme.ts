"use client";
import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: {
      main: "#e86020",
      light: "#ff7a45",
      dark: "#b8431a",
      contrastText: "#fff",
    },
    background: {
      default: "#fff8f5",
      paper: "#ffffff",
    },
    text: {
      primary: "#1b1b1f",
      secondary: "#5f6368",
    },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: [
      '"Google Sans"', '"Roboto"', '"Inter"',
      "system-ui", "-apple-system", '"Noto Sans Thai"', "sans-serif",
    ].join(","),
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    body1: { fontSize: "0.9375rem", lineHeight: 1.6 },
    body2: { fontSize: "0.8125rem", lineHeight: 1.5 },
    caption: { fontSize: "0.75rem" },
  },
  components: {
    MuiButton: {
      styleOverrides: { root: { borderRadius: 999, textTransform: "none", fontWeight: 500 } },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 999, fontWeight: 500, fontSize: "0.8125rem" } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" } },
    },
  },
});
