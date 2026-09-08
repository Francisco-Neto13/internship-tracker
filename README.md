# Internship Tracker | Gestão de Estágios e Atividades Complementares

<div align="center">
  <p>Plataforma acadêmica para gestão do ciclo completo de estágios obrigatórios e não obrigatórios, e das atividades complementares exigidas para a integralização curricular.</p>
</div>

<br />

<div align="center">
  <img src="https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white">
  <img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white">
  <img src="https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white">
  <img src="https://img.shields.io/badge/PostgreSQL_17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white">
  <img src="https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black">
  <img src="https://img.shields.io/badge/Auth.js-000000?style=for-the-badge&logo=auth0&logoColor=white">
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white">
</div>

---

## Visão Geral

O Internship Tracker substitui o controle manual (planilhas e processos em papel) da gestão de estágios em um curso de graduação. Formaliza o vínculo entre estudante, instituição, concedente e supervisores por meio de termo de compromisso, plano de atividades e apólice de seguro; ao longo do estágio, controla frequência, carga horária, relatórios periódicos, avaliações de desempenho e ocorrências como afastamento, prorrogação e rescisão.

A especificação cobre **6 atores**, **36 regras de negócio**, **70 requisitos funcionais** e **23 casos de uso**, organizados em **8 módulos** de domínio, com rastreabilidade fechada entre requisito e regra: nenhum requisito sem origem, nenhuma regra sem requisito que a implemente.

A filosofia central do projeto prioriza, nessa ordem: **segurança** (seis perfis distintos enxergam fatias diferentes dos mesmos dados, incluindo dado sensível como atestado médico), **confiabilidade** (auditoria e guarda documental não podem falhar silenciosamente) e **manutenibilidade** (equipe pequena, prazo de semestre: a regra de negócio precisa ficar isolada para não virar retrabalho a cada tela nova).

## Módulos do sistema

| Módulo | Cobre | Perfis principais |
|---|---|---|
| M01 · Acesso e Usuários | Autenticação, perfis e permissões (RF001–RF003) | Todos / Administrador |
| M02 · Gestão Acadêmica | Cursos, estudantes e parâmetros institucionais (RF004–RF006) | Administrador / Coordenação |
| M03 · Concedentes e Convênios | Cadastro, vigência e histórico (RF007–RF014) | Coordenação / Administrador |
| M04 · Gestão de Estágios | TCE, plano de atividades, responsáveis, apólice e assinaturas (RF015–RF022, RF031–RF035, RF044–RF047) | Coordenação / Professor / Concedente |
| M05 · Acompanhamento | Frequência, carga horária, relatórios e avaliação (RF023–RF030, RF036–RF043) | Estudante / Professor / Supervisor |
| M06 · Atividades Complementares | Cadastro, comprovante e análise (RF048–RF055) | Estudante / Coordenação |
| M07 · Integralização Curricular | Progresso de carga horária e emissão de comprovantes (RF056–RF058) | Estudante / Coordenação |
| M08 · Administração e Controle | Auditoria, relatórios gerenciais e conformidade (RF065–RF070) | Coordenação / Administrador |

## Modelo de segurança

A autorização não vive na tela: cada tabela sensível tem política de **Row Level Security** no PostgreSQL, resolvida pela interseção de **perfil** e **vínculo** (ex.: um professor só enxerga os estágios em que consta como orientador vigente, não todos os estágios do curso). A identidade do usuário autenticado chega ao banco por um wrapper de transação que executa `set_config('app.user_id', ..., true)` local a cada transação, necessário porque o pooler do Neon reaproveita conexões entre requisições diferentes. Uma consulta que escape desse wrapper roda sem identidade e a política devolve zero linhas: falha visível, não silenciosa.

Toda operação relevante é registrada por **gatilho de banco**, não por código de aplicação, para que nenhuma rota nova ou script de manutenção consiga contornar a auditoria. Documentos com prazo legal de guarda (RF069) têm duas barreiras independentes contra exclusão: um gatilho `BEFORE DELETE` no banco e o Bucket Locks do Cloudflare R2.

## Máquina de estados do estágio

```
RASCUNHO -> AGUARDANDO_ASSINATURAS -> PRONTO_PARA_ATIVACAO -> ATIVO -> CONCLUIDO
                                                                |  \
                                                          AFASTADO  RESCINDIDO
```

A transição para `ATIVO` verifica, na mesma transação: concedente não suspensa, convênio vigente, plano de atividades aprovado, orientador e supervisor vinculados, apólice registrada (quando exigida) e as três assinaturas do TCE. Se qualquer guarda falhar, a API responde com todos os impedimentos de uma vez, não um por requisição.

## Decisões de negócio já fechadas

Pontos que antes admitiam mais de uma interpretação, definidos com o professor orientador; implementar a alternativa descartada aqui é retrabalho:

| Ponto | Decisão |
|---|---|
| Assinatura do TCE (RF019) | Registrada no próprio sistema: identificação, data, hora e hash do documento. Sem ICP-Brasil |
| Canal de notificação (RF012, RF035, RF040, RF070) | Apenas dentro do sistema. Sem e-mail |
| Estágios simultâneos | Não permitidos. Um estudante só pode ter um estágio `ATIVO` por vez |
| Efeito do afastamento sobre prazos | Estende `data_fim` automaticamente, no mesmo número de dias corridos |
| Duração máxima (24 meses) | Aplicada por vínculo estudante-concedente, conforme art. 11 da Lei 11.788/2008 |
| Recurso contra recusa de atividade complementar | Não existe. O estudante cadastra uma nova atividade |
| Divergência relevante de carga horária | Percentual parametrizável, padrão de 10% |
| Hospedagem em território nacional | Sem exigência |

