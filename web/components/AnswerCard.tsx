"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import { CardData } from "./MessageBubble";

function GradeTable({ data, dark }: { data: Record<string, unknown>[]; dark: boolean }) {
  if (!data.length) return (
    <Typography variant="body2" sx={{ color: dark ? "#a3a3ab" : "#5f6368", mt: 1 }}>ไม่มีข้อมูล</Typography>
  );
  const keys = Object.keys(data[0]);
  return (
    <Box sx={{ mt: 1.5, overflowX: "auto", borderRadius: 2,
      border: "1px solid", borderColor: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)" }}>
      <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", minWidth: 280 }}>
        <Box component="thead">
          <Box component="tr" sx={{ background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)" }}>
            {keys.map((k) => (
              <Box component="th" key={k} sx={{
                textAlign: "left", px: 1.5, py: 1,
                fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase",
                letterSpacing: 0.6, color: dark ? "#a3a3ab" : "#5f6368",
                borderBottom: "1px solid", borderColor: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              }}>
                {k.replace(/_/g, " ")}
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="tbody">
          {data.map((row, i) => (
            <Box component="tr" key={i} sx={{
              "&:not(:last-child) td": { borderBottom: "1px solid", borderColor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" },
              "&:hover": { background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.01)" },
            }}>
              {keys.map((k) => (
                <Box component="td" key={k} sx={{
                  px: 1.5, py: 1, fontSize: "0.8125rem",
                  color: k === "grade"
                    ? (String(row[k]) === "A" ? "#1e8e3e" : String(row[k]) === "F" ? "#d93025" : dark ? "#e6e6e9" : "#1b1b1f")
                    : (dark ? "#e6e6e9" : "#1b1b1f"),
                  fontWeight: k === "grade" ? 700 : 400,
                }}>
                  {String(row[k] ?? "—")}
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function ProgressCard({ data, dark }: { data: Record<string, unknown>[]; dark: boolean }) {
  const d: Record<string, unknown> = data[0] ?? {};
  const earned = Number(d.credits_earned ?? 0);
  const total  = Number(d.total_credits_required ?? 1);
  const pct    = Math.min(100, (earned / total) * 100);

  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5,
        color: dark ? "#e6e6e9" : "#1b1b1f" }}>
        {String(d.program_name ?? "")}
      </Typography>

      <Box sx={{ display: "flex", gap: 2.5, mb: 2 }}>
        {[
          { label: "GPAX", value: d.gpax, accent: true },
          { label: "หน่วยกิตที่ได้", value: d.credits_earned },
          { label: "คงเหลือ", value: d.credits_remaining },
        ].map(({ label, value, accent }) => (
          <Box key={label}>
            <Typography variant="caption" sx={{ color: dark ? "#a3a3ab" : "#5f6368", display: "block" }}>
              {label}
            </Typography>
            <Typography variant="h6" sx={{
              fontWeight: 700, lineHeight: 1.2,
              color: accent ? "#e86020" : (dark ? "#e6e6e9" : "#1b1b1f"),
              fontSize: "1.15rem",
            }}>
              {String(value ?? "—")}
            </Typography>
          </Box>
        ))}
      </Box>

      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 8, borderRadius: 999,
          background: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)",
          "& .MuiLinearProgress-bar": {
            borderRadius: 999,
            background: "linear-gradient(90deg,#e86020,#ff9a60)",
          },
        }}
      />
      <Typography variant="caption" sx={{ mt: 0.5, display: "block",
        color: dark ? "#a3a3ab" : "#5f6368" }}>
        {earned} / {total} หน่วยกิต ({Math.round(pct)}%)
      </Typography>
    </Box>
  );
}

export default function AnswerCard({ card, dark }: { card: CardData; dark: boolean }) {
  switch (card.card_type) {
    case "progress": return <ProgressCard data={card.data} dark={dark} />;
    default:         return <GradeTable  data={card.data} dark={dark} />;
  }
}
