/**
 * Automates the batch flow (AGENTS.md, Branches e commits).
 *
 *   npm run batch:integrate -- feature/<RF-curto> [--batch integration/<lote>]
 *     Merges the feature into the batch and pushes the batch. No CI here: the batch is
 *     still under review and test, and integration/* has no remote CI.
 *
 *   npm run batch:pr [-- --batch integration/<lote>]
 *     Exhausts the batch tests first (full local CI, Docker required, on the exact commit
 *     already pushed), then opens the pull request batch -> develop, where the remote CI
 *     runs. Prints the pull request already open instead of opening another.
 *
 * Without --batch, the batch is the current branch when it is integration/*, or the only
 * local integration/* branch.
 */

import { spawnSync } from "node:child_process";
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

  console.log(`[batch] enviando ${batch}\n`);
  const push = git(["push", "-u", "origin", batch], { inherit: true });
  if (push.status !== 0) fail(`Push recusado. O merge ficou no lote local (${batch}); rode git push daqui depois de resolver.`);

  console.log(`\n[batch] ${feature} integrada em ${batch} e enviada.`);
  console.log("[batch] Quando o lote estiver completo e revisado: npm run batch:pr (roda a CI local antes do PR)\n");
}

function runLocalCi() {
  // npm is a .cmd on Windows and needs a shell; the command line has no user input
  const result = spawnSync(
    process.platform === "win32" ? "npm run ci -- --require-docker" : "npm",
    process.platform === "win32" ? [] : ["run", "ci", "--", "--require-docker"],
    { stdio: "inherit", shell: process.platform === "win32" },
  );
  return result.status ?? 1;
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
  if (!branchExists(batch) || gitOrFail(["rev-parse", batch]) !== gitOrFail(["rev-parse", `origin/${batch}`])) {
    fail(`${batch} local e origin/${batch} estao diferentes. Envie ou atualize o lote antes de abrir o PR.`);
  }

  const commits = gitOrFail(["log", "--reverse", "--format=%s", `origin/develop..origin/${batch}`])
    .split("\n")
    .filter(Boolean)
    .map((subject) => `- ${summaryOf(subject)}`);
  if (commits.length === 0) fail(`${batch} nao tem commits alem da develop.`);

  // Exhaust the batch tests on the exact commit the pull request will carry
  requireCleanTree();
  if (gitOrFail(["branch", "--show-current"]) !== batch) gitOrFail(["switch", batch]);
  console.log(`\n[batch] esgotando os testes do lote ${batch} antes do PR (npm run ci, Docker obrigatorio)\n`);
  if (runLocalCi() !== 0) fail("A CI local do lote falhou. O PR nao foi aberto: corrija numa feature e integre de novo.");

  let open;
  try {
    open = await api("GET", `/repos/${slug}/pulls?state=open&base=develop&head=${owner}:${encodeURIComponent(batch)}`);
  } catch (error) {
    if (!(error instanceof MissingCredentialError)) throw error;
    // Without a token (SSH clone, for example) the browser opens the same pull request
    console.log(`\n[batch] Testes do lote verdes. Sem credencial para a API; abra o PR no navegador:`);
    console.log(`        https://github.com/${slug}/compare/develop...${batch}?expand=1\n`);
    return;
  }
  if (open.length > 0) {
    console.log(`\n[batch] Testes do lote verdes. PR ja aberto: ${open[0].html_url}\n`);
    return;
  }

  const body = [
    `Lote \`${batch}\` pronto para a \`develop\`.`,
    "",
    "## Commits",
    ...commits,
    "",
    "## Antes do merge",
    "- [x] Testes do lote esgotados: `npm run ci` completo verde (rodado por `npm run batch:pr`)",
    "- [ ] Revisao do lote",
    "- [ ] Checks do GitHub verdes: Source branch, Lint/types/unit/build, Migrations/RLS/audit, End-to-end",
  ].join("\n");

  const created = await api("POST", `/repos/${slug}/pulls`, {
    title: `${batch} -> develop`,
    head: batch,
    base: "develop",
    body,
  });
  console.log(`\n[batch] Testes do lote verdes. PR aberto: ${created.html_url}\n`);
}

try {
  if (command === "integrate") await integrate();
  else if (command === "pr") await openPullRequest();
  else fail("Comando desconhecido. Use: integrate feature/<RF-curto> | pr");
} catch (error) {
  console.error(`\n[batch] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
