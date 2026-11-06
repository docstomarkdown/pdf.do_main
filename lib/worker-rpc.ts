type WorkerMessage = { progress?: number; done?: boolean; error?: string };

/**
 * Runs one job in a fresh Web Worker and resolves with its final message.
 * A new worker per job keeps memory bounded (the worker is terminated when the
 * job ends) and makes cancellation a simple terminate().
 */
export function callWorker<T extends object>(
  url: string,
  message: object,
  opts: { transfer?: Transferable[]; onProgress?: (fraction: number) => void; signal?: AbortSignal } = {},
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const worker = new Worker(url);
    const cleanup = () => {
      worker.terminate();
      opts.signal?.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(new DOMException("Cancelled", "AbortError"));
    };
    if (opts.signal?.aborted) return onAbort();
    opts.signal?.addEventListener("abort", onAbort);

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const data = event.data;
      if (data.error) {
        cleanup();
        reject(new Error(data.error));
      } else if (data.progress !== undefined) {
        opts.onProgress?.(data.progress);
      } else if (data.done) {
        cleanup();
        resolve(data as unknown as T);
      }
    };
    worker.onerror = (event) => {
      cleanup();
      reject(new Error(event.message || "The PDF engine failed to start."));
    };
    worker.postMessage(message, opts.transfer ?? []);
  });
}
