# AGENTS.md

Internship Tracker: Plataforma de Acompanhamento de Estágios e Atividades Complementares.
Projeto acadêmico (disciplina Project Lab). Especificação: 6 atores, 36 regras de negócio
(RN-01 a RN-37), 70 requisitos funcionais (RF001 a RF070), 23 casos de uso, 8 módulos.

## Comandos

```bash
docker compose up -d postgres --wait   # Postgres 17 com papéis e bancos (dev e _test)
cp .env.example .env                   # preencher BETTER_AUTH_SECRET
npm install               # também ativa os hooks de .githooks (prepare)
npm run db:migrate        # tabelas (drizzle/migrations) + segurança (drizzle/sql)
npm run db:seed           # usuários de desenvolvimento, senha "senha-dev-internship"
npm run dev               # http://localhost:3000
npm run lint
npm run typecheck
npm run test:unit         # Vitest sem banco
npm run test:db           # Vitest contra internship_tracker_test (recria o schema)
npm run test              # unit + db
npm run test:e2e          # Playwright; exige banco migrado e com seed
npm run build
npm run db:generate       # gera migração de tabela a partir de src/db/schema
npm run ci                # CI inteira na máquina (espelho do ci.yml); --fast pula Docker
npm run hooks             # ativa .githooks à mão, se o npm install não ativou
```

Node 24 LTS (`.nvmrc`). Nunca rodar `drizzle-kit push`: ele ignora papéis, políticas,
funções e gatilhos de `drizzle/sql` e pode deixar o banco sem RLS.

## Branches e commits

`main` e `develop` só mudam por pull request com CI verde. O trabalho é entregue em lotes:

1. Um lote nasce de `develop` como `integration/<lote>` (ex.: `integration/fase-1-fundacao`).
2. Cada implementação nasce do lote como `feature/<RF-curto>` (ex.: `feature/RF002-auth`)
   e volta para o lote. **A branch de integração não tem CI remoto:** o lote está em
   revisão e teste e pode estar incompleto.
3. Com o lote completo, ele passa por revisão e depois pela bateria completa de
   testes (lint, tipos, unidade, banco, e2e), rodada na máquina: `npm run ci`.
   Lote pequeno: no máximo uma semana entre o primeiro commit e o PR (os comandos avisam).
4. Só quando os testes do lote se esgotam sai o PR `integration/<lote>` → `develop`.
   É no PR para a `develop` que o CI remoto roda. O PR nasce com auto-merge ligado: quando
   os checks ficam verdes, o GitHub mescla sozinho e apaga a branch do lote.
   Assim a `develop` nunca recebe trabalho não testado e o CI dela não quebra.
5. `develop` vai para `main` só quando estável, por PR aberto manualmente na tela do GitHub
   (o CI remoto roda de novo). Não há promoção automática nem deploy configurado: a `main`
   só muda quando alguém decide promover.

`main` é a branch padrão do GitHub: um clone novo abre nela. O trabalho nunca começa na
`main`, e sim no lote: `git switch integration/<lote>` e, dali, `git switch -c feature/<RF-curto>`.

Comandos do fluxo:

```bash
npm run batch:integrate -- feature/<RF-curto>   # merge da feature no lote + push (sem CI)
npm run batch:pr                                # esgota os testes do lote (npm run ci, Docker obrigatório),
                                                # abre o PR integration/<lote> -> develop e liga o auto-merge
npm run github:sync -- --check                  # confere se o GitHub bate com .github/repository.json e rulesets
npm run github:sync                             # aplica configurações e proteção (só admin do repositório)
```

Depois do merge, o próximo lote nasce da `develop` atualizada:
`git fetch origin && git switch -c integration/<novo-lote> origin/develop && git push -u origin integration/<novo-lote>`.

`batch:*` funcionam para qualquer colaborador com permissão de escrita: usam a credencial que o
git já guarda para push por HTTPS (ou `GITHUB_TOKEN`). Sem credencial, `batch:pr` roda os
testes e imprime o link para abrir o PR no navegador.

A garantia do fluxo tem três camadas, e nenhuma depende de lembrar da regra:

