# Internship Tracker | Gestão de Estágios e Atividades Complementares

<div align="center">
  <p>Plataforma acadêmica para gestão do ciclo completo de estágios obrigatórios e não obrigatórios, e das atividades complementares exigidas para a integralização curricular.</p>
</div>

<br />

<div align="center">
  <img src="https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white">
  <img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white">
  <img src="https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white">
  <img src="https://img.shields.io/badge/PostgreSQL_17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white">
  <img src="https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black">
  <img src="https://img.shields.io/badge/Better_Auth-000000?style=for-the-badge&logoColor=white">
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
| M04 · Gestão de Estágios | TCE, plano de atividades, responsáveis, apólice, assinaturas, afastamento, prorrogação e rescisão (RF015–RF022, RF031–RF035, RF044–RF047, RF059–RF064) | Coordenação / Professor / Concedente |
| M05 · Acompanhamento | Frequência, carga horária, relatórios e avaliação (RF023–RF030, RF036–RF043) | Estudante / Professor / Supervisor |
| M06 · Atividades Complementares | Cadastro, comprovante e análise (RF048–RF055) | Estudante / Coordenação |
| M07 · Integralização Curricular | Progresso de carga horária e emissão de comprovantes (RF056–RF058) | Estudante / Coordenação |
| M08 · Administração e Controle | Auditoria, relatórios gerenciais e conformidade (RF065–RF070) | Coordenação / Administrador |

## Modelo de segurança

A autorização não vive na tela: toda tabela tem política de **Row Level Security** no PostgreSQL, resolvida pela interseção de **perfil** e **vínculo** (ex.: um professor só enxerga os estágios em que consta como orientador vigente, não todos os estágios do curso). A identidade do usuário autenticado chega ao banco por um wrapper de transação que executa `set_config('app.user_id', ..., true)` local a cada transação, necessário porque o pooler do Neon reaproveita conexões entre requisições diferentes. Uma consulta que escape desse wrapper roda sem identidade e a política devolve zero linhas: falha visível, não silenciosa.

RLS só vale para quem não é dono da tabela, superusuário ou `BYPASSRLS`. Por isso o banco usa três papéis: `migrator` é dono de tudo e só roda migrações; `app_runtime` executa o código de domínio sob RLS, sem permissão de `DELETE`; `auth_runtime` atende apenas a biblioteca de autenticação e é o único que alcança sessões e hashes de senha. A migração aborta se um papel de runtime puder contornar a RLS, e uma suíte de testes verifica essas invariantes contra um Postgres real a cada PR.

Toda operação relevante é registrada por **gatilho de banco**, não por código de aplicação, para que nenhuma rota nova ou script de manutenção consiga contornar a auditoria. Documentos com prazo legal de guarda (RF069) têm duas barreiras independentes contra exclusão: um gatilho `BEFORE DELETE` no banco e o Bucket Locks do Cloudflare R2.

## Máquina de estados do estágio

