import { getPool } from "./db";
import { getChatModel } from "./gemini";

const ALLOWED_VIEWS = new Set(["v_my_grades", "v_my_progress"]);

const TEMPLATE_QUERIES: Record<string, string> = {
  grades: `SELECT course_code, course_title, term, grade, grade_point
           FROM   v_my_grades
           WHERE  student_hash = $1
           ORDER  BY term DESC, course_code`,
  progress: `SELECT program_name, total_credits_required,
                    credits_earned, credits_remaining, gpax, status
             FROM   v_my_progress
             WHERE  student_hash = $1`,
  gpax: `SELECT gpax FROM v_my_progress WHERE student_hash = $1`,
};

const ROUTING_KEYWORDS: Record<string, string[]> = {
  grades:   ["เกรด", "grade", "gpa", "คะแนน"],
  progress: ["เหลือ", "credit", "หน่วยกิต", "จบ", "remain", "graduate", "progress"],
  gpax:     ["gpax", "เกรดเฉลี่ย", "cumulative"],
};

function detectTemplate(message: string): string | null {
  const lower = message.toLowerCase();
  for (const [key, kws] of Object.entries(ROUTING_KEYWORDS)) {
    if (kws.some((kw) => lower.includes(kw))) return key;
  }
  return null;
}

async function geminiSql(message: string): Promise<string | null> {
  const schemaHint = `
Available views (read-only, student_hash-scoped):
  v_my_grades(student_hash, course_code, course_title, term, grade, grade_point)
  v_my_progress(student_hash, program_name, total_credits_required,
                credits_earned, credits_remaining, gpax, status)
Always include WHERE student_hash = $1
  `;
  const model = getChatModel(0, 256);
  const result = await model.generateContent(
    `Generate a single SQL SELECT query to answer: ${message}\nSchema:\n${schemaHint}\nReturn ONLY the SQL statement, no markdown, no explanation.`
  );
  let sql = result.response.text().trim().replace(/^```sql/, "").replace(/```$/, "").trim();

  const upper = sql.toUpperCase();
  if (/INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE/.test(upper)) return null;
  if (!upper.includes("$1") && !upper.includes("STUDENT_HASH")) return null;
  const tables = [...upper.matchAll(/FROM\s+(\w+)|JOIN\s+(\w+)/g)].flatMap((m) => [m[1], m[2]].filter(Boolean));
  if (!tables.every((t) => ALLOWED_VIEWS.has(t.toLowerCase()))) return null;
  return sql;
}

export async function* answerPersonal(
  message: string,
  locale: string,
  studentHash: string
): AsyncGenerator<Record<string, unknown>> {
  const pool = getPool();
  const templateKey = detectTemplate(message);

  if (templateKey && TEMPLATE_QUERIES[templateKey]) {
    const { rows } = await pool.query(TEMPLATE_QUERIES[templateKey], [studentHash]);
    if (!rows.length) {
      yield {
        type: "token",
        text: locale === "th" ? "ไม่พบข้อมูลสำหรับบัญชีของคุณครับ" : "No data found for your account.",
      };
      yield { type: "done" };
      return;
    }
    yield { type: "card", card_type: templateKey, data: rows };
    yield { type: "done" };
    return;
  }

  const sql = await geminiSql(message);
  if (!sql) {
    yield {
      type: "token",
      text: locale === "th"
        ? "ขอโทษครับ ไม่สามารถตอบคำถามนี้ได้ กรุณาติดต่อสำนักทะเบียน"
        : "Sorry, I can't answer this. Please contact the Registrar.",
    };
    yield { type: "done" };
    return;
  }

  try {
    const { rows } = await pool.query(sql, [studentHash]);
    yield { type: "card", card_type: "generic", data: rows };
    yield { type: "done" };
  } catch {
    yield { type: "token", text: "เกิดข้อผิดพลาดในการค้นหาข้อมูลครับ" };
    yield { type: "done" };
  }
}
