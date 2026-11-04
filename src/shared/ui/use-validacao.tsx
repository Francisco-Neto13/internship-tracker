"use client";

import { useRef, useState, type FocusEvent, type FormEvent } from "react";
import type { z } from "zod";
import { errosPorCampo } from "@/lib/validacao";

type Elemento = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/**
 * Tells what is wrong while the form is filled in (issue #97). A field shows its problem when the
 * person leaves it, and the message goes away as soon as it is fixed; nobody is told off for what
 * they have not reached yet. Saving checks everything and goes to the first problem.
 *
 * A problem with no field on screen does not block: the person could not fix it, so the server answers.
 */
export function useValidacao(schema: z.ZodType, montar: (formulario: HTMLFormElement) => unknown) {
  const [erros, setErros] = useState<Record<string, string>>({});
  const tocados = useRef(new Set<string>());

  function mostrar(formulario: HTMLFormElement) {
    const todos = errosPorCampo(schema, montar(formulario));
    setErros(Object.fromEntries(Object.entries(todos).filter(([campo]) => tocados.current.has(campo))));
  }

  const aoInteragir = {
    onBlur(evento: FocusEvent<HTMLFormElement>) {
      const nome = (evento.target as unknown as Elemento).name;
      if (!nome) return;
      tocados.current.add(nome);
      mostrar(evento.currentTarget);
    },
    onChange(evento: FormEvent<HTMLFormElement>) {
      if (tocados.current.has((evento.target as unknown as Elemento).name)) mostrar(evento.currentTarget);
    },
  };

  /** True when the form can be sent. */
  function conferir(formulario: HTMLFormElement): boolean {
    const todos = errosPorCampo(schema, montar(formulario));
    const campos = Array.from(formulario.elements).filter((elemento): elemento is Elemento => "name" in elemento && Boolean((elemento as Elemento).name));
    const comProblema = campos.filter((campo) => todos[campo.name]);
    for (const campo of campos) tocados.current.add(campo.name);
    setErros(Object.fromEntries(comProblema.map((campo) => [campo.name, todos[campo.name]])));
    comProblema[0]?.focus();
    return comProblema.length === 0;
  }

  return { erros, aoInteragir, conferir };
}

/** The message under a field. Its id goes in the aria-describedby of the field. */
export function ErroCampo({ id, mensagem }: { id: string; mensagem?: string }) {
  return (
    <p id={id} aria-live="polite" className={mensagem ? "animate-aviso text-sm text-status-danger-text" : "hidden"}>
      {mensagem}
    </p>
  );
}
