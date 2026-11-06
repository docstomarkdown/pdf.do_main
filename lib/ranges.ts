/** Parses "2, 5-7" into [2,5,6,7]. Returns an error message for input the user can fix. */
export function parseRanges(input: string, max: number): { pages: number[]; error?: string } {
  const text = input.trim().replace(/\s*[-–]\s*/g, "-");
  if (!text) return { pages: [] };
  const set = new Set<number>();
  for (const part of text.split(/[,;\s]+/).filter(Boolean)) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!m) return { pages: [], error: `"${part}" isn't a page or a range. Try 2, 5-7.` };
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (a < 1 || b < 1 || a > max || b > max) return { pages: [], error: `Pages go from 1 to ${max}.` };
    if (b < a) return { pages: [], error: `"${part}" runs backwards. Try ${b}-${a}.` };
    for (let i = a; i <= b; i++) set.add(i);
  }
  return { pages: [...set].sort((x, y) => x - y) };
}

/** [2,5,6,7] becomes "2, 5-7". */
export function formatRanges(pages: Iterable<number>): string {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    out.push(j > i ? `${sorted[i]}-${sorted[j]}` : `${sorted[i]}`);
    i = j + 1;
  }
  return out.join(", ");
}

/**
 * Parses "1-3, 4-6, 9" into separate groups, [[1,2,3],[4,5,6],[9]]: each comma-separated part is its own group, in the
 * order typed (Split PDF makes one file per group). Returns an error message for input the user can fix.
 */
export function parseGroups(input: string, max: number): { groups: number[][]; error?: string } {
  const text = input.trim().replace(/\s*[-–]\s*/g, "-");
  if (!text) return { groups: [] };
  const groups: number[][] = [];
  for (const part of text.split(/[,;]+/).map((p) => p.trim()).filter(Boolean)) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!m) return { groups: [], error: `"${part}" isn't a page or a range. Try 1-3, 4-6.` };
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (a < 1 || b < 1 || a > max || b > max) return { groups: [], error: `Pages go from 1 to ${max}.` };
    if (b < a) return { groups: [], error: `"${part}" runs backwards. Try ${b}-${a}.` };
    groups.push(Array.from({ length: b - a + 1 }, (_, i) => a + i));
  }
  return { groups };
}
