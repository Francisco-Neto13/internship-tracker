"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

const QUERY_MOVIMENTO_REDUZIDO = "(prefers-reduced-motion: reduce)";

function subscribeMovimentoReduzido(callback: () => void) {
  const mql = window.matchMedia(QUERY_MOVIMENTO_REDUZIDO);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getMovimentoReduzidoSnapshot() {
  return window.matchMedia(QUERY_MOVIMENTO_REDUZIDO).matches;
}

function getMovimentoReduzidoServerSnapshot() {
  return false;
}

/**
 * Conta de 0 ate `valor` uma unica vez, ao entrar na viewport. Respeita
 * prefers-reduced-motion (risco vestibular/enxaqueca) renderizando o valor final direto,
 * sem passar pelo estado de animacao.
 */
export function ContadorAnimado({ valor, duracaoMs = 900 }: { valor: number; duracaoMs?: number }) {
  const prefereReduzido = useSyncExternalStore(
    subscribeMovimentoReduzido,
    getMovimentoReduzidoSnapshot,
    getMovimentoReduzidoServerSnapshot,
  );
  const ref = useRef<HTMLSpanElement>(null);
  const [exibido, setExibido] = useState(0);
  const jaAnimouRef = useRef(false);

  useEffect(() => {
    if (prefereReduzido) return;
    const elemento = ref.current;
    if (!elemento) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || jaAnimouRef.current) return;
        jaAnimouRef.current = true;
        observer.disconnect();

        const inicio = performance.now();
        function passo(agora: number) {
          const t = Math.min((agora - inicio) / duracaoMs, 1);
          setExibido(Math.round(easeOutCubic(t) * valor));
          if (t < 1) requestAnimationFrame(passo);
        }
        requestAnimationFrame(passo);
      },
      { threshold: 0.3 },
    );
    observer.observe(elemento);
    return () => observer.disconnect();
  }, [prefereReduzido, valor, duracaoMs]);

  return <span ref={ref}>{prefereReduzido ? valor : exibido}</span>;
}
