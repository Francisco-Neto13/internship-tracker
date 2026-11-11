# Graph Report - internship-tracker  (2026-11-10)

## Corpus Check
- 636 files · ~417,739 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 35 file(s) not represented in the graph (top: (none) 31, .example 1, .conf 1)

## Summary
- 3637 nodes · 11574 edges · 273 communities (157 shown, 116 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 123 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a6bcb2fe`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Testes e suporte compartilhado
- API de estágios
- frequencia-service.ts
- domain/documentos.ts
- dependencies
- Scripts de CI e GitHub
- estagios/[id]/page.tsx
- _acompanhamento/json.ts
- @playwright/test
- Telas de listagem
- concedentes.test.ts
- Barra lateral e navegação
- 07_estagios.sql
- esqueleto.tsx
- estagios.ts
- auditoria-service.ts
- usuario-service.ts
- Serviço de concedentes
- atividade-service.ts
- Migração de estágios
- lib/api.ts
- registrar_auditoria
- 18_guarda.sql
- Formulários da API
- Serviço de relatórios
- Identidade e avaliação
- DomainError
- 0008_avaliacao_acompanhamento.sql
- 08_frequencia.sql
- Painel por perfil
- Testes de senha provisória
- Serviço de integralização
- formalizacao-service.ts
- Workflow de deploy
- Conexão e withUser
- estudante-service.ts
- 13_atividades.sql
- 09_relatorios.sql
- Serviço de documentos
- app.calcular_integralizacao
- declaracao-service.ts
- Compose de desenvolvimento
- Botões e ações de usuário
- package.json
- campos.ts
- telas-decisoes.spec.ts
- Dados de listagem e desempenho
- identity.ts
- isRlsViolation
- frequencia.ts
- Scripts npm
- searchParamsOf
- usuario.ts
- concedente.ts
- Serviço de cursos
- support/api.ts
- Migração de fundação
- Serviço de convênios
- atividade.ts
- Periodicidade de relatórios
- triggers/afastamento.sql
- contexto-service.ts
- Menu do usuário e senha
- curso.ts
- Configuração TypeScript
- Better Auth
- Schema de acompanhamento
- 0011_integralizacao.sql
- 15_notificacoes.sql
- acessibilidade.spec.ts
- desempenho.ts
- rotulos.ts
- apply-migrations.ts
- Doc: segurança e RLS
- schemas/parametros.ts
- Compose prod: variáveis da app
- Migração de frequência
- Migração de atividades
- seed.ts
- categoria-service.ts
- owner
- Doc: VPS e produção
- aditivo-service.ts
- CI: passos
- CI: variáveis
- CI: jobs
- documentos/schemas.ts
- support/estagio.ts
- versoes/route.ts
- apuracao/route.ts
- convenio.ts
- triggers/declaracoes.sql
- triggers/relatorios.sql
- Doc: módulos de domínio
- Doc: fluxo de branches
- Compose prod: ferramentas
- Compose prod: armazenamento
- 0002_parametros_categorias.sql
- Máscaras de campo
- lib/errors.ts
- guarda-service.ts
- Doc: decisões de negócio
- Doc: autenticação e stack
- Compose prod: serviço app
- CI: ações
- primeiro-acesso.spec.ts
- estagio.test.ts
- "notificacao"
- classificacao-routes.ts
- 19_relatorios_gerenciais.sql
- usuario-repository.ts
- Doc: dados sensíveis
- Compose prod: healthchecks
- Compose prod: variáveis Postgres
- Compose prod: Postgres
- triggers/estagios.sql
- Teste de restauração
- estudantes/[id]/page.tsx
- afastamento-service.ts
- documento-estagio-service.ts
- SQL de auditoria
- Script de backup
- Configuração de backup
- Layout raiz
- Doc: guia e estados
- CI: fonte de branch
- CI: gatilhos
- Identidade do estudante
- 10_avaliacao_acompanhamento.sql
- Stub HIBP
- CI: HIBP real
- Logo principal
- Troca de cofre
- triggers/atividades.sql
- CI: job e2e
- Logo reverso
- Criação de cofre
- Script de publicação
- Ícone do app
- Doc: validação de campos
- Doc: erros de domínio
- Papéis Postgres prod
- Configuração PostCSS
- triggers/avaliacao_acompanhamento.sql
- Abertura de cofre
- Configuração de deploy
- Configuração da VPS
- Script de implantação
- Rotina diária
- Espaço em disco
- Isolado: Listing state in the URL, resolved on the server
- triggers/frequencia.sql
- triggers/integralizacao.sql
- triggers/notificacoes.sql
- 16_afastamento.sql
- app.verificar_declaracao
- zod
- "declaracao"
- parametros/route.ts
- parametro-service.ts
- 01_identidade.sql
- registrar_auditoria
- afastamentos/route.ts
- notificacoes/route.ts
- concedentes.ts
- triggers/academico.sql
- 06_documentos_convenios.sql
- 17_encerramento.sql
- triggers/documentos_convenios.sql
- guarda.sql
- triggers/rescisao.sql
- senhas-vazadas.ts
- papeis.ts
- "rescisao"
- app.impedimentos_conclusao
- 12_dados_sensiveis.sql
- percurso-estagio.tsx
- cnpj.ts
- "contexto_administrador"
- app.representa_concedente
- triggers/contexto_administrador.sql
- app.validar_contexto_administrador
- quality
- next.config.ts
- check-hibp-live.mjs

## God Nodes (most connected - your core abstractions)
1. `dataResponse()` - 236 edges
2. `withUser()` - 192 edges
3. `DomainError` - 161 edges
4. `authenticatedRoute()` - 116 edges
5. `drizzle-orm` - 86 edges
6. `cn()` - 77 edges
7. `vitest` - 75 edges
8. `Button()` - 57 edges
9. `next` - 56 edges
10. `minutosParaHoras()` - 56 edges

## Surprising Connections (you probably didn't know these)
- `Paginacao()` --indirect_call--> `botao()`  [INFERRED]
  src/shared/ui/paginacao.tsx → e2e/acoes-por-perfil.spec.ts
- `SeaweedFS volumeSizeLimitMB=128` --references--> `SeaweedFS object storage`  [EXTRACTED]
  scripts/servidor/REGRAS-DA-VPS.md → AGENTS.md
- `Health data isolation in the vault` --references--> `LUKS vault at /srv/dados`  [EXTRACTED]
  scripts/servidor/REGRAS-DA-VPS.md → AGENTS.md
- `VPS rules` --conceptually_related_to--> `Backup layers (pgBackRest, restic and rclone, Contabo Auto Backup)`  [INFERRED]
  scripts/servidor/REGRAS-DA-VPS.md → AGENTS.md
- `setup()` --calls--> `applyMigrations()`  [EXTRACTED]
  tests/db/global-setup.ts → scripts/db/apply-migrations.ts

## Import Cycles
- 3-file cycle: `src/db/schema/acesso.ts -> src/db/schema/concedentes.ts -> src/db/schema/documentos.ts -> src/db/schema/acesso.ts`
- 3-file cycle: `src/db/schema/concedentes.ts -> src/db/schema/documentos.ts -> src/db/schema/estagios.ts -> src/db/schema/concedentes.ts`
- 4-file cycle: `src/db/schema/academico.ts -> src/db/schema/acesso.ts -> src/db/schema/concedentes.ts -> src/db/schema/documentos.ts -> src/db/schema/academico.ts`
- 4-file cycle: `src/db/schema/acesso.ts -> src/db/schema/concedentes.ts -> src/db/schema/documentos.ts -> src/db/schema/estagios.ts -> src/db/schema/acesso.ts`
- 5-file cycle: `src/db/schema/academico.ts -> src/db/schema/acesso.ts -> src/db/schema/concedentes.ts -> src/db/schema/documentos.ts -> src/db/schema/estagios.ts -> src/db/schema/academico.ts`

## Hyperedges (group relationships)
- **Branch flow protection** — agents_github_rulesets, agents_local_ci, agents_pre_push_hook, agents_batch_workflow [EXTRACTED 1.00]
- **RLS enforcement stack** — agents_with_user_wrapper, agents_role_app_runtime, agents_app_schema_functions, agents_declarative_drizzle_sql, agents_rls [EXTRACTED 1.00]
- **Encrypted production data handling** — agents_luks_cofre, agents_seaweedfs_storage, agents_backup_layers, scripts_servidor_regras_da_vps_docker_after_vault [INFERRED 0.85]

## Communities (273 total, 116 thin omitted)

### Community 0 - "Testes e suporte compartilhado"
Cohesion: 0.13
Nodes (42): vitest, afastamento(), atestado(), dataFimPrevista(), cadastrar(), cenario(), administrador(), cenario() (+34 more)

### Community 1 - "API de estágios"
Cohesion: 0.07
Nodes (63): POST, POST, GET, POST, GET, POST, GET, POST (+55 more)

### Community 2 - "frequencia-service.ts"
Cohesion: 0.06
Nodes (75): estagio, limites, avaliarDivergencia(), diaAnterior(), diasUteis(), Divergencia, EstagioCarga, minutosPrevistosAte() (+67 more)

### Community 3 - "domain/documentos.ts"
Cohesion: 0.13
Nodes (24): SecaoPdf, Aditivo, Apolice, Assinatura, assinaturas(), cnpj(), data(), documentoAditivo() (+16 more)

### Community 4 - "dependencies"
Cohesion: 0.05
Nodes (39): dependencies, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, better-auth, class-variance-authority, clsx, drizzle-orm, @fontsource-variable/inter (+31 more)

### Community 5 - "Scripts de CI e GitHub"
Cohesion: 0.07
Nodes (42): args, CODE_PATHS, fail(), fast, hasDocker(), ok, onlyIndex, requireDocker (+34 more)

### Community 6 - "estagios/[id]/page.tsx"
Cohesion: 0.10
Nodes (58): ConcedentePage(), ConveniosPage(), ESCOPO, GuardaDocumentalPage(), TIPO_DOCUMENTO, horas(), ParametrosPage(), AcompanhamentoEstagio() (+50 more)

### Community 7 - "_acompanhamento/json.ts"
Cohesion: 0.08
Nodes (33): acompanhamentoJson(), avaliacaoJson(), cargaHorariaJson(), criterioJson(), divergenciaCalculadaJson(), estagioAcompanhadoJson(), RelatorioExibido, Versao (+25 more)

### Community 8 - "@playwright/test"
Cohesion: 0.10
Nodes (4): ROTAS, COORDENACAO, isCI, @playwright/test

### Community 9 - "Telas de listagem"
Cohesion: 0.12
Nodes (63): lucide-react, AuditoriaPage(), COLUNAS, Registro, TOM, Concedente, ConcedentesPage(), SITUACOES (+55 more)

### Community 10 - "concedentes.test.ts"
Cohesion: 0.10
Nodes (23): estudante, auditoria, createEstudante(), Scenario, Scenario, trailOf(), dados(), Scenario (+15 more)

### Community 11 - "Barra lateral e navegação"
Cohesion: 0.07
Nodes (47): class-variance-authority, @radix-ui/react-tooltip, AppSidebar(), ItemDeMenu(), AppLayout(), TopbarTitle(), cobre(), encontrarItem() (+39 more)

### Community 12 - "07_estagios.sql"
Cohesion: 0.11
Nodes (14): app.coordena_curso_do_estagio(), app.dias_usados_no_par(), app.e_estudante_do_estagio(), app.e_responsavel_vigente(), app.efetivar_aditivo(), app.estagios_legiveis(), app.estudante_atual_id(), app.historico_estagios_concedente() (+6 more)

### Community 13 - "esqueleto.tsx"
Cohesion: 0.70
Nodes (3): Carregando(), Esqueleto(), EsqueletoDePagina()

### Community 14 - "estagios.ts"
Cohesion: 0.05
Nodes (41): categoriaAtividade, curso, exigenciaCategoria, periodicidadeRelatorio, situacaoAcademica, limiteRequisicao, situacaoUsuario, verificacao (+33 more)

### Community 15 - "auditoria-service.ts"
Cohesion: 0.15
Nodes (20): RFC-4180, BOM, celulaCsv(), CSV_SEPARADOR, gerarCsv(), TABELA_AUDITORIA, AuditoriaDetalhadaRow, AuditoriaRow (+12 more)

### Community 16 - "usuario-service.ts"
Cohesion: 0.12
Nodes (37): definirSenha(), revogarSessoes(), expiracaoSenhaProvisoria(), impedirAutoemissaoSenha(), VALIDADE_SENHA_PROVISORIA_HORAS, chave(), diferencaVinculos(), impedirAutoinativacao() (+29 more)

### Community 17 - "Serviço de concedentes"
Cohesion: 0.12
Nodes (29): POST, Catalogo, CATALOGOS, classificacaoAtiva(), ClassificacaoRow, ConcedenteRow, ConcedenteValues, findClassificacoes() (+21 more)

### Community 18 - "atividade-service.ts"
Cohesion: 0.09
Nodes (36): Aproveitamento, calcularAproveitamento(), periodoValido(), SaldoAproveitamento, base, AnaliseRow, AtividadeRow, ComprovanteRow (+28 more)

### Community 19 - "Migração de estágios"
Cohesion: 0.05
Nodes (52): "convenio", convenio_concedente_idx, "convenio_vigencia", convenio_vigencia_documento_idx, convenio_vigencia_fim_idx, convenio_vigencia_registrado_por_idx, "documento", documento_concedente_idx (+44 more)

### Community 20 - "lib/api.ts"
Cohesion: 0.09
Nodes (27): GET, POST, GET, GET, POST, GET, paramsSchema, GET (+19 more)

### Community 21 - "registrar_auditoria"
Cohesion: 0.36
Nodes (4): bloquear_alteracao, definir_atualizado_em, registrar_auditoria, validar_alteracao_concedente

### Community 22 - "18_guarda.sql"
Cohesion: 0.13
Nodes (3): app.definir_guarda_convenio(), app.documentos_em_guarda(), app.prazo_guarda_em()

### Community 23 - "Formulários da API"
Cohesion: 0.11
Nodes (44): next, @radix-ui/react-dialog, react, NovoConvenio(), onSubmit(), onSubmit(), NovaAtividade(), onSubmit() (+36 more)

### Community 24 - "Serviço de relatórios"
Cohesion: 0.10
Nodes (31): enviadoComAtraso(), pendenteDe(), relatorioEmAtraso(), SituacaoRelatorio, VisaoRelatorio, VISOES_RELATORIO, AnexoRow, countRelatoriosPendentes() (+23 more)

### Community 25 - "Identidade e avaliação"
Cohesion: 0.09
Nodes (46): GET, withUser(), AcompanhamentoRow, AvaliacaoRow, CriterioRow, findAcompanhamentoById(), findAcompanhamentos(), findAvaliacoes() (+38 more)

### Community 26 - "DomainError"
Cohesion: 0.14
Nodes (34): DomainError, hashTce(), booleano(), convenioVigenteEm(), cursoDoEstudante(), EstagioResumo, EstagioRow, findEstagios() (+26 more)

### Community 27 - "0008_avaliacao_acompanhamento.sql"
Cohesion: 0.19
Nodes (12): "acompanhamento", acompanhamento_estagio_data_idx, acompanhamento_registrado_por_idx, avaliacao_avaliador_idx, "avaliacao_desempenho", avaliacao_estagio_idx, avaliacao_uma_final, "criterio_avaliacao" (+4 more)

### Community 28 - "08_frequencia.sql"
Cohesion: 0.15
Nodes (6): app.conferir_homologacao(), app.em_afastamento(), app.parametros_em(), app.validar_alteracao_frequencia(), app.validar_homologacao(), app.validar_registro_frequencia()

### Community 29 - "Painel por perfil"
Cohesion: 0.15
Nodes (32): DistribuicaoEstagios(), LinhaCompacta(), ListaCompacta(), SITUACOES, notificacoesRecentes(), BlocoAdministrador(), BlocoConcedente(), BlocoCoordenacao() (+24 more)

### Community 30 - "Testes de senha provisória"
Cohesion: 0.13
Nodes (20): GET(), POST(), conta, sessao, usuario, Auth, getAuth(), ContextoDaSessao (+12 more)

### Community 31 - "Serviço de integralização"
Cohesion: 0.14
Nodes (21): Apuracao, CategoriaApurada, progresso(), Situacao, base, ApuracaoRow, apurar(), calcular() (+13 more)

### Community 32 - "formalizacao-service.ts"
Cohesion: 0.12
Nodes (33): planoAtividades, podeAssinar(), ApoliceRow, AssinaturaRow, encerrarResponsavel(), findContasResponsavel(), findPlanoById(), findPlanos() (+25 more)

### Community 33 - "Workflow de deploy"
Cohesion: 0.06
Nodes (32): concurrency, cancel-in-progress, group, env, if, name, runs-on, steps (+24 more)

### Community 34 - "Conexão e withUser"
Cohesion: 0.08
Nodes (31): drizzle-orm, autorizado(), GET(), GET(), closeDatabases(), Database, ENV_BY_POOL, getAppDatabase() (+23 more)

### Community 35 - "estudante-service.ts"
Cohesion: 0.06
Nodes (44): GET, PATCH, estudanteJson(), GET, POST, padraoContendo(), SITUACAO_ACADEMICA_INICIAL, SituacaoAcademica (+36 more)

### Community 36 - "13_atividades.sql"
Cohesion: 0.15
Nodes (5): app.coordena_curso_do_estudante(), app.estudante_da_atividade(), app.estudantes_legiveis(), app.validar_analise_atividade(), app.validar_atividade()

### Community 37 - "09_relatorios.sql"
Cohesion: 0.16
Nodes (8): app.aplicar_parecer_relatorio(), app.estagio_da_versao(), app.estagio_do_relatorio(), app.gerar_relatorios(), app.periodicidade_de(), app.validar_anexo_relatorio(), app.validar_parecer_relatorio(), app.validar_versao_relatorio()

### Community 38 - "Serviço de documentos"
Cohesion: 0.14
Nodes (27): main(), getArmazenamento(), ASSINATURAS, extensaoDoTipo(), sha256Hex(), tipoPeloConteudo(), AcessoDocumento, DocumentoRow (+19 more)

### Community 39 - "app.calcular_integralizacao"
Cohesion: 0.16
Nodes (3): app.calcular_integralizacao(), app.reapurar_por_curso(), app.reapurar_por_exigencia()

### Community 40 - "declaracao-service.ts"
Cohesion: 0.07
Nodes (44): pdf-lib, GET, params, POST, declaracaoJson(), A4, cabecalho(), COR_LINHA (+36 more)

### Community 41 - "Compose de desenvolvimento"
Cohesion: 0.09
Nodes (26): AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, interval, retries, test (+18 more)

### Community 42 - "Botões e ações de usuário"
Cohesion: 0.23
Nodes (14): Confirmar(), DadosConta(), PerfisConta(), SegurancaConta(), useEnvio(), enviar(), mensagemDeErro(), Opcao (+6 more)

### Community 43 - "package.json"
Cohesion: 0.06
Nodes (29): DATABASE_CLIENT, MODULES, PG_DRIVER, engines, node, name, private, version (+21 more)

### Community 44 - "campos.ts"
Cohesion: 0.09
Nodes (38): better-auth, @hookform/resolvers, react-hook-form, CursoForm(), CursoInput, CursoOutput, cursoSchema, EstudanteForm() (+30 more)

### Community 45 - "telas-decisoes.spec.ts"
Cohesion: 0.18
Nodes (7): telaDe(), entrar(), sessao, entrar(), MATRIZ, sessao, TELAS

### Community 46 - "Dados de listagem e desempenho"
Cohesion: 0.29
Nodes (16): contagemPorSituacao(), dadosAdministrador(), dadosConcedente(), dadosCoordenacao(), dadosEstudante(), dadosOrientador(), dadosSupervisor(), SITUACOES (+8 more)

### Community 47 - "identity.ts"
Cohesion: 0.14
Nodes (20): CursoPage(), h(), AdministracaoPage(), AREAS, Cartao(), UsuarioPage(), NovoEstagioPage(), Identity (+12 more)

### Community 48 - "isRlsViolation"
Cohesion: 0.21
Nodes (18): findPgError(), isExclusionViolation(), isForeignKeyViolation(), isReadOnlyTransaction(), isRlsViolation(), isTriggerRule(), isUniqueViolation(), PgError (+10 more)

### Community 49 - "frequencia.ts"
Cohesion: 0.11
Nodes (25): divergenciaJson(), frequenciaJson(), hhmm(), homologacaoJson(), POST, GET, POST, GET (+17 more)

### Community 50 - "Scripts npm"
Cohesion: 0.09
Nodes (23): scripts, batch:integrate, batch:pr, build, ci, db:desempenho, db:generate, db:migrate (+15 more)

### Community 51 - "searchParamsOf"
Cohesion: 0.08
Nodes (27): GET, GET, GET, GET, GET, POST, GET, POST (+19 more)

### Community 52 - "usuario.ts"
Cohesion: 0.14
Nodes (24): POST, PUT, POST, GET, PATCH, POST, usuarioJson(), Vinculo (+16 more)

### Community 53 - "concedente.ts"
Cohesion: 0.12
Nodes (20): GET, PATCH, POST, concedenteJson(), POST, cepSchema, telefoneSchema, concedente (+12 more)

### Community 54 - "Serviço de cursos"
Cohesion: 0.24
Nodes (11): colunas, CursoResumo, CursoRow, CursoValues, insertCurso(), updateCurso(), acessoNegado(), CursoInput (+3 more)

### Community 55 - "support/api.ts"
Cohesion: 0.26
Nodes (11): enviarComprovante(), sessao, sessao, enviarAtestado(), sessao, contextos, dados(), erro() (+3 more)

### Community 56 - "Migração de fundação"
Cohesion: 0.08
Nodes (31): "auditoria", auditoria_ocorrido_em_idx, auditoria_tabela_registro_idx, auditoria_usuario_id_idx, "conta", conta_provedor_conta_unico, conta_usuario_id_idx, "curso" (+23 more)

### Community 57 - "Serviço de convênios"
Cohesion: 0.23
Nodes (19): ConvenioRow, findConvenioById(), findConveniosAVencer(), findConveniosDaConcedente(), findVigencias(), insertConvenio(), insertVigencia(), updateConvenio() (+11 more)

### Community 58 - "atividade.ts"
Cohesion: 0.18
Nodes (21): POST, POST, POST, POST, GET, PATCH, POST, analiseJson() (+13 more)

### Community 59 - "Periodicidade de relatórios"
Cohesion: 0.21
Nodes (15): GET, periodicidadeJson(), PUT, Periodicidade, PERIODICIDADE_PADRAO, TipoEstagio, findCursoById(), findPeriodicidades() (+7 more)

### Community 60 - "triggers/afastamento.sql"
Cohesion: 0.43
Nodes (6): aplicar_afastamento, definir_atualizado_em, exigir_substituto_afastamento, registrar_auditoria, validar_afastamento, validar_alteracao_afastamento

### Community 61 - "contexto-service.ts"
Cohesion: 0.14
Nodes (22): limparContexto(), marcarContexto(), contextoJson(), DELETE, GET, POST, contextoAdministrador, vinculoPerfil (+14 more)

### Community 62 - "Menu do usuário e senha"
Cohesion: 0.16
Nodes (11): ModalTrocarSenha(), iniciaisDoNome(), UserMenu(), signOut(), dataHora, TrocarSenhaPage(), TrocarSenhaForm(), DropdownMenuContent() (+3 more)

### Community 63 - "curso.ts"
Cohesion: 0.16
Nodes (18): GET, PATCH, cursoJson(), GET, POST, HORAS_CURSO_MAXIMO, cargaComplementares, cargaMinimaEstagio (+10 more)

### Community 64 - "Configuração TypeScript"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 65 - "Better Auth"
Cohesion: 0.30
Nodes (8): createAuth(), cidrValido(), Env, lista(), opcoesEnderecoIp(), urlRangeSenhasVazadas(), verificacaoSenhaVazadaAtiva(), recuperacaoSenha()

### Community 66 - "Schema de acompanhamento"
Cohesion: 0.09
Nodes (19): acompanhamento, anexoRelatorio, avaliacaoDesempenho, criterioAvaliacao, decisaoParecer, divergenciaCargaHoraria, homologacaoFrequencia, momentoAvaliacao (+11 more)

### Community 68 - "15_notificacoes.sql"
Cohesion: 0.10
Nodes (5): app.notificar(), app.notificar_parecer_relatorio(), app.pessoas_do_estagio(), app.rotina_diaria(), app.solicitar_recuperacao_senha()

### Community 69 - "acessibilidade.spec.ts"
Cohesion: 0.12
Nodes (3): PERFIS, @axe-core/playwright, final()

### Community 70 - "desempenho.ts"
Cohesion: 0.13
Nodes (21): AQUECIMENTO, exigirBancoDeTeste(), main(), Medicao, medir(), REPETICOES, GET, GET (+13 more)

### Community 71 - "rotulos.ts"
Cohesion: 0.06
Nodes (48): Alteracao(), valor(), DESCRICAO, ROTULOS, SOMAVEIS, acentuar(), capitalizar(), CODIGOS (+40 more)

### Community 72 - "apply-migrations.ts"
Cohesion: 0.27
Nodes (8): pg, applyMigrations(), assertRuntimeRolesCannotBypassRls(), MIGRATIONS_DIR, ROOT, SQL_STAGES, setup(), URL_VARIABLES

### Community 73 - "Doc: segurança e RLS"
Cohesion: 0.17
Nodes (10): Audit by database trigger with masked sensitive columns, Declarative drizzle/sql security layer, Identity (produced only by session.ts), Layered architecture (presentation, API, domain, persistence, database), Row Level Security on every table, migrator database role, withUser identity transaction wrapper, Write flow from Route Handler to audit trigger (+2 more)

### Community 74 - "schemas/parametros.ts"
Cohesion: 0.19
Nodes (12): Exigencias, exigenciasJson(), GET, PUT, createCategoriaBodySchema, dataQuerySchema, definirExigenciasBodySchema, definirPeriodicidadesBodySchema (+4 more)

### Community 75 - "Compose prod: variáveis da app"
Cohesion: 0.25
Nodes (14): environment, AUTH_IP_HEADERS, BETTER_AUTH_SECRET, BETTER_AUTH_URL, CRON_SECRET, DATABASE_AUTH_URL, DATABASE_MIGRATION_URL, DATABASE_URL (+6 more)

### Community 76 - "Migração de frequência"
Cohesion: 0.18
Nodes (12): divergencia_analisada_por_idx, "divergencia_carga_horaria", divergencia_estagio_idx, divergencia_uma_aberta_por_estagio, frequencia_estagio_data_situacao_idx, frequencia_homologacao_idx, frequencia_parametro_idx, frequencia_registrado_por_idx (+4 more)

### Community 78 - "Migração de atividades"
Cohesion: 0.17
Nodes (13): analise_analisado_por_idx, "analise_atividade", analise_atividade_idx, atividade_categoria_idx, "atividade_complementar", atividade_estudante_situacao_idx, atividade_fila_analise_idx, atividade_registrada_por_idx (+5 more)

### Community 79 - "seed.ts"
Cohesion: 0.12
Nodes (22): @node-rs/argon2, Banco, criarAdministrador(), existeAdministrador(), main(), CATEGORIAS, CRITERIOS, db (+14 more)

### Community 80 - "categoria-service.ts"
Cohesion: 0.19
Nodes (18): PATCH, categoriaJson(), GET, POST, CategoriaRow, clearDestinoEstagio(), ExigenciaRow, findCategoriaById() (+10 more)

### Community 81 - "owner"
Cohesion: 0.10
Nodes (25): findRescisao(), insertRescisao(), RescisaoRow, concluirEstagio(), getRescisao(), naoAtivo(), NovaRescisao, rescindirEstagio() (+17 more)

### Community 82 - "Doc: VPS e produção"
Cohesion: 0.19
Nodes (9): Backup layers (pgBackRest, restic and rclone, Contabo Auto Backup), LUKS vault at /srv/dados, Production deployment on Contabo VPS, New server setup scripts (cofre-criar, publicar, configurar-deploy, backup-configurar), Encrypted vault limited to 30% of the disk, SeaweedFS volumeSizeLimitMB=128, Shared server proxy at /srv/proxy, vps-espaco disk check (+1 more)

### Community 83 - "aditivo-service.ts"
Cohesion: 0.16
Nodes (20): Transaction, parametrosVigentesEm(), AditivoRow, cancelarAditivo(), efetivarAditivo(), findAditivos(), findAssinaturasAditivo(), insertAditivo() (+12 more)

### Community 84 - "CI: passos"
Cohesion: 0.46
Nodes (8): steps, steps, steps, steps, if, name, run, uses

### Community 85 - "CI: variáveis"
Cohesion: 0.17
Nodes (12): env, AUTH_IP_HEADERS, BETTER_AUTH_SECRET, BETTER_AUTH_URL, DATABASE_AUTH_URL, DATABASE_MIGRATION_URL, DATABASE_URL, R2_ACCESS_KEY_ID (+4 more)

### Community 86 - "CI: jobs"
Cohesion: 0.18
Nodes (10): concurrency, cancel-in-progress, group, name, runs-on, jobs, database, name (+2 more)

### Community 87 - "documentos/schemas.ts"
Cohesion: 0.22
Nodes (7): GET, documentoJson(), POST, TIPOS_MIME_PERMITIDOS, confirmarUploadBodySchema, documentoIdParamSchema, solicitarUploadBodySchema

### Community 88 - "support/estagio.ts"
Cohesion: 0.25
Nodes (7): botao(), sessao, estagioAtivoDesdeAgosto(), sessao, criarEstagioAtivoDesdeAgosto(), criarEstagioEmFormalizacao(), Sessao

### Community 89 - "versoes/route.ts"
Cohesion: 0.17
Nodes (14): instante(), parecerJson(), relatorioJson(), versaoJson(), GET, POST, POST, GET (+6 more)

### Community 90 - "apuracao/route.ts"
Cohesion: 0.35
Nodes (6): POST, GET, integralizacaoJson(), GET, estudanteIdParamSchema, Integralizacao

### Community 91 - "convenio.ts"
Cohesion: 0.18
Nodes (15): GET, POST, POST, GET, PATCH, convenioJson(), idParamSchema, aVencerQuerySchema (+7 more)

### Community 92 - "triggers/declaracoes.sql"
Cohesion: 0.60
Nodes (3): bloquear_alteracao, registrar_auditoria, validar_declaracao

### Community 93 - "triggers/relatorios.sql"
Cohesion: 0.19
Nodes (11): aplicar_parecer_relatorio, bloquear_alteracao, definir_atualizado_em, exigir_conteudo_versao, gerar_relatorios, registrar_auditoria, relatorio_enviado, validar_alteracao_relatorio (+3 more)

### Community 94 - "Doc: módulos de domínio"
Cohesion: 0.25
Nodes (9): Integralization recorded by app.apurar_integralizacao, Eight domain modules M01-M08, M02 Gestao Academica, M03 Concedentes e Convenios, M04 Gestao de Estagios, M05 Acompanhamento, M06 Atividades Complementares, M07 Integralizacao (+1 more)

### Community 95 - "Doc: fluxo de branches"
Cohesion: 0.25
Nodes (6): Deploy workflow (deploy.yml, forced-command key), GitHub rulesets and repository.json, Local CI mirror (npm run ci, ci-local.mjs), pre-push hook, Environments (development, CI, production), Versioned GitHub protection files

### Community 96 - "Compose prod: ferramentas"
Cohesion: 0.22
Nodes (9): depends_on, postgres, storage, depends_on, image, profiles, condition, ferramentas (+1 more)

### Community 97 - "Compose prod: armazenamento"
Cohesion: 0.22
Nodes (9): AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, storage, command, environment, image, mem_limit, restart (+1 more)

### Community 99 - "Máscaras de campo"
Cohesion: 0.25
Nodes (4): aplicarMascara(), Mascara, MASCARAS, TECLADO

### Community 100 - "lib/errors.ts"
Cohesion: 0.18
Nodes (14): alterarSenhaPropria(), DomainErrorDetail, normalizar(), PALAVRAS_DO_SERVICO, palavrasDeContexto(), semDigitosNasPontas(), senhaPrevisivel(), MARIA (+6 more)

### Community 101 - "guarda-service.ts"
Cohesion: 0.39
Nodes (7): chaveParaEliminacao(), DocumentoEmGuarda, eliminarDocumento(), findDocumentosEmGuarda(), eliminarDocumentoVencido(), REGRAS, traduzir()

### Community 102 - "Doc: decisões de negócio"
Cohesion: 0.25
Nodes (6): Activation guards EM_FORMALIZACAO to ATIVO, Direct upload by signed URL, Document custody (BEFORE DELETE trigger), Lei 11.788/2008, app_runtime database role, SeaweedFS object storage

### Community 103 - "Doc: autenticação e stack"
Cohesion: 0.25
Nodes (8): Better Auth authentication, Login rate limit by IP (AUTH_IP_HEADERS, limite_requisicao), auth_runtime database role, Provisional password with mandatory change, senhasVazadas breached password plugin, Project Lab course project, Internship Tracker README, Technology stack

### Community 104 - "Compose prod: serviço app"
Cohesion: 0.25
Nodes (7): build, image, mem_limit, restart, name, services, app

### Community 105 - "CI: ações"
Cohesion: 0.25
Nodes (8): with, cache, key, name, node-version-file, path, restore-keys, retention-days

### Community 107 - "estagio.test.ts"
Cohesion: 0.18
Nodes (14): diaSeguinte(), exigirAtivavel(), FatosAtivacao, impedimentosAtivacao(), PARTES, Periodo, periodoCoberto(), LIMITES (+6 more)

### Community 108 - ""notificacao""
Cohesion: 0.60
Nodes (3): "notificacao", notificacao_destinatario_recente_idx, notificacao_nao_lidas_idx

### Community 109 - "classificacao-routes.ts"
Cohesion: 0.17
Nodes (12): classificacaoJson(), rotasColecao(), rotasItem(), PATCH, GET, POST, rotas, PATCH (+4 more)

### Community 110 - "19_relatorios_gerenciais.sql"
Cohesion: 0.17
Nodes (6): app.cursos_gerenciaveis(), app.estagios_no_periodo(), app.relatorio_concedentes_parceiras(), app.relatorio_estagiarios_ativos(), app.relatorio_pendencias_integralizacao(), app.relatorio_taxa_conclusao()

### Community 111 - "usuario-repository.ts"
Cohesion: 0.16
Nodes (13): colunas, findUsuarios(), OrdemUsuario, ORDENS_USUARIO, Perfil, Situacao, UsuarioRow, colunas (+5 more)

### Community 112 - "Doc: dados sensíveis"
Cohesion: 0.29
Nodes (5): acoesNoEstagio per-person actions, app schema security definer helper functions, M08 Administracao e Controle, Sensitive document read log (app.registrar_leitura_documento), Daily cron route /api/cron/diaria with CRON_SECRET

### Community 113 - "Compose prod: healthchecks"
Cohesion: 0.57
Nodes (7): healthcheck, interval, retries, test, timeout, healthcheck, healthcheck

### Community 114 - "Compose prod: variáveis Postgres"
Cohesion: 0.29
Nodes (7): APP_RUNTIME_PASSWORD, AUTH_RUNTIME_PASSWORD, MIGRATOR_PASSWORD, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, environment

### Community 115 - "Compose prod: Postgres"
Cohesion: 0.29
Nodes (7): build, command, image, mem_limit, restart, volumes, postgres

### Community 116 - "triggers/estagios.sql"
Cohesion: 0.24
Nodes (8): bloquear_alteracao, definir_atualizado_em, registrar_auditoria, validar_alteracao_aditivo, validar_alteracao_estagio, validar_alteracao_plano, validar_assinatura, validar_responsavel

### Community 117 - "Teste de restauração"
Cohesion: 0.38
Nodes (6): limpar(), RCLONE_CONFIG, RESTIC_PASSWORD_FILE, RESTIC_REPOSITORY, backup-testar-restauracao.sh script, sql()

### Community 118 - "estudantes/[id]/page.tsx"
Cohesion: 0.17
Nodes (16): DadosAcademicos(), destinoDeVolta(), EstudantePage(), h(), semAlcance(), DeclaracoesEstudante(), IntegralizacaoPage(), h() (+8 more)

### Community 119 - "afastamento-service.ts"
Cohesion: 0.25
Nodes (12): AfastamentoRow, findAfastamentoById(), findAfastamentos(), insertAfastamento(), periodosAfastamento(), lockEstagio(), gravar(), listAfastamentos() (+4 more)

### Community 120 - "documento-estagio-service.ts"
Cohesion: 0.30
Nodes (14): documentoPlano(), findAditivoById(), findIdentificacaoEstagio(), findApolices(), findAssinaturas(), findResponsaveis(), nomeDoUsuario(), carregar() (+6 more)

### Community 122 - "Script de backup"
Cohesion: 0.40
Nodes (5): pgbackrest(), RCLONE_CONFIG, RESTIC_PASSWORD_FILE, RESTIC_REPOSITORY, backup.sh script

### Community 123 - "Configuração de backup"
Cohesion: 0.40
Nodes (5): ler(), RCLONE_CONFIG, RESTIC_PASSWORD_FILE, RESTIC_REPOSITORY, backup-configurar.sh script

### Community 124 - "Layout raiz"
Cohesion: 0.33
Nodes (3): inter, jetBrainsMono, metadata

### Community 125 - "Doc: guia e estados"
Cohesion: 0.40
Nodes (5): AGENTS.md project guide, Conclusion guards (app.impedimentos_conclusao), Internship state machine, Internship_Tracker_Documento_Final_v1.3, CLAUDE.md import of AGENTS.md

### Community 126 - "CI: fonte de branch"
Cohesion: 0.22
Nodes (9): BASE, EVENT, HEAD, HIBP_LIVE_STRICT, source-branch, name, runs-on, steps (+1 more)

### Community 127 - "CI: gatilhos"
Cohesion: 0.40
Nodes (5): on, pull_request, push, branches, branches

### Community 128 - "Identidade do estudante"
Cohesion: 0.33
Nodes (4): correspondencia, identidadeEstudante, juncao, estagio

### Community 129 - "10_avaliacao_acompanhamento.sql"
Cohesion: 0.23
Nodes (8): app.e_avaliador(), app.estagio_da_avaliacao(), app.media_avaliacao(), app.media_avaliacoes_concedente(), app.validar_acompanhamento(), app.validar_alteracao_criterio(), app.validar_avaliacao(), app.validar_resposta_avaliacao()

### Community 131 - "CI: HIBP real"
Cohesion: 0.50
Nodes (4): continue-on-error, name, runs-on, hibp-live

### Community 133 - "Logo principal"
Cohesion: 0.83
Nodes (4): Internship Tracker Logo, Rising bar chart progress motif, Two-tone navy and blue shield emblem, Three stylized people around the shield

### Community 135 - "triggers/atividades.sql"
Cohesion: 0.27
Nodes (9): aplicar_analise_atividade, bloquear_alteracao, definir_atualizado_em, exigir_comprovante_atividade, registrar_auditoria, validar_analise_atividade, validar_atividade, validar_comprovante_atividade (+1 more)

### Community 136 - "CI: job e2e"
Cohesion: 0.67
Nodes (3): name, runs-on, e2e

### Community 137 - "Logo reverso"
Cohesion: 1.00
Nodes (3): Internship Tracker Reversed Logo, Shield Emblem with Figures and Rising Bar Chart, Internship Tracker Wordmark (white and light blue, for dark backgrounds)

### Community 140 - "Ícone do app"
Cohesion: 1.00
Nodes (3): Internship Tracker App Icon (navy and blue shield logo), Rising Bar Chart Motif (progress tracking), Shield Formed by Three People

### Community 149 - "triggers/avaliacao_acompanhamento.sql"
Cohesion: 0.27
Nodes (8): bloquear_alteracao, definir_atualizado_em, exigir_respostas_avaliacao, registrar_auditoria, validar_acompanhamento, validar_alteracao_criterio, validar_avaliacao, validar_resposta_avaliacao

### Community 200 - "triggers/frequencia.sql"
Cohesion: 0.27
Nodes (9): bloquear_alteracao, conferir_homologacao, definir_atualizado_em, exigir_substituto_frequencia, registrar_auditoria, validar_alteracao_divergencia, validar_alteracao_frequencia, validar_homologacao (+1 more)

### Community 201 - "triggers/integralizacao.sql"
Cohesion: 0.17
Nodes (6): bloquear_alteracao, reapurar_por_atividade, reapurar_por_curso, reapurar_por_estagio, reapurar_por_exigencia_alteracao, reapurar_por_exigencia_insercao

### Community 202 - "triggers/notificacoes.sql"
Cohesion: 0.15
Nodes (6): notificar_analise_atividade, notificar_divergencia, notificar_parecer_relatorio, notificar_situacao_estagio, notificar_substituicao, validar_alteracao_notificacao

### Community 203 - "16_afastamento.sql"
Cohesion: 0.18
Nodes (3): app.periodos_afastamento(), app.teto_duracao_estagio(), app.validar_afastamento()

### Community 204 - "app.verificar_declaracao"
Cohesion: 0.20
Nodes (3): app.apuracao_atividades_cumpridas(), app.pode_emitir_declaracao(), app.verificar_declaracao()

### Community 205 - "zod"
Cohesion: 0.26
Nodes (9): zod, errosPorCampo(), faixa(), mensagemDoProblema(), Problema, concedente, mostrar(), NomeValidacao (+1 more)

### Community 206 - ""declaracao""
Cohesion: 0.25
Nodes (5): "declaracao", declaracao_apuracao_idx, declaracao_emitida_por_idx, declaracao_estagio_idx, declaracao_estudante_idx

### Community 207 - "parametros/route.ts"
Cohesion: 0.29
Nodes (8): GET, GET, parametrosJson(), GET, PUT, definirParametrosBodySchema, toParametros(), getParametrosVigentes()

### Community 208 - "parametro-service.ts"
Cohesion: 0.31
Nodes (8): parametroInstitucional, colunas, findHistoricoParametros(), findParametroVigente(), insertParametro(), paraDominio(), ParametroRow, definirParametros()

### Community 209 - "01_identidade.sql"
Cohesion: 0.31
Nodes (4): app.buscar_contas_estudante(), app.coordena_curso(), app.coordena_estudante_usuario(), app.tem_perfil_vigente()

### Community 210 - "registrar_auditoria"
Cohesion: 0.29
Nodes (4): auditoria_sem_truncate, auditoria_somente_inclusao, definir_atualizado_em, registrar_auditoria

### Community 211 - "afastamentos/route.ts"
Cohesion: 0.36
Nodes (8): POST, GET, POST, afastamentoJson(), afastamentoBodySchema, substituicaoAfastamentoBodySchema, toNovoAfastamento(), registrarAfastamento()

### Community 212 - "notificacoes/route.ts"
Cohesion: 0.36
Nodes (6): POST, notificacaoJson(), GET, NotificacaoRow, notificacaoIdParamSchema, notificacoesQuerySchema

### Community 213 - "concedentes.ts"
Cohesion: 0.20
Nodes (7): convenio, convenioVigencia, historicoSituacaoConcedente, porteConcedente, setorAtuacao, situacaoConcedente, situacaoConvenio

### Community 214 - "triggers/academico.sql"
Cohesion: 0.31
Nodes (4): bloquear_alteracao, definir_atualizado_em, registrar_auditoria, validar_situacao_academica

### Community 217 - "triggers/documentos_convenios.sql"
Cohesion: 0.39
Nodes (4): bloquear_alteracao, definir_atualizado_em, registrar_auditoria, validar_alteracao_documento

### Community 218 - "guarda.sql"
Cohesion: 0.29
Nodes (4): bloquear_exclusao_documento, definir_guarda_convenio, definir_guarda_documento, definir_guarda_estudante

### Community 219 - "triggers/rescisao.sql"
Cohesion: 0.36
Nodes (5): aplicar_rescisao, bloquear_alteracao_rescisao, registrar_auditoria, registrar_encerramento, validar_rescisao

### Community 220 - "senhas-vazadas.ts"
Cohesion: 0.39
Nodes (6): CAMINHOS_VERIFICADOS, contagemNoRange(), Opcoes, senhaComprometida(), senhasVazadas(), sha1Hex()

### Community 221 - "papeis.ts"
Cohesion: 0.43
Nodes (6): AcoesNoEstagio, NENHUM_PAPEL, PapeisNoEstagio, ParteAssinatura, como(), quem()

### Community 222 - ""rescisao""
Cohesion: 0.38
Nodes (3): "rescisao", rescisao_decidido_por_idx, rescisao_documento_idx

### Community 225 - "percurso-estagio.tsx"
Cohesion: 0.38
Nodes (5): LoginPage(), ETAPAS, PercursoEstagio(), Perfil, PERFIS

### Community 226 - "cnpj.ts"
Cohesion: 0.48
Nodes (5): cnpjValido(), digito(), normalizarCnpj(), PESOS_PRIMEIRO, PESOS_SEGUNDO

### Community 227 - ""contexto_administrador""
Cohesion: 0.60
Nodes (3): "contexto_administrador", contexto_administrador_administrador_idx, contexto_administrador_sessao_aberta

### Community 231 - "quality"
Cohesion: 0.67
Nodes (3): quality, name, runs-on

## Knowledge Gaps
- **47 isolated node(s):** `RFC-5737`, `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`, `react-dom`, `@tailwindcss/postcss` (+42 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1041 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **116 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `drizzle-orm` connect `Conexão e withUser` to `Identidade do estudante`, `Testes e suporte compartilhado`, `frequencia-service.ts`, `concedentes.test.ts`, `estagios.ts`, `auditoria-service.ts`, `Serviço de concedentes`, `atividade-service.ts`, `Serviço de relatórios`, `Identidade e avaliação`, `DomainError`, `Testes de senha provisória`, `Serviço de integralização`, `formalizacao-service.ts`, `estudante-service.ts`, `Serviço de documentos`, `declaracao-service.ts`, `package.json`, `Serviço de cursos`, `Serviço de convênios`, `Periodicidade de relatórios`, `contexto-service.ts`, `Schema de acompanhamento`, `apply-migrations.ts`, `seed.ts`, `categoria-service.ts`, `parametro-service.ts`, `owner`, `aditivo-service.ts`, `concedentes.ts`, `guarda-service.ts`, `usuario-repository.ts`, `afastamento-service.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `RFC-5737`, `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono` to the rest of the system?**
  _47 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Testes e suporte compartilhado` be split into smaller, more focused modules?**
  _Cohesion score 0.13388937664618086 - nodes in this community are weakly interconnected._
- **Why does `dataResponse()` connect `API de estágios` to `_acompanhamento/json.ts`, `Serviço de concedentes`, `lib/api.ts`, `Identidade e avaliação`, `estudante-service.ts`, `declaracao-service.ts`, `frequencia.ts`, `searchParamsOf`, `usuario.ts`, `concedente.ts`, `atividade.ts`, `Periodicidade de relatórios`, `contexto-service.ts`, `curso.ts`, `desempenho.ts`, `schemas/parametros.ts`, `parametros/route.ts`, `categoria-service.ts`, `afastamentos/route.ts`, `notificacoes/route.ts`, `documentos/schemas.ts`, `versoes/route.ts`, `apuracao/route.ts`, `convenio.ts`, `classificacao-routes.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `API de estágios` be split into smaller, more focused modules?**
  _Cohesion score 0.07338935574229692 - nodes in this community are weakly interconnected._
- **Why does `withUser()` connect `Identidade e avaliação` to `Testes e suporte compartilhado`, `API de estágios`, `frequencia-service.ts`, `estagios/[id]/page.tsx`, `Telas de listagem`, `concedentes.test.ts`, `auditoria-service.ts`, `usuario-service.ts`, `Serviço de concedentes`, `atividade-service.ts`, `Serviço de relatórios`, `DomainError`, `Serviço de integralização`, `formalizacao-service.ts`, `Conexão e withUser`, `estudante-service.ts`, `Serviço de documentos`, `declaracao-service.ts`, `Dados de listagem e desempenho`, `identity.ts`, `frequencia.ts`, `searchParamsOf`, `usuario.ts`, `Serviço de cursos`, `Serviço de convênios`, `atividade.ts`, `Periodicidade de relatórios`, `contexto-service.ts`, `curso.ts`, `desempenho.ts`, `rotulos.ts`, `parametros/route.ts`, `categoria-service.ts`, `parametro-service.ts`, `owner`, `aditivo-service.ts`, `lib/errors.ts`, `guarda-service.ts`, `classificacao-routes.ts`, `afastamento-service.ts`, `documento-estagio-service.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `frequencia-service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05798319327731093 - nodes in this community are weakly interconnected._