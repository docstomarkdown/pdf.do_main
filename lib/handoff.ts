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