Detalhamento completo em `documentation/DAS.docx` §9.1.

## Requisitos de qualidade

Metas de qualidade validadas pela equipe (não são garantia contratual: o projeto roda em planos gratuitos de terceiros, sem redundância paga):

- **Segurança:** RLS sem exceção em qualquer tabela sensível; leitura de dado sensível (atestado médico) registrada em auditoria; sessão expira em 30 minutos de inatividade.
- **Desempenho:** leitura sob carga normal com p95 < 800ms; geração de PDF em até 5s.
- **Disponibilidade:** uptime mensal ≥ 99% em horário comercial, dentro do SLA gratuito de Vercel/Neon; cold start do Neon é restrição aceita, não bug.
- **Manutenibilidade:** toda regra de negócio nova exige teste automatizado; acesso ao banco fora do wrapper de identidade é bloqueado por lint.
- **Confiabilidade:** cálculo de carga horária é determinístico; escrita de auditoria nunca é perdida.

As 13 métricas completas (QA-01 a QA-13) estão em `documentation/DAS.docx` §10.

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Linguagem | TypeScript (modo estrito) |
| Framework web | Next.js 15 (App Router) |
| Runtime | Node.js 22 LTS |
| Interface | React 19, Tailwind CSS 4, shadcn/ui |
| Formulários e validação | React Hook Form e Zod |
| Banco de dados | PostgreSQL 17 gerenciado (Neon), com Row Level Security |
| Acesso a dados | Drizzle ORM e drizzle-kit |
| Autenticação | Auth.js v5 |
| Armazenamento de arquivos | Cloudflare R2 (compatível com S3); MinIO em desenvolvimento |
| API | Route Handlers do Next.js, versionada em `/api/v1` |
| Geração de PDF | React-PDF no servidor |
| Testes | Vitest (unidade/integração) e Playwright (e2e) |
| Rotinas agendadas | Vercel Cron |
| Deploy | Vercel (aplicação), Neon (banco), R2 (arquivos) |

Justificativa completa de cada escolha, incluindo alternativas descartadas, em `documentation/Stack e API.docx`.

## Ambientes

| Ambiente | Banco | Armazenamento | Aplicação |
|---|---|---|---|
| Desenvolvimento | PostgreSQL 17 em Docker | MinIO em Docker | `next dev` local |
| Integração contínua | Branch efêmera do Neon | MinIO em contêiner | GitHub Actions |
| Produção | Neon (branch principal) | Cloudflare R2 | Vercel |

## Como rodar localmente

```bash
docker compose up -d      # Postgres 17 + MinIO
cp .env.example .env
npm install
npm run dev                # http://localhost:3000
```

Outros comandos úteis:

```bash
npm run lint
npm run test               # Vitest
npm run test:e2e           # Playwright
npm run db:generate        # gera migração a partir de src/db/schema
npm run db:migrate         # aplica migração pendente
```

## Estrutura do código

```
src/app/(auth)/        rotas de login e recuperação de senha
src/app/(app)/         telas autenticadas por perfil
src/app/api/v1/        route handlers da API REST
src/modules/           8 módulos de domínio, cada um com
                        { domain, services, repositories, schemas }
src/shared/            transversal: documentos, notificacoes, auditoria, ui
src/db/                client.ts (uso restrito), with-user.ts, schema/
drizzle/sql/            políticas RLS, funções e triggers versionados como SQL
```

Convenções de código, mapa de arquitetura completo e pegadinhas conhecidas estão em `AGENTS.md`.

## Fluxo de branches e commits

`main` e `develop` são protegidas e exigem CI verde no PR. Uma feature nasce de `develop` como `feature/<RF-curto>` (ex.: `feature/RF002-auth`) e volta por PR para `develop`; `develop` vai para `main` só quando estável.

Commits seguem `type(scope): summary`, no imperativo, com notas em bullet explicando a mudança real (não repetindo o resumo). Tipos: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`, `revert`. Escopos genéricos: `api`, `ui`, `domain`, `db`, `auth`, `storage`, `jobs`, `config`, `deps`, `ci`, `docs`, `test`, `repo`. Convenção completa, com exemplos, em `documentation/padroes/PADRAOCOMMITS.MD`.

## Roadmap

| Fase | Entrega |
|---|---|
| 0 · Fechamento da documentação | Stack, arquitetura, endpoints, DAS, padrão de commits, repositório (**concluída**) |
| 1 · Fundação técnica | RNFs, DER lógico, migrações, wrapper de identidade, políticas RLS, auditoria, Auth.js, CI |
| 2 · Cadastros e formalização | Cursos, estudantes, concedentes, convênios, TCE, ativação de estágio |
| 3 · Acompanhamento | Frequência, carga horária, relatórios, avaliação |
| 4 · Atividades complementares e integralização | Cadastro, análise, limites por categoria, apuração |
| 5 · Ocorrências, conclusão e conformidade | Afastamento, prorrogação, rescisão, guarda documental, relatórios gerenciais |

Critérios de saída de cada fase e ordem de dependência em `documentation/planejamento/PLANEJAMENTO.MD`.

## Documentação completa

Requisitos, regras de negócio, arquitetura, especificação de API e o Documento de Arquitetura de Software (DAS) vivem em `documentation/`, que ainda não é versionada neste repositório (arquivo de trabalho do grupo). Uma versão reduzida e versionada será adicionada depois.

## Projeto Acadêmico

Desenvolvido por José Francisco de Araújo Neto, Lucas Raphael, Guilherme Jatobá e Kauan Moura Rebelo, no âmbito da disciplina **Project Lab**.

---

<div align="center">
  <p>Construído para dar clareza, rastreabilidade e segurança ao acompanhamento de estágios.</p>
</div>
