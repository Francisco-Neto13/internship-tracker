import type { Identity } from "@/lib/identity";
import { hojeSaoPaulo } from "@/lib/datas";
import { getCargaHoraria, listEstagiosDivergentes } from "@/modules/acompanhamento/services/frequencia-service";
import { listRelatorios, listRelatoriosPendentes } from "@/modules/acompanhamento/services/relatorio-service";
import { listEstudantes } from "@/modules/academico/services/estudante-service";
import { listUsuarios } from "@/modules/acesso/services/usuario-service";
import { listUltimosRegistros } from "@/modules/administracao/services/auditoria-service";
import { listDocumentosEmGuarda } from "@/modules/administracao/services/guarda-service";
import { gerarRelatorio } from "@/modules/administracao/services/relatorio-gerencial-service";
import { listAtividades, listFilaAnalise } from "@/modules/atividades/services/atividade-service";
import { listConveniosAVencer } from "@/modules/concedentes/services/convenio-service";
import { listEstagios } from "@/modules/estagios/services/estagio-service";
import { getMinhaIntegralizacao } from "@/modules/integralizacao/services/integralizacao-service";
import { listNotificacoes } from "@/shared/notificacoes/notificacao-service";

// O painel compõe os serviços dos módulos sem regra própria: cada número é o que o serviço do
// domínio devolve sob a RLS da pessoa. Uma consulta que falha vira null (o indicador mostra
// "sem dado" com o motivo) em vez de derrubar o painel inteiro.

async function tentar<T>(consulta: Promise<T>): Promise<T | null> {
  try {
    return await consulta;
  } catch (erro) {
    console.error("[painel]", erro);
    return null;
  }
}

const SITUACOES = ["EM_FORMALIZACAO", "ATIVO", "CONCLUIDO", "RESCINDIDO"] as const;

async function contagemPorSituacao(identity: Identity) {
  const totais = await Promise.all(SITUACOES.map((situacao) => tentar(listEstagios(identity, { page: 1, limit: 1, situacao }).then((r) => r.total))));
  return Object.fromEntries(SITUACOES.map((situacao, indice) => [situacao, totais[indice]])) as Record<(typeof SITUACOES)[number], number | null>;
}

function umAnoAtras(hoje: string) {
  return `${Number(hoje.slice(0, 4)) - 1}${hoje.slice(4)}`;
}

export async function dadosCoordenacao(identity: Identity) {
  const hoje = hojeSaoPaulo();
  const [situacoes, fila, relatorios, divergentes, convenios, estudantes, pendencias, conclusao] = await Promise.all([
    contagemPorSituacao(identity),
    tentar(listFilaAnalise(identity)),
    tentar(listRelatoriosPendentes(identity)),
    tentar(listEstagiosDivergentes(identity)),
    tentar(listConveniosAVencer(identity, hoje, 30)),
    tentar(listEstudantes(identity, { page: 1, limit: 1, situacao: "MATRICULADO" })),
    tentar(gerarRelatorio(identity, "pendencias-integralizacao", { cursoId: null, concedenteId: null, de: null, ate: null })),
    tentar(gerarRelatorio(identity, "taxa-conclusao", { cursoId: null, concedenteId: null, de: umAnoAtras(hoje), ate: hoje })),
  ]);
  const encerrados = conclusao?.reduce<{ concluidos: number; rescindidos: number }>(
    (soma, linha) => ({ concluidos: soma.concluidos + Number(linha.concluidos ?? 0), rescindidos: soma.rescindidos + Number(linha.rescindidos ?? 0) }),
    { concluidos: 0, rescindidos: 0 },
  );
  return {
    hoje,
    situacoes,
    fila,
    relatorios,
    divergentes: divergentes?.filter((item) => item.divergencia.divergente || item.divergenciaAbertaId) ?? null,
    convenios,
    estudantesMatriculados: estudantes?.total ?? null,
    pendenciasIntegralizacao: pendencias?.length ?? null,
    encerrados: encerrados ?? null,
  };
}

