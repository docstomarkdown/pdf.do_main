// Carries a file from one tool to the next without uploading it anywhere. It lives in this module's
// memory only, so it survives client-side navigation but not a page reload. Nothing is stored.
type Handoff = { file: File; from: string };
let current: Handoff | null = null;

export function setHandoff(file: File, from: string): void {
  current = { file, from };
}
/** Non-destructive read, safe to call during render (React may render twice in development). */
export function peekHandoff(): Handoff | null {
  return current;
}
export function clearHandoff(): void {
  current = null;
}

// The file a tool has open right now. A link that leads to the same tool at another address (a compress-size page)
// hands it over on the way, so the person does not have to choose it again. Memory only, like the rest of this file.
let held: Handoff | null = null;

export function holdFile(file: File | null, from: string): void {
  held = file ? { file, from } : null;
}
/** Turn the held file into a hand-over. Call it only when the navigation is about to happen in this tab. */
export function handOverHeld(): void {
  if (held) current = held;
}
