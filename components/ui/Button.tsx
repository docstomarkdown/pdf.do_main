import Link from "next/link";
import type { AnchorHTMLAttributes, ComponentPropsWithRef, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { Spinner } from "./Spinner";

// One primary per state. "ghost" is the quiet role (Start over, Cancel, Clear); "success" is only the download.
// The colours of every variant live in app/globals.css (.btn-primary and so on), never here.
export type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const sizes: Record<Size, string> = { sm: "btn-sm", md: "", lg: "btn-lg" };

export function buttonClasses(variant: Variant = "primary", size: Size = "md", extra = ""): string {
  return ["btn", `btn-${variant}`, sizes[size], extra].filter(Boolean).join(" ");
}

type Common = { variant?: Variant; size?: Size; icon?: IconName; children: ReactNode; className?: string };

/**
 * `loading` swaps the icon for a spinner and marks the button busy. It uses aria-disabled and ignores clicks,
 * not `disabled`, so keyboard focus is not thrown away while a job runs. Change the label to the progressive
 * verb yourself ("Compressing…").
 */
export function Button({
  variant, size, icon, loading, children, className, onClick, ...rest
}: Common & { loading?: boolean } & ComponentPropsWithRef<"button">) {
  return (
    <button
      type="button"
      className={buttonClasses(variant, size, className)}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={loading ? undefined : onClick}
      {...rest}
    >
      {loading ? <Spinner size={20} /> : icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

/** A link that looks like a button. Use `download` for files made in the browser. */
export function ButtonLink({
  variant, size, icon, children, className, href, ...rest
}: Common & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className" | "children">) {
  const classes = buttonClasses(variant, size, className);
  const content = (<>{icon && <Icon name={icon} />}{children}</>);
  // Blob URLs and downloads need a plain anchor; internal navigation uses next/link.
  if (rest.download !== undefined || href.startsWith("blob:") || /^https?:/.test(href)) {
    return <a href={href} className={classes} {...rest}>{content}</a>;
  }
  return <Link href={href} className={classes} {...rest}>{content}</Link>;
}