| Camada | O que garante | Onde |
|---|---|---|
| Rulesets e configurações do GitHub | `develop` e `main` sem push direto, sem force push, sem exclusão; merge só por PR com os 4 checks do CI verdes (sem aprovação obrigatória). Lotes sem force push; apagados após o merge. Auto-merge ligado, só merge commit (preserva os commits no padrão do projeto). Valem para todos, inclusive o dono | `.github/rulesets/*.json` e `.github/repository.json`, aplicados por `npm run github:sync` |
| CI remoto (só em PR e push de `develop`/`main`) | Lint, tipos, unidade, build, banco/RLS, e2e; job `Source branch`: PR para `develop` só vem de `integration/*`, para `main` só de `develop` | `.github/workflows/ci.yml` |
| Máquina de cada um | `batch:pr` não abre PR sem a CI local completa verde; hook `pre-push` recusa push direto para `develop`/`main` | `scripts/github/batch.mjs`, `.githooks/pre-push` |

As proteções locais são as mais fracas (dá para abrir o PR na mão ou usar
`git push --no-verify`); as que não se contornam são o ruleset e o CI do PR. Os arquivos de
`.github/rulesets` e `.github/repository.json` são a fonte da verdade: mudança entra por PR e é
aplicada com `npm run github:sync`.
Colegas ficam com papel `write`; papel `admin` consegue alterar rulesets pela tela.

Passo novo de CI entra em dois lugares: `.github/workflows/ci.yml` e
`scripts/ci-local.mjs`. O último passo do `npm run ci` falha se o `ci.yml` tiver um
passo nomeado sem equivalente local.

Commit: `type(scope): summary` no imperativo, sob 72 caracteres, com notas em
bullet explicando a mudança real, sem linha em branco entre elas, sem ponto
final. Não misturar mudança não relacionada no mesmo commit.

Tipos: `feat` `fix` `refactor` `perf` `test` `docs` `build` `ci` `chore` `revert`.
Escopos: `api` `ui` `domain` `db` `auth` `storage` `jobs` `config` `deps` `ci`
`docs` `test` `repo`. Mudança que quebra contrato leva `!` após o escopo e uma nota
explicando a quebra.

```text
feat(domain): add hour accumulation service
- Sum recorded hours against the total agreed in the agreement
- Expose remaining balance and completion percentage
- Keep the calculation in a single service used by every screen
```

Pelo terminal, passar a mensagem num único bloco ou arquivo: vários `-m` separam os
bullets em parágrafos. Separar em commits diferentes quando a mudança pode ser
revertida sozinha, quando mistura estrutura e comportamento, ou quando é só docs ou
ferramenta.

## Convenções

- Domínio (nomes de tabela, campo, regra de negócio) em português. Código,
  identificadores e mensagens de commit em inglês. Na prática: substantivos do domínio
  em português, verbos técnicos em inglês (`listEstudantes`, `findPerfisVigentes`).
- Colunas em `snake_case` no banco, chaves `camelCase` no Drizzle, campos `snake_case`
  no JSON da API.
- Toda duração é inteiro em minutos, com sufixo `_minutos`. A API converte para horas.
- Toda tabela tem RLS habilitada (testado em `tests/db/rls-invariants.test.ts`).
  Código de aplicação nunca importa `src/db/client.ts` nem `pg`: sempre passa por
  `withUser(identity, tx => ...)` de `src/db/with-user.ts`, que define
  `app.user_id` na transação. O lint bloqueia o import direto.
- `Identity` só é produzida por `src/lib/session.ts` a partir do cookie de sessão.
  Não construir `Identity` com cast fora dali e dos testes.
- Repositórios não filtram por usuário: quem decide quais linhas existem é a RLS.
  Um `WHERE usuario_id = ...` defensivo esconderia bug de política.
- Módulos de domínio ficam em `src/modules/<módulo>/{domain,services,repositories,schemas}`.
  Um módulo não importa o `repositories` de outro (bloqueado por lint); a
  comunicação entre módulos passa por `services`.
- A regra de negócio vive no domínio, não na tela. Componentes chamam a
  camada de domínio; nunca reimplementam validação de jornada ou soma de horas.
- Nada relevante é apagado. Aditivos, substituições de responsável e versões
  de relatório geram registro novo, nunca sobrescrevem o anterior. O papel
  `app_runtime` não tem `DELETE` em nenhuma tabela (testado); conceder exige decisão.
- Erro de negócio é `DomainError` com código estável (`src/lib/errors.ts`); a
  tradução para HTTP fica em `src/lib/api.ts`.
