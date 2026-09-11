// Shared helpers for the scripts that automate the branch flow on GitHub.
// The token comes from GITHUB_TOKEN or, failing that, from the credential git already uses
// for HTTPS pushes (Git Credential Manager). It is never printed.

import { execFileSync, spawnSync } from "node:child_process";

export function git(args, { inherit = false } = {}) {
  const result = spawnSync("git", args, { encoding: "utf8", stdio: inherit ? "inherit" : "pipe" });
  return { status: result.status ?? 1, stdout: (result.stdout ?? "").trim(), stderr: (result.stderr ?? "").trim() };
}

export function gitOrFail(args) {
  const result = git(args);
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} falhou: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

/** owner/repo parsed from the origin remote (https or ssh form). */
export function repoSlug() {
  const url = gitOrFail(["remote", "get-url", "origin"]);
  const match = url.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
  if (!match) throw new Error(`origin nao aponta para o GitHub: ${url}`);
  return `${match[1]}/${match[2]}`;
}

export class MissingCredentialError extends Error {}

let cachedToken;
function resolveToken() {
  if (cachedToken) return cachedToken;
  if (process.env.GITHUB_TOKEN) return (cachedToken = process.env.GITHUB_TOKEN);

  try {
    const output = execFileSync("git", ["credential", "fill"], {
      input: "protocol=https\nhost=github.com\n\n",
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });
    const password = output.split("\n").find((line) => line.startsWith("password="));
    if (password) return (cachedToken = password.slice("password=".length).trim());
  } catch {
    // Falls through to the explicit error below
  }

  throw new MissingCredentialError(
    "Sem credencial do GitHub. Faca um git push por HTTPS uma vez (o Git Credential Manager guarda o login) ou defina GITHUB_TOKEN.",
  );
}

async function request(method, path, body) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${resolveToken()}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "internship-tracker-scripts",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  return { response, data: text ? JSON.parse(text) : null };
}

export async function api(method, path, body) {
  const { response, data } = await request(method, path, body);
  if (!response.ok) {
    const detail = data?.errors ? ` ${JSON.stringify(data.errors)}` : "";
    throw new Error(`GitHub ${method} ${path}: ${response.status} ${data?.message ?? ""}${detail}`);
  }
  return data;
}

/** Some operations (enabling auto-merge on a pull request) only exist in the GraphQL API. */
export async function graphql(query, variables) {
  const { response, data } = await request("POST", "/graphql", { query, variables });
  if (!response.ok || data?.errors?.length) {
    const message = data?.errors?.map((error) => error.message).join("; ") ?? data?.message ?? response.status;
    throw new Error(`GitHub GraphQL: ${message}`);
  }
  return data.data;
}
