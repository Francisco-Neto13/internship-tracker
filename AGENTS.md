# AGENTS.md

Internship Tracker: Plataforma de Acompanhamento de Estágios e Atividades Complementares.
Projeto acadêmico (disciplina Project Lab). Especificação: 6 atores, 36 regras de negócio
(RN-01 a RN-37), 70 requisitos funcionais (RF001 a RF070), 23 casos de uso, 8 módulos.

## Comandos

```bash
docker compose up -d    # Postgres 17 + MinIO
cp .env.example .env
npm install
npm run dev              # http://localhost:3000
npm run build
npm run lint
npm run test              # Vitest (unidade/integração)
npm run test:e2e          # Playwright
npm run db:generate       # gera migração a partir de src/db/schema
npm run db:migrate        # aplica migração pendente
```

## Branches e commits

`main` e `develop` são protegidas e exigem CI verde no PR. Uma feature nasce de
`develop` como `feature/<RF-curto>` (ex.: `feature/RF002-auth`) e volta por PR
para `develop`; `develop` vai para `main` só quando estável. Sem branch de
integração intermediária.

Commit: `type(scope): summary` no imperativo, sob 72 caracteres, com notas em
bullet explicando a mudança real, sem linha em branco entre elas, sem ponto
final. Não misturar mudança não relacionada no mesmo commit.

Tipos: `feat` `fix` `refactor` `perf` `test` `docs` `build` `ci` `chore` `revert`.
Escopos: `api` `ui` `domain` `db` `auth` `storage` `jobs` `config` `deps` `ci`
`docs` `test` `repo`. Exemplos completos em `documentation/padroes/PADRAOCOMMITS.MD`.

## Convenções

- Domínio (nomes de tabela, campo, regra de negócio) em português. Código,
  identificadores e mensagens de commit em inglês.
- Toda tabela sensível é protegida por Row Level Security. Nenhum código de
  aplicação acessa `src/db/client.ts` diretamente: sempre pelo wrapper
  `src/db/with-user.ts`, que propaga a identidade do usuário autenticado
  para a transação via `set_config('app.user_id', ...)`. Uma consulta que
  escape desse wrapper roda sem identidade e a política de RLS devolve
  zero linhas, uma falha visível, não silenciosa.
- Módulos de domínio ficam em `src/modules/<módulo>/{domain,services,repositories,schemas}`.
  Um módulo não importa o `repositories` de outro diretamente; a
  comunicação entre módulos passa por `services`.
- A regra de negócio vive no domínio, não na tela. Componentes chamam a
  camada de domínio; nunca reimplementam validação de jornada ou soma de horas.
- Nada relevante é apagado. Aditivos, substituições de responsável e versões
  de relatório geram registro novo, nunca sobrescrevem o anterior.
- Toda decisão técnica cita o RF ou a RN que a motiva.

## Módulos de domínio

| Módulo | Pasta | Agregados principais | RFs |
|---|---|---|---|
| M01 Acesso e Usuários | `src/modules/acesso` | Usuario, Perfil, Vinculo | RF001–RF003 |
| M02 Gestão Acadêmica | `src/modules/academico` | Curso, Estudante, ParametroInstitucional | RF004–RF006 |
| M03 Concedentes e Convênios | `src/modules/concedentes` | Concedente, Convenio | RF007–RF014 |
| M04 Gestão de Estágios | `src/modules/estagios` | Estagio, PlanoAtividades, Aditivo, Apolice, Assinatura | RF015–RF022, RF031–RF035, RF044–RF047 |
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

Fluxo de escrita: `Route Handler -> valida sessão -> valida schema (Zod) ->
serviço de domínio -> repositório -> abre transação e define app.user_id ->
RLS filtra -> trigger grava auditoria -> commit -> resposta`.

## Mapa de arquitetura

```
src/app/(auth)/        rotas de login e recuperação de senha
src/app/(app)/         telas autenticadas por perfil
src/app/api/v1/        route handlers da API REST
src/modules/           8 módulos de domínio (acesso, academico, concedentes,
                        estagios, acompanhamento, atividades, integralizacao,
                        administracao)
src/shared/            transversal: documentos, notificacoes, auditoria, ui
src/db/                client.ts (não importar direto), with-user.ts, schema/
src/lib/                auth, erros, cliente S3, utilitarios
drizzle/migrations/     SQL versionado gerado por drizzle-kit
drizzle/sql/            políticas RLS, funções e triggers versionados como SQL
docker-compose.yml      Postgres e MinIO para desenvolvimento
```