- Toda decisão técnica cita o RF ou a RN que a motiva.

## Módulos de domínio

| Módulo | Pasta | Agregados principais | RFs |
|---|---|---|---|
| M01 Acesso e Usuários | `src/modules/acesso` | Usuario, Perfil, Vinculo | RF001–RF003 |
| M02 Gestão Acadêmica | `src/modules/academico` | Curso, Estudante, ParametroInstitucional | RF004–RF006 |
| M03 Concedentes e Convênios | `src/modules/concedentes` | Concedente, Convenio | RF007–RF014 |
| M04 Gestão de Estágios | `src/modules/estagios` | Estagio, PlanoAtividades, Aditivo, Apolice, Assinatura, Afastamento, Rescisao | RF015–RF022, RF031–RF035, RF044–RF047, RF059–RF064 |
| M05 Acompanhamento | `src/modules/acompanhamento` | RegistroFrequencia, Relatorio, Avaliacao, Acompanhamento | RF023–RF030, RF036–RF043 |
| M06 Atividades Complementares | `src/modules/atividades` | AtividadeComplementar, Comprovante, Analise | RF048–RF055 |
| M07 Integralização | `src/modules/integralizacao` | ApuracaoIntegralizacao | RF056–RF058 |
| M08 Administração e Controle | `src/modules/administracao` | RegistroAuditoria, RelatorioGerencial, GuardaDocumental | RF065–RF070 |

Dependência entre módulos só nas direções previstas: M07 lê M04, M05 e M06;
M05 lê M04; M04 lê M02 e M03. Nenhuma dependência circular.

## Camadas

| Camada | Responsabilidade | Não faz |
|---|---|---|
| Apresentação | Renderizar, coletar entrada, exibir estado | Decidir se uma operação é permitida |
| API (`/api/v1`) | Autenticar, validar payload com Zod, traduzir erro de domínio em HTTP | Conter regra de negócio |
| Domínio | Regras de negócio, máquinas de estado, cálculo de horas | Conhecer HTTP ou React |
| Persistência | Acesso ao Postgres e ao Storage | Decidir regra |
| Banco | Integridade referencial, RLS, gatilhos de auditoria | |

Fluxo de escrita: `Route Handler (authenticatedRoute) -> valida sessão -> valida
schema (Zod) -> serviço de domínio -> withUser abre transação e define app.user_id
-> repositório -> RLS filtra -> trigger grava auditoria -> commit -> resposta`.
Referência implementada: `src/app/api/v1/estudantes/route.ts`.

## Mapa de arquitetura

```
src/app/(auth)/          login (e recuperação de senha, pendente)
src/app/(app)/           telas autenticadas; layout redireciona sem sessão
src/app/api/auth/        endpoints do Better Auth (/api/auth/*)
src/app/api/v1/          route handlers da API REST
src/modules/             8 módulos de domínio
src/shared/              transversal: documentos, notificacoes, auditoria, ui
src/db/                  client.ts (restrito), with-user.ts, errors.ts, schema/
src/lib/                 auth, session, identity, password, api, errors
drizzle/migrations/      SQL de tabelas gerado por drizzle-kit
drizzle/sql/             roles/, functions/, policies/, triggers/ (aplicados nessa ordem)
scripts/db/              migrate, seed
scripts/ci-local.mjs     CI local, espelho do .github/workflows/ci.yml
.githooks/               pre-push que recusa push direto em develop/main (core.hooksPath)
scripts/github/          batch:integrate, batch:pr, github:sync
tests/db/                testes de integração contra Postgres real
e2e/                     Playwright
docker/postgres/init/    papéis e bancos criados quando o volume nasce
```

## Banco: papéis e RLS

| Papel | Uso | Variável |
|---|---|---|
| `migrator` | Dono de tudo; roda migração e seed. Nunca usado pela aplicação | `DATABASE_MIGRATION_URL` |
| `app_runtime` | Código de domínio; sujeito à RLS; sem `DELETE`; sem acesso a tabelas de auth | `DATABASE_URL` |
| `auth_runtime` | Só o Better Auth; alcança `usuario`, `sessao`, `conta`, `verificacao`, `limite_requisicao` | `DATABASE_AUTH_URL` |

RLS é ignorada por superusuário, por papel com `BYPASSRLS` e pelo dono da tabela. Por
isso a aplicação nunca conecta como `migrator`, e `scripts/db/apply-migrations.ts`
aborta a migração se um papel de runtime puder contornar a RLS.

