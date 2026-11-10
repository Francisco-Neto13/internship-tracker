# Graph Report - internship-tracker  (2026-11-10)

## Corpus Check
- 624 files · ~387,682 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 35 file(s) not represented in the graph (top: (none) 31, .example 1, .conf 1)

## Summary
- 3388 nodes · 11375 edges · 196 communities (130 shown, 66 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 138 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6515b3dd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Testes e suporte compartilhado
- API de estágios
- frequencia-service.ts
- domain/documentos.ts
- Dependências do projeto
- Scripts de CI e GitHub
- estagios/[id]/page.tsx
- API de acompanhamento
- @playwright/test
- Telas de listagem
- Fixtures e estudantes
- Barra lateral e navegação
- 07_estagios.sql
- esqueleto.tsx
- estagios.ts
- Auditoria e relatórios gerenciais
- usuario-service.ts
- Serviço de concedentes
- atividade-service.ts
- Migração de estágios
- lib/api.ts
- Migrações concedentes e documentos
- SQL de convênios e documentos
- Formulários da API
- Serviço de relatórios
- Identidade e avaliação
- DomainError
- SQL de avaliação
- SQL de frequência
- Painel por perfil
- Testes de senha provisória
- Serviço de integralização
- withUser
- Workflow de deploy
- Conexão e withUser
- estudante-service.ts
- "public"."atividade_complementar"
- SQL de relatórios
- Serviço de documentos
- "public"."usuario"
- declaracoes/route.ts
- Compose de desenvolvimento
- Botões e ações de usuário
- 0004_documentos_convenios.sql
- Campos e formulários de login
- telas-decisoes.spec.ts
- Dados de listagem e desempenho
- acesso-tela.ts
- lib/errors.ts
- documento-acompanhamento.ts
- Scripts npm
- searchParamsOf
- getCargaHoraria
- dataResponse
- Serviço de cursos
- support/api.ts
- Migração de fundação
- Serviço de convênios
- documento-relatorio.ts
- Periodicidade de relatórios
- SQL de afastamento
- estudante-form.tsx
- Menu do usuário e senha
- validacoes.ts
- Configuração TypeScript
- Better Auth
- Schema de acompanhamento
- 0011_integralizacao.sql
- pdf.ts
- acessibilidade.spec.ts
- API de estudantes
- auditoria/page.tsx
- apply-migrations.ts
- Doc: segurança e RLS
- schemas/parametros.ts
- Compose prod: variáveis da app
- Migração de frequência
- Migração de relatórios
- Migração de atividades
- seed.ts
- gerarPdfDocumento
- convenios-documentos.test.ts
- Doc: VPS e produção
- jornada.ts
- CI: passos
- CI: variáveis
- CI: jobs
- atividades.ts
- support/estagio.ts
- schema/integralizacao.ts
- getIntegralizacao
- acesso.ts
- public.declaracao
- RecuperarSenhaForm
- Doc: módulos de domínio
- Doc: fluxo de branches
- Compose prod: ferramentas
- Compose prod: armazenamento
- Migração de parâmetros
- Máscaras de campo
- Senha contextual
- with-user.ts
- Doc: decisões de negócio
- Doc: autenticação e stack
- Compose prod: serviço app
- CI: ações
- primeiro-acesso.spec.ts
- Domínio de avaliação
- "notificacao"
- pdfAvaliacao
- Serviço de notificações
- Doc: dados sensíveis
- Compose prod: healthchecks
- Compose prod: variáveis Postgres
- Compose prod: Postgres
- "public"."estagio"
- Teste de restauração
- estudantes/[id]/page.tsx
- SQL de auditoria
- Script de backup
- Configuração de backup
- Layout raiz
- Doc: guia e estados
- CI: fonte de branch
- CI: gatilhos
- Identidade do estudante
- Stub HIBP
- CI: HIBP real
- Logo principal
- Troca de cofre
- CI: job banco
- CI: job e2e
- Logo reverso
- Criação de cofre
- Script de publicação
- Ícone do app
- Doc: validação de campos
- Doc: erros de domínio
- Papéis Postgres prod
- Configuração PostCSS
- Abertura de cofre
- Configuração de deploy
- Configuração da VPS
- Script de implantação
- Rotina diária
- Espaço em disco
- Isolado: Listing state in the URL, resolved on the server

## God Nodes (most connected - your core abstractions)
1. `dataResponse()` - 230 edges
2. `withUser()` - 186 edges
3. `DomainError` - 158 edges
4. `authenticatedRoute()` - 114 edges
5. `drizzle-orm` - 84 edges
6. `cn()` - 75 edges
7. `vitest` - 75 edges
8. `minutosParaHoras()` - 56 edges
9. `next` - 55 edges
10. `Button()` - 54 edges

## Surprising Connections (you probably didn't know these)
- `Paginacao()` --indirect_call--> `botao()`  [INFERRED]
  src/shared/ui/paginacao.tsx → e2e/acoes-por-perfil.spec.ts
- `main()` --calls--> `getArmazenamento()`  [EXTRACTED]
  scripts/storage/check.ts → src/shared/documentos/armazenamento.ts
- `SeaweedFS volumeSizeLimitMB=128` --references--> `SeaweedFS object storage`  [EXTRACTED]
  scripts/servidor/REGRAS-DA-VPS.md → AGENTS.md
- `Health data isolation in the vault` --references--> `LUKS vault at /srv/dados`  [EXTRACTED]
  scripts/servidor/REGRAS-DA-VPS.md → AGENTS.md
- `VPS rules` --conceptually_related_to--> `Backup layers (pgBackRest, restic and rclone, Contabo Auto Backup)`  [INFERRED]
  scripts/servidor/REGRAS-DA-VPS.md → AGENTS.md

## Import Cycles
- 2-file cycle: `src/db/schema/academico.ts -> src/db/schema/acesso.ts -> src/db/schema/academico.ts`
- 2-file cycle: `src/db/schema/documentos.ts -> src/db/schema/estagios.ts -> src/db/schema/documentos.ts`
- 2-file cycle: `src/db/schema/concedentes.ts -> src/db/schema/documentos.ts -> src/db/schema/concedentes.ts`
- 2-file cycle: `src/db/schema/acesso.ts -> src/db/schema/concedentes.ts -> src/db/schema/acesso.ts`
- 3-file cycle: `src/db/schema/acesso.ts -> src/db/schema/concedentes.ts -> src/db/schema/documentos.ts -> src/db/schema/acesso.ts`
- 3-file cycle: `src/db/schema/concedentes.ts -> src/db/schema/documentos.ts -> src/db/schema/estagios.ts -> src/db/schema/concedentes.ts`
- 4-file cycle: `src/db/schema/academico.ts -> src/db/schema/acesso.ts -> src/db/schema/concedentes.ts -> src/db/schema/documentos.ts -> src/db/schema/academico.ts`
- 4-file cycle: `src/db/schema/acesso.ts -> src/db/schema/concedentes.ts -> src/db/schema/documentos.ts -> src/db/schema/estagios.ts -> src/db/schema/acesso.ts`
- 5-file cycle: `src/db/schema/academico.ts -> src/db/schema/acesso.ts -> src/db/schema/concedentes.ts -> src/db/schema/documentos.ts -> src/db/schema/estagios.ts -> src/db/schema/academico.ts`

## Hyperedges (group relationships)
- **Branch flow protection** — agents_github_rulesets, agents_local_ci, agents_pre_push_hook, agents_batch_workflow [EXTRACTED 1.00]
- **RLS enforcement stack** — agents_with_user_wrapper, agents_role_app_runtime, agents_app_schema_functions, agents_declarative_drizzle_sql, agents_rls [EXTRACTED 1.00]
- **Encrypted production data handling** — agents_luks_cofre, agents_seaweedfs_storage, agents_backup_layers, scripts_servidor_regras_da_vps_docker_after_vault [INFERRED 0.85]

## Communities (196 total, 66 thin omitted)

### Community 0 - "Testes e suporte compartilhado"
Cohesion: 0.10
Nodes (46): hash, PARAMETROS_PADRAO, criarCriterio(), listCriterios(), registrarAvaliacao(), homologarFrequencia(), registrarFrequencia(), NovaRescisao (+38 more)

### Community 1 - "API de estágios"
Cohesion: 0.05
Nodes (77): POST, POST, GET, POST, GET, POST, GET, POST (+69 more)

### Community 2 - "frequencia-service.ts"
Cohesion: 0.10
Nodes (39): abrirDivergencia(), analisarDivergencia(), colunasEstagio, DivergenciaRow, EstagioAcompanhado, FiltrosFrequencia, findDivergenciaById(), findEstagioAcompanhado() (+31 more)

### Community 3 - "domain/documentos.ts"
Cohesion: 0.14
Nodes (25): Aditivo, Apolice, Assinatura, assinaturas(), cnpj(), data(), documentoAditivo(), documentoPlano() (+17 more)

### Community 4 - "Dependências do projeto"
Cohesion: 0.03
Nodes (74): DATABASE_CLIENT, MODULES, PG_DRIVER, dependencies, @aws-sdk/client-s3@^3.907.0, @aws-sdk/s3-request-presigner@^3.907.0, better-auth@1.7.4, class-variance-authority@^0.7.1 (+66 more)

### Community 5 - "Scripts de CI e GitHub"
Cohesion: 0.08
Nodes (42): args, CODE_PATHS, fail(), fast, hasDocker(), ok, onlyIndex, requireDocker (+34 more)

### Community 6 - "estagios/[id]/page.tsx"
Cohesion: 0.10
Nodes (61): ConcedentePage(), ConveniosPage(), horas(), ParametrosPage(), AcompanhamentoEstagio(), h(), seVisivel(), DesempenhoEstagio() (+53 more)

### Community 7 - "API de acompanhamento"
Cohesion: 0.05
Nodes (65): acompanhamentoJson(), avaliacaoJson(), cargaHorariaJson(), criterioJson(), divergenciaCalculadaJson(), divergenciaJson(), estagioAcompanhadoJson(), frequenciaJson() (+57 more)

### Community 8 - "@playwright/test"
Cohesion: 0.09
Nodes (3): COORDENACAO, isCI, @playwright/test

### Community 9 - "Telas de listagem"
Cohesion: 0.10
Nodes (73): nextConfig, lucide-react, next, AuditoriaPage(), Concedente, ConcedentesPage(), SITUACOES, CursosPage() (+65 more)

### Community 10 - "Fixtures e estudantes"
Cohesion: 0.09
Nodes (39): estudante, vinculoPerfil, auditoria, Scenario, cenario(), Cenario, PAGINA, Scenario (+31 more)

### Community 11 - "Barra lateral e navegação"
Cohesion: 0.10
Nodes (36): AppSidebar(), ItemDeMenu(), AppLayout(), TopbarTitle(), encontrarItem(), gruposVisiveis(), SheetContent(), SheetOverlay() (+28 more)

### Community 12 - "07_estagios.sql"
Cohesion: 0.07
Nodes (23): app.buscar_contas_responsavel(), app.coordena_curso_do_estagio(), app.dias_usados_no_par(), app.e_estudante_do_estagio(), app.e_responsavel_vigente(), app.efetivar_aditivo(), app.estagios_legiveis(), app.estudante_atual_id() (+15 more)

### Community 13 - "esqueleto.tsx"
Cohesion: 0.70
Nodes (3): Carregando(), Esqueleto(), EsqueletoDePagina()

### Community 14 - "estagios.ts"
Cohesion: 0.10
Nodes (17): convenio, aditivo, afastamento, apoliceSeguro, assinatura, papelResponsavel, parteAssinatura, parteRescisao (+9 more)

### Community 15 - "Auditoria e relatórios gerenciais"
Cohesion: 0.06
Nodes (44): RFC-4180, GET, GET, BOM, celulaCsv(), CSV_SEPARADOR, gerarCsv(), TipoRelatorio (+36 more)

### Community 16 - "usuario-service.ts"
Cohesion: 0.06
Nodes (70): GET, POST, PUT, POST, GET, PATCH, POST, usuarioJson() (+62 more)

### Community 17 - "Serviço de concedentes"
Cohesion: 0.10
Nodes (37): concedente, convenioVigencia, historicoSituacaoConcedente, porteConcedente, setorAtuacao, situacaoConcedente, situacaoConvenio, Catalogo (+29 more)

### Community 18 - "atividade-service.ts"
Cohesion: 0.07
Nodes (67): POST, POST, POST, POST, GET, PATCH, GET, GET (+59 more)

### Community 19 - "Migração de estágios"
Cohesion: 0.09
Nodes (38): "aditivo", aditivo_criado_por_idx, aditivo_documento_idx, aditivo_estagio_numero_unique, aditivo_novo_supervisor_idx, aditivo_um_pendente, apolice_documento_idx, apolice_estagio_fim_idx (+30 more)

### Community 20 - "lib/api.ts"
Cohesion: 0.11
Nodes (20): POST, GET, GET, GET, documentoJson(), POST, POST, AuthenticatedRequest (+12 more)

### Community 21 - "Migrações concedentes e documentos"
Cohesion: 0.13
Nodes (17): "concedente", concedente_porte_idx, concedente_setor_idx, concedente_situacao_idx, "historico_situacao_concedente", historico_situacao_concedente_idx, historico_situacao_decidido_por_idx, "porte_concedente" (+9 more)

### Community 22 - "SQL de convênios e documentos"
Cohesion: 0.07
Nodes (20): "rescisao", rescisao_decidido_por_idx, rescisao_documento_idx, app.convenio_vigente_em(), app.pode_baixar_documento(), app.acessos_documento(), app.pode_consultar_acessos_documento(), app.registrar_leitura_documento() (+12 more)

### Community 23 - "Formulários da API"
Cohesion: 0.11
Nodes (45): react, NovoConvenio(), onSubmit(), CursoForm(), CursoInput, CursoOutput, cursoSchema, onSubmit() (+37 more)

### Community 24 - "Serviço de relatórios"
Cohesion: 0.13
Nodes (34): enviadoComAtraso(), pendenteDe(), relatorioEmAtraso(), SituacaoRelatorio, VisaoRelatorio, hoje(), AnexoRow, countRelatoriosPendentes() (+26 more)

### Community 25 - "Identidade e avaliação"
Cohesion: 0.13
Nodes (31): acompanhamento, avaliacaoDesempenho, criterioAvaliacao, respostaAvaliacao, AcompanhamentoRow, AvaliacaoRow, CriterioRow, findAcompanhamentoById() (+23 more)

### Community 26 - "DomainError"
Cohesion: 0.07
Nodes (71): DomainError, parametrosVigentesEm(), diaSeguinte(), exigirAtivavel(), FatosAtivacao, impedimentosAtivacao(), PARTES, Periodo (+63 more)

### Community 27 - "SQL de avaliação"
Cohesion: 0.10
Nodes (29): "acompanhamento", acompanhamento_estagio_data_idx, acompanhamento_registrado_por_idx, avaliacao_avaliador_idx, "avaliacao_desempenho", avaliacao_estagio_idx, avaliacao_uma_final, "criterio_avaliacao" (+21 more)

### Community 28 - "SQL de frequência"
Cohesion: 0.13
Nodes (16): app.conferir_homologacao(), app.em_afastamento(), app.exigir_substituto_frequencia(), app.validar_alteracao_frequencia(), app.validar_homologacao(), app.validar_registro_frequencia(), bloquear_alteracao, conferir_homologacao (+8 more)

### Community 29 - "Painel por perfil"
Cohesion: 0.11
Nodes (41): DistribuicaoEstagios(), LinhaCompacta(), ListaCompacta(), SITUACOES, dadosEstudante(), dadosSupervisor(), BlocoAdministrador(), BlocoConcedente() (+33 more)

### Community 30 - "Testes de senha provisória"
Cohesion: 0.11
Nodes (29): GET(), POST(), conta, sessao, usuario, notificacao, tipoNotificacao, Auth (+21 more)

### Community 31 - "Serviço de integralização"
Cohesion: 0.17
Nodes (20): Apuracao, CategoriaApurada, progresso(), Situacao, base, ApuracaoRow, apurar(), calcular() (+12 more)

### Community 32 - "withUser"
Cohesion: 0.07
Nodes (64): Transaction, withUser(), AditivoRow, cancelarAditivo(), efetivarAditivo(), findAditivoById(), findAditivos(), findAssinaturasAditivo() (+56 more)

### Community 33 - "Workflow de deploy"
Cohesion: 0.06
Nodes (32): concurrency, cancel-in-progress, group, env, if, name, runs-on, steps (+24 more)

### Community 34 - "Conexão e withUser"
Cohesion: 0.13
Nodes (19): drizzle-orm, pg, vitest, GET(), closeDatabases(), Database, ENV_BY_POOL, getAppDatabase() (+11 more)

### Community 35 - "estudante-service.ts"
Cohesion: 0.11
Nodes (25): padraoContendo(), SITUACAO_ACADEMICA_INICIAL, SituacaoAcademica, TODAS, transicaoPermitida(), TRANSICOES_SITUACAO_ACADEMICA, validarTransicaoSituacaoAcademica(), findCursos() (+17 more)

### Community 36 - ""public"."atividade_complementar""
Cohesion: 0.07
Nodes (29): app.parametros_em(), app.aplicar_analise_atividade(), app.coordena_curso_do_estudante(), app.estudante_da_atividade(), app.exigir_comprovante_atividade(), app.validar_atividade(), app.validar_origem_estagio(), app.teto_duracao_estagio() (+21 more)

### Community 37 - "SQL de relatórios"
Cohesion: 0.10
Nodes (22): app.aplicar_parecer_relatorio(), app.estagio_da_versao(), app.estagio_do_relatorio(), app.exigir_conteudo_versao(), app.gerar_relatorios(), app.periodicidade_de(), app.validar_anexo_relatorio(), app.validar_parecer_relatorio() (+14 more)

### Community 38 - "Serviço de documentos"
Cohesion: 0.12
Nodes (31): dadosDeclaracao(), insertDeclaracao(), emitirDeclaracao(), NovaDeclaracao, REGRAS, traduzir(), getArmazenamento(), ASSINATURAS (+23 more)

### Community 39 - ""public"."usuario""
Cohesion: 0.08
Nodes (27): "declaracao", declaracao_apuracao_idx, declaracao_emitida_por_idx, declaracao_estagio_idx, declaracao_estudante_idx, app.buscar_contas_estudante(), app.coordena_curso(), app.coordena_estudante_usuario() (+19 more)

### Community 40 - "declaracoes/route.ts"
Cohesion: 0.15
Nodes (16): GET, params, POST, declaracaoJson(), declaracao, cnpj(), DadosDeclaracao, data() (+8 more)

### Community 41 - "Compose de desenvolvimento"
Cohesion: 0.09
Nodes (26): AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, interval, retries, test (+18 more)

### Community 42 - "Botões e ações de usuário"
Cohesion: 0.23
Nodes (15): Confirmar(), DadosConta(), PerfisConta(), SegurancaConta(), useEnvio(), enviar(), mensagemDeErro(), Opcao (+7 more)

### Community 43 - "0004_documentos_convenios.sql"
Cohesion: 0.24
Nodes (14): "convenio", convenio_concedente_idx, "convenio_vigencia", convenio_vigencia_documento_idx, convenio_vigencia_fim_idx, convenio_vigencia_registrado_por_idx, "documento", documento_concedente_idx (+6 more)

### Community 44 - "Campos e formulários de login"
Cohesion: 0.23
Nodes (10): zod, LoginForm(), loginSchema, LoginValues, authClient, FAIXA_DATA, SENHA_MAXIMO, SENHA_MINIMO (+2 more)

### Community 45 - "telas-decisoes.spec.ts"
Cohesion: 0.18
Nodes (7): telaDe(), entrar(), sessao, entrar(), MATRIZ, sessao, TELAS

### Community 46 - "Dados de listagem e desempenho"
Cohesion: 0.18
Nodes (21): AQUECIMENTO, exigirBancoDeTeste(), main(), Medicao, medir(), REPETICOES, contagemPorSituacao(), dadosAdministrador() (+13 more)

### Community 47 - "acesso-tela.ts"
Cohesion: 0.15
Nodes (19): AdministracaoPage(), AREAS, Cartao(), ALCANCE, EntradaCatalogo, EXIGEM_CONCEDENTE, findPerfisVigentes(), Perfil (+11 more)

### Community 48 - "lib/errors.ts"
Cohesion: 0.08
Nodes (47): findPgError(), isExclusionViolation(), isForeignKeyViolation(), isRlsViolation(), isTriggerRule(), isUniqueViolation(), PgError, triggerRuleDetail() (+39 more)

### Community 49 - "documento-acompanhamento.ts"
Cohesion: 0.17
Nodes (13): DocumentoPdf, TabelaPdf, Avaliacao, Criterio, documentoAvaliacao(), folhaFrequencia(), horas(), Lancamento (+5 more)

### Community 50 - "Scripts npm"
Cohesion: 0.09
Nodes (23): scripts, batch:integrate, batch:pr, build, ci, db:desempenho, db:generate, db:migrate (+15 more)

### Community 51 - "searchParamsOf"
Cohesion: 0.09
Nodes (23): GET, GET, GET, cursoJson(), GET, POST, GET, POST (+15 more)

### Community 52 - "getCargaHoraria"
Cohesion: 0.25
Nodes (13): estagio, limites, avaliarDivergencia(), diaAnterior(), diasUteis(), Divergencia, EstagioCarga, minutosPrevistosAte() (+5 more)

### Community 53 - "dataResponse"
Cohesion: 0.06
Nodes (51): classificacaoJson(), rotasColecao(), rotasItem(), GET, POST, GET, GET, POST (+43 more)

### Community 54 - "Serviço de cursos"
Cohesion: 0.23
Nodes (14): colunas, CursoResumo, CursoRow, CursoValues, findCursoById(), insertCurso(), updateCurso(), acessoNegado() (+6 more)

### Community 55 - "support/api.ts"
Cohesion: 0.27
Nodes (10): enviarComprovante(), sessao, sessao, enviarAtestado(), sessao, contextos, dados(), erro() (+2 more)

### Community 56 - "Migração de fundação"
Cohesion: 0.14
Nodes (20): "auditoria", auditoria_ocorrido_em_idx, auditoria_tabela_registro_idx, auditoria_usuario_id_idx, "conta", conta_provedor_conta_unico, conta_usuario_id_idx, "curso" (+12 more)

### Community 57 - "Serviço de convênios"
Cohesion: 0.26
Nodes (19): ConvenioRow, findConvenioById(), findConveniosAVencer(), findConveniosDaConcedente(), findVigencias(), insertConvenio(), insertVigencia(), updateConvenio() (+11 more)

### Community 58 - "documento-relatorio.ts"
Cohesion: 0.18
Nodes (11): SecaoPdf, DECISAO, documentoRelatorio(), nomeRelatorio(), Parecer, Relatorio, identificacao, relatorio (+3 more)

### Community 59 - "Periodicidade de relatórios"
Cohesion: 0.20
Nodes (16): GET, periodicidadeJson(), PUT, Periodicidade, PERIODICIDADE_PADRAO, TipoEstagio, findPeriodicidades(), PeriodicidadeRow (+8 more)

### Community 60 - "SQL de afastamento"
Cohesion: 0.16
Nodes (13): "afastamento", afastamento_documento_idx, afastamento_estagio_periodo_idx, afastamento_registrado_por_idx, app.exigir_substituto_afastamento(), app.periodos_afastamento(), app.validar_afastamento(), aplicar_afastamento (+5 more)

### Community 61 - "estudante-form.tsx"
Cohesion: 0.26
Nodes (9): EstudanteForm(), EstudanteInput, EstudanteOutput, estudanteSchema, AJUDA, VincularResponsavel(), BuscaConta(), Conta (+1 more)

### Community 62 - "Menu do usuário e senha"
Cohesion: 0.16
Nodes (10): ModalTrocarSenha(), iniciaisDoNome(), UserMenu(), dataHora, TrocarSenhaPage(), TrocarSenhaForm(), DropdownMenuContent(), DropdownMenuItem() (+2 more)

### Community 63 - "validacoes.ts"
Cohesion: 0.08
Nodes (27): PATCH, HORAS_CURSO_MAXIMO, concedente, UFS, errosPorCampo(), faixa(), mensagemDoProblema(), Problema (+19 more)

### Community 64 - "Configuração TypeScript"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 65 - "Better Auth"
Cohesion: 0.17
Nodes (14): createAuth(), cidrValido(), Env, lista(), opcoesEnderecoIp(), urlRangeSenhasVazadas(), verificacaoSenhaVazadaAtiva(), recuperacaoSenha() (+6 more)

### Community 66 - "Schema de acompanhamento"
Cohesion: 0.11
Nodes (15): anexoRelatorio, decisaoParecer, divergenciaCargaHoraria, homologacaoFrequencia, momentoAvaliacao, parecerRelatorio, registroFrequencia, relatorio (+7 more)

### Community 67 - "0011_integralizacao.sql"
Cohesion: 0.48
Nodes (6): "apuracao_categoria", apuracao_categoria_categoria_idx, apuracao_categoria_unique, apuracao_curso_idx, apuracao_estudante_recente_idx, "apuracao_integralizacao"

### Community 68 - "pdf.ts"
Cohesion: 0.21
Nodes (11): pdf-lib, A4, COR_LINHA, COR_MARCA, COR_SUAVE, COR_TEXTO, COR_TITULO, Fontes (+3 more)

### Community 69 - "acessibilidade.spec.ts"
Cohesion: 0.17
Nodes (4): PERFIS, @axe-core/playwright@^4.10.2, @axe-core/playwright, final()

### Community 70 - "API de estudantes"
Cohesion: 0.24
Nodes (12): GET, PATCH, estudanteJson(), GET, POST, createEstudanteBodySchema, estudanteIdParamSchema, listEstudantesQuerySchema (+4 more)

### Community 71 - "auditoria/page.tsx"
Cohesion: 0.15
Nodes (22): Alteracao(), COLUNAS, Registro, TOM, valor(), acentuar(), capitalizar(), CODIGOS (+14 more)

### Community 72 - "apply-migrations.ts"
Cohesion: 0.23
Nodes (7): applyMigrations(), assertRuntimeRolesCannotBypassRls(), MIGRATIONS_DIR, ROOT, SQL_STAGES, setup(), URL_VARIABLES

### Community 73 - "Doc: segurança e RLS"
Cohesion: 0.17
Nodes (10): Audit by database trigger with masked sensitive columns, Declarative drizzle/sql security layer, Identity (produced only by session.ts), Layered architecture (presentation, API, domain, persistence, database), Row Level Security on every table, migrator database role, withUser identity transaction wrapper, Write flow from Route Handler to audit trigger (+2 more)

### Community 74 - "schemas/parametros.ts"
Cohesion: 0.12
Nodes (22): PATCH, categoriaJson(), GET, POST, Exigencias, exigenciasJson(), GET, PUT (+14 more)

### Community 75 - "Compose prod: variáveis da app"
Cohesion: 0.25
Nodes (14): environment, AUTH_IP_HEADERS, BETTER_AUTH_SECRET, BETTER_AUTH_URL, CRON_SECRET, DATABASE_AUTH_URL, DATABASE_MIGRATION_URL, DATABASE_URL (+6 more)

### Community 76 - "Migração de frequência"
Cohesion: 0.25
Nodes (13): divergencia_analisada_por_idx, "divergencia_carga_horaria", divergencia_estagio_idx, divergencia_uma_aberta_por_estagio, frequencia_estagio_data_situacao_idx, frequencia_homologacao_idx, frequencia_parametro_idx, frequencia_registrado_por_idx (+5 more)

### Community 77 - "Migração de relatórios"
Cohesion: 0.23
Nodes (13): "anexo_relatorio", anexo_relatorio_versao_idx, "parecer_relatorio", parecer_relatorio_emitido_por_idx, periodicidade_curso_tipo_unique, "periodicidade_relatorio", "relatorio", relatorio_estagio_tipo_sequencia_unique (+5 more)

### Community 78 - "Migração de atividades"
Cohesion: 0.25
Nodes (13): analise_analisado_por_idx, "analise_atividade", analise_atividade_idx, atividade_categoria_idx, "atividade_complementar", atividade_estudante_situacao_idx, atividade_fila_analise_idx, atividade_registrada_por_idx (+5 more)

### Community 79 - "seed.ts"
Cohesion: 0.13
Nodes (22): Banco, criarAdministrador(), existeAdministrador(), main(), CATEGORIAS, CRITERIOS, db, ensurePerfil() (+14 more)

### Community 80 - "gerarPdfDocumento"
Cohesion: 0.42
Nodes (5): cabecalho(), criar(), Escritor, gerarPdfDocumento(), gerarPdfTabela()

### Community 81 - "convenios-documentos.test.ts"
Cohesion: 0.13
Nodes (17): main(), NovoAfastamento, Armazenamento, armazenamentoS3(), configuracaoS3(), definirArmazenamento(), armazenamentoMemoria(), afastamento() (+9 more)

### Community 82 - "Doc: VPS e produção"
Cohesion: 0.19
Nodes (9): Backup layers (pgBackRest, restic and rclone, Contabo Auto Backup), LUKS vault at /srv/dados, Production deployment on Contabo VPS, New server setup scripts (cofre-criar, publicar, configurar-deploy, backup-configurar), Encrypted vault limited to 30% of the disk, SeaweedFS volumeSizeLimitMB=128, Shared server proxy at /srv/proxy, vps-espaco disk check (+1 more)

### Community 83 - "jornada.ts"
Cohesion: 0.20
Nodes (11): AvaliacaoJornada, avaliarJornada(), duracaoDoHorario(), HorarioDoDia, Limites, minutosDoHorario(), ProblemaHorario, semanaIso() (+3 more)

### Community 84 - "CI: passos"
Cohesion: 0.27
Nodes (12): steps, steps, steps, quality, name, runs-on, steps, steps (+4 more)

### Community 85 - "CI: variáveis"
Cohesion: 0.17
Nodes (12): env, AUTH_IP_HEADERS, BETTER_AUTH_SECRET, BETTER_AUTH_URL, DATABASE_AUTH_URL, DATABASE_MIGRATION_URL, DATABASE_URL, R2_ACCESS_KEY_ID (+4 more)

### Community 86 - "CI: jobs"
Cohesion: 0.18
Nodes (10): concurrency, cancel-in-progress, group, jobs, source-branch, name, permissions, contents (+2 more)

### Community 87 - "atividades.ts"
Cohesion: 0.17
Nodes (9): analiseAtividade, atividadeComplementar, comprovanteAtividade, decisaoAnalise, situacaoAtividade, documento, TAMANHO_MAXIMO_BYTES, tipoDocumento (+1 more)

### Community 88 - "support/estagio.ts"
Cohesion: 0.25
Nodes (7): botao(), sessao, estagioAtivoDesdeAgosto(), sessao, criarEstagioAtivoDesdeAgosto(), criarEstagioEmFormalizacao(), Sessao

### Community 89 - "schema/integralizacao.ts"
Cohesion: 0.20
Nodes (9): curso, periodicidadeRelatorio, situacaoAcademica, apuracaoCategoria, apuracaoIntegralizacao, gatilhoApuracao, situacaoCategoriaIntegralizacao, situacaoIntegralizacao (+1 more)

### Community 90 - "getIntegralizacao"
Cohesion: 0.38
Nodes (6): POST, GET, integralizacaoJson(), estudanteIdParamSchema, getIntegralizacao(), Integralizacao

### Community 91 - "acesso.ts"
Cohesion: 0.25
Nodes (5): limiteRequisicao, situacaoUsuario, verificacao, perfil, tipoEstagio

### Community 92 - "public.declaracao"
Cohesion: 0.60
Nodes (3): bloquear_alteracao, registrar_auditoria, validar_declaracao

### Community 93 - "RecuperarSenhaForm"
Cohesion: 0.50
Nodes (3): metadata, RecuperarSenhaPage(), RecuperarSenhaForm()

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

### Community 98 - "Migração de parâmetros"
Cohesion: 0.36
Nodes (8): "categoria_atividade", categoria_atividade_nome_unique, "exigencia_categoria", exigencia_categoria_categoria_idx, exigencia_categoria_curso_categoria_unique, exigencia_categoria_um_destino_estagio, "parametro_institucional", parametro_institucional_definido_por_idx

### Community 99 - "Máscaras de campo"
Cohesion: 0.17
Nodes (9): aplicarMascara(), Mascara, MASCARAS, TECLADO, cnpjValido(), digito(), normalizarCnpj(), PESOS_PRIMEIRO (+1 more)

### Community 100 - "Senha contextual"
Cohesion: 0.42
Nodes (7): normalizar(), PALAVRAS_DO_SERVICO, palavrasDeContexto(), semDigitosNasPontas(), senhaPrevisivel(), MARIA, validarSenhaContextual()

### Community 101 - "with-user.ts"
Cohesion: 0.18
Nodes (13): Identity, isValidUserId(), pendenciasConclusao(), chaveParaEliminacao(), DocumentoEmGuarda, eliminarDocumento(), findDocumentosEmGuarda(), eliminarDocumentoVencido() (+5 more)

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

### Community 107 - "Domínio de avaliação"
Cohesion: 0.32
Nodes (6): conferirRespostas(), Criterio, mediaNormalizada(), ProblemaResposta, Resposta, criterios

### Community 108 - ""notificacao""
Cohesion: 0.83
Nodes (3): "notificacao", notificacao_destinatario_recente_idx, notificacao_nao_lidas_idx

### Community 109 - "pdfAvaliacao"
Cohesion: 0.67
Nodes (3): GET, paramsSchema, pdfAvaliacao()

### Community 111 - "Serviço de notificações"
Cohesion: 0.29
Nodes (11): autorizado(), GET(), executarRotinaDiaria(), contarNaoLidas(), findNotificacoes(), marcarLida(), marcarTodasLidas(), lerNotificacao() (+3 more)

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

### Community 116 - ""public"."estagio""
Cohesion: 0.09
Nodes (19): app.encerrar_estagio(), app.validar_rescisao(), bloquear_alteracao, definir_atualizado_em, registrar_auditoria, validar_alteracao_aditivo, validar_alteracao_estagio, validar_alteracao_plano (+11 more)

### Community 117 - "Teste de restauração"
Cohesion: 0.38
Nodes (6): limpar(), RCLONE_CONFIG, RESTIC_PASSWORD_FILE, RESTIC_REPOSITORY, backup-testar-restauracao.sh script, sql()

### Community 118 - "estudantes/[id]/page.tsx"
Cohesion: 0.16
Nodes (21): CursoPage(), h(), h(), DadosAcademicos(), destinoDeVolta(), EstudantePage(), h(), semAlcance() (+13 more)

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
Cohesion: 0.40
Nodes (5): BASE, EVENT, HEAD, HIBP_LIVE_STRICT, env

### Community 127 - "CI: gatilhos"
Cohesion: 0.40
Nodes (5): on, pull_request, push, branches, branches

### Community 128 - "Identidade do estudante"
Cohesion: 0.40
Nodes (4): correspondencia, identidadeEstudante, juncao, estagio

### Community 131 - "CI: HIBP real"
Cohesion: 0.50
Nodes (4): continue-on-error, name, runs-on, hibp-live

### Community 133 - "Logo principal"
Cohesion: 0.83
Nodes (4): Internship Tracker Logo, Rising bar chart progress motif, Two-tone navy and blue shield emblem, Three stylized people around the shield

### Community 135 - "CI: job banco"
Cohesion: 0.67
Nodes (3): name, runs-on, database

### Community 136 - "CI: job e2e"
Cohesion: 0.67
Nodes (3): name, runs-on, e2e

### Community 137 - "Logo reverso"
Cohesion: 1.00
Nodes (3): Internship Tracker Reversed Logo, Shield Emblem with Figures and Rising Bar Chart, Internship Tracker Wordmark (white and light blue, for dark backgrounds)

### Community 140 - "Ícone do app"
Cohesion: 1.00
Nodes (3): Internship Tracker App Icon (navy and blue shield logo), Rising Bar Chart Motif (progress tracking), Shield Formed by Three People

## Knowledge Gaps
- **36 isolated node(s):** `RCLONE_CONFIG`, `RESTIC_PASSWORD_FILE`, `RESTIC_REPOSITORY`, `RCLONE_CONFIG`, `RESTIC_PASSWORD_FILE` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 808 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **66 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `drizzle-orm` connect `Conexão e withUser` to `Identidade do estudante`, `Testes e suporte compartilhado`, `frequencia-service.ts`, `Dependências do projeto`, `Fixtures e estudantes`, `estagios.ts`, `Auditoria e relatórios gerenciais`, `usuario-service.ts`, `Serviço de concedentes`, `atividade-service.ts`, `Serviço de relatórios`, `Identidade e avaliação`, `DomainError`, `Testes de senha provisória`, `Serviço de integralização`, `withUser`, `estudante-service.ts`, `Serviço de documentos`, `declaracoes/route.ts`, `lib/errors.ts`, `Serviço de cursos`, `Serviço de convênios`, `Periodicidade de relatórios`, `Schema de acompanhamento`, `apply-migrations.ts`, `seed.ts`, `convenios-documentos.test.ts`, `atividades.ts`, `schema/integralizacao.ts`, `acesso.ts`, `with-user.ts`, `Serviço de notificações`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `RCLONE_CONFIG`, `RESTIC_PASSWORD_FILE`, `RESTIC_REPOSITORY` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Testes e suporte compartilhado` be split into smaller, more focused modules?**
  _Cohesion score 0.10443307757885763 - nodes in this community are weakly interconnected._
- **Why does `withUser()` connect `withUser` to `Testes e suporte compartilhado`, `API de estágios`, `frequencia-service.ts`, `estagios/[id]/page.tsx`, `API de acompanhamento`, `Telas de listagem`, `Fixtures e estudantes`, `Auditoria e relatórios gerenciais`, `usuario-service.ts`, `Serviço de concedentes`, `atividade-service.ts`, `Serviço de relatórios`, `Identidade e avaliação`, `DomainError`, `Testes de senha provisória`, `Serviço de integralização`, `Conexão e withUser`, `estudante-service.ts`, `Serviço de documentos`, `declaracoes/route.ts`, `Dados de listagem e desempenho`, `acesso-tela.ts`, `lib/errors.ts`, `searchParamsOf`, `getCargaHoraria`, `dataResponse`, `Serviço de cursos`, `Serviço de convênios`, `Periodicidade de relatórios`, `convenios-documentos.test.ts`, `getIntegralizacao`, `with-user.ts`, `Serviço de notificações`, `estudantes/[id]/page.tsx`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `API de estágios` be split into smaller, more focused modules?**
  _Cohesion score 0.04707511249567324 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `Conexão e withUser` to `Testes e suporte compartilhado`, `domain/documentos.ts`, `Dependências do projeto`, `estagios/[id]/page.tsx`, `Telas de listagem`, `Fixtures e estudantes`, `Auditoria e relatórios gerenciais`, `usuario-service.ts`, `atividade-service.ts`, `lib/api.ts`, `Serviço de relatórios`, `DomainError`, `Testes de senha provisória`, `Serviço de integralização`, `estudante-service.ts`, `Serviço de documentos`, `declaracoes/route.ts`, `acesso-tela.ts`, `lib/errors.ts`, `documento-acompanhamento.ts`, `getCargaHoraria`, `documento-relatorio.ts`, `validacoes.ts`, `Better Auth`, `pdf.ts`, `auditoria/page.tsx`, `apply-migrations.ts`, `schemas/parametros.ts`, `seed.ts`, `convenios-documentos.test.ts`, `Máscaras de campo`, `Senha contextual`, `with-user.ts`, `Domínio de avaliação`, `Serviço de notificações`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `frequencia-service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0975609756097561 - nodes in this community are weakly interconnected._