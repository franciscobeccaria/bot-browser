import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, chmodSync, openSync } from "node:fs";
import { platform } from "node:os";
import { HOME, PROFILE, PORT, LOG, VISIBLE, chromePath } from "./config.js";

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

// Keep pages "visible" (timers, rendering, visibilityState) while the window
// is hidden. They are not automation flags: navigator.webdriver stays false.
const BACKGROUND_FLAGS = [
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
  "--disable-background-timer-throttling",
];

const mac = platform() === "darwin";
const osa = (...lines) => execFileSync("osascript", lines.flatMap((l) => ["-e", l]), { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
export const frontPid = () => { try { return Number(osa('tell application "System Events" to get unix id of first process whose frontmost is true')); } catch { return null; } };
const proc = (p) => `(first process whose unix id is ${p})`;

// Hide the bot's Chrome (like Cmd+H) and give focus back to whatever app the
// user was in. It keeps working: navigation, clicks, screenshots.
export function hide(restoreTo) {
  const p = pid();
  if (!mac || !p) return false;
  const lines = [`tell application "System Events" to set visible of ${proc(p)} to false`];
  if (restoreTo && restoreTo !== p) lines.push(`tell application "System Events" to set frontmost of ${proc(restoreTo)} to true`);
  try { osa(...lines); return true; } catch { return false; }
}

// Bring it to the front: for logins, or when the user wants to look.
export function show() {
  const p = pid();
  if (!mac || !p) return false;
  try { osa(`tell application "System Events" to set visible of ${proc(p)} to true`, `tell application "System Events" to set frontmost of ${proc(p)} to true`); return true; } catch { return false; }
}

export async function start(urls = [], { visible = VISIBLE } = {}) {
  if (await alive()) return { started: false, port: PORT, pid: pid() };
  const chrome = chromePath();
  if (!chrome) throw new Error("Google Chrome not found. Install it or set BOT_BROWSER_CHROME.");
  mkdirSync(PROFILE, { recursive: true });
  chmodSync(HOME, 0o700); chmodSync(PROFILE, 0o700);
  // Launch the real binary, with no automation flags: no
  // --enable-automation, so navigator.webdriver stays false and Google lets
  // you sign in by hand. Chrome only refuses the debug port on the *default*
  // profile; with its own --user-data-dir it opens it fine.
  const args = [
    `--user-data-dir=${PROFILE}`,
    `--remote-debugging-port=${PORT}`,
    "--remote-debugging-address=127.0.0.1",
    "--no-first-run", "--no-default-browser-check",
    ...BACKGROUND_FLAGS,
    ...urls,
  ];
  const app = chrome.match(/^(.*?\.app)\/Contents\/MacOS\//)?.[1];
  const before = mac ? frontPid() : null;
  if (mac && app) {
    // `open -g -n` starts a separate instance without activating it.
    execFileSync("open", ["-g", "-n", "-a", app, "--stdout", LOG, "--stderr", LOG, "--args", ...args]);
  } else {
    const log = openSync(LOG, "a");
    spawn(chrome, args, { detached: true, stdio: ["ignore", log, log] }).unref();
  }
  for (let i = 0; i < 40; i++) { if (await alive()) break; await sleep(500); }
  if (!(await alive())) throw new Error(`Chrome started but port ${PORT} is not answering. See ${LOG}`);
  // Chrome activates itself on launch anyway, so hide it right away.
  if (!visible) hide(before);
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
