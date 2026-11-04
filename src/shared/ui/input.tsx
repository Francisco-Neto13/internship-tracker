import type { ComponentProps } from "react";
import { cn } from "./cn";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-navy-900/20 bg-white px-3 text-sm text-navy-900 outline-none transition-colors",
        "placeholder:text-navy-900/60",
        // focus-within: Tab between day, month and year of a date moves inside the field
        "focus-within:border-azul-500 focus-within:ring-2 focus-within:ring-azul-500/25",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "aria-invalid:border-status-danger-text aria-invalid:focus:ring-status-danger-text/20",
        className,
      )}
      {...props}
    />
  );
}
