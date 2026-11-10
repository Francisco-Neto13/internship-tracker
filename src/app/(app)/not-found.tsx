import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";

// Um registro que não existe e um registro de outra pessoa dão a mesma tela: a RLS não revela
// qual dos dois é (RN-37).
export default function RegistroNaoEncontrado() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Registro não encontrado" description="O endereço pode estar incorreto." />
      <EstadoVazio
        variante="sem-permissao"
        titulo="Não encontrado ou fora do seu alcance"
        descricao="Este registro não existe ou não está entre os que o seu perfil acompanha."
        acao={
          <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
            Ir para o painel
          </Link>
        }
      />
    </div>
  );
}
