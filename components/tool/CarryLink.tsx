"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { handOverHeld } from "@/lib/handoff";

/**
 * A link to the same tool at another address. If the tool has a file open (`useHeldFile`), the file goes along in
 * memory, the way "Keep going with this file" does. Only for an ordinary click: a click that opens a new tab or
 * window leaves this page as it is, and a file handed over then would turn up in whichever tool was opened next.
 */
export function CarryLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const carry = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) handOverHeld();
  };
  return <Link href={href} className={className} onClick={carry}>{children}</Link>;
}
