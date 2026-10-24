import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const path = "src/components/chat/ChatInbox.tsx";
const repoPath = "painel/" + path;
const baseline = execFileSync("git", ["show", "FETCH_HEAD:" + repoPath], { encoding: "utf8" });
const current = readFileSync(path, "utf8");
function findings(source) {
  const result = spawnSync("npx", ["eslint", "--stdin", "--stdin-filename", path, "--format", "json"], {
    input: source, encoding: "utf8", shell: process.platform === "win32",
  });
  if (result.error || (result.status !== 0 && result.status !== 1)) {
    throw new Error("ESLint unavailable: " + (result.error?.message || result.stderr));
  }
  const output = JSON.parse(result.stdout);
  const counts = new Map();
  for (const message of output.flatMap((item) => item.messages || [])) {
    const key = JSON.stringify([message.ruleId, message.message, message.severity]);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return { counts, errors: output.reduce((n, x) => n + x.errorCount, 0), warnings: output.reduce((n, x) => n + x.warningCount, 0) };
}
const base = findings(baseline);
const head = findings(current);
const introduced = [];
for (const [key, count] of head.counts) {
  const delta = count - (base.counts.get(key) || 0);
  if (delta > 0) introduced.push({ finding: JSON.parse(key), count: delta });
}
console.log("TF3-A ESLint baseline main:", base.errors, "errors,", base.warnings, "warnings");
console.log("TF3-A ESLint branch:", head.errors, "errors,", head.warnings, "warnings");
if (introduced.length) {
  console.error("New ESLint findings:", JSON.stringify(introduced, null, 2));
  process.exitCode = 1;
} else {
  console.log("TF3-A ESLint delta OK: no new findings.");
}
