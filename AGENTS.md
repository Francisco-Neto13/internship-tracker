# AGENTS.md

Internship Tracker: Plataforma de Acompanhamento de Estágios e Atividades Complementares.
Projeto acadêmico (disciplina Project Lab). Especificação: 6 atores, 37 regras de negócio
(RN-01 a RN-38, com RN-20 suprimida), 73 requisitos funcionais (RF001 a RF073), 23 casos
de uso, 8 módulos. Documento oficial: `documentation/requisitos/Internship_Tracker_Documento_Final_v1.3.docx`.

## Comandos

```bash
docker compose up -d postgres storage --wait   # Postgres 17 (papéis, dev e _test) e SeaweedFS (S3)
cp .env.example .env                   # preencher BETTER_AUTH_SECRET
npm install               # também ativa os hooks de .githooks (prepare)
npm run db:migrate        # tabelas (drizzle/migrations) + segurança (drizzle/sql)
npm run db:seed           # usuários de desenvolvimento, senha "senha-dev-internship"
npm run storage:init      # bucket privado e CORS do upload direto (idempotente)
npm run storage:check     # confere bucket e CORS
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

Toda migração de tabela nova ganha `drizzle/rollback/<migração>.down.sql`, testado à mão
(ordem: tabelas, depois funções que usam os tipos na assinatura, depois os tipos). Mudança
em tabela com dados entra sem quebrá-los: coluna nova anulável ou com padrão, check criado
`NOT VALID` e validado quando os dados permitem (modelo: `0003_concedentes`).

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
  `app.usuario_id` na transação. O lint bloqueia o import direto.
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
| M08 Administração e Controle | `src/modules/administracao` | RegistroAuditoria, RelatorioGerencial, GuardaDocumental, AcessoDocumentoSensivel | RF065–RF073 |

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
schema (Zod) -> serviço de domínio -> withUser abre transação e define app.usuario_id
-> repositório -> RLS filtra -> trigger grava auditoria -> commit -> resposta`.
Referência implementada: `src/app/api/v1/estudantes/route.ts`.

## Mapa de arquitetura

