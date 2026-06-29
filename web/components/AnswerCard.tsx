"use client";

import { CardData } from "./MessageBubble";

function GradeTable({ data }: { data: Record<string, unknown>[] }) {
  if (!data.length) return <p className="text-sm" style={{ color: "var(--text-muted)" }}>ไม่มีข้อมูล</p>;
  const keys = Object.keys(data[0]);
  return (
    <div className="overflow-x-auto rounded-[var(--radius-md)] border mt-2"
         style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ background: "var(--surface)" }}>
            {keys.map((k) => (
              <th key={k} className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wide"
                  style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                {k.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < data.length - 1 ? "1px solid var(--border)" : "none" }}>
              {keys.map((k) => (
                <td key={k} className="px-3 py-2" style={{ color: "var(--text)" }}>
                  {String(row[k] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProgressCard({ data }: { data: Record<string, unknown>[] }) {
  const d: Record<string, unknown> = data[0] ?? {};
  return (
    <div className="mt-2 rounded-[var(--radius-lg)] border p-4 space-y-3"
         style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
        {String(d.program_name ?? "")}
      </div>
      <div className="flex gap-4 text-sm">
        <div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>GPAX</div>
          <div className="text-lg font-semibold" style={{ color: "var(--color-primary)" }}>
            {String(d.gpax ?? "—")}
          </div>
        </div>
        <div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>หน่วยกิตที่ได้</div>
          <div className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            {String(d.credits_earned ?? "—")}
          </div>
        </div>
        <div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>คงเหลือ</div>
          <div className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            {String(d.credits_remaining ?? "—")}
          </div>
        </div>
      </div>
      {/* Progress bar */}
      {!!d.total_credits_required && d.credits_earned !== undefined && (
        <div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                background: "var(--color-primary)",
                width: `${Math.min(100, (Number(d.credits_earned) / Number(d.total_credits_required)) * 100)}%`,
              }}
            />
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {Number(d.credits_earned)}/{Number(d.total_credits_required)} หน่วยกิต
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnswerCard({ card }: { card: CardData }) {
  switch (card.card_type) {
    case "grades":
      return <GradeTable data={card.data} />;
    case "progress":
      return <ProgressCard data={card.data} />;
    default:
      return <GradeTable data={card.data} />;
  }
}