`drizzle/sql` é declarativo: a cada migração, todas as políticas e permissões de runtime
são apagadas e recriadas na mesma transação. O arquivo é a fonte da verdade.

Funções auxiliares ficam no schema `app`, em `security definer` com `search_path = ''`:
`app.usuario_atual_id()`, `app.tem_perfil_vigente(perfil)`, `app.coordena_curso(curso_id)`,
`app.coordena_estudante_usuario(usuario_id)`. Nas políticas, envolver chamadas que não
dependem da linha em `(select ...)` para o Postgres avaliar uma vez por consulta.

Perfil sozinho não basta. A permissão é a interseção de perfil e vínculo:

| Perfil | Alcance |
|---|---|
| Estudante | Apenas os próprios registros |
| Professor Orientador | Estágios em que consta como orientador vigente |
| Supervisor | Estágios em que consta como supervisor vigente |
| Coordenação | Estudantes e estágios do curso sob sua coordenação |
| Concedente | Estágios da própria concedente |
| Administrador | Parametrização e auditoria; sem acesso a conteúdo de relatório ou atestado |

Colunas usadas nas junções das políticas precisam de índice, senão a política vira o
gargalo. Toda política nova ganha teste que a viola isoladamente
(modelo: `tests/db/estudante-access.test.ts`).

## Autenticação

Better Auth com e-mail e senha (hash Argon2id), sessão em banco e expiração por 30 min
de inatividade. Cadastro próprio desabilitado: contas são criadas pelo administrador
(RF001). Usuário `INATIVO` não abre sessão, e uma sessão existente deixa de resolver
identidade assim que o usuário é inativado. O limite de tentativas de login fica em
banco (`limite_requisicao`), não em memória.

## Máquina de estados do estágio

```
RASCUNHO -> AGUARDANDO_ASSINATURAS -> PRONTO_PARA_ATIVACAO -> ATIVO -> CONCLUIDO
ATIVO <-> AFASTADO
ATIVO -> RESCINDIDO
AFASTADO -> RESCINDIDO
```

Guardas de `PRONTO_PARA_ATIVACAO -> ATIVO`, todas na mesma transação: concedente
não suspensa (RF008), convênio vigente na data de início (RF010), plano de
atividades aprovado (RF017), orientador e supervisor vinculados (RF032),
apólice vigente quando exigida (RF018), três assinaturas registradas (RF019).
Se qualquer guarda falhar, a resposta é 409 com todos os impedimentos de uma vez.

## Decisões de negócio já fechadas

Pontos que antes eram ambíguos e já têm decisão definida (não implemente a
alternativa descartada por engano):

| Ponto | Decisão |
|---|---|
| Assinatura do TCE (RF019) | Registrada no sistema: identificação, data, hora, hash. Sem ICP-Brasil |
| Notificação (RF012, RF035, RF040, RF070) | Só dentro do sistema. Sem e-mail |
| Estágios simultâneos | Não permitidos. Um estudante só pode ter um estágio ATIVO por vez |
| Afastamento | Estende `data_fim` automaticamente, mesmo nº de dias corridos |
| Duração máxima (24 meses) | Por vínculo estudante-concedente (Lei 11.788/2008, art. 11) |
| Recurso contra recusa de atividade complementar | Não existe; cadastra-se nova atividade |
| Divergência relevante de carga horária | Percentual parametrizável, padrão 10% |
| Hospedagem em território nacional | Sem exigência |

Em aberto: recuperação de senha (RF002) precisa de um canal fora do sistema, mas
notificação é só in-app. Não implementar envio de e-mail sem decisão registrada.

## Requisitos de qualidade (resumo)

Segurança > Confiabilidade > Manutenibilidade, nessa prioridade quando conflitam.
RLS sem exceção (testado); leitura de atestado médico registrada em auditoria;
sessão expira em 30min; leitura p95 < 800ms; PDF em até 5s; uptime ≥ 99% em
horário comercial; toda RN nova exige teste; cálculo de horas é determinístico.

## Pegadinhas conhecidas

- Hooks não têm extensão. Com CRLF, o `sh` do Git no Windows falha com "not found";
  o `.gitattributes` força LF em `.githooks/*`. Não remover essa regra.
