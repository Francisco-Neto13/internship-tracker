// Points git at the versioned hooks in .githooks. Runs from `npm install` (prepare),
// so every clone gets the pre-push check without anyone remembering `npm run hooks`.
// Does nothing in CI, in deploy builds or anywhere outside a git work tree.

import { spawnSync } from "node:child_process";

if (process.env.CI) process.exit(0);

const insideRepo = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { encoding: "utf8" });
if (insideRepo.status !== 0 || insideRepo.stdout.trim() !== "true") process.exit(0);

spawnSync("git", ["config", "core.hooksPath", ".githooks"], { stdio: "ignore" });
