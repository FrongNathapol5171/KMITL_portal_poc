import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/server-auth";
import { getPool } from "@/lib/db";

export async function POST(request: NextRequest) {
  const studentHash = await getSession();
  if (!studentHash) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { consent } = await request.json();
  const pool = getPool();

  await pool.query(
    "UPDATE students SET consent_analytics = $1, consent_ts = NOW() WHERE student_hash = $2",
    [consent, studentHash]
  );

  if (!consent) {
    await pool.query("DELETE FROM chat_events WHERE student_hash = $1", [studentHash]);
  }

  return NextResponse.json({ ok: true, consent });
}
