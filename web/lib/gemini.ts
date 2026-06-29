import { GoogleGenerativeAI } from "@google/generative-ai";

const LLM_MODEL = process.env.LLM_MODEL ?? "gemini-2.0-flash";
const EMBED_MODEL = process.env.EMBEDDING_MODEL ?? "text-embedding-004";

function client() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
}

export function getChatModel(temperature = 0.2, maxOutputTokens = 1024, systemInstruction?: string) {
  return client().getGenerativeModel({
    model: LLM_MODEL,
    ...(systemInstruction ? { systemInstruction } : {}),
    generationConfig: { temperature, maxOutputTokens },
  });
}

export function getIntentModel() {
  return client().getGenerativeModel({
    model: LLM_MODEL,
    generationConfig: { temperature: 0, maxOutputTokens: 64 },
  });
}

export async function embedText(text: string, taskType: "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT" = "RETRIEVAL_QUERY"): Promise<number[]> {
  const model = client().getGenerativeModel({ model: EMBED_MODEL });
  const result = await model.embedContent({
    content: { role: "user", parts: [{ text }] },
    taskType: taskType as never,
  });
  return result.embedding.values;
}
