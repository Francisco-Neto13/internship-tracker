# Graph Report - internship-tracker  (2026-11-10)

## Corpus Check
- Large corpus: 599 files · ~377,434 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 3240 nodes · 10694 edges · 200 communities (135 shown, 65 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 129 edges (avg confidence: 0.84)
- Token cost: 347,951 input · 0 output

## Community Hubs (Navigation)
- Testes e suporte compartilhado
- API de estágios
- Serviço de frequência
- PDFs e declarações
- Dependências do projeto
- Scripts de CI e GitHub
- Telas de detalhe
- API de acompanhamento
- Testes e2e Playwright
- Telas de listagem
- Fixtures e estudantes
- Barra lateral e navegação
- SQL de estágios
- Utilitários de interface
- Schema Drizzle principal
- Auditoria e relatórios gerenciais
- Serviço de usuários
- Serviço de concedentes
- Serviço de atividades
- Migração de estágios
- Rotas autenticadas
- Migrações concedentes e documentos
- SQL de convênios e documentos
- Formulários da API
- Serviço de relatórios
- Identidade e avaliação
- Serviço de estágio
- SQL de avaliação
- SQL de frequência
- Painel por perfil
- Testes de senha provisória
- Serviço de integralização
- Serviço de formalização
- Workflow de deploy
- Conexão e withUser
- API de usuários
- SQL de atividades e notificações
- SQL de relatórios
- Serviço de documentos
- SQL de identidade e cursos
- API de atividades
- Compose de desenvolvimento
- Botões e ações de usuário
- API de avaliação
- Campos e formulários de login
- SQL de guarda e parâmetros
- Dados de listagem e desempenho
- Sessão e perfis
- Categorias e exigências
- Domínio do estágio
- Scripts npm
- Filtros e API de auditoria
- Rotas de classificação
- API de convênios
- Serviço de cursos
- Tradução de erros do banco
- Migração de fundação
- Serviço de convênios
- Serviço de aditivos
- Periodicidade de relatórios
- SQL de afastamento
- Formulários de curso e estudante
- Menu do usuário e senha
- API de cursos
- Configuração TypeScript
- Better Auth
- Schema de acompanhamento
- Migrações de integralização
- Primeiro admin e credenciais
- API de concedentes
- API de estudantes
- Rótulos e status
- Validação Zod
- Doc: segurança e RLS
- API de parâmetros e categorias
- Compose prod: variáveis da app
- Migração de frequência
- Migração de relatórios
- Migração de atividades
- Seed de desenvolvimento
- Vínculos e senha provisória
- Serviço de afastamento
- Doc: VPS e produção
- PDFs do estágio
- CI: passos
- CI: variáveis
- CI: jobs
- API de documentos
- API de notificações
- Schema de concedentes
- Serviço de parâmetros
- API de afastamento
- API de parâmetros
- Encerramento do estágio
- Doc: módulos de domínio
- Doc: fluxo de branches
- Compose prod: ferramentas
- Compose prod: armazenamento
- Migração de parâmetros
- Máscaras de campo
- Senha contextual
- Guarda documental
- Doc: decisões de negócio
- Doc: autenticação e stack
- Compose prod: serviço app
- CI: ações
- Senhas vazadas
- Domínio de avaliação
- Aproveitamento de estágio
- Validação de CNPJ
- Papéis no estágio
- Serviço de notificações
- Doc: dados sensíveis
- Compose prod: healthchecks
- Compose prod: variáveis Postgres
- Compose prod: Postgres
- SQL de rescisão
- Teste de restauração
- Capa de curso
- Tela de login
- SQL de notificações
- SQL de auditoria
- Script de backup
- Configuração de backup
- Layout raiz
- Doc: guia e estados
- CI: fonte de branch
- CI: gatilhos
- Identidade do estudante
- Avatar
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
- Verificação HIBP real
- Abertura de cofre
- Configuração de deploy
- Configuração da VPS
- Script de implantação
- Rotina diária
- Espaço em disco
- Isolado: Listing state in the URL, resolved on the server

## God Nodes (most connected - your core abstractions)
1. `dataResponse()` - 228 edges
2. `withUser()` - 184 edges
3. `DomainError` - 154 edges
4. `authenticatedRoute()` - 109 edges
5. `drizzle-orm` - 83 edges
6. `cn()` - 75 edges
7. `vitest` - 68 edges
8. `next` - 57 edges
9. `minutosParaHoras()` - 52 edges
10. `getIdentity()` - 50 edges

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
- 2-file cycle: `src/db/schema/academico.ts -> src/db/schema/acesso.ts -> src/db/schema/academico.ts`
- 2-file cycle: `src/db/schema/acesso.ts -> src/db/schema/concedentes.ts -> src/db/schema/acesso.ts`
- 2-file cycle: `src/db/schema/concedentes.ts -> src/db/schema/documentos.ts -> src/db/schema/concedentes.ts`
- 2-file cycle: `src/db/schema/documentos.ts -> src/db/schema/estagios.ts -> src/db/schema/documentos.ts`
- 3-file cycle: `src/db/schema/acesso.ts -> src/db/schema/concedentes.ts -> src/db/schema/documentos.ts -> src/db/schema/acesso.ts`
- 3-file cycle: `src/db/schema/concedentes.ts -> src/db/schema/documentos.ts -> src/db/schema/estagios.ts -> src/db/schema/concedentes.ts`
- 4-file cycle: `src/db/schema/academico.ts -> src/db/schema/acesso.ts -> src/db/schema/concedentes.ts -> src/db/schema/documentos.ts -> src/db/schema/academico.ts`
- 4-file cycle: `src/db/schema/acesso.ts -> src/db/schema/concedentes.ts -> src/db/schema/documentos.ts -> src/db/schema/estagios.ts -> src/db/schema/acesso.ts`
- 5-file cycle: `src/db/schema/academico.ts -> src/db/schema/acesso.ts -> src/db/schema/concedentes.ts -> src/db/schema/documentos.ts -> src/db/schema/estagios.ts -> src/db/schema/academico.ts`

## Hyperedges (group relationships)
- **RLS enforcement stack** — agents_with_user_wrapper, agents_role_app_runtime, agents_app_schema_functions, agents_declarative_drizzle_sql, agents_rls [EXTRACTED 1.00]
- **Branch flow protection** — agents_github_rulesets, agents_local_ci, agents_pre_push_hook, agents_batch_workflow [EXTRACTED 1.00]
- **Encrypted production data handling** — agents_luks_cofre, agents_seaweedfs_storage, agents_backup_layers, scripts_servidor_regras_da_vps_docker_after_vault [INFERRED 0.85]

## Communities (200 total, 65 thin omitted)

### Community 0 - "Testes e suporte compartilhado"
Cohesion: 0.09
Nodes (64): vitest, listCriterios(), registrarAvaliacao(), decidirRelatorio(), enviarRelatorio(), listRelatorios(), traduzir, Armazenamento (+56 more)

### Community 1 - "API de estágios"
Cohesion: 0.07
Nodes (62): POST, POST, GET, POST, GET, POST, GET, POST (+54 more)

### Community 2 - "Serviço de frequência"
Cohesion: 0.07
Nodes (73): estagio, limites, avaliarDivergencia(), diaAnterior(), diasUteis(), Divergencia, EstagioCarga, minutosPrevistosAte() (+65 more)

### Community 3 - "PDFs e declarações"
Cohesion: 0.06
Nodes (57): pdf-lib@1.17.1, pdf-lib, GET, params, POST, declaracaoJson(), declaracao, A4 (+49 more)

### Community 4 - "Dependências do projeto"
Cohesion: 0.04
Nodes (64): DATABASE_CLIENT, MODULES, PG_DRIVER, dependencies, @aws-sdk/client-s3@^3.907.0, @aws-sdk/s3-request-presigner@^3.907.0, better-auth@1.7.4, class-variance-authority@^0.7.1 (+56 more)

### Community 5 - "Scripts de CI e GitHub"
Cohesion: 0.06
Nodes (51): pg@^8.23.0, pg, args, CODE_PATHS, fail(), fast, hasDocker(), ok (+43 more)

### Community 6 - "Telas de detalhe"
Cohesion: 0.11
Nodes (51): ConcedentePage(), ABAS, DadosAcademicos(), destinoDeVolta(), EstudantePage(), h(), semAlcance(), AtividadesComplementaresPage() (+43 more)

### Community 7 - "API de acompanhamento"
Cohesion: 0.07
Nodes (47): cargaHorariaJson(), divergenciaCalculadaJson(), divergenciaJson(), estagioAcompanhadoJson(), frequenciaJson(), hhmm(), homologacaoJson(), instante() (+39 more)

### Community 8 - "Testes e2e Playwright"
Cohesion: 0.05
Nodes (25): RFC-5737, PERFIS, botao(), sessao, estagioAtivoDesdeAgosto(), sessao, enviarComprovante(), sessao (+17 more)

### Community 9 - "Telas de listagem"
Cohesion: 0.14
Nodes (51): AuditoriaPage(), Concedente, ConcedentesPage(), SITUACOES, CursosPage(), h(), Estudante, EstudantesPage() (+43 more)

### Community 10 - "Fixtures e estudantes"
Cohesion: 0.07
Nodes (49): estudante, auditoria, SITUACAO_ACADEMICA_INICIAL, SituacaoAcademica, TODAS, transicaoPermitida(), TRANSICOES_SITUACAO_ACADEMICA, validarTransicaoSituacaoAcademica() (+41 more)

### Community 11 - "Barra lateral e navegação"
Cohesion: 0.08
Nodes (42): AppSidebar(), ItemDeMenu(), AppLayout(), TopbarTitle(), encontrarItem(), GRUPOS, gruposVisiveis(), itensVisiveis() (+34 more)

### Community 12 - "SQL de estágios"
Cohesion: 0.07
Nodes (28): app.coordena_curso_do_estagio(), app.dias_usados_no_par(), app.e_estudante_do_estagio(), app.e_responsavel_vigente(), app.efetivar_aditivo(), app.estagios_legiveis(), app.estudante_atual_id(), app.historico_estagios_concedente() (+20 more)

### Community 13 - "Utilitários de interface"
Cohesion: 0.10
Nodes (30): nextConfig, next, ConveniosPage(), ESCOPO, GuardaDocumentalPage(), TIPO_DOCUMENTO, horas(), ParametrosPage() (+22 more)

### Community 14 - "Schema Drizzle principal"
Cohesion: 0.06
Nodes (37): categoriaAtividade, curso, parametroInstitucional, periodicidadeRelatorio, limiteRequisicao, situacaoUsuario, verificacao, analiseAtividade (+29 more)

### Community 15 - "Auditoria e relatórios gerenciais"
Cohesion: 0.08
Nodes (37): RFC-4180, GET, BOM, celulaCsv(), CSV_SEPARADOR, gerarCsv(), TipoRelatorio, TIPOS_RELATORIO (+29 more)

### Community 16 - "Serviço de usuários"
Cohesion: 0.11
Nodes (40): vinculoPerfil, Transaction, validarVinculos(), colunas, findContasEstudante(), findUsuarioById(), findUsuarios(), insertUsuario() (+32 more)

### Community 17 - "Serviço de concedentes"
Cohesion: 0.12
Nodes (35): GET, POST, GET, PATCH, concedenteJson(), GET, POST, CATALOGOS (+27 more)

### Community 18 - "Serviço de atividades"
Cohesion: 0.11
Nodes (37): POST, AnaliseRow, AtividadeRow, ComprovanteRow, condicoesAtividade(), estudanteAtualId(), FiltrosAtividade, findAtividadeById() (+29 more)

### Community 19 - "Migração de estágios"
Cohesion: 0.09
Nodes (38): "aditivo", aditivo_criado_por_idx, aditivo_documento_idx, aditivo_estagio_numero_unique, aditivo_novo_supervisor_idx, aditivo_um_pendente, apolice_documento_idx, apolice_estagio_fim_idx (+30 more)

### Community 20 - "Rotas autenticadas"
Cohesion: 0.09
Nodes (23): GET, GET, previaJson(), GET, GET, GET, POST, GET (+15 more)

### Community 21 - "Migrações concedentes e documentos"
Cohesion: 0.09
Nodes (30): "concedente", concedente_porte_idx, concedente_setor_idx, concedente_situacao_idx, "historico_situacao_concedente", historico_situacao_concedente_idx, historico_situacao_decidido_por_idx, "porte_concedente" (+22 more)

### Community 22 - "SQL de convênios e documentos"
Cohesion: 0.08
Nodes (23): "rescisao", rescisao_decidido_por_idx, rescisao_documento_idx, app.convenio_vigente_em(), app.pode_baixar_documento(), app.pode_consultar_acessos_documento(), app.registrar_leitura_documento(), app.rotina_diaria() (+15 more)

### Community 23 - "Formulários da API"
Cohesion: 0.18
Nodes (28): react, NovoConvenio(), onSubmit(), NovaAtividade(), onSubmit(), NovoAfastamento(), enviar(), Campo() (+20 more)

### Community 24 - "Serviço de relatórios"
Cohesion: 0.11
Nodes (33): anexoRelatorio, parecerRelatorio, relatorio, versaoRelatorio, enviadoComAtraso(), pendenteDe(), relatorioEmAtraso(), SituacaoRelatorio (+25 more)

### Community 25 - "Identidade e avaliação"
Cohesion: 0.14
Nodes (30): withUser(), Identity, isValidUserId(), AcompanhamentoRow, CriterioRow, findAcompanhamentoById(), findAcompanhamentos(), findAvaliacoes() (+22 more)

### Community 26 - "Serviço de estágio"
Cohesion: 0.14
Nodes (34): DomainError, booleano(), convenioVigenteEm(), cursoDoEstudante(), diasUsadosNoPar(), EstagioResumo, EstagioRow, findEstagios() (+26 more)

### Community 27 - "SQL de avaliação"
Cohesion: 0.10
Nodes (29): "acompanhamento", acompanhamento_estagio_data_idx, acompanhamento_registrado_por_idx, avaliacao_avaliador_idx, "avaliacao_desempenho", avaliacao_estagio_idx, avaliacao_uma_final, "criterio_avaliacao" (+21 more)

### Community 28 - "SQL de frequência"
Cohesion: 0.08
Nodes (20): app.conferir_homologacao(), app.em_afastamento(), app.exigir_substituto_frequencia(), app.validar_alteracao_frequencia(), app.validar_homologacao(), app.validar_registro_frequencia(), app.impedimentos_conclusao(), app.validar_origem_estagio() (+12 more)

### Community 29 - "Painel por perfil"
Cohesion: 0.16
Nodes (28): lucide-react, DistribuicaoEstagios(), LinhaCompacta(), ListaCompacta(), SITUACOES, BlocoAdministrador(), BlocoConcedente(), BlocoCoordenacao() (+20 more)

### Community 30 - "Testes de senha provisória"
Cohesion: 0.11
Nodes (26): GET(), POST(), conta, sessao, usuario, notificacao, tipoNotificacao, getAuth() (+18 more)

### Community 31 - "Serviço de integralização"
Cohesion: 0.13
Nodes (26): POST, GET, integralizacaoJson(), Apuracao, CategoriaApurada, progresso(), Situacao, base (+18 more)

### Community 32 - "Serviço de formalização"
Cohesion: 0.15
Nodes (32): ApoliceRow, AssinaturaRow, encerrarResponsavel(), findPlanoById(), findPlanos(), findResponsavelAtual(), insertApolice(), insertAssinatura() (+24 more)

### Community 33 - "Workflow de deploy"
Cohesion: 0.06
Nodes (32): concurrency, cancel-in-progress, group, env, if, name, runs-on, steps (+24 more)

### Community 34 - "Conexão e withUser"
Cohesion: 0.11
Nodes (21): drizzle-orm, autorizado(), GET(), GET(), closeDatabases(), Database, ENV_BY_POOL, getAppDatabase() (+13 more)

### Community 35 - "API de usuários"
Cohesion: 0.13
Nodes (24): GET, POST, PUT, POST, GET, PATCH, POST, usuarioJson() (+16 more)

### Community 36 - "SQL de atividades e notificações"
Cohesion: 0.09
Nodes (18): app.aplicar_analise_atividade(), app.coordena_curso_do_estudante(), app.estudante_da_atividade(), app.exigir_comprovante_atividade(), app.validar_analise_atividade(), app.validar_atividade(), app.notificar(), app.notificar_analise_atividade() (+10 more)

### Community 37 - "SQL de relatórios"
Cohesion: 0.11
Nodes (21): app.aplicar_parecer_relatorio(), app.estagio_da_versao(), app.estagio_do_relatorio(), app.exigir_conteudo_versao(), app.gerar_relatorios(), app.periodicidade_de(), app.validar_anexo_relatorio(), app.validar_parecer_relatorio() (+13 more)

### Community 38 - "Serviço de documentos"
Cohesion: 0.15
Nodes (25): main(), getArmazenamento(), ASSINATURAS, extensaoDoTipo(), sha256Hex(), tipoPeloConteudo(), AcessoDocumento, DocumentoRow (+17 more)

### Community 39 - "SQL de identidade e cursos"
Cohesion: 0.11
Nodes (21): "notificacao", notificacao_destinatario_recente_idx, notificacao_nao_lidas_idx, app.buscar_contas_estudante(), app.coordena_curso(), app.coordena_estudante_usuario(), app.tem_perfil_vigente(), app.representa_concedente() (+13 more)

### Community 40 - "API de atividades"
Cohesion: 0.18
Nodes (21): POST, POST, POST, GET, PATCH, GET, POST, analiseJson() (+13 more)

### Community 41 - "Compose de desenvolvimento"
Cohesion: 0.09
Nodes (26): AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, interval, retries, test (+18 more)

### Community 42 - "Botões e ações de usuário"
Cohesion: 0.17
Nodes (20): @radix-ui/react-dialog, Confirmar(), DadosConta(), PerfisConta(), SegurancaConta(), useEnvio(), enviar(), mensagemDeErro() (+12 more)

### Community 43 - "API de avaliação"
Cohesion: 0.12
Nodes (19): acompanhamentoJson(), avaliacaoJson(), criterioJson(), PATCH, PATCH, GET, POST, GET (+11 more)

### Community 44 - "Campos e formulários de login"
Cohesion: 0.15
Nodes (15): POST, LoginForm(), loginSchema, LoginValues, metadata, RecuperarSenhaPage(), email, RecuperarSenhaForm() (+7 more)

### Community 45 - "SQL de guarda e parâmetros"
Cohesion: 0.09
Nodes (14): app.parametros_em(), app.teto_duracao_estagio(), app.definir_guarda_convenio(), app.documentos_em_guarda(), app.prazo_guarda_em(), bloquear_alteracao, definir_atualizado_em, registrar_auditoria (+6 more)

### Community 46 - "Dados de listagem e desempenho"
Cohesion: 0.18
Nodes (23): AQUECIMENTO, exigirBancoDeTeste(), main(), Medicao, medir(), REPETICOES, contagemPorSituacao(), dadosAdministrador() (+15 more)

### Community 47 - "Sessão e perfis"
Cohesion: 0.13
Nodes (18): GET, AdministracaoPage(), AREAS, Cartao(), dataHora, TrocarSenhaPage(), SITUACAO_ACADEMICA, SITUACAO_USUARIO (+10 more)

### Community 48 - "Categorias e exigências"
Cohesion: 0.17
Nodes (21): Exigencias, exigenciasJson(), GET, PUT, exigenciaCategoria, CategoriaRow, clearDestinoEstagio(), ExigenciaRow (+13 more)

### Community 49 - "Domínio do estágio"
Cohesion: 0.14
Nodes (18): DomainErrorDetail, diaSeguinte(), exigirAtivavel(), FatosAtivacao, impedimentosAtivacao(), PARTES, Periodo, periodoCoberto() (+10 more)

### Community 50 - "Scripts npm"
Cohesion: 0.09
Nodes (23): scripts, batch:integrate, batch:pr, build, ci, db:desempenho, db:generate, db:migrate (+15 more)

### Community 51 - "Filtros e API de auditoria"
Cohesion: 0.15
Nodes (15): GET, GET, GET, POST, GET, GET, searchParamsOf(), dataSchema (+7 more)

### Community 52 - "Rotas de classificação"
Cohesion: 0.11
Nodes (18): classificacaoJson(), rotasColecao(), rotasItem(), PATCH, GET, POST, rotas, PATCH (+10 more)

### Community 53 - "API de convênios"
Cohesion: 0.18
Nodes (16): GET, POST, POST, POST, GET, PATCH, convenioJson(), idParamSchema (+8 more)

### Community 54 - "Serviço de cursos"
Cohesion: 0.17
Nodes (17): padraoContendo(), colunas, CursoResumo, CursoRow, CursoValues, findCursoById(), findCursos(), insertCurso() (+9 more)

### Community 55 - "Tradução de erros do banco"
Cohesion: 0.23
Nodes (17): findPgError(), isExclusionViolation(), isForeignKeyViolation(), isRlsViolation(), isTriggerRule(), isUniqueViolation(), PgError, triggerRuleDetail() (+9 more)

### Community 56 - "Migração de fundação"
Cohesion: 0.14
Nodes (20): "auditoria", auditoria_ocorrido_em_idx, auditoria_tabela_registro_idx, auditoria_usuario_id_idx, "conta", conta_provedor_conta_unico, conta_usuario_id_idx, "curso" (+12 more)

### Community 57 - "Serviço de convênios"
Cohesion: 0.26
Nodes (19): ConvenioRow, findConvenioById(), findConveniosAVencer(), findConveniosDaConcedente(), findVigencias(), insertConvenio(), insertVigencia(), updateConvenio() (+11 more)

### Community 58 - "Serviço de aditivos"
Cohesion: 0.20
Nodes (19): AditivoRow, cancelarAditivo(), efetivarAditivo(), findAditivoById(), findAditivos(), findAssinaturasAditivo(), insertAditivo(), findEstagioById() (+11 more)

### Community 59 - "Periodicidade de relatórios"
Cohesion: 0.20
Nodes (16): GET, periodicidadeJson(), PUT, Periodicidade, PERIODICIDADE_PADRAO, TipoEstagio, findPeriodicidades(), PeriodicidadeRow (+8 more)

### Community 60 - "SQL de afastamento"
Cohesion: 0.16
Nodes (13): "afastamento", afastamento_documento_idx, afastamento_estagio_periodo_idx, afastamento_registrado_por_idx, app.exigir_substituto_afastamento(), app.periodos_afastamento(), app.validar_afastamento(), aplicar_afastamento (+5 more)

### Community 61 - "Formulários de curso e estudante"
Cohesion: 0.13
Nodes (16): @hookform/resolvers@^5.2.2, react-hook-form@^7.63.0, @hookform/resolvers, react-hook-form, CursoForm(), CursoInput, CursoOutput, cursoSchema (+8 more)

### Community 62 - "Menu do usuário e senha"
Cohesion: 0.16
Nodes (10): @radix-ui/react-dropdown-menu@^2.1.24, @radix-ui/react-dropdown-menu, ModalTrocarSenha(), iniciaisDoNome(), UserMenu(), TrocarSenhaForm(), DropdownMenuContent(), DropdownMenuItem() (+2 more)

### Community 63 - "API de cursos"
Cohesion: 0.18
Nodes (16): GET, PATCH, cursoJson(), GET, POST, HORAS_CURSO_MAXIMO, cargaComplementares, cargaMinimaEstagio (+8 more)

### Community 64 - "Configuração TypeScript"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 65 - "Better Auth"
Cohesion: 0.23
Nodes (12): better-auth, solicitarRecuperacaoSenha(), Auth, createAuth(), cidrValido(), Env, lista(), opcoesEnderecoIp() (+4 more)

### Community 66 - "Schema de acompanhamento"
Cohesion: 0.11
Nodes (15): acompanhamento, avaliacaoDesempenho, criterioAvaliacao, decisaoParecer, divergenciaCargaHoraria, homologacaoFrequencia, momentoAvaliacao, registroFrequencia (+7 more)

### Community 67 - "Migrações de integralização"
Cohesion: 0.18
Nodes (13): "apuracao_categoria", apuracao_categoria_categoria_idx, apuracao_categoria_unique, apuracao_curso_idx, apuracao_estudante_recente_idx, "apuracao_integralizacao", "declaracao", declaracao_apuracao_idx (+5 more)

### Community 68 - "Primeiro admin e credenciais"
Cohesion: 0.21
Nodes (11): Banco, criarAdministrador(), existeAdministrador(), main(), definirSenha(), revogarSessoes(), generateTemporaryPassword(), hashPassword() (+3 more)

### Community 69 - "API de concedentes"
Cohesion: 0.15
Nodes (11): POST, cepSchema, telefoneSchema, concedente, UFS, campos, CamposBody, createConcedenteBodySchema (+3 more)

### Community 70 - "API de estudantes"
Cohesion: 0.21
Nodes (13): GET, PATCH, estudanteJson(), GET, POST, situacaoAcademica, createEstudanteBodySchema, estudanteIdParamSchema (+5 more)

### Community 71 - "Rótulos e status"
Cohesion: 0.16
Nodes (14): Alteracao(), COLUNAS, Registro, TOM, valor(), formatarCnpj(), OPERACAO_AUDITORIA, SITUACAO_ATIVIDADE (+6 more)

### Community 72 - "Validação Zod"
Cohesion: 0.19
Nodes (12): zod, LIMITE, errosPorCampo(), faixa(), mensagemDoProblema(), Problema, concedente, aprovacaoRelatorioBodySchema (+4 more)

### Community 73 - "Doc: segurança e RLS"
Cohesion: 0.17
Nodes (10): Audit by database trigger with masked sensitive columns, Declarative drizzle/sql security layer, Identity (produced only by session.ts), Layered architecture (presentation, API, domain, persistence, database), Row Level Security on every table, migrator database role, withUser identity transaction wrapper, Write flow from Route Handler to audit trigger (+2 more)

### Community 74 - "API de parâmetros e categorias"
Cohesion: 0.23
Nodes (11): PATCH, categoriaJson(), GET, POST, createCategoriaBodySchema, definirExigenciasBodySchema, definirParametrosBodySchema, listCategoriasQuerySchema (+3 more)

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

### Community 79 - "Seed de desenvolvimento"
Cohesion: 0.23
Nodes (13): CATEGORIAS, CRITERIOS, db, ensurePerfil(), main(), pool, upsertCategorias(), upsertConcedenteComConvenio() (+5 more)

### Community 80 - "Vínculos e senha provisória"
Cohesion: 0.23
Nodes (10): expiracaoSenhaProvisoria(), impedirAutoemissaoSenha(), VALIDADE_SENHA_PROVISORIA_HORAS, chave(), diferencaVinculos(), impedirAutoinativacao(), impedirAutorremocaoAdministrador(), PERFIS_QUE_EXIGEM_CONCEDENTE (+2 more)

### Community 81 - "Serviço de afastamento"
Cohesion: 0.27
Nodes (12): AfastamentoRow, findAfastamentoById(), findAfastamentos(), insertAfastamento(), periodosAfastamento(), lockEstagio(), gravar(), listAfastamentos() (+4 more)

### Community 82 - "Doc: VPS e produção"
Cohesion: 0.19
Nodes (9): Backup layers (pgBackRest, restic and rclone, Contabo Auto Backup), LUKS vault at /srv/dados, Production deployment on Contabo VPS, New server setup scripts (cofre-criar, publicar, configurar-deploy, backup-configurar), Encrypted vault limited to 30% of the disk, SeaweedFS volumeSizeLimitMB=128, Shared server proxy at /srv/proxy, vps-espaco disk check (+1 more)

### Community 83 - "PDFs do estágio"
Cohesion: 0.35
Nodes (12): documentoPlano(), findIdentificacaoEstagio(), findApolices(), findAssinaturas(), findResponsaveis(), nomeDoUsuario(), carregar(), pdfAditivo() (+4 more)

### Community 84 - "CI: passos"
Cohesion: 0.27
Nodes (12): steps, steps, steps, quality, name, runs-on, steps, steps (+4 more)

### Community 85 - "CI: variáveis"
Cohesion: 0.17
Nodes (12): env, AUTH_IP_HEADERS, BETTER_AUTH_SECRET, BETTER_AUTH_URL, DATABASE_AUTH_URL, DATABASE_MIGRATION_URL, DATABASE_URL, R2_ACCESS_KEY_ID (+4 more)

### Community 86 - "CI: jobs"
Cohesion: 0.18
Nodes (10): concurrency, cancel-in-progress, group, jobs, source-branch, name, permissions, contents (+2 more)

### Community 87 - "API de documentos"
Cohesion: 0.27
Nodes (7): documentoJson(), POST, TAMANHO_MAXIMO_BYTES, tipoDocumento, TIPOS_MIME_PERMITIDOS, confirmarUploadBodySchema, solicitarUploadBodySchema

### Community 88 - "API de notificações"
Cohesion: 0.33
Nodes (7): POST, notificacaoJson(), GET, NotificacaoRow, lerNotificacao(), notificacaoIdParamSchema, notificacoesQuerySchema

### Community 89 - "Schema de concedentes"
Cohesion: 0.18
Nodes (8): convenio, convenioVigencia, historicoSituacaoConcedente, porteConcedente, setorAtuacao, situacaoConcedente, situacaoConvenio, documento

### Community 90 - "Serviço de parâmetros"
Cohesion: 0.33
Nodes (9): Parametros, PARAMETROS_PADRAO, colunas, findHistoricoParametros(), findParametroVigente(), insertParametro(), paraDominio(), ParametroRow (+1 more)

### Community 91 - "API de afastamento"
Cohesion: 0.36
Nodes (8): POST, GET, POST, afastamentoJson(), afastamentoBodySchema, substituicaoAfastamentoBodySchema, toNovoAfastamento(), registrarAfastamento()

### Community 92 - "API de parâmetros"
Cohesion: 0.33
Nodes (8): GET, parametrosJson(), GET, PUT, dataQuerySchema, toParametros(), definirParametros(), listHistoricoParametros()

### Community 93 - "Encerramento do estágio"
Cohesion: 0.36
Nodes (8): findRescisao(), insertRescisao(), RescisaoRow, concluirEstagio(), getRescisao(), naoAtivo(), NovaRescisao, rescindirEstagio()

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
Cohesion: 0.25
Nodes (4): aplicarMascara(), Mascara, MASCARAS, TECLADO

### Community 100 - "Senha contextual"
Cohesion: 0.42
Nodes (7): normalizar(), PALAVRAS_DO_SERVICO, palavrasDeContexto(), semDigitosNasPontas(), senhaPrevisivel(), MARIA, validarSenhaContextual()

### Community 101 - "Guarda documental"
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

### Community 106 - "Senhas vazadas"
Cohesion: 0.39
Nodes (6): CAMINHOS_VERIFICADOS, contagemNoRange(), Opcoes, senhaComprometida(), senhasVazadas(), sha1Hex()

### Community 107 - "Domínio de avaliação"
Cohesion: 0.32
Nodes (6): conferirRespostas(), Criterio, mediaNormalizada(), ProblemaResposta, Resposta, criterios

### Community 108 - "Aproveitamento de estágio"
Cohesion: 0.32
Nodes (6): Aproveitamento, calcularAproveitamento(), periodoValido(), SaldoAproveitamento, base, exigirPeriodo()

### Community 109 - "Validação de CNPJ"
Cohesion: 0.43
Nodes (6): cnpjValido(), digito(), normalizarCnpj(), PESOS_PRIMEIRO, PESOS_SEGUNDO, validarCnpj()

### Community 110 - "Papéis no estágio"
Cohesion: 0.43
Nodes (6): acoesNoEstagio(), NENHUM_PAPEL, PapeisNoEstagio, ParteAssinatura, como(), quem()

### Community 111 - "Serviço de notificações"
Cohesion: 0.50
Nodes (6): contarNaoLidas(), findNotificacoes(), marcarLida(), marcarTodasLidas(), lerTodas(), listNotificacoes()

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

### Community 116 - "SQL de rescisão"
Cohesion: 0.43
Nodes (5): aplicar_rescisao, bloquear_alteracao_rescisao, registrar_auditoria, registrar_encerramento, validar_rescisao

### Community 117 - "Teste de restauração"
Cohesion: 0.38
Nodes (6): limpar(), RCLONE_CONFIG, RESTIC_PASSWORD_FILE, RESTIC_REPOSITORY, backup-testar-restauracao.sh script, sql()

### Community 118 - "Capa de curso"
Cohesion: 0.48
Nodes (5): CursoPage(), h(), CapaCurso(), tomDe(), TONS

### Community 119 - "Tela de login"
Cohesion: 0.38
Nodes (5): LoginPage(), ETAPAS, PercursoEstagio(), Perfil, PERFIS

### Community 120 - "SQL de notificações"
Cohesion: 0.33
Nodes (4): notificar_analise_atividade, notificar_situacao_estagio, notificar_substituicao, validar_alteracao_notificacao

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

### Community 129 - "Avatar"
Cohesion: 0.40
Nodes (4): iniciais(), TAMANHOS, tomDe(), TONS

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
- **36 isolated node(s):** `RFC-5737`, `RESTIC_REPOSITORY`, `RESTIC_PASSWORD_FILE`, `RCLONE_CONFIG`, `RESTIC_REPOSITORY` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 754 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **65 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `drizzle-orm` connect `Conexão e withUser` to `Identidade do estudante`, `Testes e suporte compartilhado`, `Serviço de frequência`, `PDFs e declarações`, `Dependências do projeto`, `Scripts de CI e GitHub`, `Fixtures e estudantes`, `Schema Drizzle principal`, `Auditoria e relatórios gerenciais`, `Serviço de usuários`, `Serviço de concedentes`, `Serviço de atividades`, `Serviço de relatórios`, `Identidade e avaliação`, `Serviço de estágio`, `Testes de senha provisória`, `Serviço de integralização`, `Serviço de formalização`, `Serviço de documentos`, `Categorias e exigências`, `Serviço de cursos`, `Serviço de convênios`, `Serviço de aditivos`, `Periodicidade de relatórios`, `Better Auth`, `Schema de acompanhamento`, `Primeiro admin e credenciais`, `Seed de desenvolvimento`, `Serviço de afastamento`, `API de documentos`, `Schema de concedentes`, `Serviço de parâmetros`, `Encerramento do estágio`, `Guarda documental`, `Serviço de notificações`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `RFC-5737`, `RESTIC_REPOSITORY`, `RESTIC_PASSWORD_FILE` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Testes e suporte compartilhado` be split into smaller, more focused modules?**
  _Cohesion score 0.08986568986568987 - nodes in this community are weakly interconnected._
- **Why does `withUser()` connect `Identidade e avaliação` to `Testes e suporte compartilhado`, `API de estágios`, `Serviço de frequência`, `PDFs e declarações`, `Telas de listagem`, `Fixtures e estudantes`, `Utilitários de interface`, `Auditoria e relatórios gerenciais`, `Serviço de usuários`, `Serviço de concedentes`, `Serviço de atividades`, `Serviço de relatórios`, `Serviço de estágio`, `Testes de senha provisória`, `Serviço de integralização`, `Serviço de formalização`, `Conexão e withUser`, `Serviço de documentos`, `API de atividades`, `Dados de listagem e desempenho`, `Sessão e perfis`, `Categorias e exigências`, `Rotas de classificação`, `Serviço de cursos`, `Serviço de convênios`, `Serviço de aditivos`, `Periodicidade de relatórios`, `Primeiro admin e credenciais`, `API de parâmetros e categorias`, `Serviço de afastamento`, `PDFs do estágio`, `API de notificações`, `Serviço de parâmetros`, `API de parâmetros`, `Encerramento do estágio`, `Guarda documental`, `Serviço de notificações`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `API de estágios` be split into smaller, more focused modules?**
  _Cohesion score 0.07401032702237521 - nodes in this community are weakly interconnected._
- **Why does `dataResponse()` connect `API de estágios` to `PDFs e declarações`, `API de acompanhamento`, `Serviço de concedentes`, `Serviço de atividades`, `Rotas autenticadas`, `Serviço de integralização`, `API de usuários`, `API de atividades`, `API de avaliação`, `Campos e formulários de login`, `Sessão e perfis`, `Categorias e exigências`, `Filtros e API de auditoria`, `Rotas de classificação`, `API de convênios`, `Periodicidade de relatórios`, `API de cursos`, `API de concedentes`, `API de estudantes`, `API de parâmetros e categorias`, `API de documentos`, `API de notificações`, `API de afastamento`, `API de parâmetros`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `Serviço de frequência` be split into smaller, more focused modules?**
  _Cohesion score 0.0691333982473223 - nodes in this community are weakly interconnected._