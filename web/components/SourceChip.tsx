"use client";

import Chip from "@mui/material/Chip";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import { Source } from "./MessageBubble";

export default function SourceChip({ source, dark }: { source: Source; dark: boolean }) {
  const label = `${source.doc}${source.section ? ` · ${source.section}` : ""}`;

  return (
    <Chip
      icon={<ArticleOutlinedIcon sx={{ fontSize: "13px !important" }} />}
      label={label}
      size="small"
      component={source.url ? "a" : "div"}
      href={source.url}
      target={source.url ? "_blank" : undefined}
      clickable={!!source.url}
      sx={{
        height: 24, fontSize: "0.7rem", fontWeight: 500,
        borderRadius: "8px",
        background: dark ? "rgba(232,96,32,0.15)" : "rgba(232,96,32,0.08)",
        border: "1px solid",
        borderColor: dark ? "rgba(232,96,32,0.3)" : "rgba(232,96,32,0.2)",
        color: dark ? "#ff9a60" : "#b8431a",
        "& .MuiChip-icon": { color: "inherit" },
        "&:hover": source.url ? {
          background: "rgba(232,96,32,0.18)",
          borderColor: "#e86020",
        } : {},
      }}
    />
  );
}
