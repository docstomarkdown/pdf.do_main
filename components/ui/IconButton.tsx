import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "./Icon";

/** An icon-only button, 44 by 44 px. The label is required: it becomes the accessible name. */
export function IconButton({
  icon, label, tone, className = "", ...rest
}: { icon: IconName; label: string; tone?: "danger" } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label">) {
  return (
    <button type="button" aria-label={label} className={`icon-btn ${tone === "danger" ? "icon-btn-danger" : ""} ${className}`.trim()} {...rest}>
      <Icon name={icon} />
    </button>
  );
}
