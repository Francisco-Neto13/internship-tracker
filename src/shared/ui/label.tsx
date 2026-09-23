import type { ComponentProps } from "react";
import { cn } from "./cn";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium text-navy-900", className)} {...props} />;
}
