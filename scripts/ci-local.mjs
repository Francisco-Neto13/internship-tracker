/**
 * Runs the whole CI on this machine. It is how a batch exhausts its tests before the pull
 * request into develop: `npm run batch:pr` runs it with --require-docker first.
 *
 *   npm run ci
 *   npm run ci -- --fast             # skips every step that needs Docker
 *   npm run ci -- --require-docker   # fails instead of skipping when Docker is down (batch:pr)
 *   npm run ci -- --only "<step>"    # one step; ci.yml uses it to share logic with this file
 *
 * The value is not repeating commands, it is reproducing the CI environment: a clean
 * clone, in UTC, with the same Postgres container and roles. The first step catches
 * source that exists here but is hidden from the clone by .gitignore.
 *
 * A new step goes in TWO places: here and in .github/workflows/ci.yml. The last step
 * ("Mirror of ci.yml") fails when ci.yml has a step with no counterpart here.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const fast = args.includes("--fast");
const requireDocker = args.includes("--require-docker");
const onlyIndex = args.indexOf("--only");
const only = onlyIndex >= 0 ? args[onlyIndex + 1] : undefined;

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const GRAY = "\x1b[90m";
const RESET = "\x1b[0m";

/** Paths the build and the test suites consume. documentation/ stays local by decision. */
const CODE_PATHS = ["src", "scripts", "drizzle", "docker", "tests", "e2e", ".github", ".githooks", ".env.test"];

/**
 * Steps that only prepare the GitHub runner, or only make sense inside a pull request
 * (the source branch check), and have nothing to mirror locally.
 */
const RUNNER_ONLY_STEPS = [
  "Check source branch",
  "Checkout",
  "Setup Node",
  "Install dependencies",
  "Start database",
  "Install Playwright browser",
  "Restore Next.js build cache",
  "Upload Playwright report",
];

const ok = { status: 0, stdout: "", stderr: "" };
const fail = (message) => ({ status: 1, stdout: "", stderr: message });

function run(command, commandArgs, options = {}) {
  // npm and npx are .cmd files on Windows and need a shell. With a shell the command
  // line goes as one string (npm args here never contain spaces); passing separate
  // args together with shell triggers DEP0190 on Node 24.
  const needsShell = process.platform === "win32" && ["npm", "npx"].includes(command);
  const [cmd, argv] = needsShell ? [[command, ...commandArgs].join(" "), []] : [command, commandArgs];

  const result = spawnSync(cmd, argv, {
    cwd: ROOT,
    shell: needsShell,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    ...options,
    env: { ...process.env, ...(options.env ?? {}) },
  });

  if (result.error) return fail(String(result.error));
  return result;
}

let dockerAvailable;
function hasDocker() {
  dockerAvailable ??= !fast && run("docker", ["version", "--format", "{{.Server.Os}}"]).status === 0;
  return dockerAvailable;
}

function startDatabase() {
  return run("docker", ["compose", "up", "-d", "postgres", "--wait"]);
}

function readTestEnv() {
  return parseEnv(readFileSync(path.join(ROOT, ".env.test"), "utf8"));
}

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

