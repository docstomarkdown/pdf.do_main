"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Field } from "./Field";
import { IconButton } from "./IconButton";

/** A password input with a show and hide button. The password stays in the page; this never sends it anywhere. */
export function PasswordField({
  label, hint, error, className, ...rest
}: { label: string; hint?: string; error?: string; className?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id" | "type">) {
  const [shown, setShown] = useState(false);
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(c) => (
        <span className="relative block">
          <input className="ctl pr-12" autoComplete="off" {...c} {...rest} type={shown ? "text" : "password"} />
          <IconButton icon={shown ? "eye-off" : "eye"} label={shown ? "Hide password" : "Show password"} onClick={() => setShown(!shown)} className="absolute right-0 top-0" />
        </span>
      )}
    </Field>
  );
}
