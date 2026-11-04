"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Button } from "./button";
import { cn } from "./cn";
import { Input } from "./input";

/** Password field with a button to show what was typed (NIST SP 800-63B-4 3.1.1.2). */
export function CampoSenha({ className, ...props }: Omit<ComponentProps<typeof Input>, "type">) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visivel ? "text" : "password"} className={cn("pr-11", className)} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-1/2 right-1 size-9 -translate-y-1/2 text-navy-900/65 hover:text-navy-900"
        onClick={() => setVisivel((atual) => !atual)}
        aria-label={visivel ? "Ocultar caracteres digitados" : "Exibir caracteres digitados"}
      >
        {visivel ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </Button>
    </div>
  );
}
