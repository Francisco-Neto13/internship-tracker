/**
 * Automates the batch flow (AGENTS.md, Branches e commits).
 *
 *   npm run batch:integrate -- feature/<RF-curto> [--batch integration/<lote>]
 *     Merges the feature into the batch and pushes the batch. The pre-push hook runs the
 *     full local CI on the way, so a batch that would break CI never reaches GitHub.
 *
 *   npm run batch:pr [-- --batch integration/<lote>]
 *     Opens the pull request batch -> develop (or prints the one already open).
 *
 * Without --batch, the batch is the current branch when it is integration/*, or the only
 * local integration/* branch.
 */

import { api, git, gitOrFail, MissingCredentialError, repoSlug } from "./github.mjs";

const [command, ...rest] = process.argv.slice(2);

function option(name) {
  const index = rest.indexOf(name);
  return index >= 0 ? rest[index + 1] : undefined;
}

class BatchError extends Error {}

// Throws instead of process.exit: exiting while fetch sockets close crashes Node on Windows
function fail(message) {
  throw new BatchError(message);
}

function branchExists(ref) {
  return git(["rev-parse", "--verify", "--quiet", ref]).status === 0;
}

function resolveBatch() {
  const explicit = option("--batch");
  if (explicit) {
    if (!explicit.startsWith("integration/")) fail(`--batch precisa ser integration/*, recebido "${explicit}".`);
    return explicit;
  }

  const current = gitOrFail(["branch", "--show-current"]);
  if (current.startsWith("integration/")) return current;

  const batches = gitOrFail(["branch", "--list", "integration/*", "--format=%(refname:short)"])
    .split("\n")
    .filter(Boolean);
  if (batches.length === 1) return batches[0];
  if (batches.length === 0) fail("Nenhum lote local. Crie com: git switch -c integration/<lote> origin/develop");
  fail(`Mais de um lote local (${batches.join(", ")}). Informe --batch integration/<lote>.`);
}

function requireCleanTree() {
  const status = gitOrFail(["status", "--porcelain"]);
  if (status) fail(`Ha alteracoes nao commitadas. Commite ou guarde antes:\n${status}`);
}

async function integrate() {
  const feature = rest.find((arg) => !arg.startsWith("--") && arg !== option("--batch"));
  if (!feature?.startsWith("feature/")) fail("Informe a feature: npm run batch:integrate -- feature/<RF-curto>");
  if (!branchExists(feature)) fail(`A branch ${feature} nao existe localmente.`);

  const batch = resolveBatch();
  requireCleanTree();

  console.log(`\n[batch] integrando ${feature} em ${batch}`);
  gitOrFail(["fetch", "origin"]);
  if (!branchExists(batch)) {
    fail(`O lote ${batch} nao existe localmente. Crie com: git switch -c ${batch} origin/develop`);
  }

  gitOrFail(["switch", batch]);

  // Someone else may have integrated features into the batch meanwhile
  if (branchExists(`origin/${batch}`)) {
    const synced = git(["merge", "--ff-only", `origin/${batch}`]);
    if (synced.status !== 0) fail(`O lote local divergiu de origin/${batch}. Resolva antes: ${synced.stderr}`);
  }

  const fastForward = git(["merge", "--ff-only", feature]);
  if (fastForward.status !== 0) {
    const merged = git(["merge", "--no-ff", feature, "-m", `chore(repo): integrate ${feature} into ${batch}`]);
    if (merged.status !== 0) {
      git(["merge", "--abort"]);
      gitOrFail(["switch", feature]);
      fail(
        `Conflito ao integrar ${feature}. Nada foi alterado no lote. Traga o lote para a feature e resolva la:\n` +
          `  git merge ${batch}`,
      );
    }
  }

  console.log(`[batch] enviando ${batch}; o hook pre-push roda a CI local completa\n`);
  const push = git(["push", "-u", "origin", batch], { inherit: true });
  if (push.status !== 0) {
    fail(
      `Push recusado. O merge ficou no lote local (${batch}). Corrija na feature, rode este comando de novo ` +
        "ou, se o problema era so ambiente (Docker, porta 3000), rode git push daqui.",
    );
  }

  console.log(`\n[batch] ${feature} integrada em ${batch} e enviada.`);
  console.log("[batch] Quando o lote estiver completo e revisado: npm run batch:pr\n");
}

function summaryOf(subject) {
  // Commit bodies follow the summary on the next line, so %s joins them: keep the summary
  return subject.split(" - ")[0];
}

async function openPullRequest() {
  const batch = resolveBatch();
  const slug = repoSlug();
  const [owner] = slug.split("/");

  gitOrFail(["fetch", "origin"]);
  if (!branchExists(`origin/${batch}`)) fail(`${batch} ainda nao foi enviado. Rode npm run batch:integrate primeiro.`);
  if (branchExists(batch) && gitOrFail(["rev-parse", batch]) !== gitOrFail(["rev-parse", `origin/${batch}`])) {
    fail(`${batch} local e origin/${batch} estao diferentes. Envie o lote (git push) antes de abrir o PR.`);
  }

  let open;
  try {
    open = await api("GET", `/repos/${slug}/pulls?state=open&base=develop&head=${owner}:${encodeURIComponent(batch)}`);
  } catch (error) {
    if (!(error instanceof MissingCredentialError)) throw error;
    // Without a token (SSH clone, for example) the browser opens the same pull request
    console.log(`\n[batch] Sem credencial para a API. Abra o PR no navegador:`);
    console.log(`        https://github.com/${slug}/compare/develop...${batch}?expand=1\n`);
    return;
  }
  if (open.length > 0) {
    console.log(`\n[batch] PR ja aberto: ${open[0].html_url}\n`);
    return;
  }

  const commits = gitOrFail(["log", "--reverse", "--format=%s", `origin/develop..origin/${batch}`])
    .split("\n")
    .filter(Boolean)
    .map((subject) => `- ${summaryOf(subject)}`);
  if (commits.length === 0) fail(`${batch} nao tem commits alem da develop.`);

  const body = [
    `Lote \`${batch}\` pronto para a \`develop\`.`,
    "",
    "## Commits",
    ...commits,
    "",
    "## Antes do merge",
    "- [ ] Revisao do lote",
    "- [ ] `npm run ci` completo verde (o hook pre-push rodou no envio do lote)",
    "- [ ] Checks do GitHub verdes: Source branch, Lint/types/unit/build, Migrations/RLS/audit, End-to-end",
  ].join("\n");

  const created = await api("POST", `/repos/${slug}/pulls`, {
    title: `${batch} -> develop`,
    head: batch,
    base: "develop",
    body,
  });
  console.log(`\n[batch] PR aberto: ${created.html_url}\n`);
}

try {
  if (command === "integrate") await integrate();
  else if (command === "pr") await openPullRequest();
  else fail("Comando desconhecido. Use: integrate feature/<RF-curto> | pr");
} catch (error) {
  console.error(`\n[batch] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
