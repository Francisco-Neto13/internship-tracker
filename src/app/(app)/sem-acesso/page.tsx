import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";

// RF003: para onde vai quem abre pelo endereço uma tela de outro perfil (`identidadeDaTela`).
export default function SemAcessoPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Sem acesso" description="Esta tela não faz parte do seu perfil." />
      <EstadoVazio
        variante="sem-permissao"
        titulo="Você não tem acesso a esta tela"
        descricao="Se precisar dela, fale com a coordenação do curso ou com o administrador do sistema."
        acao={
          <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
            Ir para o painel
          </Link>
        }
      />
    </div>
  );
}
