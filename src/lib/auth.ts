import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { getAuthDatabase } from "@/db/client";
import { conta, limiteRequisicao, sessao, usuario, verificacao } from "@/db/schema";
import { hashPassword, verifyPassword } from "./password";

// QA: an idle session expires after 30 minutes. Each request older than a minute
// pushes the expiry forward, so only inactivity ends the session.
const SESSION_IDLE_SECONDS = 30 * 60;
const SESSION_REFRESH_SECONDS = 60;

function createAuth() {
  const database = getAuthDatabase();

  return betterAuth({
    appName: "Internship Tracker",
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: { usuario, sessao, conta, verificacao, limiteRequisicao },
    }),
    advanced: {
      database: { generateId: "uuid" },
    },
    // Tables and columns keep the Portuguese domain names (AGENTS.md conventions)
    user: {
      modelName: "usuario",
      fields: {
        name: "nome",
        emailVerified: "emailVerificado",
        image: "imagem",
        createdAt: "criadoEm",
        updatedAt: "atualizadoEm",
      },
      additionalFields: {
        situacao: { type: "string", required: false, input: false },
      },
    },
    session: {
      modelName: "sessao",
      fields: {
        userId: "usuarioId",
        expiresAt: "expiraEm",
        ipAddress: "enderecoIp",
        userAgent: "agenteUsuario",
        createdAt: "criadoEm",
        updatedAt: "atualizadoEm",
      },
      expiresIn: SESSION_IDLE_SECONDS,
      updateAge: SESSION_REFRESH_SECONDS,
    },
    account: {
      modelName: "conta",
      fields: {
        userId: "usuarioId",
        accountId: "contaId",
        providerId: "provedorId",
        password: "senhaHash",
        accessToken: "tokenAcesso",
        refreshToken: "tokenAtualizacao",
        idToken: "tokenId",
        accessTokenExpiresAt: "tokenAcessoExpiraEm",
        refreshTokenExpiresAt: "tokenAtualizacaoExpiraEm",
        scope: "escopo",
        createdAt: "criadoEm",
        updatedAt: "atualizadoEm",
      },
    },
    verification: {
      modelName: "verificacao",
      fields: {
        identifier: "identificador",
        value: "valor",
        expiresAt: "expiraEm",
        createdAt: "criadoEm",
        updatedAt: "atualizadoEm",
      },
    },
    rateLimit: {
      storage: "database",
      modelName: "limiteRequisicao",
      fields: { key: "chave", count: "contador", lastRequest: "ultimaRequisicao" },
    },
    emailAndPassword: {
      enabled: true,
      // RF001: accounts are created by the administrator, never by self sign-up
      disableSignUp: true,
      minPasswordLength: 12,
      password: { hash: hashPassword, verify: verifyPassword },
      revokeSessionsOnPasswordReset: true,
    },
    databaseHooks: {
      session: {
        create: {
          // RF001: an inactive user cannot open a session even with the right password
          before: async (session) => {
            const [row] = await database
              .select({ situacao: usuario.situacao })
              .from(usuario)
              .where(eq(usuario.id, session.userId));

            if (row?.situacao !== "ATIVO") {
              throw new APIError("FORBIDDEN", { message: "Usuario inativo" });
            }
          },
        },
      },
    },
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;

let instance: Auth | undefined;

// Lazy so that `next build` can load route modules without database credentials
export function getAuth(): Auth {
  return (instance ??= createAuth());
}