```
RASCUNHO -> AGUARDANDO_ASSINATURAS -> PRONTO_PARA_ATIVACAO -> ATIVO -> CONCLUIDO
ATIVO <-> AFASTADO
ATIVO -> RESCINDIDO
AFASTADO -> RESCINDIDO
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

## Requisitos de qualidade

Metas de qualidade validadas pela equipe (não são garantia contratual: o projeto roda em planos gratuitos de terceiros, sem redundância paga):

- **Segurança:** RLS sem exceção em qualquer tabela; leitura de dado sensível (atestado médico) registrada em auditoria; sessão expira em 30 minutos de inatividade.
- **Desempenho:** leitura sob carga normal com p95 < 800ms; geração de PDF em até 5s.
- **Disponibilidade:** uptime mensal ≥ 99% em horário comercial, dentro do SLA gratuito de Vercel/Neon; cold start do Neon é restrição aceita, não bug.
- **Manutenibilidade:** toda regra de negócio nova exige teste automatizado; acesso ao banco fora do wrapper de identidade é bloqueado por lint.
- **Confiabilidade:** cálculo de carga horária é determinístico; escrita de auditoria nunca é perdida.

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Linguagem | TypeScript (modo estrito) |
| Framework web | Next.js 16 (App Router) |
| Runtime | Node.js 24 LTS |
| Interface | React 19, Tailwind CSS 4, shadcn/ui |
| Formulários e validação | React Hook Form e Zod |
| Banco de dados | PostgreSQL 17 gerenciado (Neon), com Row Level Security |
| Acesso a dados | Drizzle ORM, drizzle-kit e driver `pg` |
| Autenticação | Better Auth (e-mail e senha com Argon2id, sessão em banco) |
| Armazenamento de arquivos | Cloudflare R2 (compatível com S3); MinIO em desenvolvimento |
| API | Route Handlers do Next.js, versionada em `/api/v1` |
| Geração de PDF | React-PDF no servidor |
| Testes | Vitest (unidade/integração) e Playwright (e2e) |
| Rotinas agendadas | Vercel Cron |
| Deploy | Vercel (aplicação), Neon (banco), R2 (arquivos) |

## Ambientes

| Ambiente | Banco | Armazenamento | Aplicação |
|---|---|---|---|
| Desenvolvimento | PostgreSQL 17 em Docker | MinIO em Docker | `next dev` local |
| Integração contínua | PostgreSQL 17 no mesmo `docker compose` | — | GitHub Actions |
| Produção | Neon (branch principal) | Cloudflare R2 | Vercel |

O CI usa o mesmo contêiner e o mesmo script de papéis do ambiente local, então um teste de RLS que passa na máquina passa no CI pelas mesmas razões.

## Como rodar localmente

Requisitos: Node.js 24 (`.nvmrc`) e Docker.

```bash
docker compose up -d postgres --wait   # Postgres 17 com papéis e bancos
cp .env.example .env                   # gere BETTER_AUTH_SECRET: openssl rand -base64 32
npm install
npm run db:migrate
npm run db:seed
npm run dev                            # http://localhost:3000
```

O seed cria usuários com a senha `senha-dev-internship`:

| E-mail | Perfil |
|---|---|
| `admin@internship.local` | Administrador |
| `coordenacao.software@internship.local` | Coordenação de Engenharia de Software |
| `ana.estudante@internship.local` | Estudante de Engenharia de Software |
| `bruno.estudante@internship.local` | Estudante de Administração |

Se o volume do Postgres já existia antes dos papéis, recrie-o com `docker compose down -v`.

Outros comandos úteis:

```bash
npm run lint
npm run typecheck
npm run test:unit          # Vitest sem banco
npm run test:db            # RLS, auditoria e autenticação contra Postgres real
npm run test:e2e           # Playwright (banco migrado e com seed)
npm run db:generate        # gera migração de tabela a partir de src/db/schema
npm run ci                 # CI inteira na máquina, espelho do ci.yml (--fast pula Docker)
```

O `npm install` ativa os hooks versionados em `.githooks` (se não ativar, `npm run hooks`). O `pre-push` recusa push direto para `develop` e `main`; push de `feature/*` e `integration/*` passa direto.

### Produção (Neon)

`DATABASE_MIGRATION_URL` aponta para o dono do banco na conexão direta. Depois da primeira migração, habilite o login dos papéis de runtime com senhas geradas e use-os, pela conexão com pooler, em `DATABASE_URL` (`app_runtime`) e `DATABASE_AUTH_URL` (`auth_runtime`):

```sql
alter role app_runtime with login password '<senha gerada>';
alter role auth_runtime with login password '<senha gerada>';
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
src/lib/                auth, sessão, identidade, API e erros
drizzle/migrations/     SQL de tabelas gerado pelo drizzle-kit
drizzle/sql/            papéis, funções, políticas RLS e triggers versionados como SQL
scripts/db/             migração e seed
scripts/ci-local.mjs    CI local, espelho do workflow do GitHub
.githooks/              pre-push que recusa push direto em develop e main
scripts/github/         automação do fluxo de lotes e da proteção das branches
tests/db/               testes de integração contra Postgres real
e2e/                    testes de ponta a ponta (Playwright)
```

Convenções de código, mapa de arquitetura completo e pegadinhas conhecidas estão em `AGENTS.md`.

## Fluxo de branches e commits

`main` e `develop` só mudam por pull request com CI verde. O trabalho é entregue em lotes: um lote nasce de `develop` como `integration/<lote>` (ex.: `integration/fase-1-fundacao`), e cada implementação nasce do lote como `feature/<RF-curto>` (ex.: `feature/RF002-auth`) e volta para ele. Com o lote completo, ele passa por revisão e depois pela bateria completa de testes, rodada na máquina (`npm run ci`); só quando os testes do lote se esgotam sai o PR para `develop`. Assim a `develop` nunca recebe trabalho não testado. `develop` vai para `main` só quando estável.

A branch de integração não tem CI remoto: o lote está em revisão e teste. O CI do GitHub roda no PR para a `develop` (e para a `main`), e o merge só é liberado com ele verde. O fluxo é automatizado:

```bash
npm run batch:integrate -- feature/<RF-curto>   # merge da feature no lote + push (sem CI)
npm run batch:pr                                # esgota os testes do lote (npm run ci, Docker ligado e porta 3000 livre),
                                                # abre o PR integration/<lote> -> develop e liga o auto-merge
```

Com o auto-merge, o GitHub mescla o PR sozinho quando os checks ficam verdes e apaga a branch do lote; o próximo lote nasce da `develop` atualizada. Os comandos avisam quando o lote passa de uma semana, porque lote grande acumula conflito e atrasa o feedback. Servem para qualquer colaborador com permissão de escrita e usam a credencial que o git já guarda para push por HTTPS (ou `GITHUB_TOKEN`); sem credencial, `batch:pr` roda os testes e imprime o link para abrir o PR no navegador. O job `Source branch` do CI recusa PR para `develop` que não venha de `integration/*` e PR para `main` que não venha de `develop`.

### Proteção e configurações do GitHub

A proteção e as configurações do repositório ficam versionadas em `.github/` e valem para todos, inclusive o dono:

| Arquivo | Alvo | O que define |
|---|---|---|
| `rulesets/develop-e-main.json` | `develop`, `main` | Sem exclusão, sem force push; merge só por PR, sem aprovação obrigatória, com os checks `Source branch`, `Lint, types, unit tests, build`, `Migrations, RLS and audit tests` e `End-to-end` verdes e a branch atualizada. Ninguém na lista de exceção |
| `rulesets/lotes.json` | `integration/**` | Sem force push (o lote é apagado após o merge) |
| `repository.json` | Repositório | Auto-merge ligado, branch apagada após o merge, botão de atualizar branch, só merge commit |

```bash
npm run github:sync -- --check   # qualquer colaborador: mostra se o GitHub difere dos arquivos
npm run github:sync              # admin do repositório: aplica os arquivos no GitHub
```

Mudança entra por PR nos arquivos e depois é aplicada. Colegas ficam com papel `write`, que não altera rulesets. A `main` pode ser criada a partir da `develop` com `git push origin develop:main`, que o hook aceita só nesse caso.

Commits seguem `type(scope): summary`, no imperativo, com notas em bullet explicando a mudança real (não repetindo o resumo). Tipos: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`, `revert`. Escopos genéricos: `api`, `ui`, `domain`, `db`, `auth`, `storage`, `jobs`, `config`, `deps`, `ci`, `docs`, `test`, `repo`. Exemplo e regras de divisão de commits em `AGENTS.md`.

## Roadmap

| Fase | Entrega |
|---|---|
| 0 · Fechamento da documentação | Stack, arquitetura, endpoints, DAS, padrão de commits, repositório (**concluída**) |
| 1 · Fundação técnica | RNFs, DER lógico, migrações, wrapper de identidade, papéis e políticas RLS, auditoria, autenticação, CI (**em integração**) |
| 2 · Cadastros e formalização | Cursos, estudantes, concedentes, convênios, TCE, ativação de estágio |
| 3 · Acompanhamento | Frequência, carga horária, relatórios, avaliação |
| 4 · Atividades complementares e integralização | Cadastro, análise, limites por categoria, apuração |
| 5 · Ocorrências, conclusão e conformidade | Afastamento, prorrogação, rescisão, guarda documental, relatórios gerenciais |

A ordem segue a dependência de dados, não a numeração dos requisitos. Critérios de saída de cada fase em `AGENTS.md`.

## Documentação

Requisitos, regras de negócio e documentos formais da disciplina são mantidos pela equipe fora deste repositório. Aqui, a referência é este README, o `AGENTS.md` e o próprio código: schema em `src/db/schema`, segurança em `drizzle/sql`, contratos da API em `src/modules/*/schemas` e comportamento esperado nos testes.

## Projeto Acadêmico

Desenvolvido por José Francisco de Araújo Neto, Lucas Raphael, Guilherme Jatobá e Kauan Moura Rebelo, no âmbito da disciplina **Project Lab**.

---

<div align="center">
  <p>Construído para dar clareza, rastreabilidade e segurança ao acompanhamento de estágios.</p>
</div>