## Modelo de permissão (RLS)

Perfil sozinho não basta. A permissão é a interseção de perfil e vínculo:

| Perfil | Alcance |
|---|---|
| Estudante | Apenas os próprios registros |
| Professor Orientador | Estágios em que consta como orientador vigente |
| Supervisor | Estágios em que consta como supervisor vigente |
| Coordenação | Estudantes e estágios do curso sob sua coordenação |
| Concedente | Estágios da própria concedente |
| Administrador | Parametrização e auditoria; sem acesso a conteúdo de relatório ou atestado |

Cada tabela sensível recebe política RLS que resolve o vínculo por junção,
usando funções auxiliares em `security definer`. Colunas usadas nessas
junções precisam de índice, senão a política vira o gargalo.

## Máquina de estados do estágio

```
RASCUNHO -> AGUARDANDO_ASSINATURAS -> PRONTO_PARA_ATIVACAO -> ATIVO -> CONCLUIDO
ATIVO <-> AFASTADO
ATIVO -> RESCINDIDO
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

Detalhamento em `documentation/DAS.docx` §9.1.

## Requisitos de qualidade (resumo)

Segurança > Confiabilidade > Manutenibilidade, nessa prioridade quando conflitam.
RLS sem exceção (testado); leitura de atestado médico registrada em auditoria;
sessão expira em 30min; leitura p95 < 800ms; PDF em até 5s; uptime ≥ 99% em
horário comercial; toda RN nova exige teste; cálculo de horas é determinístico.
13 cenários completos (QA-01 a QA-13) em `documentation/DAS.docx` §10.

## Pegadinhas conhecidas

- Next.js está fixado em `^15.5.0`, não 16.x: o Auth.js (`next-auth@5` beta)
  só declara suporte de peer dependency a Next 14/15; `npm install` recusa a
  árvore de dependências com Next 16.
- O Neon opera o pooler em modo transação. Qualquer conexão Drizzle precisa
  de `prepare: false`, senão prepared statements do driver quebram contra
  o pooler.
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
1. Fundação técnica: RNFs (feito), DER lógico, migrações, wrapper de
   identidade, políticas RLS, auditoria, Auth.js, CI.
2. Cadastros e formalização: cursos, estudantes, concedentes, convênios,
   TCE, ativação de estágio.
3. Acompanhamento: frequência, carga horária, relatórios, avaliação.
4. Atividades complementares e integralização.
5. Ocorrências, conclusão e conformidade: afastamento, prorrogação,
   rescisão, guarda documental, relatórios gerenciais.

A ordem segue dependência de dados, não a numeração dos RFs: sem perfil e
vínculo (Fase 1), nenhuma política RLS pode ser escrita; sem curso e
exigência curricular (Fase 2), não há como validar carga mínima. Detalhe
completo, com critério de saída de cada fase, em
`documentation/planejamento/PLANEJAMENTO.MD`.

## Documentação completa

Requisitos, regras de negócio, arquitetura detalhada, especificação de API e
o Documento de Arquitetura de Software (DAS, modelo arc42) vivem em
`documentation/`, que ainda não é versionada neste repositório (arquivo de
trabalho pessoal). Uma versão reduzida e versionada será adicionada depois;
quando isso acontecer, apontar aqui para ela.

- `documentation/contexto/CONTEXTO.MD`: estado atual do projeto, lacunas conhecidas
- `documentation/planejamento/PLANEJAMENTO.MD`: fases, ordem de implementação, riscos
- `documentation/arquitetura/STACK.MD`: stack completa, restrições, alternativas descartadas
- `documentation/arquitetura/ARQUITETURA.MD`: modelo de dados, segurança, estrutura de pastas
- `documentation/arquitetura/ENDPOINTS-API.MD`: todos os endpoints, convenções, códigos de erro
- `documentation/DAS.docx`: Documento de Arquitetura de Software (arc42)
- `documentation/Stack e API.docx`: entrega formal de stack e API
- `documentation/requisitos/Requisitos e Regras.docx`: requisitos e regras de negócio completos
