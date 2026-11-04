"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

const DURACAO_MS = 500; // --duracao-progresso

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
 * Conta de 0 até `valor` uma única vez, ao entrar na tela. O número certo vem do servidor e fica no
 * leitor de tela o tempo todo: sem JavaScript, ou com prefers-reduced-motion, nunca aparece um zero
 * falso. Depois da primeira contagem, um valor novo só troca, sem contar de novo.
 */
export function ContadorAnimado({ valor }: { valor: number }) {
  const prefereReduzido = useSyncExternalStore(subscribeMovimentoReduzido, getMovimentoReduzidoSnapshot, getMovimentoReduzidoServerSnapshot);
  const ref = useRef<HTMLSpanElement>(null);
  const [exibido, setExibido] = useState(valor);
  const contou = useRef(false);

  // Antes de pintar, para o número final não piscar antes de a contagem começar
  useLayoutEffect(() => {
    if (prefereReduzido || contou.current || valor === 0) return;
    setExibido(0);
  }, [prefereReduzido, valor]);

  useEffect(() => {
    if (prefereReduzido) return;
    if (contou.current) {
      setExibido(valor);
      return;
    }
    const elemento = ref.current;
    if (!elemento) return;
    let quadro = 0;
    const observador = new IntersectionObserver(
      (entradas) => {
        if (!entradas[0]?.isIntersecting || contou.current) return;
        contou.current = true;
        observador.disconnect();
        const inicio = performance.now();
        const passo = (agora: number) => {
          const t = Math.min((agora - inicio) / DURACAO_MS, 1);
          setExibido(Math.round(easeOutCubic(t) * valor));
          if (t < 1) quadro = requestAnimationFrame(passo);
        };
        quadro = requestAnimationFrame(passo);
      },
      { threshold: 0.3 },
    );
    observador.observe(elemento);
    return () => {
      observador.disconnect();
      cancelAnimationFrame(quadro);
      // Interrupted: leaves the right number instead of one in the middle of the count
      if (contou.current) setExibido(valor);
    };
  }, [prefereReduzido, valor]);

  const texto = (prefereReduzido ? valor : exibido).toLocaleString("pt-BR");
  return (
    <span ref={ref}>
      <span aria-hidden>{texto}</span>
      <span className="sr-only">{valor.toLocaleString("pt-BR")}</span>
    </span>
  );
}
