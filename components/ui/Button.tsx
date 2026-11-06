import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const variants: Record<Variant, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-indigo-600",
  secondary: "bg-white text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:outline-indigo-600",
  ghost: "text-slate-700 hover:bg-slate-100 focus-visible:outline-indigo-600",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600",
  success: "bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:outline-emerald-700",
};
const sizes: Record<Size, string> = { md: "px-5 py-2.5 text-base", lg: "px-6 py-3.5 text-lg" };

export function buttonClasses(variant: Variant = "primary", size: Size = "md", extra = ""): string {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`.trim();
}

type Common = { variant?: Variant; size?: Size; icon?: IconName; children: ReactNode; className?: string };

export function Button({ variant, size, icon, children, className, ...rest }: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={buttonClasses(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} />}
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
