#!/usr/bin/env node
import { PORT, PROFILE, HOME } from "../src/config.js";
import { alive, pid, start, stop, tabs, version } from "../src/chrome.js";

const DEFAULT_LOGINS = ["https://accounts.google.com", "https://chatgpt.com", "https://x.com/login"];
const [cmd, ...rest] = process.argv.slice(2);

const usage = `bot-browser — a real Chrome with its own permanent profile for your agents

  setup [--yes]        install dependencies, create the profile, install the skill
  login [urls...]      open login pages so you sign in by hand
  start [urls...]      start the bot's Chrome (no-op if running)
  stop | restart
  status               running? open tabs
  mcp                  run the MCP server (stdio)
  port | pid

  agent-browser:  agent-browser --session bot connect ${PORT}
Profile: ${PROFILE}   Env: BOT_BROWSER_HOME, BOT_BROWSER_PORT, BOT_BROWSER_CHROME`;

try {
  switch (cmd) {
    case "setup": await (await import("../src/setup.js")).setup({ yes: rest.includes("--yes") }); break;
    case "start": { const r = await start(rest); console.log(r.started ? `ready: port ${r.port}, pid ${r.pid}` : `already running (port ${r.port}, pid ${r.pid})`); break; }
    case "login": await start(rest.length ? rest : DEFAULT_LOGINS);
      console.log("Sign in by hand in the tabs that opened. Sessions are saved in the profile."); break;
    case "stop": console.log((await stop()) ? "stopped" : "not running"); break;
    case "restart": await stop(); { const r = await start(); console.log(`ready: port ${r.port}, pid ${r.pid}`); } break;
    case "status":
      if (!(await alive())) { console.log(`stopped (profile: ${PROFILE})`); break; }
      console.log(`running: port ${PORT}, pid ${pid()}\nbrowser: ${(await version()).Browser}`);
      for (const t of await tabs()) console.log(` - ${t.title.slice(0, 60)} | ${t.url.slice(0, 80)}`);
      break;
    case "mcp": await (await import("../src/mcp.js")).serve(); break;
    case "port": console.log(PORT); break;
    case "pid": { const p = pid(); if (p) console.log(p); break; }
    default: console.log(usage);
  }
} catch (e) { console.error(e.message || e); process.exit(1); }
