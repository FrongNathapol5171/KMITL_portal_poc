import { getIntentModel } from "./gemini";
import { getPool } from "./db";
import { answerStream } from "./rag";
import { answerPersonal } from "./text2sql";
import { randomUUID } from "crypto";

const INTENT_PROMPT = `You are the intent classifier for AskKMITL, a university student portal.
Classify the student's message into exactly one intent label:

- knowledge        : questions about rules, regulations, curriculum, scholarships, thesis, calendar, courses (no personal data needed)
- personal_data    : questions about *this* student's grades, GPA, credits, enrolments, requests
- skill            : requests for degree audit, GPA simulation, course recommendation, retake optimiser
- smalltalk        : greetings, thanks, chitchat
- other            : anything outside university scope

Reply with a JSON object only — no markdown, no extra text:
{"intent": "<label>", "topic": "<short topic tag>"}

Student message:
`;

async function classifyIntent(message: string): Promise<{ intent: string; topic: string }> {
  const model = getIntentModel();
  const result = await model.generateContent(INTENT_PROMPT + message);
  let text = result.response.text().trim();
  if (text.startsWith("```")) {
    text = text.split("```")[1].replace(/^json/, "").trim();
  }
  try {
    return JSON.parse(text);
  } catch {
    return { intent: "other", topic: "other" };
  }
}

async function logEvent(params: {
  studentHash: string | null;
  locale: string;
  rawQuery: string | null;
  intent: string;
  topic: string;
  tierUsed: string;
  resolved: boolean;
  escalatedTo: string | null;
  latencyMs: number;
  retrievalConf: number | null;
}) {
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO chat_events
         (event_id, student_hash, ts, locale, raw_query,
          intent, topic, tier_used, resolved, escalated_to, latency_ms, retrieval_conf)
       VALUES ($1,$2,NOW(),$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        randomUUID(),
        params.studentHash,
        params.locale,
        params.rawQuery,
        params.intent,
        params.topic,
        params.tierUsed,
        params.resolved,
        params.escalatedTo,
        params.latencyMs,
        params.retrievalConf,
      ]
    );
  } catch { /* non-critical */ }
}

export async function* routeChat(
  message: string,
  locale: string,
  studentHash: string | null
): AsyncGenerator<Record<string, unknown>> {
  const t0 = Date.now();
  const { intent, topic } = await classifyIntent(message);

  if ((intent === "personal_data" || intent === "skill") && !studentHash) {
    yield { type: "auth_required", intent };
    return;
  }

  let tier = "A";
  let resolved = true;
  let escalatedTo: string | null = null;
  let retrievalConf: number | null = null;

  if (intent === "knowledge") {
    for await (const chunk of answerStream(message, locale)) {
      if (chunk.type === "source") retrievalConf = chunk.conf as number;
      if (chunk.escalated) { escalatedTo = chunk.escalated_to as string; resolved = false; }
      yield chunk;
    }
    tier = "A";
  } else if (intent === "personal_data" || intent === "skill") {
    for await (const chunk of answerPersonal(message, locale, studentHash!)) {
      yield chunk;
    }
    tier = intent === "personal_data" ? "B" : "C";
  } else {
    yield { type: "token", text: "สวัสดีครับ! มีอะไรให้ช่วยเรื่องการศึกษาไหมครับ?" };
    yield { type: "done" };
  }

  // Check consent before logging raw query
  let rawQuery: string | null = null;
  if (studentHash) {
    try {
      const pool = getPool();
      const { rows } = await pool.query(
        "SELECT consent_analytics FROM students WHERE student_hash = $1",
        [studentHash]
      );
      if (rows[0]?.consent_analytics) rawQuery = message;
    } catch { /* ignore */ }
  }

  await logEvent({
    studentHash,
    locale,
    rawQuery,
    intent,
    topic,
    tierUsed: tier,
    resolved,
    escalatedTo,
    latencyMs: Date.now() - t0,
    retrievalConf,
  });
}
