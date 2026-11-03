"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { EstadoVazio } from "@/shared/ui/estado-vazio";

// Falha inesperada de uma página (o banco caiu, a rede oscilou). A mensagem técnica fica no
// servidor; aqui só o que a pessoa pode fazer, e o código para o suporte localizar o registro.
export default function ErroDaPagina({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EstadoVazio
      variante="erro"
      titulo="Não foi possível carregar esta página"
      descricao={
        <>
          Tente de novo em instantes. Se continuar, informe ao suporte
          {error.digest ? (
            <>
              {" "}o código <span className="font-mono">{error.digest}</span>
            </>
          ) : null}
          .
        </>
      }
      acao={
        <Button type="button" variant="outline" onClick={reset}>
          <RotateCw className="size-4" aria-hidden />
          Tentar de novo
        </Button>
      }
    />
  );
}
