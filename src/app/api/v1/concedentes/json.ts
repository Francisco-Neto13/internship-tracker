import type { ConcedenteRow } from "@/modules/concedentes/repositories/concedente-repository";

// JSON shape of /api/v1/concedentes (snake_case)
export function concedenteJson(row: ConcedenteRow) {
  return {
    id: row.id,
    razao_social: row.razaoSocial,
    nome_fantasia: row.nomeFantasia,
    cnpj: row.cnpj,
    endereco: {
      logradouro: row.logradouro,
      numero: row.numeroEndereco,
      complemento: row.complemento,
      bairro: row.bairro,
      municipio: row.municipio,
      uf: row.uf,
      cep: row.cep,
    },
    email_contato: row.emailContato,
    telefone_contato: row.telefoneContato,
    representante_legal_nome: row.representanteLegalNome,
    representante_legal_cargo: row.representanteLegalCargo,
    area_atuacao: row.areaAtuacao,
    porte_id: row.porteId,
    setor_atuacao_id: row.setorAtuacaoId,
    situacao: row.situacao,
    criado_em: row.criadoEm.toISOString(),
  };
}