```
src/app/(auth)/          login e troca de senha (/trocar-senha)
src/app/(app)/           telas autenticadas; layout redireciona sem sessão
src/app/api/auth/        endpoints do Better Auth (/api/auth/*)
src/app/api/v1/          route handlers da API REST
src/modules/             8 módulos de domínio
src/shared/              transversal: documentos, notificacoes, auditoria, ui
src/db/                  client.ts (restrito), with-user.ts, errors.ts, schema/
src/lib/                 auth, session, identity, password, api, errors
drizzle/migrations/      SQL de tabelas gerado por drizzle-kit
drizzle/rollback/        reversão manual de cada migração (*.down.sql)
drizzle/sql/             roles/, functions/, policies/, triggers/ (aplicados nessa ordem)
scripts/db/              migrate, seed
scripts/storage/         init (bucket e CORS) e check do armazenamento local
src/shared/documentos/   upload direto (D8): token, conteúdo pelos bytes, armazenamento S3 e em memória
scripts/ci-local.mjs     CI local, espelho do .github/workflows/ci.yml
.githooks/               pre-push que recusa push direto em develop/main (core.hooksPath)
scripts/github/          batch:integrate, batch:pr, github:sync
tests/db/                testes de integração contra Postgres real
e2e/                     Playwright; e2e/support/hibp-stub.mjs simula a API de senhas vazadas
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
aborta a migração se um papel de runtime puder contornar a RLS. Em tempo de execução,
`src/db/client.ts` recusa criar o pool se `DATABASE_URL` não conectar como `app_runtime`
(ou `DATABASE_AUTH_URL` como `auth_runtime`).

Não usar `FORCE ROW LEVEL SECURITY`: as funções `security definer` de `app.*` rodam como
dono justamente para ler `vinculo_perfil` sem recursão na própria política, e o gatilho de
auditoria grava como dono. Com `FORCE`, as políticas e a auditoria quebram.

`drizzle/sql` é declarativo: a cada migração, todas as políticas e permissões de runtime
são apagadas e recriadas na mesma transação. O arquivo é a fonte da verdade.

Funções auxiliares ficam no schema `app`, em `security definer` com `search_path = ''`:
`app.usuario_atual_id()`, `app.tem_perfil_vigente(perfil)`, `app.coordena_curso(curso_id)`,
`app.coordena_estudante_usuario(usuario_id)`, `app.representa_concedente(concedente_id)`,
`app.e_responsavel_vigente(estagio_id, papel)`, `app.convenio_vigente_em(convenio_id, concedente_id, data)`. Nas políticas, envolver chamadas que não
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

Política `SELECT` de tabela em que o app insere com `RETURNING` (todo `insert` do Drizzle)
precisa decidir pelas colunas da própria linha (`estudante_id = ...`, `app.coordena_curso(curso_id)`),
não por função que busca a linha pelo id: a função roda com o snapshot anterior ao `INSERT`,
não a enxerga e o `RETURNING` falha com violação de RLS (modelo: `estagio_leitura`).

Gatilho de regra levanta `P0001` com mensagem `CODIGO: texto`; `isTriggerRule` (`src/db/errors.ts`)
converte em `DomainError` com o mesmo código. Colunas sensíveis entram mascaradas na auditoria:
registrar em `app.coluna_sensivel` (`drizzle/sql/functions/02_auditoria.sql`), com teste.

Colunas usadas nas junções das políticas precisam de índice, senão a política vira o
gargalo. Toda política nova ganha teste que a viola isoladamente
(modelo: `tests/db/estudante-access.test.ts`).

## Autenticação

Better Auth com e-mail e senha (hash Argon2id), sessão em banco e expiração por 30 min
de inatividade. Cadastro próprio desabilitado: contas são criadas pelo administrador
(RF001). Usuário `INATIVO` não abre sessão, e uma sessão existente deixa de resolver
identidade assim que o usuário é inativado. O limite de tentativas de login fica em
banco (`limite_requisicao`), não em memória.

Senha: 15 a 128 caracteres (NIST SP 800-63B-4). Senha nova é recusada se aparecer em
vazamentos (plugin próprio `senhasVazadas`, `src/lib/senhas-vazadas.ts`: só 5 caracteres do
SHA-1 saem do servidor, com padding; se a consulta falhar, a troca é recusada; `HIBP_RANGE_URL`
troca o endpoint, e o e2e usa o stub local, com a consulta real num passo que não bloqueia o CI) ou se for o nome do sistema, o e-mail, o nome do
usuário ou derivações (`senha-contextual.ts`, comparação da senha inteira).
`SENHAS_VAZADAS_VERIFICACAO=desligada` só vale fora de produção (os testes de banco usam).
Rotas HTTP de conta que o domínio cobre ficam fechadas em `disabledPaths` (`/update-user`,
`/change-password` e outras); chamadas `auth.api.*` no servidor não são afetadas. Senha
provisória gerada é gravada com `hashPassword` direto (`definirSenha`), porque o plugin exige
contexto de rota da biblioteca.

Limite de login por IP: a origem do endereço vem de `AUTH_IP_HEADERS` e
`AUTH_TRUSTED_PROXIES` (`src/lib/auth-options.ts`). Na Vercel o padrão confia em
`x-vercel-forwarded-for`/`x-forwarded-for`, que a plataforma sobrescreve. Em hospedagem
própria, produção sem essas variáveis não inicia.

Conta nova ou senha esquecida recebe senha provisória (`usuario.troca_senha_obrigatoria`, `senha_provisoria_expira_em`).
Enquanto a troca estiver pendente, `authenticatedRoute` responde 403
`TROCA_SENHA_OBRIGATORIA` (exceto rotas com `permitirTrocaSenhaPendente`) e `getIdentity()`
redireciona as telas para `/trocar-senha`. Páginas usam `getIdentity()`, não `getSession()`,
para não ler dados com a troca pendente. Hash e sessão são escritos só pelo adaptador do
Better Auth (`src/lib/credenciais.ts`); `app_runtime` nunca toca em `conta` ou `sessao`.

Privilégio de `app_runtime` em `usuario` é por coluna. O Drizzle lista toda coluna no
`INSERT` (com `DEFAULT`) e o Postgres exige privilégio em cada uma: inserir em tabela com
grant por coluna exige SQL com a lista explícita (modelo: `insertUsuario`). Tabelas novas
recebem `INSERT` na tabela inteira e `UPDATE` por coluna; o que o app não pode gravar fica
num gatilho `BEFORE` que recusa (modelo: `validar_alteracao_concedente`).

## Máquina de estados do estágio

Fonte: documento de requisitos v1.2, §8.6 (Figura 2). São quatro estados, com os mesmos
nomes exibidos na interface:

```
[cadastro] -> EM_FORMALIZACAO -> ATIVO -> CONCLUIDO
                                 ATIVO -> RESCINDIDO
                                 ATIVO -> ATIVO   (aditivo, prorrogação, afastamento)
