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
npm run db:primeiro-admin -- <e-mail> <nome>  # primeiro administrador de um banco vazio; o seed recusa banco remoto
npm run db:desempenho     # carga (600 estágios, ~98 mil lançamentos) e p95 das leituras de M05, só em *_test
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
   (o CI remoto roda de novo). Não há promoção automática: a `main` só muda quando alguém decide
   promover. O que chega à `main` vai para produção sozinho, depois do CI verde (seção Produção).

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
- Colunas lado a lado usam `colunas-alinhadas` (`globals.css`) e terminam na mesma linha; `e2e/alinhamento.spec.ts` mede. Coluna é `flex flex-col`, e o último painel cresce.
- Tela de login: o percurso real do estágio é o herói, e o formulário vem primeiro no documento (`src/app/(auth)/login`). Cada frase de `percurso-estagio.tsx` espelha uma regra do sistema: se a regra mudar, o texto muda junto. O formulário cabe em 1280×720 sem rolagem, com teste. A tela não tem largura máxima: título, cartão e percurso crescem com o monitor, e o teste mede o vão até 2560 px. Breakpoint arbitrário em `rem`: misturado com `px`, o Tailwind não garante a ordem e a regra maior pode perder.
- Documento enviado precisa de caminho de volta na tela: `BaixarDocumento`, onde quem decide ou consulta o registro o vê (RF071).
- Tela restrita por perfil começa com `identidadeDaTela(rota)` (`src/lib/acesso-tela.ts`), que lê o registro do menu e leva a `/sem-acesso`. Rota nova entra em `NAVEGACAO` ou em `ROTAS_SEM_MENU`, e na matriz de `e2e/visibilidade-por-perfil.spec.ts`. Aba ou formulário que o perfil não usa não aparece: não mostrar a aba só para dizer que está fora do alcance.
- Arquivo gerado por rota `/api/v1` baixa com `BaixarArquivo`, nunca por link direto: num link, a recusa da API abre o JSON na tela. PDF e CSV mostram nomes de `rotulos.ts` e datas de `datas.ts`, não códigos nem UUID.
- Texto que a pessoa lê não cita RF, RN nem DER: a rastreabilidade fica nos comentários e no campo `requisito` da API. Escolher uma pessoa é por nome (`BuscaConta`), nunca por código interno. A auditoria aparece em palavras por `src/lib/auditoria-texto.ts`; os valores exatos ficam no banco e na API.
- Cabeçalhos de segurança de toda resposta ficam em `next.config.ts`, e `e2e/cabecalhos.spec.ts` confere: o proxy do servidor não define nenhum. Não há CSP de script, porque exigiria nonce em cada render; quem incluir uma mede as telas antes.
- Limite e formato de campo saem de `src/lib/campos.ts`, lido pelo schema Zod e pela tela (issue #97): a tela só ajuda, o servidor decide. Campo de texto sem limite não passa no lint nem compila em `FormularioApi`. Senha não usa `maxLength`, porque colar cortaria sem avisar: o formulário confere. CNPJ aceita letras nos 12 primeiros caracteres (IN RFB 2.229/2024).
- Formulário avisa o erro ao sair do campo, com o schema da rota que recebe o envio (`useValidacao`, `src/shared/ui/validacoes.ts`; `FormularioApi` exige `validacao`). Salvar confere tudo e leva ao primeiro erro, sem enviar. Schema que lê `@/db/schema` não vai ao navegador: ali, escrever a regra em `validacoes.ts` com os valores de `LIMITE`.
- Ação de um clique cujo efeito é caro ou impossível de desfazer pede confirmação dizendo a consequência
  (`Confirmacao`, ou a prop `confirmacao` de `BotaoAcao` e `FormularioApi`): sair, decisão final, assinatura,
  rescisão, permissões. Ação reversível não pede: confirmar tudo ensina a clicar sem ler. Cancelar recebe o foco.
- Cada pessoa vê só a ação que lhe cabe. No estágio, `acoesNoEstagio` (`src/modules/estagios/domain/papeis.ts`) lê os papéis
  dela naquele estágio pelas mesmas funções `app.*` das políticas, e cada ação cita a regra que a decide: regra de escrita nova
  entra lá junto com a tela. Fila de decisão lista só o que quem vê decide (`analisaveis` nas atividades). A tela só esconde;
  quem decide continua sendo a API e o banco (`e2e/acoes-por-perfil.spec.ts`).
- Troca de perfil (RF003): o administrador usa o sistema como outra conta pelo botão "Ver como", para conferir o alcance de
  cada perfil e percorrer um fluxo inteiro (assinar o TCE por cada parte, por exemplo) sem entrar e sair. O perfil é só dos
  desenvolvedores, e a troca grava em produção. A troca é uma linha de `contexto_administrador` ligada à sessão, auditada e
  relida a cada requisição em `resolveSession` (`src/lib/session.ts`): `identity` passa a ser a conta escolhida, com
  `titularId`, e `titular` continua sendo quem entrou. `withUser` define `app.titular_id` e liga `app.em_contexto_administrador()`:
  a escrita passa como a conta, sob as políticas dela, e o gatilho de auditoria grava o administrador em `auditoria.titular_id`
  por `app.titular_atual_id()`, que só aceita o valor com troca aberta para aquela conta. O limite do administrador vale
  também na troca: conteúdo de relatório oculto, relatório não é enviado nem analisado (`CONTEXTO_SEM_RELATORIO`, políticas de
  `versao_relatorio`, `anexo_relatorio` e `parecer_relatorio`), documento não abre (`CONTEXTO_SEM_DOCUMENTO`). Rota com
  `foraDaTroca` (troca de senha) responde 403 `CONTEXTO_ACAO_DA_CONTA`; só as rotas com `comoTitular` (`/api/v1/contexto`)
  agem como quem entrou. O cookie `contexto-perfil` só evita a consulta nas outras sessões. Testes:
  `tests/db/contexto-administrador.test.ts`, `e2e/troca-de-perfil.spec.ts`.
- Estado de listagem mora na URL e é resolvido no servidor: `?busca=&pagina=&por_pagina=&ordem=campo|-campo&<filtros>`
  (`src/lib/consulta.ts`, componentes `Paginacao`, `BarraFiltros`, `DataTable`). Ordem desconhecida cai no padrão.
  O link de volta de um registro leva `?voltar=`, aceito só com o prefixo da própria listagem.
- Nome e tom de situação ficam em `src/lib/rotulos.ts`; datas em `src/lib/datas.ts`. Tela não exibe código cru.
- Indicador sem dado é `null` e aparece como "Sem dado" com o motivo, nunca como zero. A interface não usa travessão: em texto, ponto, vírgula ou dois-pontos; em valor vazio, uma palavra que diga o que falta ("Sem data", "Não informado"). O painel só mostra número
  que vem do banco; não há tendência porque não há série histórica.

## Movimento

Animação serve para explicar o que aconteceu, nunca para enfeitar nem para fazer alguém esperar. Só CSS, com tokens em `src/app/globals.css`, sem biblioteca: o Radix já espera a saída terminar, e o sistema não tem animação de layout que justifique o Motion. Não usar View Transition na navegação: ela congela a tela enquanto troca.

| Token | Valor | Uso |
|---|---|---|
| `--duracao-rapida` | 100 ms | Hover, foco, clique |
| `--duracao-media` | 180 ms | Menu, tooltip, fundo de modal, troca de página, aviso |
| `--duracao-entrada` | 260 ms | Modal, gaveta, cartão entrando |
| `--duracao-saida` | 160 ms | Tudo que sai: sair é mais rápido que entrar |
| `--duracao-progresso` | 500 ms | Barra e número contando, só no painel. É o teto do sistema |
| `--atraso-sequencia` | 40 ms | Entre itens de um grupo, parando no sexto |
| `ease-padrao`, `ease-entrada`, `ease-saida` | Curvas produtivas do IBM Carbon | O elemento fica, chega ou sai |

| Componente ou classe | Para quê |
|---|---|
| `animate-surgir` | Fade com 6 px de deslocamento: cartão, painel, estado vazio, login |
| `animate-aparecer` | Só fade: conteúdo de página, por `.conteudo-pagina` (`template.tsx`), e linha de tabela |
| `animate-aviso` | Mensagem de erro de campo e confirmação de salvo |
| `animate-tremer` | Só erro de login. Não usar em validação de campo: seria repetitivo |
| `animate-modal-*`, `animate-overlay-*`, `animate-menu-*`, `animate-gaveta-*` | Abrir e fechar, ligados ao `data-state` do Radix |
| `animate-crescer-x` | Barra crescendo com `scaleX`, com `origin-left` |
| `.grupo-em-sequencia`, `.linhas-em-sequencia` | Filhos entrando em sequência curta |
| `ContadorAnimado` | Número contando; o leitor de tela recebe o valor certo desde o início |
| `Button carregando` | Mostra o indicador, desabilita e marca `aria-busy` |
| `Esqueleto`, `loading.tsx` | Forma do conteúdo enquanto a página carrega |

Regras: animar só `transform` e `opacity`, salvo borda e cor em hover e foco. Nada em loop, exceto indicador de carregamento e esqueleto. Quanto mais frequente a ação, mais discreta a animação. `prefers-reduced-motion` zera duração e atraso em tudo (`globals.css`), e o e2e roda assim por padrão (`playwright.config.ts`); `e2e/movimento.spec.ts` liga o movimento onde ele é o assunto. Não animar: digitação, ordenação, paginação, busca, foco, nem texto longo sendo lido.

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
scripts/storage/         init (bucket e CORS) e check do armazenamento
scripts/servidor/        produção: cofre criptografado, publicação, deploy, rotina diária e backup
src/shared/documentos/   upload direto (D8): token, conteúdo pelos bytes, armazenamento S3 e em memória
scripts/ci-local.mjs     CI local, espelho do .github/workflows/ci.yml
.githooks/               pre-push que recusa push direto em develop/main (core.hooksPath)
scripts/github/          batch:integrate, batch:pr, github:sync
tests/db/                testes de integração contra Postgres real
e2e/                     Playwright; e2e/support/hibp-stub.mjs simula a API de senhas vazadas
docker/postgres/init/    papéis e bancos criados quando o volume nasce
docker-compose.prod.yml  serviços de produção; por enquanto, o armazenamento com criptografia
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
`app.usuario_atual_id()`, `app.em_contexto_administrador()`, `app.titular_atual_id()`, `app.tem_perfil_vigente(perfil)`, `app.coordena_curso(curso_id)`,
`app.coordena_estudante_usuario(usuario_id)`, `app.representa_concedente(concedente_id)`,
`app.e_responsavel_vigente(estagio_id, papel)`, `app.convenio_vigente_em(convenio_id, concedente_id, data)`,
`app.estagios_legiveis(academico)`, `app.pode_ler_relatorios(estagio_id)`, `app.hoje()` (data em
America/Sao_Paulo), `app.parametros_em(data)`, `app.travar_estagio(estagio_id)`,
`app.impedimentos_conclusao(estagio_id)`, `app.registrar_leitura_documento(documento_id)`,
`app.estudantes_legiveis()`, `app.identidades_estudante()`, `app.buscar_contas_estudante(busca)`, `app.buscar_contas_responsavel(estagio_id, papel, busca)`, `app.solicitar_recuperacao_senha(email)`, `app.calcular_integralizacao(estudante_id)`,
`app.apurar_integralizacao(estudante_id, gatilho)`, `app.notificar(...)` e `app.rotina_diaria()`,
`app.periodos_afastamento(estagio_id)`, `app.teto_duracao_estagio(estagio_id)`,
`app.definir_guarda_estagio(estagio_id, data)`, `app.eliminar_documento(documento_id)`,
`app.cursos_gerenciaveis()`, `app.relatorio_*` (relatórios gerenciais) e
`app.dados_declaracao(...)`/`app.verificar_declaracao(codigo)`. Nas políticas, envolver chamadas que não
dependem da linha em `(select ...)` para o Postgres avaliar uma vez por consulta.

Perfil sozinho não basta. A permissão é a interseção de perfil e vínculo:

| Perfil | Alcance |
|---|---|
| Estudante | Apenas os próprios registros |
| Professor Orientador | Estágios em que consta como orientador vigente |
| Supervisor | Estágios em que consta como supervisor vigente |
| Coordenação | Estudantes e estágios do curso sob sua coordenação |
| Concedente | Estágios da própria concedente |
| Administrador | Parametrização e auditoria; age como outra conta pela troca de perfil, com o próprio nome na auditoria; sem acesso a conteúdo de relatório ou atestado, também na troca |

Política `SELECT` de tabela em que o app insere com `RETURNING` (todo `insert` do Drizzle)
precisa decidir pelas colunas da própria linha (`estudante_id = ...`, `app.coordena_curso(curso_id)`),
não por função que busca a linha pelo id: a função roda com o snapshot anterior ao `INSERT`,
não a enxerga e o `RETURNING` falha com violação de RLS (modelo: `estagio_leitura`).

Tabela filha volumosa (frequência, homologação, avaliação, relatório) filtra pelo conjunto
`estagio_id in (select app.estagios_legiveis())` (atividades e integralização, por
`estudante_id in (select app.estudantes_legiveis())`), planejado uma vez por consulta, e não por
`app.pode_ler_estagio(estagio_id)`, que custa quatro consultas por linha: a listagem de
divergências caiu de 62 s para 12 ms com 98 mil lançamentos (`npm run db:desempenho`). Leitura
nova sobre essas tabelas entra na medição antes do merge.

Gatilho de regra levanta `P0001` com mensagem `CODIGO: texto`; `isTriggerRule` (`src/db/errors.ts`)
converte em `DomainError` com o mesmo código. Colunas sensíveis entram mascaradas na auditoria:
registrar em `app.coluna_sensivel` (`drizzle/sql/functions/02_auditoria.sql`), com teste. Leitura
de documento sensível não aparece para o banco: o download chama `app.registrar_leitura_documento`,
que concede e grava `LEITURA` na mesma transação (RF072); não há outro caminho para a URL.

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
`AUTH_TRUSTED_PROXIES` (`src/lib/auth-options.ts`). Produção sem essas variáveis não inicia;
no servidor, o proxy define `x-real-ip`.

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
de frequência pendente de homologação. Implementadas no banco (`app.impedimentos_conclusao`): o
gatilho do estágio recusa a transição com `CONCLUSAO_BLOQUEADA` e a lista nos `details`; a
conclusão da Fase 5 só faz o `UPDATE`.

Relatório periódico: `PENDENTE -> EM_ANALISE -> APROVADO | DEVOLVIDO`, `DEVOLVIDO ->
EM_ANALISE`; "em atraso" é derivado do prazo. Gerado na ativação (gatilho em `estagio`); a
situação só muda por gatilho de `versao_relatorio` e `parecer_relatorio`; o final só existe no
estágio obrigatório. Frequência: `REGISTRADO | SINALIZADO -> HOMOLOGADO | SUBSTITUIDO | CANCELADO`,
`HOMOLOGADO -> SUBSTITUIDO` (só a coordenação); o gatilho decide a situação e os limites aplicados. Atividade complementar: `EM_ANALISE ->
APROVADA | RECUSADA | DEVOLVIDA`, `DEVOLVIDA -> EM_ANALISE`; `RECUSADA` é final. A decisão só chega por
`analise_atividade` (gatilho), e as horas aproveitadas são calculadas pelo banco na aprovação
(limite da categoria e total do curso, estudante travado). A integralização é gravada só por
`app.apurar_integralizacao`, disparada por gatilho a cada evento que muda o resultado.

Situação acadêmica (implementada, serviço e gatilho): `MATRICULADO -> TRANCADO | FORMADO |
DESLIGADO`, `TRANCADO -> MATRICULADO | DESLIGADO`; `FORMADO` e `DESLIGADO` finais.
Leitura mais restritiva da lei, mantida como decisão final da equipe (2026-11-04).

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
| Banco em produção | PostgreSQL 17 em Docker no servidor próprio, sem serviço gerenciado. Backup com restauração a um ponto no tempo (RNF-12) fica a cargo da equipe, com pgBackRest (seção Produção) |
| Arquivos em produção | SeaweedFS em Docker no servidor próprio, sem Cloudflare R2. A ativação pede cartão de crédito ou PayPal mesmo na franquia gratuita, e a equipe decidiu não cadastrar meio de pagamento. Criptografia em repouso e backup dos arquivos ficam a cargo da equipe (seção Produção); a segunda barreira da guarda foi perdida |
| Situação acadêmica (RF005) | Transições restritas (acima), validadas no serviço e por gatilho, auditadas. Decisão final da equipe (2026-11-04) |
| Visto do supervisor nos relatórios (Lei 11.788/2008, art. 3º, §1º) | Não implementado: o supervisor não lê relatórios, conforme DER §4.5. Decisão final da equipe (2026-11-04); o orientador não tem mais ajustes a passar |
| Redução da jornada em período de avaliações (art. 10, §2º) | Não implementada, porque exige calendário acadêmico. Decisão final da equipe (2026-11-04) |
| Análise de atividade complementar (RF053) | Só a coordenação do curso; não existe "responsável designado". Decisão final da equipe (2026-11-04) |
| Identidade do estudante (issue #80) | Orientador, supervisor e concedente leem só nome e matrícula, e só de estudantes dos estágios que acompanham, por `app.identidades_estudante`. As políticas de `usuario` e `estudante` não abrem para eles: abririam e-mail, período e situação acadêmica |
| Conta ao cadastrar estudante (RF005) | Coordenação e administrador buscam por nome ou e-mail, com `app.buscar_contas_estudante`: só contas ativas com perfil Estudante vigente e ainda sem cadastro acadêmico |
| Stack e arquitetura | A atual é a definitiva, por decisão da equipe (2026-11-04) |
| Duração máxima e afastamento (RF060, RF062) | O afastamento estende `data_fim` só até o teto de 2 anos no par estudante–concedente; a exceção do art. 11 (estagiário com deficiência) é marcada no estágio pela coordenação, com documento, nunca no estudante |
| Frequência (RF023, RF024) | Um lançamento vigente por dia, com intervalo; limite semanal pela semana ISO (segunda a domingo); conclusão bloqueada se houver lançamento pendente de homologação |
| Relatório e atividade fora do prazo (RF037) | Relatório enviado depois do prazo é aceito e marcado como em atraso |
| Aproveitamento de estágio não obrigatório (RF046) | Concluído ou rescindido, limitado aos minutos homologados, sempre com análise do responsável |
| Mudança de curso | Estágio mantém o curso de origem; a apuração conta só estágios do curso atual, e os anteriores entram por decisão da coordenação |
| Upload | PDF, JPEG ou PNG, até 10 MiB, direto ao armazenamento por URL assinada; o servidor confere tamanho, tipo pelos bytes e SHA-256 antes de aceitar |
| Dados de saúde (RN-38, RF071–RF073) | Atestado e documento de dispensa são sensíveis: acesso só por vínculo, criptografia em repouso (SeaweedFS com `-encryptVolumeData` e disco criptografado no servidor), cada visualização ou download registrado; o administrador não lê o conteúdo |
| Recuperação de senha (RF002) | "Esqueceu a senha?" no login avisa os administradores no sistema (`/api/auth/recuperacao-senha`), com a mesma resposta para qualquer e-mail e limite por endereço. O administrador confirma quem pediu e emite a senha provisória (`POST /usuarios/{id}/senha-provisoria`), entregue fora do sistema; 72 h de validade; troca obrigatória no primeiro acesso. Sem e-mail. Administrador único que esquece a senha é recuperado no servidor |

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
- Em produção, `DATABASE_URL` é `app_runtime`,
  `DATABASE_AUTH_URL` é `auth_runtime`, e a migração roda num passo separado com
  `DATABASE_MIGRATION_URL`, nunca no build (o build não depende de banco). Conectar a aplicação
  com o dono do banco **contorna toda a RLS**. O PostgreSQL não publica porta na internet.
- Porta 5432 ocupada na máquina (PostgreSQL instalado fora do Docker): `POSTGRES_PORT` no `.env` muda a porta publicada
  pelo Compose, as URLs do `.env` usam a mesma porta, e as de teste vão num `.env.test.local` (ignorado pelo git), lido
  antes do `.env.test` pelo Vitest e pelo `npm run ci`. O `.env.test` e o CI ficam na 5432.
- O init do Postgres (`docker/postgres/init`) só roda quando o volume é criado. Se o
  container já existia antes dos papéis, recriar: `docker compose down -v` e subir de novo.
- Fora do init local, a migração cria `app_runtime` e `auth_runtime` sem login. Habilitar uma
  vez por ambiente com senha gerada: `alter role app_runtime with login password '...'`
  (idem `auth_runtime`). `DATABASE_MIGRATION_URL` usa o dono (`migrator`).
- O pool de conexões reaproveita a mesma conexão entre requisições. `set_config(..., true)` é
  obrigatório (local à transação); um valor de sessão vazaria a identidade para outra requisição.
- Disco reservado é disco perdido: o cofre tem tamanho fixo no servidor, e o SeaweedFS reserva 7 volumes × `-master.volumeSizeLimitMB` por bucket. O cofre nasceu com 60 GB de 96 e consumia o espaço de outros projetos com pouco mais de 100 MB de dados. Limites e checagens: `/srv/REGRAS-DA-VPS.md`, do repositório `vps-chiconeto`.
- O Docker ignora o ufw nas portas publicadas: o `docker-compose.prod.yml` não publica nenhuma.
- As fontes vêm de pacotes (`next/font/local`). Com `next/font/google`, o build de produção falhou no servidor.
- `next build` não pode depender de banco: `getAuth()` e os pools são criados sob
  demanda. Não instanciar nada disso no topo de um módulo.
- O Next renderiza um anunciador de rota com `role="alert"`. Em Playwright, filtrar
  alertas por texto.
- Armazenamento é SeaweedFS (`chrislusf/seaweedfs`, porta 8333): `mini` em desenvolvimento e CI,
  `server` com criptografia em `docker-compose.prod.yml`. O prefixo `R2_` das variáveis é
  histórico; o código só muda por `R2_ENDPOINT` e pelas chaves.
- Em produção, as chaves da criptografia do SeaweedFS ficam nos metadados dele, no mesmo volume
  dos arquivos: sem disco criptografado no servidor, quem levar o disco lê os atestados.
- O navegador envia direto ao armazenamento: em produção, `R2_ENDPOINT` é um endereço público
  com HTTPS, e o proxy precisa manter o cabeçalho `Host`, senão a assinatura da URL falha.
- URL de upload assinada: o SDK v3 assina por padrão um CRC32 do corpo ainda inexistente, e o
  bucket recusa o PUT real. O cliente usa `requestChecksumCalculation: "WHEN_REQUIRED"`.
- Cabeçalho extra no navegador (por exemplo `extraHTTPHeaders` do Playwright) vai também no PUT
  direto ao bucket e quebra o preflight de CORS. Spec que envia arquivo pela tela não usa
  `extraHTTPHeaders`.
- Schemas Drizzle que se referenciam formam ciclo de import: enums compartilhados ficam em
  `src/db/schema/enums.ts`, e FK circular usa `(): AnyPgColumn => ...`.
- Scripts `tsx` rodam como CommonJS: sem `await` no topo, usar `main().catch(...)`.
- Toda aprovação de atividade, conclusão de estágio, mudança de exigência ou de carga do curso
  grava uma apuração (gatilho). Teste que precisa de estudante sem apuração não mexe no curso.
- `app_runtime` não tem `UPDATE` em `documento` nem `DELETE` em nada: prazo de guarda e eliminação
  só pelas funções de `functions/18_guarda.sql`. Teste que precisa de prazo vencido usa o dono.
- Encerrar um estágio (conclusão ou rescisão) encerra a vigência dos responsáveis: orientador e
  supervisor deixam de ler o estágio. Teste que lê como orientador depois do fim espera vazio.
- Função `security definer` usada numa política precisa de `grant execute` para `app_runtime`,
  senão o `INSERT` falha com 42501 (não com violação de RLS).
- Em função SQL, subconsulta lateral com chamada cara precisa de `case` e `offset 0` para não ser
  achatada e chamada em toda linha (`relatorio_pendencias_integralizacao`, `DER-LOGICO.MD` §13.1).
- `e2e/acessibilidade.spec.ts` roda as regras automáticas de WCAG 2.1 AA (axe) em cada perfil, a 1280 e 360 px, e o uso só
  com teclado (atalho para o conteúdo, foco visível, foco preso no diálogo); leitor de tela segue exigindo gente. Texto com opacidade abaixo de `text-navy-900/65` não passa no fundo da página.
- Outros navegadores (RNF-13) rodam sob demanda: `E2E_NAVEGADORES=1 npx playwright test --project=firefox` (`webkit`,
  `edge`), com `CI=1` e `AUTH_IP_HEADERS=x-forwarded-for`, no build de produção; no servidor de desenvolvimento o login falha
  por clicar antes da hidratação. O WebKit do Playwright no Windows não é o Safari.
- Com `CI=1`, o Playwright sobe o build de produção já existente: rota nova dá 404 até
  `npm run build` (o `npm run ci` compila antes do e2e).
- Constraint trigger (verificação adiada para o commit) não aceita `create or replace`: em
  `drizzle/sql/triggers`, `drop trigger if exists` e `create constraint trigger` de novo.
- Avaliação exige nota em todos os critérios ativos, que são globais: teste que avalia busca os
  critérios ativos na hora, e teste que cria critério o desativa ao final.
- O banco de teste é compartilhado e cresce: teste de listagem filtra pelo próprio cenário
  (curso, e-mail), porque a página padrão de 100 itens já não cobre tudo.
- Spec de tela que faz login pelo navegador sem `x-forwarded-for` divide com os outros o limite
  de 3 logins em 10 s; use um endereço próprio (`test.use({ extraHTTPHeaders })`), exceto em spec
  que envia arquivo ao bucket (CORS). Specs de API usam `sessoes(faixa)` de `e2e/support/api.ts`.
- O bucket é privado; download sempre passa por endpoint
  que verifica permissão e emite URL assinada de expiração curta, nunca URL
  pública direta.
- A guarda documental tem uma barreira só, o gatilho `BEFORE DELETE` no banco: quem administra
  o servidor consegue apagar arquivos direto no disco.

- Grid sem coluna base (`grid-cols-1`) estica até a largura do conteúdo e estoura a página no celular. Contêiner
  com rolagem precisa de `relative`, senão o rótulo `sr-only` (absoluto) escapa dele e cria rolagem na página.
- Em subconsulta correlacionada do Drizzle, `${curso.id}` sai sem qualificação e casa com a tabela interna:
  a contagem dá 0 sem erro. Escrever `"curso"."id"` literal (`findCursos`).
- Diálogo do Radix aberto sem `Dialog.Trigger` não devolve o foco ao fechar: guardar a origem em
  `onOpenAutoFocus` e restaurar em `onCloseAutoFocus` (`botao-acao.tsx`).
- Nome e matrícula do estudante em lista de estágio vêm de `identidadeEstudante` (`src/db/identidade-estudante.ts`), não de
  junção com `usuario` e `estudante`: para orientador, supervisor e concedente, a RLS dessas tabelas devolve vazio sem erro.

## Produção

Sistema em https://internship.chiconeto.dev, numa VPS da Contabo (região EU) com Docker Compose:
aplicação, PostgreSQL 17 e SeaweedFS. O Caddy que emite os certificados e publica as portas é do servidor, fora deste projeto (`/srv/proxy`), e encaminha o `Host` e o `X-Real-IP`. Os
dados e os segredos ficam num volume LUKS em `/srv/dados`, com a senha só com a equipe.

| Situação | O que fazer |
|---|---|
| Publicar | Merge na `main`. Com o CI verde, `.github/workflows/deploy.yml` publica. Se o build falhar, a versão atual continua no ar |
| Simular | Actions > Deploy > Run workflow > `dry_run` |
| O servidor reiniciou | O sistema fica fora do ar até alguém rodar `ssh -t root@<servidor> sh /srv/internship-tracker/scripts/servidor/cofre-abrir.sh` e digitar a senha. O Docker não sobe sozinho, de propósito: sem o cofre, os contêineres voltariam sem os dados. O deploy falha com aviso enquanto o cofre estiver fechado |
| Banco novo | `npm run db:primeiro-admin`, no serviço `ferramentas` do Compose |
| Ver o disco | `vps-espaco`, no servidor. Regras para qualquer projeto: `/srv/REGRAS-DA-VPS.md`, do repositório `vps-chiconeto` (clonado em `/srv/servidor`, aplicado com `sh /srv/servidor/scripts/aplicar.sh`) |
| Mudar o tamanho do cofre | `cofre-trocar.sh <tamanho>`: copia, confere por checksum e volta sozinho se falhar. Apagar `/srv/cofre-antigo.img` depois de conferir |

A chave do deploy só dispara o deploy: usuário `deploy`, com comando forçado (`configurar-deploy.sh`).
A chave do host fica fixada no secret `VPS_KNOWN_HOSTS`.

### Backup (RNF-12)

| Camada | O que faz | Onde |
|---|---|---|
| pgBackRest | Cópia completa aos domingos, diferencial nos outros dias e cada alteração do banco arquivada, no máximo 5 min depois. Permite voltar a um horário exato | `/srv/dados/backup`, no volume criptografado |
| restic e rclone | A cada hora, envia cópias do banco, arquivos e `.env`, criptografados no servidor | Google Drive, fora da Contabo (`backup-configurar.sh`) |
| Auto Backup da Contabo | Imagem diária do servidor inteiro, com até 10 cópias. Não volta a horário exato, e a restauração leva o servidor todo | Painel da Contabo |

Provar que abre: `sh scripts/servidor/backup-testar-restauracao.sh ["<horário>"]`, que restaura em contêineres descartáveis, com o sistema no ar. Rodar depois de mudança no banco ou no armazenamento. Sem documentos no banco, o script exige `ARQUIVO_MARCADOR` e `SHA_MARCADOR`, porque resultado vazio não comprova os arquivos.

Teste feito em 2026-11-04, depois da implantação (o RNF-12 pedia antes), baixando do Drive: o banco voltou ao horário pedido, sem a linha posterior, e um arquivo de teste voltou igual pelo SHA-256, em 98 s. O banco de produção tinha 1 conta e nenhum documento, então o volume testado foi pequeno. O acesso ao Drive usa a cota do rclone, dividida com outros usuários: a primeira configuração e um envio tiveram recusas por cota; se elas se repetirem, criar uma chave própria no Google Cloud. A restauração real, por cima do diretório de produção, não foi executada.

A senha do restic fica em `/srv/dados/.backup/senha` e em um cofre de senhas da equipe: sem ela, o backup não abre. Não há aviso automático de falha; confira `/srv/dados/.backup/ultimo-envio` e `systemctl status internship-backup`.

## Roadmap (fases)

0. Fechamento da documentação (**concluída**).
1. Fundação técnica (**concluída**): RNFs, DER lógico, migrações, wrapper de
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
3. Acompanhamento (**concluída**, lote `integration/fase-3-acompanhamento`): frequência com
   limites no serviço e no banco, homologação, carga horária, divergências com caso para o
   orientador, relatórios gerados na ativação, avaliação com média da concedente (RF014),
   acompanhamento do orientador, guardas de conclusão no banco, registro de leitura de
   documento sensível (RF071–RF073) e medição de desempenho com volume.
4. Atividades complementares e integralização (**concluída**, lote
   `integration/fase-4-atividades-integralizacao`): cadastro com comprovante e detecção de
   duplicata, análise pela coordenação, limites por categoria e total do curso calculados pelo
   banco, aproveitamento de estágio não obrigatório, vedação de dupla contagem em quatro
   barreiras e apuração de integralização por gatilho.
5. Ocorrências, conclusão e conformidade (**concluída**, lote `integration/fase-5-conformidade`):
   notificações no sistema por gatilho e rotina diária (`/api/cron/diaria`), afastamento com extensão até
   o teto, rescisão e conclusão com encerramento comum, guarda documental sem exclusão,
   relatórios gerenciais com CSV e PDF, PDFs do TCE, plano e aditivo, declarações com código de
   verificação.

6. Interface (**concluída**, lote `integration/fase-6-interface`): reformulação das telas sobre os
   componentes de `src/shared/ui`, painel por perfil, perfil do estudante em abas, listagens com busca,
   ordenação e paginação no servidor, confirmações em diálogo. Sem mudança de schema, política ou permissão.

A ordem segue dependência de dados, não a numeração dos RFs: sem perfil e
vínculo (Fase 1), nenhuma política RLS pode ser escrita; sem curso e
exigência curricular (Fase 2), não há como validar carga mínima.

Critérios de saída:

| Fase | Critério |
|---|---|
| 1 | Um usuário de cada perfil autentica e enxerga apenas o que lhe cabe, comprovado por teste automatizado. Orientador, supervisor e concedente completam o critério quando `estagio` existir |
| 2 | Um estágio percorre `EM_FORMALIZACAO → ATIVO`, e cada guarda de ativação é comprovada por teste que a viola isoladamente (`tests/db/estagio-formalizacao.test.ts`, `e2e/estagio.spec.ts`) |
| 3 | Um estágio ativo percorre frequência, homologação, relatório, avaliação e acompanhamento, cada perfil no seu papel, e cada guarda de conclusão é comprovada isoladamente (`tests/db/frequencia.test.ts`, `tests/db/conclusao.test.ts`, `e2e/acompanhamento.spec.ts`) |
| 4 | A vedação de dupla contagem (RN-36) tem teste que a força a falhar antes de passar (`tests/db/dupla-contagem.test.ts`: falha no commit `4e5c4d0`, passa com a barreira em `df3500d`) |
| 5 | Um estágio ativo termina por conclusão ou rescisão com todos os efeitos na mesma transação, e cada guarda de afastamento, rescisão e guarda documental é comprovada isoladamente (`tests/db/afastamento.test.ts`, `tests/db/encerramento.test.ts`, `tests/db/guarda.test.ts`, `e2e/fase5.spec.ts`) |

## Documentação

Requisitos, regras de negócio e documentos formais da disciplina são mantidos fora
do repositório pela equipe. Neste repositório, a referência é este arquivo, o
`README.md` e o próprio código: schema em `src/db/schema`, segurança em
`drizzle/sql`, contratos da API em `src/modules/*/schemas` e comportamento esperado
nos testes. Quando uma regra de negócio não estiver coberta aqui nem no código,
perguntar em vez de supor.

O projeto tem grafo do Graphify em `graphify-out/` (`graph.json` e `GRAPH_REPORT.md`): depois de mudanças grandes, atualizar com `graphify update .` (só código; se mudarem documentos ou imagens, `/graphify . --update`).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