- O e2e do `npm run ci` sobe o build de produção na porta 3000. Parar o `npm run dev`
  antes, senão o passo falha avisando que a porta está ocupada.
- O bit de execução do hook não sobrevive a um arquivo recém-criado no Windows. Ao adicionar
  ou recriar `.githooks/pre-push`: `git add --chmod=+x .githooks/pre-push`.
- Deploy na Vercel fica para o futuro. Quando entrar: a integração Neon + Vercel injeta
  `DATABASE_URL` com o papel dono do banco, o que **contorna toda a RLS**. Em produção,
  `DATABASE_URL` é `app_runtime`, `DATABASE_AUTH_URL` é `auth_runtime`, e a migração roda num
  job separado com `DATABASE_MIGRATION_URL`, nunca no build da Vercel (o build não depende de
  banco). Branch Neon por preview esgota o limite de 10 branches do plano gratuito.
- O init do Postgres (`docker/postgres/init`) só roda quando o volume é criado. Se o
  container já existia antes dos papéis, recriar: `docker compose down -v` e subir de novo.
- No Neon, a migração cria `app_runtime` e `auth_runtime` sem login. Habilitar uma vez
  por ambiente com senha gerada: `alter role app_runtime with login password '...'`
  (idem `auth_runtime`). `DATABASE_MIGRATION_URL` usa o dono (`neondb_owner`) na
  conexão direta; as outras duas usam a conexão com pooler.
- O pooler do Neon opera em modo transação. `set_config(..., true)` é obrigatório
  (local à transação); um valor de sessão vazaria a identidade para outra requisição.
  O driver `pg` com Drizzle usa statements sem nome e funciona com esse pooler.
- `next build` não pode depender de banco: `getAuth()` e os pools são criados sob
  demanda. Não instanciar nada disso no topo de um módulo.
- O Next renderiza um anunciador de rota com `role="alert"`. Em Playwright, filtrar
  alertas por texto.
- Primeira consulta após inatividade no plano gratuito do Neon leva
  ~0.5s a mais (cold start). Aquecer o banco antes de demonstração ao vivo.
- Buckets do Cloudflare R2 são privados; download sempre passa por endpoint
  que verifica permissão e emite URL assinada de expiração curta, nunca URL
  pública direta.
- Bucket Locks do R2 não é imutabilidade absoluta: um administrador da conta
  ainda consegue remover a regra de retenção. É uma segunda barreira, não a
  única (a primeira é o gatilho `BEFORE DELETE` no banco).

## Roadmap (fases)

0. Fechamento da documentação (**concluída**).
1. Fundação técnica: RNFs (feito), DER lógico (proposta), migrações, wrapper de
   identidade, papéis e RLS, auditoria, autenticação e CI (feitos no lote
   `integration/fase-1-fundacao`, com fatia vertical de curso e estudante).
2. Cadastros e formalização: cursos, estudantes, concedentes, convênios,
   TCE, ativação de estágio.
3. Acompanhamento: frequência, carga horária, relatórios, avaliação.
4. Atividades complementares e integralização.
5. Ocorrências, conclusão e conformidade: afastamento, prorrogação,
   rescisão, guarda documental, relatórios gerenciais.

A ordem segue dependência de dados, não a numeração dos RFs: sem perfil e
vínculo (Fase 1), nenhuma política RLS pode ser escrita; sem curso e
exigência curricular (Fase 2), não há como validar carga mínima.

Critérios de saída:

| Fase | Critério |
|---|---|
| 1 | Um usuário de cada perfil autentica e enxerga apenas o que lhe cabe, comprovado por teste automatizado. Orientador, supervisor e concedente completam o critério quando `estagio` existir |
| 2 | Um estágio percorre `RASCUNHO → ATIVO`, e cada guarda de ativação é comprovada por teste que a viola isoladamente |
| 4 | A vedação de dupla contagem (RN-36) tem teste que a força a falhar antes de passar |

## Documentação

Requisitos, regras de negócio e documentos formais da disciplina são mantidos fora
do repositório pela equipe. Neste repositório, a referência é este arquivo, o
`README.md` e o próprio código: schema em `src/db/schema`, segurança em
`drizzle/sql`, contratos da API em `src/modules/*/schemas` e comportamento esperado
nos testes. Quando uma regra de negócio não estiver coberta aqui nem no código,
perguntar em vez de supor.
