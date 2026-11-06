import type { SVGProps } from "react";

const paths = {
  merge: <><path d="M4 7h8M4 12h8M4 17h8" /><path d="M14 12h6m0 0-3-3m3 3-3 3" /></>,
  compress: <path d="M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  extract: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" /><path d="M14 3l5 5v3" /><path d="M13 16h8m0 0-3-3m3 3-3 3" /></>,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>,
  shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  upload: <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />,
  download: <path d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  "arrow-right": <path d="M5 12h14m0 0-5-5m5 5-5 5" />,
  "arrow-up": <path d="M12 19V5m0 0-5 5m5-5 5 5" />,
  "arrow-down": <path d="M12 5v14m0 0-5-5m5 5 5-5" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  search: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4-4" /></>,
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  alert: <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17.5v.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.01" /></>,
  home: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, className = "h-5 w-5", ...rest }: { name: IconName; className?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
