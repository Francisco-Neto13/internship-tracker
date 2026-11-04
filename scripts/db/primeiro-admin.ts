import { and, eq, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../src/db/schema";
import { expiracaoSenhaProvisoria } from "../../src/modules/acesso/domain/senha-provisoria";
import { generateTemporaryPassword, hashPassword } from "../../src/lib/password";

// RF001: accounts are created by an administrator, so an empty production database needs a
// first one, and the seed refuses remote databases because its passwords are known. Runs as
// the owner role. The temporary password follows RF002: shown once, 72 h, change required.

type Banco = NodePgDatabase<typeof schema>;

export async function existeAdministrador(db: Banco): Promise<boolean> {
  const [vinculo] = await db
    .select({ id: schema.vinculoPerfil.id })
    .from(schema.vinculoPerfil)
    .where(and(eq(schema.vinculoPerfil.perfil, "ADMINISTRADOR"), isNull(schema.vinculoPerfil.vigenciaFim)))
    .limit(1);
  return vinculo !== undefined;
}

export async function criarAdministrador(db: Banco, dados: { email: string; nome: string }): Promise<string> {
  const senha = generateTemporaryPassword();
  const senhaHash = await hashPassword(senha);
  await db.transaction(async (tx) => {
    const [usuario] = await tx
      .insert(schema.usuario)
      .values({ email: dados.email, nome: dados.nome, trocaSenhaObrigatoria: true, senhaProvisoriaExpiraEm: expiracaoSenhaProvisoria() })
      .returning({ id: schema.usuario.id });
    await tx.insert(schema.conta).values({ usuarioId: usuario.id, provedorId: "credential", contaId: usuario.id, senhaHash });
    await tx.insert(schema.vinculoPerfil).values({ usuarioId: usuario.id, perfil: "ADMINISTRADOR" });
  });
  return senha;
}

async function main() {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { Pool } = await import("pg");
  const [email, ...nome] = process.argv.slice(2);
  if (!email?.includes("@") || nome.length === 0) {
    console.error('Uso: npm run db:primeiro-admin -- <e-mail> "<nome>"');
    process.exit(1);
  }
  if (!process.env.DATABASE_MIGRATION_URL) {
    console.error("DATABASE_MIGRATION_URL não definida");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_MIGRATION_URL });
  try {
    const db = drizzle({ client: pool, schema });
    if (await existeAdministrador(db)) {
      console.error("Já existe um administrador: novas contas são criadas pela tela de usuários (RF001).");
      process.exitCode = 1;
      return;
    }
    const senha = await criarAdministrador(db, { email: email.toLowerCase(), nome: nome.join(" ") });
    console.log(`Administrador criado: ${email}`);
    console.log(`Senha provisória (72 h, só aparece agora): ${senha}`);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
