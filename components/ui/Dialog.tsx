"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * A modal dialog on the browser's own <dialog> element: it traps focus, closes on Escape, and returns focus to
 * whatever opened it. On a phone it is a sheet from the bottom edge (see .dialog in app/globals.css).
 * `onClose` runs when it is dismissed any way: Escape, a click on the backdrop, or the parent setting `open` false.
 */
export function Dialog({
  open, onClose, title, description, children, actions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const textId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      aria-describedby={description ? textId : undefined}
      onClose={onClose}
      // The padding lives on the inner box, so a click that lands on the dialog itself is a click on the backdrop.
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="dialog-inner">
        <h2 id={titleId} className="dialog-title">{title}</h2>
        {description && <p id={textId} className="dialog-text">{description}</p>}
        {children && <div className="mt-4">{children}</div>}
        {actions && <div className="dialog-actions">{actions}</div>}
      </div>
    </dialog>
  );
}
