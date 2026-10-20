import type { UsuarioComPerfis } from "@/modules/acesso/services/usuario-service";

// JSON shape of /api/v1/usuarios responses (snake_case, ISO 8601 instants)

type Vinculo = UsuarioComPerfis["perfis"][number];

export function vinculoJson(vinculo: Vinculo) {
  return {
    id: vinculo.id,
    perfil: vinculo.perfil,
    curso_id: vinculo.cursoId,
    vigencia_inicio: vinculo.vigenciaInicio.toISOString(),
    vigencia_fim: vinculo.vigenciaFim?.toISOString() ?? null,
  };
}

export function usuarioJson(usuario: UsuarioComPerfis) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    situacao: usuario.situacao,
    troca_senha_obrigatoria: usuario.trocaSenhaObrigatoria,
    senha_provisoria_expira_em: usuario.senhaProvisoriaExpiraEm?.toISOString() ?? null,
    criado_em: usuario.criadoEm.toISOString(),
    perfis: usuario.perfis.map(vinculoJson),
  };
}
