// Thin wrappers over agent-browser (CDP) and agent-desktop (OS accessibility),
// both pointed at the bot's own Chrome.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PORT, SESSION } from "./config.js";
import { start, pid } from "./chrome.js";

const run = promisify(execFile);

export async function ab(args, { timeout = 60000 } = {}) {
  await ensureConnected();
  const { stdout } = await run("agent-browser", ["--session", SESSION, ...args], { timeout, maxBuffer: 32 << 20 });
  return stdout.trim();
}

let connected = false;
export async function ensureConnected() {
  if (connected) return;
  await start();
  await run("agent-browser", ["--session", SESSION, "connect", String(PORT)], { timeout: 30000 });
  connected = true;
}

// After `download <sel> <path>`, agent-browser keeps redirecting every
// download of the session to that folder with GUID names. Dropping the
// connection resets Chrome to its normal Downloads folder.
export async function release() {
  if (!connected) return;
  try { await run("agent-browser", ["--session", SESSION, "close"], { timeout: 15000 }); } catch {}
  connected = false;
}

export async function ad(args, { timeout = 60000 } = {}) {
  const { stdout } = await run("agent-desktop", args, { timeout, maxBuffer: 32 << 20 });
  return JSON.parse(stdout);
}

// The user's personal Chrome has the same app name, so always target the bot's
// windows by process id.
export async function botWindows() {
  const p = pid();
  const res = await ad(["list-windows", "--app", "Google Chrome"]);
  if (!res.ok) throw new Error(res.error?.message || "agent-desktop list-windows failed");
  return res.data.filter((w) => w.pid === p);
}

export async function has(bin) {
  try { await run(bin, bin === "agent-desktop" ? ["version"] : ["--version"], { timeout: 15000 }); return true; }
  catch { return false; }
}
