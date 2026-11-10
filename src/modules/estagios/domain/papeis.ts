// Who acts on each step of an internship. Permission is profile plus link (AGENTS.md), so the
// roles are read per internship from the same app.* functions the policies and triggers use.
// Each action cites the rule in drizzle/sql that decides it. The screen uses this only to show
// each person their own part; the API and the database still decide every write.

export type PapeisNoEstagio = {
  /** app.e_estudante_do_estagio */
  estudante: boolean;
  /** app.e_responsavel_vigente(estagio, 'ORIENTADOR') */
  orientador: boolean;
  /** app.e_responsavel_vigente(estagio, 'SUPERVISOR') */
  supervisor: boolean;
  /** app.coordena_curso_do_estagio */
  coordenacao: boolean;
  /** app.representa_concedente_do_estagio */
  concedente: boolean;
};

export const NENHUM_PAPEL: PapeisNoEstagio = { estudante: false, orientador: false, supervisor: false, coordenacao: false, concedente: false };

export type ParteAssinatura = "ESTUDANTE" | "INSTITUICAO" | "CONCEDENTE";

export function acoesNoEstagio(papeis: PapeisNoEstagio) {
  const { estudante, orientador, supervisor, coordenacao, concedente } = papeis;
  // app.pode_assinar (RF019): each party signs for itself
  const assina: Record<ParteAssinatura, boolean> = { ESTUDANTE: estudante, INSTITUICAO: coordenacao, CONCEDENTE: concedente };
  return {
    // estagio_atualizacao_*: the student edits the open TCE but cannot close, reopen or activate it (RF015, D9)
    fecharTce: coordenacao,
    reabrirTce: coordenacao,
    ativar: coordenacao,
    partesQueAssina: (Object.keys(assina) as ParteAssinatura[]).filter((parte) => assina[parte]),
    // responsavel_insercao (RF031)
    vincularResponsavel: coordenacao,
    // apolice_insercao (RF018)
    registrarApolice: coordenacao || concedente,
    // plano_insercao, plano_atualizacao (RF016); DECISAO_PLANO_RESTRITA (RF017)
    elaborarPlano: estudante || orientador || coordenacao,
    decidirPlano: orientador,
    // aditivo_insercao (RF020)
    proporAditivo: coordenacao,
    // LANCAMENTO_RESTRITO_AO_ESTUDANTE (RF023), AJUSTE_RESTRITO (RF029), HOMOLOGACAO_RESTRITA_AO_SUPERVISOR (RF027)
    lancarFrequencia: estudante,
    cancelarFrequencia: estudante || coordenacao,
    homologarFrequencia: supervisor,
    // ENVIO_RESTRITO_AO_ESTUDANTE (RF037), ANALISE_RESTRITA_AO_ORIENTADOR (RF038)
    enviarRelatorio: estudante,
    decidirRelatorio: orientador,
    // ACOMPANHAMENTO_RESTRITO_AO_ORIENTADOR (RF033)
    registrarAcompanhamento: orientador,
    // AFASTAMENTO_RESTRITO (RF059), estagio_atualizacao_coordenacao (RF045), RESCISAO_RESTRITA (RF063)
    registrarAfastamento: coordenacao,
    concluir: coordenacao,
    rescindir: coordenacao,
    // DECLARACAO_RESTRITA (RF058)
    emitirDeclaracao: estudante || coordenacao,
  };
}

export type AcoesNoEstagio = ReturnType<typeof acoesNoEstagio>;