const steps = [
  {
    name: "No source hidden by .gitignore",
    run: () => {
      const result = run("git", [
        "ls-files", "--others", "--ignored", "--exclude-standard", "--directory", "--", ...CODE_PATHS,
      ]);
      if (result.status !== 0) return fail(`git falhou: ${result.stderr}`);

      const hidden = result.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
      if (hidden.length === 0) return ok;

      return fail(
        [
          "Estes caminhos existem aqui e NAO existem num clone limpo:",
          ...hidden.map((entry) => `  ${entry}`),
          "",
          "Rode `git check-ignore -v <caminho>` para ver qual regra pegou.",
        ].join("\n"),
      );
    },
  },
  { name: "Lint", run: () => run("npm", ["run", "lint"]) },
  { name: "Typecheck", run: () => run("npm", ["run", "typecheck"]) },
  { name: "Unit tests", run: () => run("npx", ["vitest", "run", "--project", "unit"], { env: { TZ: "UTC" } }) },
  { name: "Build", run: () => run("npm", ["run", "build"]) },
  {
    name: "Database tests",
    docker: true,
    run: () => {
      const database = startDatabase();
      if (database.status !== 0) return database;
      return run("npm", ["run", "test:db"], { env: { TZ: "UTC" } });
    },
  },
  {
    name: "Migrations are idempotent",
    docker: true,
    // Applies the migrations twice to the test database. The second pass must neither
    // fail (drizzle/sql is re-applied every time) nor record a migration again.
    run: () => {
      const database = startDatabase();
      if (database.status !== 0) return database;

      const migrationUrl = readTestEnv().DATABASE_MIGRATION_URL;
      const databaseName = new URL(migrationUrl).pathname.slice(1);
      const journal = JSON.parse(readFileSync(path.join(ROOT, "drizzle/migrations/meta/_journal.json"), "utf8"));
      const expected = String(journal.entries.length);

      const applied = () =>
        run("docker", [
          "compose", "exec", "-T", "postgres",
          "psql", "-U", "postgres", "-d", databaseName, "-tAc", "select count(*) from drizzle.__drizzle_migrations",
        ]).stdout.trim();

      const counts = [];
      for (let pass = 0; pass < 2; pass++) {
        const migrate = run("npm", ["run", "db:migrate"], { env: { DATABASE_MIGRATION_URL: migrationUrl } });
        if (migrate.status !== 0) return migrate;
        counts.push(applied());
      }

      if (counts.some((count) => count !== expected)) {
        return fail(`journal=${expected} primeira=${counts[0]} segunda=${counts[1]}: nao bate ou a segunda passada reaplicou algo`);
      }
      return ok;
    },
  },
  {
    name: "Migrate development database",
    docker: true,
    run: () => {
      if (!process.env.CI && !existsSync(path.join(ROOT, ".env"))) {
        return fail("Sem .env: rode `cp .env.example .env` e preencha BETTER_AUTH_SECRET.");
      }
      const database = startDatabase();
      if (database.status !== 0) return database;
      return run("npm", ["run", "db:migrate"]);
    },
  },
  { name: "Seed development database", docker: true, run: () => run("npm", ["run", "db:seed"]) },
  {
    name: "End-to-end tests",
    docker: true,
    // CI=1 makes Playwright serve the production build from the Build step
    run: async () => {
      if (await portInUse(3000)) {
        return fail("A porta 3000 esta ocupada (npm run dev aberto?). Pare o servidor: o e2e sobe o build de producao.");
      }
      return run("npm", ["run", "test:e2e"], { env: { CI: "1" } });
    },
  },
  {
    name: "Mirror of ci.yml",
    // Someone adds a step to ci.yml and forgets this file: `npm run ci` starts lying
    run: () => {
      const workflow = readFileSync(path.join(ROOT, ".github/workflows/ci.yml"), "utf8");
      const inWorkflow = [...workflow.matchAll(/^\s+- name: (.+)$/gm)]
        .map((match) => match[1].trim())
        .filter((name) => !RUNNER_ONLY_STEPS.includes(name));
      const here = new Set(steps.map((step) => step.name));
      const missing = [...new Set(inWorkflow.filter((name) => !here.has(name)))];

      return missing.length === 0 ? ok : fail(`passos no ci.yml que nao existem aqui: ${missing.join(", ")}`);
    },
  },
];

const selected = only ? steps.filter((step) => step.name === only) : steps;
if (only && selected.length === 0) {
  console.error(`Passo desconhecido: "${only}". Passos: ${steps.map((step) => step.name).join(", ")}`);
  process.exit(1);
}

console.log(`\nRodando a CI local${fast ? " (--fast: sem Docker)" : ""}\n`);

let failed = false;
for (const step of selected) {
  if (step.docker && !hasDocker()) {
    // A green run that silently skipped the database and e2e would let untested RLS through
    if (requireDocker) {
      failed = true;
      console.log(`  ${RED}XX${RESET}  ${step.name}`);
      console.log("      Docker indisponivel: abra o Docker Desktop e rode de novo. Este passo nao pode ser pulado aqui.");
      break;
    }
    console.log(`${GRAY}  --  ${step.name} (${fast ? "pulado: --fast" : "Docker indisponivel"})${RESET}`);
    continue;
  }

  const startedAt = Date.now();
  const result = await step.run();
  const seconds = `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;

  if (result.status === 0) {
    console.log(`  ${GREEN}ok${RESET}  ${step.name} ${GRAY}${seconds}${RESET}`);
    continue;
  }

  failed = true;
  console.log(`  ${RED}XX${RESET}  ${step.name} ${GRAY}${seconds}${RESET}`);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  console.log(output.split("\n").slice(-25).map((line) => `      ${line}`).join("\n"));
  // Fail fast: running the rest after a broken lint only burns time
  break;
}

if (failed) {
  console.log(`\n${RED}A CI falharia.${RESET} Corrija antes de enviar.\n`);
  process.exit(1);
}

console.log(`\n${GREEN}Tudo verde.${RESET} A CI deve passar.\n`);
