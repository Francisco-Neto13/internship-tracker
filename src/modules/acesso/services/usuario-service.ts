import { isForeignKeyViolation, isRlsViolation, isUniqueViolation } from "@/db/errors";
import { withUser, type Transaction } from "@/db/with-user";
import { definirSenha, revogarSessoes } from "@/lib/credenciais";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { generateTemporaryPassword } from "@/lib/password";
import { expiracaoSenhaProvisoria } from "../domain/senha-provisoria";
import {
  diferencaVinculos,
  impedirAutoinativacao,
  impedirAutorremocaoAdministrador,
  validarVinculos,
  type VinculoDesejado,
} from "../domain/vinculos";
import {
  findUsuarioById,
  findUsuarios,
  insertUsuario,
  updateUsuario,
  type UsuarioRow,
} from "../repositories/usuario-repository";
import {
  encerrarVinculos,
  findHistoricoVinculos,
  findVinculosVigentes,
  insertVinculos,
  type VinculoRow,
} from "../repositories/vinculo-perfil-repository";

// RF001: the administrator creates, edits and inactivates users and replaces their
// profile links. Domain rows (usuario, vinculo_perfil) are written through withUser, so
// RLS checks the administrator and the audit trigger records who acted (RN-28).
// Credentials and sessions live behind the auth pool (src/lib/credenciais.ts).

type Perfil = VinculoRow["perfil"];
type Situacao = UsuarioRow["situacao"];

export type UsuarioComPerfis = UsuarioRow & { perfis: VinculoRow[] };

const acessoNegado = (acao: string) =>
  new DomainError({
    code: "ACESSO_NEGADO",
    kind: "FORBIDDEN",
    message: `O perfil atual não permite ${acao}.`,
    requisito: "RF003",
  });

const naoEncontrado = () =>
  new DomainError({ code: "USUARIO_NAO_ENCONTRADO", kind: "NOT_FOUND", message: "Usuário não encontrado.", requisito: "RF001" });

function translateWriteError(error: unknown, acao: string): unknown {
  if (isRlsViolation(error)) return acessoNegado(acao);
  if (isUniqueViolation(error, "usuario_email_unique")) {
    return new DomainError({
      code: "EMAIL_DUPLICADO",
      kind: "CONFLICT",
      message: "Já existe usuário com este e-mail.",
      requisito: "RF001",
    });
  }
  if (isForeignKeyViolation(error, "vinculo_perfil_curso_id_curso_id_fk")) {
    return new DomainError({
      code: "CURSO_INEXISTENTE",
      kind: "UNPROCESSABLE",
      message: "O curso informado para a coordenação não existe.",
      requisito: "RF001",
    });
  }
  return error;
}

/**
 * A write that matched no row is ambiguous under RLS: the user may not exist, may be
 * hidden from the caller, or may be visible but not writable. Reading it again in the
 * same transaction tells 404 from 403 without leaking rows the caller cannot see.
 */
async function explicarFalha(tx: Transaction, id: string, acao: string, situacaoEsperada?: Situacao): Promise<never> {
  const atual = await findUsuarioById(tx, id);
  if (!atual) throw naoEncontrado();
  if (situacaoEsperada && atual.situacao !== situacaoEsperada) {
    throw new DomainError({
      code: atual.situacao === "INATIVO" ? "USUARIO_JA_INATIVO" : "USUARIO_JA_ATIVO",
      kind: "CONFLICT",
      message: atual.situacao === "INATIVO" ? "O usuário já está inativo." : "O usuário já está ativo.",
      requisito: "RF001",
    });
  }
  throw acessoNegado(acao);
}

async function comPerfis(tx: Transaction, usuarios: UsuarioRow[]): Promise<UsuarioComPerfis[]> {
  const vinculos = await findVinculosVigentes(
    tx,
    usuarios.map((usuario) => usuario.id),
  );
  return usuarios.map((usuario) => ({
    ...usuario,
    perfis: vinculos.filter((vinculo) => vinculo.usuarioId === usuario.id),
  }));
}

export async function listUsuarios(
  identity: Identity,
  query: { page: number; limit: number; perfil?: Perfil; situacao?: Situacao; busca?: string },
): Promise<{ items: UsuarioComPerfis[]; total: number }> {
  return withUser(identity, async (tx) => {
    const { items, total } = await findUsuarios(tx, {
      perfil: query.perfil,
      situacao: query.situacao,
      busca: query.busca,
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });
    return { items: await comPerfis(tx, items), total };
  });
}

