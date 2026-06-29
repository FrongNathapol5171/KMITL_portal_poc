import { NextResponse } from "next/server";
import { getSession } from "@/lib/server-auth";
import { getPool } from "@/lib/db";

export async function GET() {
  const studentHash = await getSession();
  if (!studentHash) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const pool = getPool();

  const { rows: candidates } = await pool.query(
    `SELECT c.code, c.title_en, e.grade, e.grade_point, c.credits
     FROM   enrolments e
     JOIN   students s  USING (student_id)
     JOIN   courses  c  ON e.course_id = c.course_id
     WHERE  s.student_hash = $1
       AND  e.grade_point < 3.0
       AND  e.status = 'completed'
     ORDER  BY e.grade_point ASC`,
    [studentHash]
  );

  const { rows: prog } = await pool.query(
    "SELECT credits_earned, gpax FROM v_my_progress WHERE student_hash = $1",
    [studentHash]
  );

  if (!prog.length) return NextResponse.json([]);

  const currentCredits = Number(prog[0].credits_earned ?? 0);

  const results = candidates
    .map((c) => ({
      code: c.code,
      title: c.title_en,
      current_grade: c.grade,
      credits: Number(c.credits),
      gpax_gain_if_A: Number(
        (((4.0 - Number(c.grade_point)) * Number(c.credits)) / Math.max(1, currentCredits)).toFixed(4)
      ),
    }))
    .sort((a, b) => b.gpax_gain_if_A - a.gpax_gain_if_A);

  return NextResponse.json(results);
}
