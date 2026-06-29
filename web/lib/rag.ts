import { getPool } from "./db";
import { embedText, getChatModel } from "./gemini";

const SYSTEM_INSTRUCTION =
  "You are AskKMITL, a helpful academic assistant for KMITL " +
  "(King Mongkut's Institute of Technology Ladkrabang) students. " +
  "Answer ONLY based on the provided context. " +
  "Answer in the same language the student used (Thai or English). " +
  "If the context does not contain enough information, say so clearly " +
  "and suggest the student contact the relevant office. " +
  "Never fabricate regulations or deadlines. " +
  "Always mention the source document/section at the end of your answer. " +
  "Do not perform or approve any transactions; inform and route only.";

async function retrieveChunks(query: string, k = 5) {
  const embedding = await embedText(query, "RETRIEVAL_QUERY");
  const vecStr = `[${embedding.join(",")}]`;
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT chunk_id, doc, section, source_url, content,
            1 - (embedding <=> $1::vector) AS similarity
     FROM   doc_chunks
     ORDER  BY embedding <=> $1::vector
     LIMIT  $2`,
    [vecStr, k]
  );
  return rows as Array<{
    chunk_id: number;
    doc: string;
    section: string;
    source_url: string;
    content: string;
    similarity: string;
  }>;
}

export async function* answerStream(message: string, locale: string): AsyncGenerator<Record<string, unknown>> {
  const chunks = await retrieveChunks(message);

  if (!chunks.length) {
    yield {
      type: "token",
      text: locale === "th"
        ? "ขออภัย ไม่พบข้อมูลที่เกี่ยวข้องในเอกสารของ KMITL กรุณาติดต่อสำนักทะเบียนโดยตรงครับ"
        : "Sorry, I couldn't find relevant information. Please contact the Registrar's office directly.",
    };
    yield { type: "done", escalated: true, escalated_to: "registrar" };
    return;
  }

  const avgConf = chunks.reduce((s, c) => s + Number(c.similarity), 0) / chunks.length;

  if (avgConf < 0.55) {
    yield {
      type: "token",
      text: locale === "th"
        ? "ไม่แน่ใจในคำตอบที่ถูกต้อง กรุณาตรวจสอบกับสำนักทะเบียน"
        : "I'm not confident in the answer. Please verify with the Registrar.",
    };
    yield { type: "done", escalated: true, escalated_to: "registrar" };
    return;
  }

  const contextText = chunks
    .map((c) => `[${c.doc} / ${c.section}]\n${c.content}`)
    .join("\n\n---\n\n");
  const prompt = `Context:\n${contextText}\n\nQuestion: ${message}`;

  const model = getChatModel(0.2, 1024, SYSTEM_INSTRUCTION);
  const result = await model.generateContentStream(prompt);
  for await (const part of result.stream) {
    const text = part.text();
    if (text) yield { type: "token", text };
  }

  for (const c of chunks.slice(0, 3)) {
    yield {
      type: "source",
      doc: c.doc,
      section: c.section,
      url: c.source_url,
      conf: Number(Number(c.similarity).toFixed(3)),
    };
  }

  yield { type: "done", escalated: false, conf: Number(avgConf.toFixed(3)) };
}