export async function getUsuario(identity: Identity, id: string) {
  return withUser(identity, async (tx) => {
    const usuario = await findUsuarioById(tx, id);
    if (!usuario) throw naoEncontrado();
    const historico = await findHistoricoVinculos(tx, id);
    const [comVigentes] = await comPerfis(tx, [usuario]);
    return { ...comVigentes, historico };
  });
}

/**
 * Creates the user with a temporary password (RF001, RF002). The password is returned
 * once, to be handed over out of band; only its hash is stored. If the credential write
 * fails after the user row committed, issuing a new temporary password recovers it.
 */
export async function createUsuario(
  identity: Identity,
  input: { nome: string; email: string; perfis: VinculoDesejado[] },
): Promise<{ usuario: UsuarioComPerfis; senhaProvisoria: string }> {
  validarVinculos(input.perfis);

  let usuario: UsuarioComPerfis;
  try {
    usuario = await withUser(identity, async (tx) => {
      const criado = await insertUsuario(tx, {
        nome: input.nome,
        email: input.email,
        trocaSenhaObrigatoria: true,
        senhaProvisoriaExpiraEm: expiracaoSenhaProvisoria(),
      });
      const perfis = await insertVinculos(tx, criado.id, input.perfis);
      return { ...criado, perfis };
    });
  } catch (error) {
    throw translateWriteError(error, "cadastrar usuários");
  }

  const senhaProvisoria = generateTemporaryPassword();
  await definirSenha(usuario.id, senhaProvisoria);
  return { usuario, senhaProvisoria };
}

export async function updateUsuarioDados(
  identity: Identity,
  id: string,
  input: { nome?: string; email?: string },
): Promise<UsuarioComPerfis> {
  try {
    return await withUser(identity, async (tx) => {
      const atualizado = await updateUsuario(tx, id, input);
      if (!atualizado) return explicarFalha(tx, id, "editar usuários");
      const [comVigentes] = await comPerfis(tx, [atualizado]);
      return comVigentes;
    });
  } catch (error) {
    throw translateWriteError(error, "editar usuários");
  }
}

/**
 * RF001: inactivation never deletes (RN-28). The session check in src/lib/session.ts
 * already refuses an inactive user on the next request (RNF-03); revoking the sessions
 * also removes the rows. If that second step fails the user is still locked out, so the
 * failure is logged instead of reported as a failed inactivation.
 */
export async function inativarUsuario(identity: Identity, id: string): Promise<UsuarioComPerfis> {
  impedirAutoinativacao(identity.userId, id);

  const usuario = await withUser(identity, async (tx) => {
    const atualizado = await updateUsuario(tx, id, { situacao: "INATIVO" }, "ATIVO");
    if (!atualizado) return explicarFalha(tx, id, "inativar usuários", "ATIVO");
    const [comVigentes] = await comPerfis(tx, [atualizado]);
    return comVigentes;
  });

  try {
    await revogarSessoes(id);
  } catch (error) {
    console.error("Usuário inativado, mas as sessões não foram removidas", error);
  }
  return usuario;
}

export async function reativarUsuario(identity: Identity, id: string): Promise<UsuarioComPerfis> {
  return withUser(identity, async (tx) => {
    const atualizado = await updateUsuario(tx, id, { situacao: "ATIVO" }, "INATIVO");
    if (!atualizado) return explicarFalha(tx, id, "reativar usuários", "INATIVO");
    const [comVigentes] = await comPerfis(tx, [atualizado]);
    return comVigentes;
  });
}

/**
 * Replaces the profile links in force (RF001, RF003). Links that remain keep their row,
 * removed ones get vigencia_fim, new ones are inserted: the history stays readable.
 */
export async function substituirPerfis(identity: Identity, id: string, perfis: VinculoDesejado[]): Promise<VinculoRow[]> {
  validarVinculos(perfis);
  impedirAutorremocaoAdministrador(identity.userId, id, perfis);

  try {
    return await withUser(identity, async (tx) => {
      if (!(await findUsuarioById(tx, id))) throw naoEncontrado();

      const atuais = await findVinculosVigentes(tx, [id]);
      const { encerrar, abrir } = diferencaVinculos(atuais, perfis);

      // RLS hides links the caller may not close: fewer rows means the caller is not an administrator
      const encerrados = await encerrarVinculos(tx, encerrar);
      if (encerrados.length !== encerrar.length) throw acessoNegado("alterar perfis");

      await insertVinculos(tx, id, abrir);
      return findVinculosVigentes(tx, [id]);
    });
  } catch (error) {
    throw translateWriteError(error, "alterar perfis");
  }
}
