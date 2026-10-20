# Rollback de migrações

Cada migração de tabela a partir da `0002` tem aqui o SQL que a desfaz. Não é aplicado por
nenhum script: reverter é decisão manual, feita com `DATABASE_MIGRATION_URL` (papel
`migrator`), na ordem inversa das migrações, e seguida de remover a entrada correspondente
em `drizzle.__drizzle_migrations`.

```bash
psql "$DATABASE_MIGRATION_URL" -1 -f drizzle/rollback/0002_parametros_categorias.down.sql
```

Reverter apaga as tabelas e os dados delas. A trilha de auditoria (`auditoria`) não é
tocada: os registros das linhas removidas continuam lá. Antes de reverter em produção,
exporte os dados (`pg_dump -t <tabela>`).

Políticas, funções e gatilhos de `drizzle/sql` não precisam de rollback próprio: são
declarativos e recriados a cada `npm run db:migrate` a partir dos arquivos da revisão
em uso.