export async function dadosOrientador(identity: Identity) {
  const [relatorios, divergentes, ativos] = await Promise.all([
    tentar(listRelatoriosPendentes(identity)),
    tentar(listEstagiosDivergentes(identity)),
    tentar(listEstagios(identity, { page: 1, limit: 8, situacao: "ATIVO" })),
  ]);
  return {
    paraAnalisar: relatorios?.filter((relatorio) => relatorio.situacao === "EM_ANALISE") ?? null,
    atrasados: relatorios?.filter((relatorio) => relatorio.emAtraso) ?? null,
    divergentes: divergentes?.filter((item) => item.divergencia.divergente || item.divergenciaAbertaId) ?? null,
    ativos,
  };
}

export async function dadosSupervisor(identity: Identity) {
  const ativos = await tentar(listEstagios(identity, { page: 1, limit: 12, situacao: "ATIVO" }));
  // Horas aguardando homologação de cada estagiário (RF027): uma leitura por estágio, só dos 12
  // primeiros, que é o que o painel mostra; a lista completa fica em Frequência
  const cargas = ativos
    ? await Promise.all(ativos.items.map((estagio) => tentar(getCargaHoraria(identity, estagio.id)).then((carga) => ({ estagio, carga }))))
    : null;
  return { ativos, cargas };
}

export async function dadosConcedente(identity: Identity) {
  const [situacoes, ativos] = await Promise.all([contagemPorSituacao(identity), tentar(listEstagios(identity, { page: 1, limit: 8, situacao: "ATIVO" }))]);
  return { situacoes, ativos };
}

export async function dadosEstudante(identity: Identity) {
  const [estagios, integralizacao, atividades] = await Promise.all([
    tentar(listEstagios(identity, { page: 1, limit: 10 })),
    tentar(getMinhaIntegralizacao(identity)),
    tentar(listAtividades(identity, {})),
  ]);
  const atual = estagios?.items.find((estagio) => estagio.situacao === "ATIVO") ?? estagios?.items.find((estagio) => estagio.situacao === "EM_FORMALIZACAO") ?? null;
  const [carga, relatorios] = atual?.situacao === "ATIVO"
    ? await Promise.all([tentar(getCargaHoraria(identity, atual.id)), tentar(listRelatorios(identity, atual.id))])
    : [null, null];
  return { atual, carga, relatorios, integralizacao, atividades, hoje: hojeSaoPaulo() };
}

export async function dadosAdministrador(identity: Identity) {
  const hoje = hojeSaoPaulo();
  const [ativos, inativos, trocaPendente, auditoria, guarda, convenios, estagiarios] = await Promise.all([
    tentar(listUsuarios(identity, { page: 1, limit: 1, situacao: "ATIVO" })),
    tentar(listUsuarios(identity, { page: 1, limit: 1, situacao: "INATIVO" })),
    tentar(listUsuarios(identity, { page: 1, limit: 100, situacao: "ATIVO" })),
    tentar(listUltimosRegistros(identity, 8)),
    tentar(listDocumentosEmGuarda(identity, null)),
    tentar(listConveniosAVencer(identity, hoje, 30)),
    tentar(gerarRelatorio(identity, "estagiarios-ativos", { cursoId: null, concedenteId: null, de: hoje, ate: hoje })),
  ]);
  return {
    usuariosAtivos: ativos?.total ?? null,
    usuariosInativos: inativos?.total ?? null,
    // Só a primeira página de ativos: a contagem exata de troca pendente não tem consulta própria
    trocaSenhaPendente: trocaPendente ? trocaPendente.items.filter((usuario) => usuario.trocaSenhaObrigatoria).length : null,
    trocaSenhaAmostra: trocaPendente ? trocaPendente.total > trocaPendente.items.length : false,
    auditoria,
    guarda,
    convenios,
    estagiariosHoje: estagiarios ? estagiarios.reduce((soma, linha) => soma + Number(linha.estagiarios ?? 0), 0) : null,
  };
}

export async function notificacoesRecentes(identity: Identity) {
  return tentar(listNotificacoes(identity, { apenasNaoLidas: false, limite: 6 }));
}
