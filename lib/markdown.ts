export type TextLine = { text: string; size: number; y: number };

const BULLET = /^[•◦▪▫●○■□\-–—*·]\s+/;

/**
 * Turns lines of text (with their size and position, page by page) into Markdown, by guessing: text clearly bigger than the
 * usual size becomes a heading (the biggest sizes first, up to three levels), lines that start with a bullet become list items,
 * and lines that sit close together run on as one paragraph. Tables, columns, bold and links are not recognised.
 */
export function toMarkdown(pages: TextLine[][]): string {
  // The usual size is the one that carries the most characters.
  const weight = new Map<number, number>();
  for (const line of pages.flat()) {
    const key = Math.round(line.size * 2) / 2;
    weight.set(key, (weight.get(key) ?? 0) + line.text.length);
  }
  const body = [...weight.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 12;
  const bigger = [...new Set([...weight.keys()].filter((s) => s >= body * 1.15))].sort((a, b) => b - a).slice(0, 3);

  const out: string[] = [];
  for (const lines of pages) {
    let paragraph: string[] = [];
    let previous: TextLine | null = null;
    const flush = () => { if (paragraph.length) out.push(paragraph.join(" ")); paragraph = []; };
    for (const line of lines) {
      const level = bigger.indexOf(Math.round(line.size * 2) / 2);
      const gap = previous ? previous.y - line.y : 0;
      const apart = previous ? gap > Math.max(previous.size, line.size) * 1.9 : false;
      if (level >= 0) { flush(); out.push(`${"#".repeat(level + 1)} ${line.text}`); previous = null; continue; }
      if (BULLET.test(line.text)) { flush(); out.push(`- ${line.text.replace(BULLET, "")}`); previous = line; continue; }
      if (apart) flush();
      paragraph.push(line.text);
      previous = line;
    }
    flush();
  }
  // Consecutive list items sit together; everything else is a block of its own.
  return out.reduce((text, block, i) => text + (i === 0 ? "" : block.startsWith("- ") && out[i - 1].startsWith("- ") ? "\n" : "\n\n") + block, "");
}
