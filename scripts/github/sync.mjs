/**
 * Makes the GitHub repository match the configuration versioned in .github:
 *   .github/repository.json   repository settings (auto-merge, branch deletion, merge methods)
 *   .github/rulesets/*.json    branch protection
 *
 *   npm run github:sync              # applies both (repository admin only)
 *   npm run github:sync -- --check   # only reports differences, exits 1 on drift (any collaborator)
 *
 * The files are the source of truth, like drizzle/sql for the database: a setting changed on
 * the GitHub screen is reported as drift and overwritten on the next apply. Rulesets that
 * exist on GitHub but not here are reported, never deleted.
 *
 * Required status checks carry integration_id 15368 (GitHub Actions), so only the CI
 * workflow can satisfy them, not a commit status posted by hand.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { api, repoSlug } from "./github.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const check = process.argv.includes("--check");
const slug = repoSlug();

/** True when every field in `desired` has the same value in `live` (GitHub adds defaults). */
function contains(live, desired) {
  if (Array.isArray(desired)) {
    return Array.isArray(live) && live.length === desired.length && desired.every((item, i) => contains(live[i], item));
  }
  if (desired && typeof desired === "object") {
    return live && typeof live === "object" && Object.entries(desired).every(([key, value]) => contains(live[key], value));
  }
  return live === desired;
}

function rulesetDifferences(live, desired) {
  const found = [];
  for (const field of ["enforcement", "target", "conditions", "bypass_actors"]) {
    if (!contains(live[field], desired[field])) found.push(field);
  }
  const liveRules = new Map((live.rules ?? []).map((rule) => [rule.type, rule]));
  for (const rule of desired.rules) {
    if (!liveRules.has(rule.type)) found.push(`regra ${rule.type} ausente`);
    else if (!contains(liveRules.get(rule.type), rule)) found.push(`regra ${rule.type} diferente`);
  }
  const desiredTypes = new Set(desired.rules.map((rule) => rule.type));
  for (const type of liveRules.keys()) {
    if (!desiredTypes.has(type)) found.push(`regra ${type} a mais no GitHub`);
  }
  return found;
}

async function syncRepositorySettings() {
  const desired = JSON.parse(readFileSync(path.join(ROOT, ".github/repository.json"), "utf8"));
  const live = await api("GET", `/repos/${slug}`);
  const changed = Object.keys(desired).filter((key) => live[key] !== desired[key]);

  if (changed.length === 0) {
    console.log("  ok      configuracoes do repositorio");
    return false;
  }
  const detail = changed.map((key) => `${key}: ${live[key]} -> ${desired[key]}`).join("; ");
  if (check) {
    console.log(`  difere  configuracoes do repositorio: ${detail}`);
  } else {
    await api("PATCH", `/repos/${slug}`, desired);
    console.log(`  atualizado configuracoes do repositorio: ${detail}`);
  }
  return true;
}

async function syncRulesets() {
  const dir = path.join(ROOT, ".github/rulesets");
  const desiredRulesets = readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => JSON.parse(readFileSync(path.join(dir, file), "utf8")));

  const existing = await api("GET", `/repos/${slug}/rulesets?includes_parents=false`);
  const byName = new Map(existing.map((ruleset) => [ruleset.name, ruleset]));
  let drift = false;

  for (const desired of desiredRulesets) {
    const summary = byName.get(desired.name);
    if (!summary) {
      drift = true;
      if (check) {
        console.log(`  falta   ruleset ${desired.name}`);
      } else {
        const created = await api("POST", `/repos/${slug}/rulesets`, desired);
        console.log(`  criado  ruleset ${desired.name} (id ${created.id})`);
      }
      continue;
    }

    const live = await api("GET", `/repos/${slug}/rulesets/${summary.id}`);
    const found = rulesetDifferences(live, desired);
    if (found.length === 0) {
      console.log(`  ok      ruleset ${desired.name}`);
      continue;
    }

    drift = true;
    if (check) {
      console.log(`  difere  ruleset ${desired.name}: ${found.join("; ")}`);
    } else {
      await api("PUT", `/repos/${slug}/rulesets/${summary.id}`, desired);
      console.log(`  atualizado ruleset ${desired.name}: ${found.join("; ")}`);
    }
  }

  const versioned = new Set(desiredRulesets.map((ruleset) => ruleset.name));
  for (const ruleset of existing) {
    if (!versioned.has(ruleset.name)) console.log(`  aviso   ruleset ${ruleset.name} existe no GitHub e nao esta em .github/rulesets`);
  }
  return drift;
}

console.log(`\nGitHub de ${slug}${check ? " (--check: sem gravar)" : ""}\n`);
const settingsDrift = await syncRepositorySettings();
const rulesetsDrift = await syncRulesets();

if (check && (settingsDrift || rulesetsDrift)) {
  console.log("\nO GitHub nao esta igual aos arquivos. Rode `npm run github:sync` para aplicar.\n");
  // exitCode instead of process.exit: exiting while fetch sockets close crashes Node on Windows
  process.exitCode = 1;
} else {
  console.log("");
}
