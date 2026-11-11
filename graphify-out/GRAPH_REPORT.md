# Graph Report - internship-tracker  (2026-11-11)

## Corpus Check
- 639 files · ~434,462 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 35 file(s) not represented in the graph (top: (none) 31, .example 1, .conf 1)

## Summary
- 3645 nodes · 11591 edges · 276 communities (158 shown, 118 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 123 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9e35f2c3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- drizzle-orm
- API de estágios
- frequencia-service.ts
- domain/documentos.ts
- dependencies
- Scripts de CI e GitHub
- estagios/[id]/page.tsx
- _acompanhamento/json.ts
- @playwright/test
- Telas de listagem
- session.ts
- Barra lateral e navegação
- 07_estagios.sql
- cn
- estagios.ts
- relatorio-gerencial-service.ts
- usuario-service.ts
- Serviço de concedentes
- atividade-service.ts
- Migração de estágios
- authenticatedRoute
- registrar_auditoria
- 18_guarda.sql
- react
- Serviço de relatórios
- Identidade e avaliação
- declaracao-service.ts
- 0008_avaliacao_acompanhamento.sql
- 08_frequencia.sql
- Painel por perfil
- Testes de senha provisória
- Serviço de integralização
- withUser
- Workflow de deploy
- Conexão e withUser
- estudante-service.ts
- 13_atividades.sql
- 09_relatorios.sql
- Serviço de documentos
- app.calcular_integralizacao
- pdf.ts
- Compose de desenvolvimento
- Botões e ações de usuário
- package.json
- troca-de-perfil.tsx
- telas-decisoes.spec.ts
- Dados de listagem e desempenho
- usuarios/[id]/page.tsx
- isRlsViolation
- frequencia.ts
- Scripts npm
- dataResponse
- usuario.ts
- concedente.ts
- Serviço de cursos
- support/api.ts
- Migração de fundação
- Serviço de convênios
- atividade.ts
- Periodicidade de relatórios
- triggers/afastamento.sql
- with-user.ts
- Menu do usuário e senha
- curso.ts
- Configuração TypeScript
- auth.ts
- Schema de acompanhamento
- 0011_integralizacao.sql
- 15_notificacoes.sql
- acessibilidade.spec.ts
- estudante.ts
- estudantes/[id]/page.tsx
- documento-acompanhamento.ts
- Doc: segurança e RLS
- schemas/parametros.ts
- Compose prod: variáveis da app
- Migração de frequência
- Migração de atividades
- createUsuario
- categoria-service.ts
- devDependencies
- Doc: VPS e produção
- seed.ts
- CI: passos
- CI: variáveis
- CI: jobs
- vinculos.test.ts
- acoes-por-perfil.spec.ts
- getCargaHoraria
- schema/integralizacao.ts
- (app)/layout.tsx
- triggers/declaracoes.sql
- triggers/relatorios.sql
- Doc: módulos de domínio
- Doc: fluxo de branches
- Compose prod: ferramentas
- Compose prod: armazenamento
- 0002_parametros_categorias.sql
- formulario-api.tsx
- senha-contextual.ts
- guarda-service.ts
- Doc: decisões de negócio
- Doc: autenticação e stack
- Compose prod: serviço app
- CI: ações
- navigation.ts
- estagio.test.ts
- "notificacao"
- classificacao-routes.ts
- 19_relatorios_gerenciais.sql
- acesso.ts
- Doc: dados sensíveis
- Compose prod: healthchecks
- Compose prod: variáveis Postgres
- Compose prod: Postgres
- triggers/estagios.sql
- Teste de restauração
- cursos/[id]/page.tsx
- afastamento-service.ts
- documento-estagio-service.ts
- SQL de auditoria
- Script de backup
- Configuração de backup
- Layout raiz
- Doc: guia e estados
- CI: fonte de branch
- CI: gatilhos
- atividades.ts
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
- novo-estagio-form.tsx
- "declaracao"
- searchParamsOf
- parametro-service.ts
- 01_identidade.sql
- registrar_auditoria
- exigencias/route.ts
- jornada.ts
- concedentes.ts
- triggers/academico.sql
- 06_documentos_convenios.sql
- 17_encerramento.sql
- triggers/documentos_convenios.sql
- guarda.sql
- triggers/rescisao.sql
- [codigo]/route.ts
- papeis.ts
- "rescisao"
- app.impedimentos_conclusao
- 12_dados_sensiveis.sql
- campos.ts
- RecuperarSenhaForm
- "contexto_administrador"
- app.representa_concedente
- triggers/contexto_administrador.sql
- app.validar_contexto_administrador
- quality
- use-mobile.ts
- @aws-sdk/client-s3

## God Nodes (most connected - your core abstractions)
1. `dataResponse()` - 236 edges
2. `withUser()` - 192 edges
3. `DomainError` - 162 edges
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

## Communities (276 total, 118 thin omitted)

### Community 0 - "drizzle-orm"
Cohesion: 0.08
Nodes (79): drizzle-orm, pg, vitest, hash, criarCriterio(), listCriterios(), registrarAvaliacao(), estagioNaoEncontrado() (+71 more)

### Community 1 - "API de estágios"
Cohesion: 0.06
Nodes (68): POST, POST, POST, GET, POST, GET, POST, GET (+60 more)

### Community 2 - "frequencia-service.ts"
Cohesion: 0.07
Nodes (49): avaliarJornada(), semanaIso(), abrirDivergencia(), analisarDivergencia(), colunasEstagio, DivergenciaRow, EstagioAcompanhado, FiltrosFrequencia (+41 more)

### Community 3 - "domain/documentos.ts"
Cohesion: 0.14
Nodes (25): Aditivo, Apolice, Assinatura, assinaturas(), cnpj(), data(), documentoAditivo(), documentoPlano() (+17 more)

### Community 4 - "dependencies"
Cohesion: 0.08
Nodes (24): dependencies, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, better-auth, class-variance-authority, clsx, drizzle-orm, @fontsource-variable/inter (+16 more)

### Community 5 - "Scripts de CI e GitHub"
Cohesion: 0.06
Nodes (49): args, CODE_PATHS, fail(), fast, hasDocker(), ok, onlyIndex, requireDocker (+41 more)

### Community 6 - "estagios/[id]/page.tsx"
Cohesion: 0.10
Nodes (59): ConcedentePage(), horas(), ParametrosPage(), AcompanhamentoEstagio(), h(), seVisivel(), DesempenhoEstagio(), nota() (+51 more)

### Community 7 - "_acompanhamento/json.ts"
Cohesion: 0.09
Nodes (25): acompanhamentoJson(), avaliacaoJson(), criterioJson(), PATCH, PATCH, GET, POST, GET (+17 more)

### Community 8 - "@playwright/test"
Cohesion: 0.08
Nodes (5): RFC-5737, ROTAS, COORDENACAO, isCI, @playwright/test

### Community 9 - "Telas de listagem"
Cohesion: 0.13
Nodes (48): AuditoriaPage(), COLUNAS, Registro, TOM, Concedente, ConcedentesPage(), SITUACOES, CursosPage() (+40 more)

### Community 10 - "session.ts"
Cohesion: 0.11
Nodes (19): POST, GET, GET, limparContexto(), marcarContexto(), contextoJson(), DELETE, GET (+11 more)

### Community 11 - "Barra lateral e navegação"
Cohesion: 0.13
Nodes (27): @radix-ui/react-tooltip, AppSidebar(), ItemDeMenu(), gruposVisiveis(), SheetContent(), SheetOverlay(), SheetTitle(), sheetVariants (+19 more)

### Community 12 - "07_estagios.sql"
Cohesion: 0.11
Nodes (14): app.coordena_curso_do_estagio(), app.dias_usados_no_par(), app.e_estudante_do_estagio(), app.e_responsavel_vigente(), app.efetivar_aditivo(), app.estagios_legiveis(), app.estudante_atual_id(), app.historico_estagios_concedente() (+6 more)

### Community 13 - "cn"
Cohesion: 0.11
Nodes (33): nextConfig, securityHeaders, next, ConveniosPage(), ESCOPO, GuardaDocumentalPage(), TIPO_DOCUMENTO, DESCRICAO (+25 more)

### Community 14 - "estagios.ts"
Cohesion: 0.11
Nodes (15): afastamento, apoliceSeguro, assinatura, papelResponsavel, parteAssinatura, parteRescisao, planoAtividades, rescisao (+7 more)

### Community 15 - "relatorio-gerencial-service.ts"
Cohesion: 0.10
Nodes (25): RFC-4180, GET, BOM, celulaCsv(), CSV_SEPARADOR, gerarCsv(), TipoRelatorio, TIPOS_RELATORIO (+17 more)

### Community 16 - "usuario-service.ts"
Cohesion: 0.11
Nodes (38): vinculoPerfil, revogarSessoes(), impedirAutoinativacao(), impedirAutorremocaoAdministrador(), colunas, findContasEstudante(), findUsuarioById(), insertUsuario() (+30 more)

### Community 17 - "Serviço de concedentes"
Cohesion: 0.11
Nodes (34): cnpjValido(), digito(), normalizarCnpj(), PESOS_PRIMEIRO, PESOS_SEGUNDO, Catalogo, CATALOGOS, classificacaoAtiva() (+26 more)

### Community 18 - "atividade-service.ts"
Cohesion: 0.08
Nodes (35): calcularAproveitamento(), periodoValido(), SaldoAproveitamento, base, AtividadeRow, condicoesAtividade(), estudanteAtualId(), FiltrosAtividade (+27 more)

### Community 19 - "Migração de estágios"
Cohesion: 0.05
Nodes (52): "convenio", convenio_concedente_idx, "convenio_vigencia", convenio_vigencia_documento_idx, convenio_vigencia_fim_idx, convenio_vigencia_registrado_por_idx, "documento", documento_concedente_idx (+44 more)

### Community 20 - "authenticatedRoute"
Cohesion: 0.18
Nodes (12): GET, GET, paramsSchema, GET, GET, GET, GET, pdfResponse() (+4 more)

### Community 21 - "registrar_auditoria"
Cohesion: 0.36
Nodes (4): bloquear_alteracao, definir_atualizado_em, registrar_auditoria, validar_alteracao_concedente

### Community 22 - "18_guarda.sql"
Cohesion: 0.13
Nodes (3): app.definir_guarda_convenio(), app.documentos_em_guarda(), app.prazo_guarda_em()

### Community 23 - "react"
Cohesion: 0.15
Nodes (29): react, NovoConvenio(), onSubmit(), EstudanteForm(), onSubmit(), EstudanteInput, EstudanteOutput, estudanteSchema (+21 more)

### Community 24 - "Serviço de relatórios"
Cohesion: 0.10
Nodes (38): enviadoComAtraso(), pendenteDe(), relatorioEmAtraso(), SituacaoRelatorio, VisaoRelatorio, VISOES_RELATORIO, AnexoRow, countRelatoriosPendentes() (+30 more)

### Community 25 - "Identidade e avaliação"
Cohesion: 0.13
Nodes (28): conferirRespostas(), AcompanhamentoRow, CriterioRow, findAcompanhamentoById(), findAcompanhamentos(), findAvaliacoes(), findCriterios(), findRespostas() (+20 more)

### Community 26 - "declaracao-service.ts"
Cohesion: 0.17
Nodes (19): GET, params, POST, declaracaoJson(), cnpj(), DadosDeclaracao, data(), documentoDeclaracao() (+11 more)

### Community 27 - "0008_avaliacao_acompanhamento.sql"
Cohesion: 0.19
Nodes (12): "acompanhamento", acompanhamento_estagio_data_idx, acompanhamento_registrado_por_idx, avaliacao_avaliador_idx, "avaliacao_desempenho", avaliacao_estagio_idx, avaliacao_uma_final, "criterio_avaliacao" (+4 more)

### Community 28 - "08_frequencia.sql"
Cohesion: 0.15
Nodes (6): app.conferir_homologacao(), app.em_afastamento(), app.parametros_em(), app.validar_alteracao_frequencia(), app.validar_homologacao(), app.validar_registro_frequencia()

### Community 29 - "Painel por perfil"
Cohesion: 0.14
Nodes (34): lucide-react, DistribuicaoEstagios(), LinhaCompacta(), ListaCompacta(), SITUACOES, BlocoAdministrador(), BlocoConcedente(), BlocoCoordenacao() (+26 more)

### Community 30 - "Testes de senha provisória"
Cohesion: 0.15
Nodes (18): conta, sessao, usuario, auditoria, alterarSenhaPropria(), resolveSession(), concluirTrocaSenha(), trocarSenha() (+10 more)

### Community 31 - "Serviço de integralização"
Cohesion: 0.12
Nodes (27): POST, GET, integralizacaoJson(), GET, Apuracao, CategoriaApurada, progresso(), Situacao (+19 more)

### Community 32 - "withUser"
Cohesion: 0.05
Nodes (122): correspondencia, identidadeEstudante, juncao, aditivo, estagio, withUser(), DomainError, conferirComprovantes() (+114 more)

### Community 33 - "Workflow de deploy"
Cohesion: 0.06
Nodes (32): concurrency, cancel-in-progress, group, env, if, name, runs-on, steps (+24 more)

### Community 34 - "Conexão e withUser"
Cohesion: 0.11
Nodes (24): autorizado(), GET(), Database, ENV_BY_POOL, getAppDatabase(), getAuthDatabase(), getDatabase(), globalForDb (+16 more)

### Community 35 - "estudante-service.ts"
Cohesion: 0.09
Nodes (31): curso, estudante, SITUACAO_ACADEMICA_INICIAL, SituacaoAcademica, TODAS, transicaoPermitida(), TRANSICOES_SITUACAO_ACADEMICA, validarTransicaoSituacaoAcademica() (+23 more)

### Community 36 - "13_atividades.sql"
Cohesion: 0.15
Nodes (5): app.coordena_curso_do_estudante(), app.estudante_da_atividade(), app.estudantes_legiveis(), app.validar_analise_atividade(), app.validar_atividade()

### Community 37 - "09_relatorios.sql"
Cohesion: 0.16
Nodes (8): app.aplicar_parecer_relatorio(), app.estagio_da_versao(), app.estagio_do_relatorio(), app.gerar_relatorios(), app.periodicidade_de(), app.validar_anexo_relatorio(), app.validar_parecer_relatorio(), app.validar_versao_relatorio()

### Community 38 - "Serviço de documentos"
Cohesion: 0.09
Nodes (36): main(), documentoJson(), POST, TAMANHO_MAXIMO_BYTES, TIPOS_MIME_PERMITIDOS, armazenamentoS3(), configuracaoS3(), getArmazenamento() (+28 more)

### Community 39 - "app.calcular_integralizacao"
Cohesion: 0.16
Nodes (3): app.calcular_integralizacao(), app.reapurar_por_curso(), app.reapurar_por_exigencia()

### Community 40 - "pdf.ts"
Cohesion: 0.14
Nodes (20): pdf-lib, A4, cabecalho(), COR_LINHA, COR_MARCA, COR_SUAVE, COR_TEXTO, COR_TITULO (+12 more)

### Community 41 - "Compose de desenvolvimento"
Cohesion: 0.09
Nodes (26): AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, interval, retries, test (+18 more)

### Community 42 - "Botões e ações de usuário"
Cohesion: 0.15
Nodes (20): @radix-ui/react-dialog, Confirmar(), DadosConta(), PerfisConta(), SegurancaConta(), useEnvio(), enviar(), mensagemDeErro() (+12 more)

### Community 43 - "package.json"
Cohesion: 0.07
Nodes (27): DATABASE_CLIENT, MODULES, PG_DRIVER, engines, node, name, private, version (+19 more)

### Community 44 - "troca-de-perfil.tsx"
Cohesion: 0.17
Nodes (13): @hookform/resolvers, react-hook-form, CursoForm(), CursoInput, CursoOutput, cursoSchema, Conta, EscolhaDeConta() (+5 more)

### Community 45 - "telas-decisoes.spec.ts"
Cohesion: 0.18
Nodes (7): telaDe(), entrar(), sessao, entrar(), MATRIZ, sessao, TELAS

### Community 46 - "Dados de listagem e desempenho"
Cohesion: 0.15
Nodes (27): AQUECIMENTO, exigirBancoDeTeste(), main(), Medicao, medir(), REPETICOES, contagemPorSituacao(), dadosAdministrador() (+19 more)

### Community 47 - "usuarios/[id]/page.tsx"
Cohesion: 0.24
Nodes (10): AdministracaoPage(), AREAS, Cartao(), UsuarioPage(), ALCANCE, catalogoPerfis(), EntradaCatalogo, EXIGEM_CONCEDENTE (+2 more)

### Community 48 - "isRlsViolation"
Cohesion: 0.21
Nodes (18): findPgError(), isExclusionViolation(), isForeignKeyViolation(), isRlsViolation(), isTriggerRule(), isUniqueViolation(), PgError, triggerRuleDetail() (+10 more)

### Community 49 - "frequencia.ts"
Cohesion: 0.07
Nodes (44): cargaHorariaJson(), divergenciaCalculadaJson(), divergenciaJson(), estagioAcompanhadoJson(), frequenciaJson(), hhmm(), homologacaoJson(), instante() (+36 more)

### Community 50 - "Scripts npm"
Cohesion: 0.09
Nodes (23): scripts, batch:integrate, batch:pr, build, ci, db:desempenho, db:generate, db:migrate (+15 more)

### Community 51 - "dataResponse"
Cohesion: 0.08
Nodes (29): GET, GET, GET, GET, POST, GET, GET, GET (+21 more)

### Community 52 - "usuario.ts"
Cohesion: 0.14
Nodes (21): PUT, GET, PATCH, usuarioJson(), Vinculo, vinculoJson(), GET, POST (+13 more)

### Community 53 - "concedente.ts"
Cohesion: 0.08
Nodes (33): GET, POST, POST, GET, PATCH, POST, concedenteJson(), GET (+25 more)

### Community 54 - "Serviço de cursos"
Cohesion: 0.23
Nodes (12): colunas, CursoResumo, CursoRow, CursoValues, findCursos(), insertCurso(), updateCurso(), acessoNegado() (+4 more)

### Community 55 - "support/api.ts"
Cohesion: 0.20
Nodes (17): estagioAtivoDesdeAgosto(), sessao, enviarComprovante(), sessao, sessao, enviarAtestado(), sessao, contextos (+9 more)

### Community 56 - "Migração de fundação"
Cohesion: 0.08
Nodes (31): "auditoria", auditoria_ocorrido_em_idx, auditoria_tabela_registro_idx, auditoria_usuario_id_idx, "conta", conta_provedor_conta_unico, conta_usuario_id_idx, "curso" (+23 more)

### Community 57 - "Serviço de convênios"
Cohesion: 0.23
Nodes (17): ConvenioRow, findConvenioById(), findConveniosAVencer(), findConveniosDaConcedente(), findVigencias(), insertConvenio(), insertVigencia(), updateConvenio() (+9 more)

### Community 58 - "atividade.ts"
Cohesion: 0.14
Nodes (26): POST, POST, POST, POST, GET, PATCH, GET, GET (+18 more)

### Community 59 - "Periodicidade de relatórios"
Cohesion: 0.21
Nodes (15): GET, periodicidadeJson(), PUT, Periodicidade, PERIODICIDADE_PADRAO, TipoEstagio, findCursoById(), findPeriodicidades() (+7 more)

### Community 60 - "triggers/afastamento.sql"
Cohesion: 0.43
Nodes (6): aplicar_afastamento, definir_atualizado_em, exigir_substituto_afastamento, registrar_auditoria, validar_afastamento, validar_alteracao_afastamento

### Community 61 - "with-user.ts"
Cohesion: 0.14
Nodes (20): padraoContendo(), Identity, isValidUserId(), ContaParaContexto, ContextoAberto, encerrarContextos(), findContasParaContexto(), findContextoAberto() (+12 more)

### Community 62 - "Menu do usuário e senha"
Cohesion: 0.27
Nodes (8): @radix-ui/react-dropdown-menu, iniciaisDoNome(), UserMenu(), signOut(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuSeparator()

### Community 63 - "curso.ts"
Cohesion: 0.17
Nodes (17): GET, PATCH, cursoJson(), GET, POST, cargaComplementares, cargaMinimaEstagio, codigo (+9 more)

### Community 64 - "Configuração TypeScript"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 65 - "auth.ts"
Cohesion: 0.13
Nodes (20): better-auth, GET(), POST(), solicitarRecuperacaoSenha(), Auth, createAuth(), getAuth(), cidrValido() (+12 more)

### Community 66 - "Schema de acompanhamento"
Cohesion: 0.09
Nodes (19): acompanhamento, anexoRelatorio, avaliacaoDesempenho, criterioAvaliacao, decisaoParecer, divergenciaCargaHoraria, homologacaoFrequencia, momentoAvaliacao (+11 more)

### Community 68 - "15_notificacoes.sql"
Cohesion: 0.10
Nodes (5): app.notificar(), app.notificar_parecer_relatorio(), app.pessoas_do_estagio(), app.rotina_diaria(), app.solicitar_recuperacao_senha()

### Community 69 - "acessibilidade.spec.ts"
Cohesion: 0.12
Nodes (3): PERFIS, @axe-core/playwright, final()

### Community 70 - "estudante.ts"
Cohesion: 0.21
Nodes (12): GET, PATCH, estudanteJson(), GET, POST, createEstudanteBodySchema, estudanteIdParamSchema, listEstudantesQuerySchema (+4 more)

### Community 71 - "estudantes/[id]/page.tsx"
Cohesion: 0.09
Nodes (41): Alteracao(), valor(), DadosAcademicos(), destinoDeVolta(), EstudantePage(), h(), semAlcance(), AtividadesComplementaresPage() (+33 more)

### Community 72 - "documento-acompanhamento.ts"
Cohesion: 0.16
Nodes (14): DocumentoPdf, TabelaPdf, Avaliacao, Criterio, documentoAvaliacao(), folhaFrequencia(), horas(), Lancamento (+6 more)

### Community 73 - "Doc: segurança e RLS"
Cohesion: 0.17
Nodes (10): Audit by database trigger with masked sensitive columns, Declarative drizzle/sql security layer, Identity (produced only by session.ts), Layered architecture (presentation, API, domain, persistence, database), Row Level Security on every table, migrator database role, withUser identity transaction wrapper, Write flow from Route Handler to audit trigger (+2 more)

### Community 74 - "schemas/parametros.ts"
Cohesion: 0.20
Nodes (12): PATCH, categoriaJson(), GET, findCategorias(), createCategoriaBodySchema, dataQuerySchema, definirParametrosBodySchema, definirPeriodicidadesBodySchema (+4 more)

### Community 75 - "Compose prod: variáveis da app"
Cohesion: 0.25
Nodes (14): environment, AUTH_IP_HEADERS, BETTER_AUTH_SECRET, BETTER_AUTH_URL, CRON_SECRET, DATABASE_AUTH_URL, DATABASE_MIGRATION_URL, DATABASE_URL (+6 more)

### Community 76 - "Migração de frequência"
Cohesion: 0.18
Nodes (12): divergencia_analisada_por_idx, "divergencia_carga_horaria", divergencia_estagio_idx, divergencia_uma_aberta_por_estagio, frequencia_estagio_data_situacao_idx, frequencia_homologacao_idx, frequencia_parametro_idx, frequencia_registrado_por_idx (+4 more)

### Community 78 - "Migração de atividades"
Cohesion: 0.17
Nodes (13): analise_analisado_por_idx, "analise_atividade", analise_atividade_idx, atividade_categoria_idx, "atividade_complementar", atividade_estudante_situacao_idx, atividade_fila_analise_idx, atividade_registrada_por_idx (+5 more)

### Community 79 - "createUsuario"
Cohesion: 0.20
Nodes (12): @node-rs/argon2, Banco, criarAdministrador(), existeAdministrador(), main(), definirSenha(), generateTemporaryPassword(), hashPassword() (+4 more)

### Community 80 - "categoria-service.ts"
Cohesion: 0.24
Nodes (14): POST, CategoriaRow, clearDestinoEstagio(), ExigenciaRow, findCategoriaById(), findExigencias(), insertCategoria(), updateCategoria() (+6 more)

### Community 81 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, @axe-core/playwright, drizzle-kit, eslint, eslint-config-next, @playwright/test, tailwindcss, @tailwindcss/postcss (+7 more)

### Community 82 - "Doc: VPS e produção"
Cohesion: 0.19
Nodes (9): Backup layers (pgBackRest, restic and rclone, Contabo Auto Backup), LUKS vault at /srv/dados, Production deployment on Contabo VPS, New server setup scripts (cofre-criar, publicar, configurar-deploy, backup-configurar), Encrypted vault limited to 30% of the disk, SeaweedFS volumeSizeLimitMB=128, Shared server proxy at /srv/proxy, vps-espaco disk check (+1 more)

### Community 83 - "seed.ts"
Cohesion: 0.23
Nodes (13): CATEGORIAS, CRITERIOS, db, ensurePerfil(), main(), pool, upsertCategorias(), upsertConcedenteComConvenio() (+5 more)

### Community 84 - "CI: passos"
Cohesion: 0.46
Nodes (8): steps, steps, steps, steps, if, name, run, uses

### Community 85 - "CI: variáveis"
Cohesion: 0.17
Nodes (12): env, AUTH_IP_HEADERS, BETTER_AUTH_SECRET, BETTER_AUTH_URL, DATABASE_AUTH_URL, DATABASE_MIGRATION_URL, DATABASE_URL, R2_ACCESS_KEY_ID (+4 more)

### Community 86 - "CI: jobs"
Cohesion: 0.18
Nodes (10): concurrency, cancel-in-progress, group, name, runs-on, jobs, database, name (+2 more)

### Community 87 - "vinculos.test.ts"
Cohesion: 0.23
Nodes (10): impedirAutoemissaoSenha(), senhaProvisoriaExpirada(), VALIDADE_SENHA_PROVISORIA_HORAS, chave(), diferencaVinculos(), PERFIS_QUE_EXIGEM_CONCEDENTE, validarVinculos(), VinculoAtual (+2 more)

### Community 89 - "getCargaHoraria"
Cohesion: 0.27
Nodes (12): estagio, limites, avaliarDivergencia(), diaAnterior(), diasUteis(), Divergencia, EstagioCarga, minutosPrevistosAte() (+4 more)

### Community 90 - "schema/integralizacao.ts"
Cohesion: 0.17
Nodes (11): categoriaAtividade, exigenciaCategoria, periodicidadeRelatorio, situacaoAcademica, apuracaoCategoria, apuracaoIntegralizacao, declaracao, gatilhoApuracao (+3 more)

### Community 91 - "(app)/layout.tsx"
Cohesion: 0.35
Nodes (8): AppLayout(), TopbarTitle(), FaixaContexto(), TrocaDePerfil(), encontrarItem(), SidebarInset(), SidebarProvider(), SidebarTrigger()

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

### Community 99 - "formulario-api.tsx"
Cohesion: 0.13
Nodes (14): zod, aplicarMascara(), Mascara, MASCARAS, TECLADO, concedente, aprovacaoRelatorioBodySchema, devolucaoRelatorioBodySchema (+6 more)

### Community 100 - "senha-contextual.ts"
Cohesion: 0.42
Nodes (7): normalizar(), PALAVRAS_DO_SERVICO, palavrasDeContexto(), semDigitosNasPontas(), senhaPrevisivel(), MARIA, validarSenhaContextual()

### Community 101 - "guarda-service.ts"
Cohesion: 0.36
Nodes (8): chaveParaEliminacao(), DocumentoEmGuarda, eliminarDocumento(), findDocumentosEmGuarda(), eliminarDocumentoVencido(), listDocumentosEmGuarda(), REGRAS, traduzir()

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

### Community 106 - "navigation.ts"
Cohesion: 0.29
Nodes (9): cobre(), GRUPOS, itensVisiveis(), NAVEGACAO, NavGrupo, NavItem, pertence(), podeAbrir() (+1 more)

### Community 107 - "estagio.test.ts"
Cohesion: 0.17
Nodes (13): DomainErrorDetail, diaSeguinte(), exigirAtivavel(), FatosAtivacao, impedimentosAtivacao(), PARTES, Periodo, periodoCoberto() (+5 more)

### Community 108 - ""notificacao""
Cohesion: 0.60
Nodes (3): "notificacao", notificacao_destinatario_recente_idx, notificacao_nao_lidas_idx

### Community 109 - "classificacao-routes.ts"
Cohesion: 0.14
Nodes (15): classificacaoJson(), rotasColecao(), rotasItem(), PATCH, GET, POST, rotas, PATCH (+7 more)

### Community 110 - "19_relatorios_gerenciais.sql"
Cohesion: 0.17
Nodes (6): app.cursos_gerenciaveis(), app.estagios_no_periodo(), app.relatorio_concedentes_parceiras(), app.relatorio_estagiarios_ativos(), app.relatorio_pendencias_integralizacao(), app.relatorio_taxa_conclusao()

### Community 111 - "acesso.ts"
Cohesion: 0.22
Nodes (6): contextoAdministrador, limiteRequisicao, situacaoUsuario, verificacao, perfil, tipoEstagio

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

### Community 118 - "cursos/[id]/page.tsx"
Cohesion: 0.36
Nodes (7): CursoPage(), h(), TIPO_ESTAGIO, listEstudantes(), CapaCurso(), tomDe(), TONS

### Community 119 - "afastamento-service.ts"
Cohesion: 0.23
Nodes (12): AfastamentoRow, findAfastamentoById(), findAfastamentos(), insertAfastamento(), periodosAfastamento(), listAfastamentos(), listPeriodosAfastamento(), NovoAfastamento (+4 more)

### Community 120 - "documento-estagio-service.ts"
Cohesion: 0.44
Nodes (9): findIdentificacaoEstagio(), findAssinaturas(), nomeDoUsuario(), findRescisao(), carregar(), pdfAditivo(), pdfPlano(), pdfRescisao() (+1 more)

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

### Community 128 - "atividades.ts"
Cohesion: 0.25
Nodes (5): analiseAtividade, atividadeComplementar, comprovanteAtividade, decisaoAnalise, situacaoAtividade

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

### Community 205 - "novo-estagio-form.tsx"
Cohesion: 0.12
Nodes (26): Criterio, NovaAvaliacao(), enviar(), montar(), onSubmit(), regras, Campo(), Convenio (+18 more)

### Community 206 - ""declaracao""
Cohesion: 0.25
Nodes (5): "declaracao", declaracao_apuracao_idx, declaracao_emitida_por_idx, declaracao_estagio_idx, declaracao_estudante_idx

### Community 207 - "searchParamsOf"
Cohesion: 0.10
Nodes (25): GET, GET, GET, POST, notificacaoJson(), GET, GET, parametrosJson() (+17 more)

### Community 208 - "parametro-service.ts"
Cohesion: 0.18
Nodes (14): parametroInstitucional, Transaction, Parametros, PARAMETROS_PADRAO, colunas, findHistoricoParametros(), findParametroVigente(), insertParametro() (+6 more)

### Community 209 - "01_identidade.sql"
Cohesion: 0.31
Nodes (4): app.buscar_contas_estudante(), app.coordena_curso(), app.coordena_estudante_usuario(), app.tem_perfil_vigente()

### Community 210 - "registrar_auditoria"
Cohesion: 0.29
Nodes (4): auditoria_sem_truncate, auditoria_somente_inclusao, definir_atualizado_em, registrar_auditoria

### Community 211 - "exigencias/route.ts"
Cohesion: 0.38
Nodes (6): Exigencias, exigenciasJson(), GET, PUT, definirExigenciasBodySchema, uuidParamSchema

### Community 212 - "jornada.ts"
Cohesion: 0.33
Nodes (6): AvaliacaoJornada, duracaoDoHorario(), HorarioDoDia, Limites, minutosDoHorario(), ProblemaHorario

### Community 213 - "concedentes.ts"
Cohesion: 0.16
Nodes (10): concedente, convenio, convenioVigencia, historicoSituacaoConcedente, porteConcedente, setorAtuacao, situacaoConcedente, situacaoConvenio (+2 more)

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

### Community 220 - "[codigo]/route.ts"
Cohesion: 0.47
Nodes (4): GET(), verificarDeclaracao(), codigoVerificacaoParamSchema, declaracaoBodySchema

### Community 221 - "papeis.ts"
Cohesion: 0.43
Nodes (6): AcoesNoEstagio, NENHUM_PAPEL, PapeisNoEstagio, ParteAssinatura, como(), quem()

### Community 222 - ""rescisao""
Cohesion: 0.38
Nodes (3): "rescisao", rescisao_decidido_por_idx, rescisao_documento_idx

### Community 225 - "campos.ts"
Cohesion: 0.16
Nodes (13): LoginForm(), loginSchema, LoginValues, LoginPage(), ETAPAS, PercursoEstagio(), Perfil, PERFIS (+5 more)

### Community 226 - "RecuperarSenhaForm"
Cohesion: 0.50
Nodes (3): metadata, RecuperarSenhaPage(), RecuperarSenhaForm()

### Community 227 - ""contexto_administrador""
Cohesion: 0.60
Nodes (3): "contexto_administrador", contexto_administrador_administrador_idx, contexto_administrador_sessao_aberta

### Community 231 - "quality"
Cohesion: 0.67
Nodes (3): quality, name, runs-on

### Community 232 - "use-mobile.ts"
Cohesion: 0.70
Nodes (4): getServerSnapshot(), getSnapshot(), subscribe(), useIsMobile()

## Knowledge Gaps
- **47 isolated node(s):** `RFC-5737`, `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`, `react-dom`, `@tailwindcss/postcss` (+42 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1044 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **118 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `drizzle-orm` connect `drizzle-orm` to `atividades.ts`, `frequencia-service.ts`, `Scripts de CI e GitHub`, `estagios.ts`, `relatorio-gerencial-service.ts`, `usuario-service.ts`, `Serviço de concedentes`, `atividade-service.ts`, `Serviço de relatórios`, `Identidade e avaliação`, `declaracao-service.ts`, `Testes de senha provisória`, `Serviço de integralização`, `withUser`, `Conexão e withUser`, `estudante-service.ts`, `Serviço de documentos`, `package.json`, `Serviço de cursos`, `Serviço de convênios`, `Periodicidade de relatórios`, `with-user.ts`, `auth.ts`, `Schema de acompanhamento`, `estudantes/[id]/page.tsx`, `createUsuario`, `categoria-service.ts`, `parametro-service.ts`, `seed.ts`, `concedentes.ts`, `schema/integralizacao.ts`, `guarda-service.ts`, `acesso.ts`, `afastamento-service.ts`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `RFC-5737`, `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono` to the rest of the system?**
  _47 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `drizzle-orm` be split into smaller, more focused modules?**
  _Cohesion score 0.07534539239424583 - nodes in this community are weakly interconnected._
- **Why does `dataResponse()` connect `dataResponse` to `API de estágios`, `declaracao-service.ts`, `Serviço de documentos`, `_acompanhamento/json.ts`, `estudante.ts`, `session.ts`, `schemas/parametros.ts`, `classificacao-routes.ts`, `searchParamsOf`, `categoria-service.ts`, `frequencia.ts`, `exigencias/route.ts`, `usuario.ts`, `concedente.ts`, `atividade.ts`, `Periodicidade de relatórios`, `Serviço de integralização`, `curso.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Should `API de estágios` be split into smaller, more focused modules?**
  _Cohesion score 0.05586722767648434 - nodes in this community are weakly interconnected._
- **Why does `withUser()` connect `withUser` to `drizzle-orm`, `frequencia-service.ts`, `estagios/[id]/page.tsx`, `Telas de listagem`, `cn`, `relatorio-gerencial-service.ts`, `usuario-service.ts`, `Serviço de concedentes`, `atividade-service.ts`, `Serviço de relatórios`, `Identidade e avaliação`, `declaracao-service.ts`, `Testes de senha provisória`, `Serviço de integralização`, `Conexão e withUser`, `estudante-service.ts`, `Serviço de documentos`, `Dados de listagem e desempenho`, `frequencia.ts`, `usuario.ts`, `Serviço de cursos`, `Serviço de convênios`, `atividade.ts`, `Periodicidade de relatórios`, `with-user.ts`, `curso.ts`, `estudantes/[id]/page.tsx`, `schemas/parametros.ts`, `searchParamsOf`, `categoria-service.ts`, `parametro-service.ts`, `createUsuario`, `getCargaHoraria`, `guarda-service.ts`, `classificacao-routes.ts`, `cursos/[id]/page.tsx`, `afastamento-service.ts`, `documento-estagio-service.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `frequencia-service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07272727272727272 - nodes in this community are weakly interconnected._