"use client";

import { useState, type ComponentProps } from "react";
import { cn } from "./cn";

const PERTO_DO_LIMITE = 0.9;

/** Long text with the limit in view (issue #97): the counter says when pasted text was cut. */
export function AreaTexto({ className, maxLength, onChange, value, defaultValue, ...props }: Omit<ComponentProps<"textarea">, "maxLength"> & { maxLength: number }) {
  const [digitado, setDigitado] = useState(String(defaultValue ?? "").length);
  const usados = value !== undefined ? String(value).length : digitado;
  return (
    <div className="flex flex-col gap-1">
      <textarea
        {...props}
        value={value}
        defaultValue={defaultValue}
        maxLength={maxLength}
        onChange={(evento) => {
          setDigitado(evento.target.value.length);
          onChange?.(evento);
        }}
        className={cn(
          "w-full rounded-md border border-navy-900/20 bg-white p-3 text-sm text-navy-900 transition-colors focus-visible:border-azul-500 focus-visible:ring-2 focus-visible:ring-azul-500/25 focus-visible:outline-none",
          className,
        )}
      />
      <p className={cn("text-right text-xs tabular-nums", usados >= maxLength * PERTO_DO_LIMITE ? "text-status-pending-text" : "text-navy-900/65")}>
        {usados.toLocaleString("pt-BR")} de {maxLength.toLocaleString("pt-BR")} caracteres
      </p>
    </div>
  );
}
