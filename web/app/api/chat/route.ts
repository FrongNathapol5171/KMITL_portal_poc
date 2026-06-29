import { cookies } from "next/headers";
import { routeChat } from "@/lib/orchestrator";

export async function POST(request: Request) {
  const { message, locale = "th" } = await request.json();
  const store = await cookies();
  const studentHash = store.get("session")?.value ?? null;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        for await (const chunk of routeChat(message, locale, studentHash)) {
          send(chunk);
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        send({ type: "token", text: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" });
        send({ type: "done" });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        console.error("Chat stream error:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
