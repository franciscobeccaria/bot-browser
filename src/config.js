import { homedir, platform } from "node:os";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

export const HOME = process.env.BOT_BROWSER_HOME || join(homedir(), ".bot-browser");
export const PROFILE = join(HOME, "profile");
export const PORT = Number(process.env.BOT_BROWSER_PORT || 9333);
export const SESSION = process.env.BOT_BROWSER_SESSION || "bot";
export const LOG = join(HOME, "chrome.log");
export const CONFIG_FILE = join(HOME, "config.json");

const CHROME_CANDIDATES = {
  darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
  linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/opt/google/chrome/chrome"],
};

export function chromePath() {
  if (process.env.BOT_BROWSER_CHROME) return process.env.BOT_BROWSER_CHROME;
  return (CHROME_CANDIDATES[platform()] || []).find(existsSync) || null;
}

// ~/.bot-browser/config.json  { "blockedUrls": ["^https://x\\.com/(home)?$"] }
export function userConfig() {
  try { return JSON.parse(readFileSync(CONFIG_FILE, "utf8")); } catch { return {}; }
}

export function blockedReason(url) {
  for (const pat of userConfig().blockedUrls || []) {
    try { if (new RegExp(pat).test(url)) return pat; } catch {}
  }
  return null;
}
