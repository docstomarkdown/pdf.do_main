import Link from "next/link";
import type { AnchorHTMLAttributes } from "react";

/** A link inside running text. For a link that looks like a button, use ButtonLink. */
export function TextLink({ href, className = "", ...rest }: { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return <Link href={href} className={`link ${className}`.trim()} {...rest} />;
}
