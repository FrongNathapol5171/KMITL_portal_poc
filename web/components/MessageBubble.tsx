"use client";

import AnswerCard from "./AnswerCard";
import SourceChip from "./SourceChip";

export type Source = { doc: string; section: string; url?: string; conf: number };
export type CardData = { card_type: string; data: Record<string, unknown>[] };

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  sources?: Source[];
  card?: CardData;
}

function ThinkingShimmer() {
  return (
    <div className="flex gap-1.5 py-1 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full animate-bounce"
          style={{
            background: "var(--color-primary)",
            animationDelay: `${i * 0.15}s`,
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  );
}

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-1`}>
      <div
        className="max-w-[85%] md:max-w-[70%] rounded-[var(--radius-lg)] px-4 py-3 text-sm leading-relaxed"
        style={{
          background: isUser ? "var(--surface-2)" : "transparent",
          color: "var(--text)",
          border: isUser ? "none" : undefined,
          paddingLeft: isUser ? undefined : "0",
        }}
      >
        {/* Text content */}
        {message.content && (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}

        {/* Thinking shimmer */}
        {message.streaming && !message.content && !message.card && (
          <ThinkingShimmer />
        )}

        {/* Structured card */}
        {message.card && <AnswerCard card={message.card} />}

        {/* Source chips */}
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.sources.map((s, i) => (
              <SourceChip key={i} source={s} />
            ))}
          </div>
        )}

        {/* Streaming cursor */}
        {message.streaming && message.content && (
          <span
            className="inline-block w-0.5 h-4 ml-0.5 align-middle animate-pulse"
            style={{ background: "var(--color-primary)" }}
          />
        )}
      </div>
    </div>
  );
}
