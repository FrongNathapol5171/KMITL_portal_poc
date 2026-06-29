"use client";

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
  disabled?: boolean;
}

export default function SuggestionChips({ suggestions, onSelect, disabled }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {suggestions.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          disabled={disabled}
          className="text-sm px-4 py-2 rounded-[var(--radius-pill)] border transition-all duration-150 disabled:opacity-50"
          style={{
            background: "var(--color-primary-tint)",
            borderColor: "var(--color-primary)",
            color: "var(--color-primary-text)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--color-primary)";
            (e.currentTarget as HTMLElement).style.color = "white";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--color-primary-tint)";
            (e.currentTarget as HTMLElement).style.color = "var(--color-primary-text)";
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
