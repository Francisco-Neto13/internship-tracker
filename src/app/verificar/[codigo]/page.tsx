import type { Metadata } from "next";
import { verificarDeclaracao } from "@/db/rotinas";
import { formatarDataHora } from "@/lib/datas";
import { TIPO_DECLARACAO } from "@/lib/rotulos";
import { codigoVerificacaoParamSchema } from "@/modules/integralizacao/schemas/declaracao";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { ListaDefinicao } from "@/shared/ui/painel";
import { StatusBadge } from "@/shared/ui/status-badge";

export const metadata: Metadata = { title: "Verificar declaração" };

// RF058: quem recebe a declaração confere a autenticidade sem login. Mostra só o que o próprio
// documento já diz e o SHA-256 do arquivo.
export default async function VerificarDeclaracaoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const parsed = codigoVerificacaoParamSchema.safeParse(await params);
  const declaracao = parsed.success ? await verificarDeclaracao(parsed.data.codigo) : null;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="surface-card flex w-full max-w-xl min-w-0 flex-col gap-4 p-6">
        <h1 className="text-xl font-semibold text-navy-900">Verificar declaração</h1>
        {declaracao ? (
          <div className="flex flex-col gap-4" data-testid="declaracao-verificada">
            <StatusBadge tone="ok">Declaração autêntica</StatusBadge>
            <ListaDefinicao
              colunas={1}
              itens={[
                { rotulo: "Tipo", valor: TIPO_DECLARACAO[declaracao.tipo] },
                { rotulo: "Estudante", valor: declaracao.estudante },
                { rotulo: "Curso", valor: declaracao.curso },
                { rotulo: "Emitida em", valor: formatarDataHora(declaracao.emitida_em) },
                { rotulo: "SHA-256 do arquivo", valor: <span className="font-mono text-xs break-all">{declaracao.sha256}</span> },
              ]}
            />
          </div>
        ) : (
          <EstadoVazio compacto variante="sem-resultados" titulo="Nenhuma declaração com este código" descricao="Confira se o código foi digitado como aparece no documento." />
        )}
      </div>
    </main>
  );
}
