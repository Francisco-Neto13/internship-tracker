import { ativarEstagio, createEstagio, fecharTce, type DadosTceEntrada } from "@/modules/estagios/services/estagio-service";
import {
  assinarTce,
  decidirPlano,
  registrarApolice,
  registrarPlano,
  submeterPlano,
  vincularResponsavel,
} from "@/modules/estagios/services/formalizacao-service";
import { createMundoEstagio, identityOf } from "./fixtures";

// Shared by the internship tests: a TCE and the whole formalization run by the people who
// do it in real life (coordination, student, advisor, concedente), under RLS.

export type Mundo = Awaited<ReturnType<typeof createMundoEstagio>>;
export type Etapa = "plano" | "supervisor" | "apolice" | "assinaturaConcedente" | "fechamento";

export function tce(mundo: Mundo, ajustes: Partial<DadosTceEntrada> = {}): DadosTceEntrada {
  return {
    estudanteId: mundo.estudante.id,
    concedenteId: mundo.concedente.id,
    convenioId: mundo.convenio.id,
    tipo: "OBRIGATORIO",
    dataInicio: "2026-11-02",
    dataFimPactuada: "2027-11-01",
    cargaDiariaMinutos: 6 * 60,
    cargaSemanalMinutos: 30 * 60,
    cargaTotalMinutos: 400 * 60,
    condicoesPactuadas: "Desenvolvimento de software sob supervisão",
    bolsaValor: null,
    auxilioTransporteValor: null,
    seguroExigido: true,
    ...ajustes,
  };
}

export const como = (usuario: { id: string }) => identityOf(usuario.id);

/** Runs the whole formalization by the people who do it in real life, skipping `pular`. */
export async function prepararEstagio(mundo: Mundo, pular: Etapa[] = [], ajustes: Partial<DadosTceEntrada> = {}) {
  const dados = tce(mundo, ajustes);
  const criado = await createEstagio(como(mundo.coordenador), dados);
  const id = criado.id;

  await vincularResponsavel(como(mundo.coordenador), id, "ORIENTADOR", mundo.orientador.id);
  if (!pular.includes("supervisor")) await vincularResponsavel(como(mundo.coordenador), id, "SUPERVISOR", mundo.supervisor.id);

  await registrarPlano(como(mundo.aluno), id, {
    atividadesPrevistas: "Manutenção de sistemas web",
    justificativaCompatibilidade: "Componentes de engenharia de software",
  });
  await submeterPlano(como(mundo.aluno), id);
  if (!pular.includes("plano")) await decidirPlano(como(mundo.orientador), id, "APROVADO", null);

  if (!pular.includes("apolice")) {
    await registrarApolice(como(mundo.representante), id, {
      seguradora: "Seguradora Exemplo",
      numeroApolice: "AP-1",
      contratante: "CONCEDENTE",
      vigenciaInicio: dados.dataInicio,
      vigenciaFim: "2029-12-31",
      substituiApoliceId: null,
      documentoId: null,
    });
  }

  if (!pular.includes("fechamento")) {
    await fecharTce(como(mundo.coordenador), id);
    await assinarTce(como(mundo.aluno), id, "ESTUDANTE", "203.0.113.20");
    await assinarTce(como(mundo.coordenador), id, "INSTITUICAO", null);
    if (!pular.includes("assinaturaConcedente")) await assinarTce(como(mundo.representante), id, "CONCEDENTE", null);
  }
  return id;
}


/**
 * An ATIVO internship that started in the past (Monday 2026-08-03), so frequency, reports and
 * evaluations have days to refer to. Fase 3 tests start here.
 */
export async function estagioAtivo(mundo: Mundo, ajustes: Partial<DadosTceEntrada> = {}) {
  const id = await prepararEstagio(mundo, [], { dataInicio: "2026-08-03", dataFimPactuada: "2027-07-30", ...ajustes });
  await ativarEstagio(como(mundo.coordenador), id);
  return id;
}
