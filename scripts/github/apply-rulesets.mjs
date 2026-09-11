/**
 * Applies the branch protection versioned in .github/rulesets to the GitHub repository.
 *
 *   npm run github:rulesets              # creates or updates each ruleset by name
 *   npm run github:rulesets -- --check   # only reports differences, exits 1 on drift
 *
 * The files are the source of truth, like drizzle/sql for the database: a rule changed on
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
const RULESETS_DIR = path.join(ROOT, ".github/rulesets");
const check = process.argv.includes("--check");

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

function differences(live, desired) {
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

const slug = repoSlug();
const desiredRulesets = readdirSync(RULESETS_DIR)
  .filter((file) => file.endsWith(".json"))
  .sort()
  .map((file) => JSON.parse(readFileSync(path.join(RULESETS_DIR, file), "utf8")));

const existing = await api("GET", `/repos/${slug}/rulesets?includes_parents=false`);
const byName = new Map(existing.map((ruleset) => [ruleset.name, ruleset]));

console.log(`\nRulesets de ${slug}${check ? " (--check: sem gravar)" : ""}\n`);

let drift = false;
for (const desired of desiredRulesets) {
  const summary = byName.get(desired.name);

  if (!summary) {
    drift = true;
    if (check) {
      console.log(`  falta   ${desired.name}`);
    } else {
      const created = await api("POST", `/repos/${slug}/rulesets`, desired);
      console.log(`  criado  ${desired.name} (id ${created.id})`);
    }
    continue;
  }

  const live = await api("GET", `/repos/${slug}/rulesets/${summary.id}`);
  const found = differences(live, desired);
  if (found.length === 0) {
    console.log(`  ok      ${desired.name}`);
    continue;
  }

  drift = true;
  if (check) {
    console.log(`  difere  ${desired.name}: ${found.join("; ")}`);
  } else {
    await api("PUT", `/repos/${slug}/rulesets/${summary.id}`, desired);
    console.log(`  atualizado ${desired.name}: ${found.join("; ")}`);
  }
}

const versioned = new Set(desiredRulesets.map((ruleset) => ruleset.name));
for (const ruleset of existing) {
  if (!versioned.has(ruleset.name)) console.log(`  aviso   ${ruleset.name} existe no GitHub e nao esta em .github/rulesets`);
}

if (check && drift) {
  console.log("\nO GitHub nao esta igual aos arquivos. Rode `npm run github:rulesets` para aplicar.\n");
  // exitCode instead of process.exit: exiting while fetch sockets close crashes Node on Windows
  process.exitCode = 1;
} else {
  console.log("");
}
