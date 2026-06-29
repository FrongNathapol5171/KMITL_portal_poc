import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/server-auth";
import { getPool } from "@/lib/db";

export async function POST(request: NextRequest) {
  const studentHash = await getSession();
  if (!studentHash) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { hypothetical_grades = [] } = await request.json();
  const { rows } = await getPool().query(
    "SELECT credits_earned, gpax FROM v_my_progress WHERE student_hash = $1",
    [studentHash]
  );

  if (!rows.length) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const currentCredits = Number(rows[0].credits_earned ?? 0);
  const currentGpax = Number(rows[0].gpax ?? 0);

  const hypoPoints = hypothetical_grades.reduce(
    (s: number, g: { grade_point: number; credits: number }) => s + g.grade_point * g.credits,
    0
  );
  const hypoCredits = hypothetical_grades.reduce(
    (s: number, g: { credits: number }) => s + g.credits,
    0
  );

  const newGpax =
    (currentGpax * currentCredits + hypoPoints) / Math.max(1, currentCredits + hypoCredits);

  return NextResponse.json({
    current_gpax: Number(currentGpax.toFixed(3)),
    projected_gpax: Number(newGpax.toFixed(3)),
    credits_after: currentCredits + hypoCredits,
  });
}
