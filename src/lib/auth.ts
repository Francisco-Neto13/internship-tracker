import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { haveIBeenPwned } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { getAuthDatabase } from "@/db/client";
import { conta, limiteRequisicao, sessao, usuario, verificacao } from "@/db/schema";
import { senhaProvisoriaExpirada } from "@/modules/acesso/domain/senha-provisoria";
import { opcoesEnderecoIp, verificacaoSenhaVazadaAtiva } from "./auth-options";
import { hashPassword, verifyPassword } from "./password";

// QA: an idle session expires after 30 minutes. Each request older than a minute
// pushes the expiry forward, so only inactivity ends the session.
const SESSION_IDLE_SECONDS = 30 * 60;
const SESSION_REFRESH_SECONDS = 60;

function createAuth() {
  // Fail at start-up, not at the first password change, on a misconfigured environment
  verificacaoSenhaVazadaAtiva(process.env);
  const database = getAuthDatabase();

  return betterAuth({
    appName: "Internship Tracker",
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: { usuario, sessao, conta, verificacao, limiteRequisicao },
    }),
    advanced: {
      database: { generateId: "uuid" },
      // RF002: the sign-in rate limit is keyed by a client address only a trusted proxy sets
      ipAddress: opcoesEnderecoIp(process.env),
    },
    // Account routes the domain already covers, or the project does not use, stay closed over
    // HTTP: name and e-mail change through RF001 (audited, administrator only), the password
    // through POST /api/v1/auth/senha, recovery through the temporary password. Server-side
    // calls (auth.api.*) are not affected.
    disabledPaths: [
      "/update-user",
      "/change-email",
      "/change-password",
      "/delete-user",
      "/request-password-reset",
      "/reset-password",
      "/verify-password",
      "/send-verification-email",
      "/verify-email",
      "/link-social",
      "/unlink-account",
    ],
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
        // RF002: set when the administrator issues a temporary password
        trocaSenhaObrigatoria: { type: "boolean", required: false, input: false },
        senhaProvisoriaExpiraEm: { type: "date", required: false, input: false },
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
      // NIST SP 800-63B-4, 3.1.1.2: at least 15 characters when the password is the only
      // factor. Sign-in does not check the length, so older 12-character passwords still work.
      minPasswordLength: 15,
      maxPasswordLength: 128,
      password: { hash: hashPassword, verify: verifyPassword },
      revokeSessionsOnPasswordReset: true,
    },
    databaseHooks: {
      session: {
        create: {
          // RF001: an inactive user cannot open a session even with the right password.
          // RF002: neither can an expired temporary password; the administrator issues a new one.
          before: async (session) => {
            const [row] = await database
              .select({
                situacao: usuario.situacao,
                trocaSenhaObrigatoria: usuario.trocaSenhaObrigatoria,
                senhaProvisoriaExpiraEm: usuario.senhaProvisoriaExpiraEm,
              })
              .from(usuario)
              .where(eq(usuario.id, session.userId));

            if (row?.situacao !== "ATIVO") {
              throw new APIError("FORBIDDEN", { message: "Usuário inativo", code: "USUARIO_INATIVO" });
            }
            if (senhaProvisoriaExpirada(row)) {
              throw new APIError("FORBIDDEN", { message: "Senha provisória expirada", code: "SENHA_PROVISORIA_EXPIRADA" });
            }
          },
        },
      },
    },
    plugins: [
      // NIST SP 800-63B-4 3.1.1.2: new passwords are compared against breach corpora. Only
      // the first 5 hex characters of the SHA-1 leave the server (k-anonymity), padded
      // responses hide which prefix matched, and a failed lookup refuses the change
      // (fail closed) instead of accepting an unchecked password. The getter re-reads the
      // environment on each password change.
      haveIBeenPwned({
        get enabled() {
          return verificacaoSenhaVazadaAtiva(process.env);
        },
        customPasswordCompromisedMessage: "Senha encontrada em vazamentos de dados",
      }),
      nextCookies(),
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;

let instance: Auth | undefined;

// Lazy so that `next build` can load route modules without database credentials
export function getAuth(): Auth {
  return (instance ??= createAuth());
}
