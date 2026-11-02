import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, chmodSync, openSync } from "node:fs";
import { HOME, PROFILE, PORT, LOG, chromePath } from "./config.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const base = `http://127.0.0.1:${PORT}`;

export async function alive() {
  try { const r = await fetch(`${base}/json/version`, { signal: AbortSignal.timeout(2000) }); return r.ok; }
  catch { return false; }
}

export function pid() {
  try {
    const out = execFileSync("pgrep", ["-f", "--", `--user-data-dir=${PROFILE}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return Number(out.trim().split("\n")[0]) || null;
  } catch { return null; }
}

export async function start(urls = []) {
  if (await alive()) return { started: false, port: PORT, pid: pid() };
  const chrome = chromePath();
  if (!chrome) throw new Error("Google Chrome not found. Install it or set BOT_BROWSER_CHROME.");
  mkdirSync(PROFILE, { recursive: true });
  chmodSync(HOME, 0o700); chmodSync(PROFILE, 0o700);
  const log = openSync(LOG, "a");
  // Launch the real binary directly, with no automation flags: no
  // --enable-automation, so navigator.webdriver stays false and Google lets
  // you sign in by hand. Chrome only refuses the debug port on the *default*
  // profile; with its own --user-data-dir it opens it fine.
  const child = spawn(chrome, [
    `--user-data-dir=${PROFILE}`,
    `--remote-debugging-port=${PORT}`,
    "--remote-debugging-address=127.0.0.1",
    "--no-first-run", "--no-default-browser-check",
    ...urls,
  ], { detached: true, stdio: ["ignore", log, log] });
  child.unref();
  for (let i = 0; i < 40; i++) { if (await alive()) break; await sleep(500); }
  if (!(await alive())) throw new Error(`Chrome started but port ${PORT} is not answering. See ${LOG}`);
  return { started: true, port: PORT, pid: pid() };
}

export async function stop() {
  const p = pid();
  if (!p) return false;
  process.kill(p);
  for (let i = 0; i < 20 && pid(); i++) await sleep(500);
  return true;
}

export async function version() {
  const r = await fetch(`${base}/json/version`); return r.json();
}

export async function tabs() {
  const r = await fetch(`${base}/json/list`);
  return (await r.json()).filter((t) => t.type === "page").map((t) => ({ id: t.id, title: t.title, url: t.url }));
}

export async function newTab(url) {
  const r = await fetch(`${base}/json/new?${encodeURI(url)}`, { method: "PUT" });
  return r.json();
}
