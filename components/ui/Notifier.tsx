"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { Spinner } from "./Spinner";

/**
 * Toasts, for small things beside the main flow: a quick confirmation, a download that runs while you keep
 * choosing options, an error you must see. Three kinds:
 *   status    clears itself after five seconds
 *   progress  stays until finished; update it, then call done() or fail(); has an optional Cancel
 *   error     stays until dismissed; may carry one action
 * Never the only place something appears: the result panel or an inline Alert says it too.
 *
 * Sonner (MIT) does the queueing, the three-at-a-time limit and the positioning. It is loaded on the first
 * notification, so a page that never toasts never downloads it. The markup and every colour are ours (app/globals.css).
 */

type Sonner = typeof import("sonner");

let sonner: Promise<Sonner> | null = null;
const loadSonner = () => (sonner ??= import("sonner"));

// The host asks for Sonner on the first notification and tells us when its Toaster is on the page.
let wanted = false;
const listeners = new Set<() => void>();
let hostMounted: () => void = () => {};
const hostReady = new Promise<void>((resolve) => { hostMounted = resolve; });
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

async function ready(): Promise<Sonner["toast"]> {
  if (!wanted) { wanted = true; listeners.forEach((l) => l()); }
  const [mod] = await Promise.all([loadSonner(), hostReady]);
  return mod.toast;
}

/** Mount once, in the root layout. Renders nothing until the first notification. */
export function NotifierHost() {
  const needed = useSyncExternalStore(subscribe, () => wanted, () => false);
  const [Toaster, setToaster] = useState<Sonner["Toaster"] | null>(null);

  useEffect(() => {
    if (!needed) return;
    let alive = true;
    void loadSonner().then((m) => { if (alive) setToaster(() => m.Toaster); });
    return () => { alive = false; };
  }, [needed]);
  useEffect(() => { if (Toaster) hostMounted(); }, [Toaster]);

  if (!Toaster) return null;
  return (
    <Toaster
      position="bottom-right"
      visibleToasts={3}
      gap={8}
      duration={5000}
      containerAriaLabel="Notifications"
      // On a phone the toasts sit above the sticky action bar: that bar sets --toast-bottom-offset to its height.
      mobileOffset={{ bottom: "calc(var(--toast-bottom-offset, 1rem) + env(safe-area-inset-bottom))", left: 12, right: 12 }}
      toastOptions={{ unstyled: true }}
    />
  );
}

type ToastId = string | number;
type Texts = { title: string; text?: string };

function StatusToast({ title, text, onClose }: Texts & { onClose: () => void }) {
  return (
    <div className="toast" role="status">
      <Icon name="check" className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="toast-body">
        <p className="toast-title">{title}</p>
        {text && <p>{text}</p>}
      </div>
      <IconButton icon="close" label="Dismiss notification" className="toast-close" onClick={onClose} />
    </div>
  );
}

function ErrorToast({ title, text, action, onClose }: Texts & { action?: { label: string; onClick?: () => void }; onClose: () => void }) {
  return (
    <div className="toast toast-error" role="alert">
      <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="toast-body">
        <p className="toast-title">{title}</p>
        {text && <p>{text}</p>}
        {action && (
          <div className="toast-actions">
            <Button variant="secondary" size="sm" onClick={() => { action.onClick?.(); onClose(); }}>{action.label}</Button>
          </div>
        )}
      </div>
      <IconButton icon="close" label="Dismiss notification" className="toast-close" onClick={onClose} />
    </div>
  );
}

function ProgressToast({ title, text, value, onCancel }: Texts & { value?: number; onCancel?: () => void }) {
  return (
    <div className="toast" role="status">
      <Spinner size={22} value={value} className="toast-spinner" />
      <div className="toast-body">
        <p className="toast-title">{title}</p>
        {text && <p>{text}</p>}
        {value !== undefined && (
          <div className="bar mt-2" aria-hidden="true">
            <div className="bar-fill" style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }} />
          </div>
        )}
        {onCancel && (
          <div className="toast-actions">
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          </div>
        )}
      </div>
    </div>
  );
}

let serial = 0;

export type ProgressHandle = {
  /** Change the text or the fraction (0 to 1). Leave `value` out for a spinner with no fraction. */
  update: (next: { title?: string; text?: string; value?: number }) => void;
  /** Turn it into a short confirmation. */
  done: (title: string, text?: string) => void;
  /** Turn it into an error that stays until dismissed. */
  fail: (title: string, text?: string) => void;
  dismiss: () => void;
};

export const notify = {
  /** A quick confirmation. Clears itself after five seconds. */
  status(title: string, opts: { text?: string; duration?: number } = {}): void {
    void ready().then((toast) => {
      const id: ToastId = toast.custom((tid) => <StatusToast title={title} text={opts.text} onClose={() => toast.dismiss(tid)} />, { duration: opts.duration ?? 5000 });
      return id;
    });
  },

  /** Something went wrong, or needs a decision. Stays until dismissed. */
  error(title: string, opts: { text?: string; action?: { label: string; onClick?: () => void } } = {}): void {
    void ready().then((toast) => {
      toast.custom((tid) => <ErrorToast title={title} text={opts.text} action={opts.action} onClose={() => toast.dismiss(tid)} />, { duration: Infinity });
    });
  },

  /** Work running beside the main flow. Keep the handle and update it; finish with done() or fail(). */
  progress(initial: { title: string; text?: string; value?: number; onCancel?: () => void }): ProgressHandle {
    const id = `progress-${++serial}`;
    let state = { ...initial };
    const show = () => ready().then((toast) => {
      toast.custom(() => (
        <ProgressToast title={state.title} text={state.text} value={state.value} onCancel={state.onCancel && (() => { toast.dismiss(id); state.onCancel?.(); })} />
      ), { id, duration: Infinity });
    });
    void show();
    return {
      update(next) { state = { ...state, ...next }; void show(); },
      done(title, text) {
        void ready().then((toast) => { toast.custom((tid) => <StatusToast title={title} text={text} onClose={() => toast.dismiss(tid)} />, { id, duration: 5000 }); });
      },
      fail(title, text) {
        void ready().then((toast) => { toast.custom((tid) => <ErrorToast title={title} text={text} onClose={() => toast.dismiss(tid)} />, { id, duration: Infinity }); });
      },
      dismiss() { void ready().then((toast) => { toast.dismiss(id); }); },
    };
  },

  dismissAll(): void {
    void ready().then((toast) => { toast.dismiss(); });
  },
};
