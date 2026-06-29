import { NextResponse } from "next/server";
import { getSession } from "@/lib/server-auth";
import { getPool } from "@/lib/db";

export async function GET() {
  const studentHash = await getSession();
  if (!studentHash) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const pool = getPool();

  const progRow = await pool.query(
    `SELECT p.program_id, p.name, p.total_credits_required
     FROM   students s JOIN programs p USING (program_id)
     WHERE  s.student_hash = $1`,
    [studentHash]
  );
  if (!progRow.rows.length) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }
  const prog = progRow.rows[0];

  const curriculumRows = await pool.query(
    `SELECT c.course_id, c.code, c.title_en, cu.category,
            cu.required_flag, c.credits
     FROM   curriculum cu JOIN courses c USING (course_id)
     WHERE  cu.program_id = $1`,
    [prog.program_id]
  );

  const completedRows = await pool.query(
    `SELECT e.course_id
     FROM   enrolments e JOIN students s USING (student_id)
     WHERE  s.student_hash = $1
       AND  e.status = 'completed'
       AND  e.grade NOT IN ('F','W')`,
    [studentHash]
  );
  const completedIds = new Set(completedRows.rows.map((r) => r.course_id));

  const met: Record<string, unknown[]> = {};
  const unmet: Record<string, unknown[]> = {};

  for (const course of curriculumRows.rows) {
    const target = completedIds.has(course.course_id) ? met : unmet;
    if (!target[course.category]) target[course.category] = [];
    target[course.category].push({
      code: course.code,
      title: course.title_en,
      credits: course.credits,
      required: course.required_flag,
    });
  }

  const creditsEarned = (Object.values(met).flat() as { credits: number }[])
    .reduce((s, c) => s + c.credits, 0);

  return NextResponse.json({
    program: prog.name,
    total_required: prog.total_credits_required,
    credits_earned: creditsEarned,
    credits_remaining: prog.total_credits_required - creditsEarned,
    met,
    unmet,
  });
}
