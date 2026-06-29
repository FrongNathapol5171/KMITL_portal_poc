const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export type SseChunk =
  | { type: "token"; text: string }
  | { type: "card"; card_type: string; data: Record<string, unknown>[] }
  | { type: "source"; doc: string; section: string; url?: string; conf: number }
  | { type: "auth_required"; intent: string }
  | { type: "done"; escalated?: boolean; escalated_to?: string; conf?: number };

export async function* streamChat(
  message: string,
  locale: string = "th",
  signal?: AbortSignal
): AsyncGenerator<SseChunk> {
  const resp = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message, locale }),
    signal,
  });

  if (!resp.ok) throw new Error(`API error ${resp.status}`);

  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") return;
      try {
        yield JSON.parse(raw) as SseChunk;
      } catch { /* skip malformed */ }
    }
  }
}

export async function login(studentId: string, password: string) {
  const resp = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ student_id: studentId, password }),
  });
  if (!resp.ok) throw new Error("Login failed");
  return resp.json();
}

export async function logout() {
  await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
}
