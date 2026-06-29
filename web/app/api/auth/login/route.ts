import { NextRequest, NextResponse } from "next/server";
import { hashStudent } from "@/lib/server-auth";
import { getPool } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { student_id } = await request.json();
  if (!student_id?.trim()) {
    return NextResponse.json({ error: "Missing student_id" }, { status: 400 });
  }

  const studentHash = hashStudent(student_id.trim());
  const { rows } = await getPool().query(
    "SELECT student_id FROM students WHERE student_hash = $1",
    [studentHash]
  );

  if (!rows.length) {
    return NextResponse.json({ error: "Student not found" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, student_hash: studentHash });
  res.cookies.set("session", studentHash, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 86400,
    path: "/",
  });
  return res;
}
