/** Where a document came from. Lettered badges, not the AI products' logos: permission to use those is not cleared. */
export type Source = "gpt" | "claude" | "gemini" | "word" | "pdf" | "md";

const LETTERS: Record<Source, string> = { gpt: "G", claude: "C", gemini: "Ge", word: "W", pdf: "P", md: "M" };
export const SOURCE_NAMES: Record<Source, string> = { gpt: "ChatGPT", claude: "Claude", gemini: "Gemini", word: "Word", pdf: "PDF", md: "Markdown" };

/** A small square with a letter, in the source's colour (`.src-<source>` in app/globals.css). Decorative: say the source in text beside it. */
export function SourceBadge({ source, small = false }: { source: Source; small?: boolean }) {
  return <span aria-hidden="true" className={`src-badge src-${source} ${small ? "src-badge-sm" : ""}`.trim()}>{LETTERS[source]}</span>;
}
