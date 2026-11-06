import type { AnchorHTMLAttributes } from "react";
import { Icon, type IconName } from "./Icon";

/** An icon-only link, 44 by 44 px, for a download made in the browser. The label is required: it becomes the accessible name. */
export function IconLink({
  icon, label, href, className = "", ...rest
}: { icon: IconName; label: string; href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "aria-label" | "href">) {
  return (
    <a href={href} aria-label={label} className={`icon-btn ${className}`.trim()} {...rest}>
      <Icon name={icon} />
    </a>
  );
}