```

Aditivo, prorrogação e afastamento não mudam o estado: o estágio segue `ATIVO`, com
prazos e cargas recalculados. Não existem `AFASTADO`, `RASCUNHO`,
`AGUARDANDO_ASSINATURAS` nem `PRONTO_PARA_ATIVACAO`: "em afastamento" e as etapas da
formalização (TCE em edição, TCE fechado para assinatura, assinaturas coletadas) são
derivadas dos dados (`DER-LOGICO.MD` §5.1 e §9 D9). Reabrir um TCE fechado anula as
assinaturas por divergência de hash, sem apagá-las.

Guardas de `EM_FORMALIZACAO -> ATIVO`, todas na mesma transação: concedente não suspensa
(RF008), convênio vigente na data de início (RF010), plano de atividades aprovado (RF017),
orientador e supervisor vinculados (RF032), apólice vigente quando exigida (RF018), três
assinaturas sobre o hash do TCE fechado (RF019), estudante `MATRICULADO` (Lei
11.788/2008, art. 3º, I) e nenhum outro estágio `ATIVO` do estudante. Se qualquer guarda
falhar, a resposta é 409 com todos os impedimentos de uma vez.

Guardas de `ATIVO -> CONCLUIDO`: avaliação de desempenho registrada (RF043) e, se
obrigatório, carga mínima homologada e relatório final aprovado (RF045); nenhum lançamento
de frequência pendente de homologação.

Relatório periódico: `PENDENTE -> EM_ANALISE -> APROVADO | DEVOLVIDO`, `DEVOLVIDO ->
EM_ANALISE`; "em atraso" é derivado do prazo. Atividade complementar: `EM_ANALISE ->
APROVADA | RECUSADA | DEVOLVIDA`, `DEVOLVIDA -> EM_ANALISE`; `RECUSADA` é final.

Situação acadêmica (implementada, serviço e gatilho): `MATRICULADO -> TRANCADO | FORMADO |
DESLIGADO`, `TRANCADO -> MATRICULADO | DESLIGADO`; `FORMADO` e `DESLIGADO` finais.
Leitura mais restritiva da lei, **pendente de validação com o orientador**.

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
| Situação acadêmica (RF005) | Transições restritas (acima), validadas no serviço e por gatilho, auditadas. **Pendente de validação com o orientador** |
| Duração máxima e afastamento (RF060, RF062) | O afastamento estende `data_fim` só até o teto de 2 anos no par estudante–concedente; a exceção do art. 11 (estagiário com deficiência) é marcada no estágio pela coordenação, com documento, nunca no estudante |
| Frequência (RF023, RF024) | Um lançamento vigente por dia, com intervalo; limite semanal pela semana ISO (segunda a domingo); conclusão bloqueada se houver lançamento pendente de homologação |
| Relatório e atividade fora do prazo (RF037) | Relatório enviado depois do prazo é aceito e marcado como em atraso |
| Aproveitamento de estágio não obrigatório (RF046) | Concluído ou rescindido, limitado aos minutos homologados, sempre com análise do responsável |
| Mudança de curso | Estágio mantém o curso de origem; a apuração conta só estágios do curso atual, e os anteriores entram por decisão da coordenação |
| Upload | PDF, JPEG ou PNG, até 10 MiB, direto ao R2 por URL assinada; o servidor confere tamanho, tipo pelos bytes e SHA-256 antes de aceitar |
| Dados de saúde (RN-38, RF071–RF073) | Atestado e documento de dispensa são sensíveis: acesso só por vínculo, criptografia em repouso do R2, cada visualização ou download registrado; o administrador não lê o conteúdo |
| Recuperação de senha (RF002) | O administrador emite senha provisória (`POST /usuarios/{id}/senha-provisoria`), entregue fora do sistema; 72 h de validade; troca obrigatória no primeiro acesso. Sem e-mail |

## Requisitos de qualidade (resumo)

Segurança > Confiabilidade > Manutenibilidade, nessa prioridade quando conflitam.
Fonte: RNF-01 a RNF-13 do documento de requisitos v1.2. Essenciais: RLS na camada de dados
(RNF-01, testado), hash adaptativo de senha (RNF-02), inativação na requisição seguinte
(RNF-03), auditoria só de inserção (RNF-04), dado de saúde com acesso por vínculo,
criptografia em repouso e leitura registrada (RNF-05), arquivo privado com link temporário
(RNF-06), cálculo de horas único e determinístico no servidor (RNF-07), hash SHA-256 de TCE e
aditivo assinados (RNF-08). Importantes: 360 px sem rolagem horizontal (RNF-09), WCAG 2.1 AA
(RNF-10), p95 de 2 s nas consultas (RNF-11), backup com restauração a ponto no tempo
(RNF-12), duas últimas versões de Chrome, Edge, Firefox e Safari (RNF-13). Sessão expira em
30 min; toda RN nova exige teste. As metas mais apertadas do `DAS.docx` §10 (p95 < 800 ms,
PDF em 5 s, uptime ≥ 99%) são alvo da equipe, não requisito.

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
- Armazenamento local é SeaweedFS (`chrislusf/seaweedfs`, comando `mini`, porta 8333): o
  MinIO deixou de publicar imagens da edição comunitária. Mesma API S3 do R2; o código só
  muda por `R2_ENDPOINT` e `R2_FORCE_PATH_STYLE`.
- URL de upload assinada: o SDK v3 assina por padrão um CRC32 do corpo ainda inexistente, e o
  bucket recusa o PUT real. O cliente usa `requestChecksumCalculation: "WHEN_REQUIRED"`.
- Cabeçalho extra no navegador (por exemplo `extraHTTPHeaders` do Playwright) vai também no PUT
  direto ao bucket e quebra o preflight de CORS. Spec que envia arquivo pela tela não usa
  `extraHTTPHeaders`.
- Schemas Drizzle que se referenciam formam ciclo de import: enums compartilhados ficam em
  `src/db/schema/enums.ts`, e FK circular usa `(): AnyPgColumn => ...`.
- Scripts `tsx` rodam como CommonJS: sem `await` no topo, usar `main().catch(...)`.
- Buckets do Cloudflare R2 são privados; download sempre passa por endpoint
  que verifica permissão e emite URL assinada de expiração curta, nunca URL
  pública direta.
- Bucket Locks do R2 não é imutabilidade absoluta: um administrador da conta
  ainda consegue remover a regra de retenção. É uma segunda barreira, não a
  única (a primeira é o gatilho `BEFORE DELETE` no banco).

## Roadmap (fases)

0. Fechamento da documentação (**concluída**).
1. Fundação técnica (**concluída**): RNFs, DER lógico (proposta), migrações, wrapper de
   identidade, papéis e RLS, auditoria, autenticação e CI (lote
   `integration/fase-1-fundacao`); gestão de usuários e perfis, senha provisória, detalhe e
   edição de curso e estudante, consulta e exportação da auditoria (lote
   `integration/fase-1-fechamento`).
2. Cadastros e formalização (**concluída**, lote `integration/fase-2-cadastros`):
   parâmetros institucionais e categorias, concedentes com histórico de situação, vínculo de
   supervisor e concedente, convênios com vigência e renovação, upload direto de documentos,
   TCE com fechamento e reabertura, plano de atividades, responsáveis, apólice, assinaturas,
   ativação com todas as guardas, aditivos e substituição de responsáveis; mascaramento de
   colunas sensíveis na auditoria; stub do HIBP no CI.
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
| 2 | Um estágio percorre `EM_FORMALIZACAO → ATIVO`, e cada guarda de ativação é comprovada por teste que a viola isoladamente (`tests/db/estagio-formalizacao.test.ts`, `e2e/estagio.spec.ts`) |
| 4 | A vedação de dupla contagem (RN-36) tem teste que a força a falhar antes de passar |

## Documentação

Requisitos, regras de negócio e documentos formais da disciplina são mantidos fora
do repositório pela equipe. Neste repositório, a referência é este arquivo, o
`README.md` e o próprio código: schema em `src/db/schema`, segurança em
`drizzle/sql`, contratos da API em `src/modules/*/schemas` e comportamento esperado
nos testes. Quando uma regra de negócio não estiver coberta aqui nem no código,
perguntar em vez de supor.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
