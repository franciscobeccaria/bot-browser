import { createInterface } from "node:readline/promises";
import { execFileSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, lstatSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { HOME, PROFILE, CONFIG_FILE, chromePath } from "./config.js";
import { has } from "./tools.js";

const SKILL_SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "skills", "bot-browser");
const ok = (m) => console.log(`  ✓ ${m}`);
const no = (m) => console.log(`  ✗ ${m}`);

export async function setup({ yes = false } = {}) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (q) => yes || /^(y|s|)$/i.test((await rl.question(`  ${q} [Y/n] `)).trim());
  console.log("bot-browser setup\n");

  const chrome = chromePath();
  chrome ? ok(`Google Chrome: ${chrome}`) : no("Google Chrome not found (install it, or set BOT_BROWSER_CHROME)");

  for (const bin of ["agent-browser", "agent-desktop"]) {
    if (await has(bin)) { ok(`${bin} installed`); continue; }
    if (await ask(`${bin} is missing. Install it with npm -g?`)) {
      execFileSync("npm", ["install", "-g", bin], { stdio: "inherit" });
      ok(`${bin} installed`);
    } else no(`${bin} skipped`);
  }

  if (platform() === "darwin" && (await has("agent-desktop"))) {
    const p = JSON.parse(execFileSync("agent-desktop", ["permissions"], { encoding: "utf8" })).data;
    if (p.accessibility.state === "granted") ok("macOS Accessibility permission");
    else if (await ask("agent-desktop needs Accessibility permission. Open the guide?"))
      execFileSync("agent-desktop", ["permissions", "--guide"], { stdio: "inherit" });
  }

  mkdirSync(PROFILE, { recursive: true });
  chmodSync(HOME, 0o700); chmodSync(PROFILE, 0o700);
  ok(`profile: ${PROFILE} (only your user can read it)`);
  if (!existsSync(CONFIG_FILE)) writeFileSync(CONFIG_FILE, JSON.stringify({ blockedUrls: [] }, null, 2) + "\n");
  ok(`config: ${CONFIG_FILE}`);

  for (const dir of [join(homedir(), ".claude", "skills"), join(homedir(), ".agents", "skills")]) {
    const dest = join(dir, "bot-browser");
    if (existsSync(dest) && lstatSync(dest).isSymbolicLink()) { ok(`skill already linked at ${dest}`); continue; }
    if (!existsSync(dirname(dir)) ) continue;
    mkdirSync(dir, { recursive: true });
    cpSync(SKILL_SRC, dest, { recursive: true });
    ok(`skill installed at ${dest}`);
  }
  rl.close();

  console.log(`
Next:
  1. bot-browser login           sign in by hand (Google, ChatGPT, X...). Sessions stay in the profile.
  2. Connect it to your agent as an MCP server:
       claude mcp add bot-browser -- npx -y bot-browser mcp
       codex mcp add bot-browser -- npx -y bot-browser mcp
     Or just ask Claude Code / Codex to "use the bot browser" (the skill uses the CLI).
`);
}
