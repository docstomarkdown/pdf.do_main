"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** What a job's work function is given: a signal to stop on, and ways to report what it is doing. */
export type JobContext = {
  signal: AbortSignal;
  /** Words for what is happening now ("Optimising structure and images…"). */
  setStatus: (status: string) => void;
  /** A fraction from 0 to 1, when the job knows one. Leave it unset for a spinner. */
  setProgress: (fraction: number) => void;
};

/** A result with a single `file` also carries the object URL of that file; a result of several files has no URL here. */
export type JobResult<R> = R extends { file: File } ? R & { url: string } : R;

type State<R> = {
  busy: boolean;
  status: string;
  progress: number | undefined;
  error: string | null;
  result: JobResult<R> | null;
};

const hasFile = (value: object): value is { file: File } => (value as { file?: unknown }).file instanceof File;

const idle = { busy: false, status: "", progress: undefined, error: null, result: null };

/**
 * The life of one run of a tool: idle, running, then a result or an error. It owns what every tool used to repeat:
 * the busy flag, the status words, the progress fraction, the error message, cancelling, and the object URL of the
 * output file (made when the job finishes, revoked when it is cleared, replaced or the tool unmounts).
 * The work function returns `{ file, ...anything else the result panel needs }` for a tool that makes one file, or any
 * object for a tool that makes several (then there is no URL here: `MultiResult` and `ImageGallery` make their own).
 */
export function useToolJob<R extends object>() {
  const [state, setState] = useState<State<R>>(idle);
  const abort = useRef<AbortController | null>(null);
  const url = useRef<string | null>(null);

  const revoke = useCallback(() => {
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
  }, []);
  useEffect(() => revoke, [revoke]);

  /** Clear the result and any error, for example when the person changes an option. */
  const reset = useCallback(() => {
    revoke();
    setState(idle);
  }, [revoke]);

  const run = useCallback(async (work: (ctx: JobContext) => Promise<R>, failureMessage = "Something went wrong.") => {
    revoke();
    const controller = new AbortController();
    abort.current = controller;
    setState({ ...idle, busy: true });
    try {
      const out = await work({
        signal: controller.signal,
        setStatus: (status) => setState((s) => ({ ...s, status })),
        setProgress: (progress) => setState((s) => ({ ...s, progress })),
      });
      let result = out as JobResult<R>;
      if (hasFile(out)) {
        url.current = URL.createObjectURL(out.file);
        result = { ...out, url: url.current } as JobResult<R>;
      }
      setState({ ...idle, result });
    } catch (e) {
      // Cancelling is not an error: the person asked for it.
      const cancelled = e instanceof DOMException && e.name === "AbortError";
      setState({ ...idle, error: cancelled ? null : e instanceof Error ? e.message : failureMessage });
    } finally {
      abort.current = null;
    }
  }, [revoke]);

  const cancel = useCallback(() => abort.current?.abort(), []);

  return { ...state, run, cancel, reset };
}
