// MCP server (stdio): exposes the bot's own Chrome to any MCP client
// (Claude Code, Codex, Claude Desktop, Cursor...).
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PORT, PROFILE, blockedReason } from "./config.js";
import { alive, pid, start, tabs, newTab, version } from "./chrome.js";
import { ab, ad, release, botWindows } from "./tools.js";

const text = (t) => ({ content: [{ type: "text", text: typeof t === "string" ? t : JSON.stringify(t, null, 2) }] });
const fail = (t) => ({ isError: true, content: [{ type: "text", text: t }] });

const RULES = `This is the user's own browser, logged in to their real accounts.
Read by default. Sending, posting, buying, deleting or changing account data
needs the user's explicit OK for that specific action. Never type, ask for or
read passwords, 2FA codes, cookies or tokens: when a page needs a login, call
request_login and wait for the user.`;

export async function serve() {
  const server = new McpServer({ name: "bot-browser", version: "0.1.0" }, { instructions: RULES });

  const tool = (name, description, shape, fn) =>
    server.registerTool(name, { description, inputSchema: shape }, async (args) => {
      try { return await fn(args); } catch (e) { return fail(String(e.stderr || e.message || e)); }
    });

  tool("status", "Is the bot's Chrome running? Lists its open tabs.", {}, async () => {
    if (!(await alive())) return text({ running: false, profile: PROFILE });
    return text({ running: true, port: PORT, pid: pid(), browser: (await version()).Browser, tabs: await tabs() });
  });

  tool("open", "Open a URL in the bot's Chrome (current tab) and return its title.",
    { url: z.string().url() }, async ({ url }) => {
      const b = blockedReason(url);
      if (b) return fail(`Blocked by the user's config (${b}). Open a more specific URL instead.`);
      await ab(["open", url]);
      return text(`${await ab(["get", "title"])}\n${await ab(["get", "url"])}`);
    });

  tool("snapshot", "Accessibility snapshot of the current page, with @refs to act on.",
    { interactive_only: z.boolean().default(true) }, async ({ interactive_only }) =>
      text(await ab(interactive_only ? ["snapshot", "-i"] : ["snapshot"])));

  tool("read", "Read the page: its title, URL, or the text of a CSS selector.",
    { what: z.enum(["title", "url", "text"]), selector: z.string().optional() },
    async ({ what, selector }) => text(await ab(what === "text" ? ["get", "text", selector || "body"] : ["get", what])));

  tool("click", "Click an element by @ref (from snapshot) or CSS selector.",
    { target: z.string() }, async ({ target }) => text(await ab(["click", target])));

  tool("fill", "Fill a text field by @ref or selector. Never use it for passwords or codes.",
    { target: z.string(), value: z.string() }, async ({ target, value }) => text(await ab(["fill", target, value])));

  tool("press", "Press a key in the page (Enter, Escape, Tab, ArrowDown...).",
    { key: z.string() }, async ({ key }) => text(await ab(["press", key])));

  tool("screenshot", "Screenshot of the current page.", {}, async () => {
    const file = join(mkdtempSync(join(tmpdir(), "bot-browser-")), "shot.png");
    await ab(["screenshot", file]);
    return { content: [{ type: "image", mimeType: "image/png", data: readFileSync(file).toString("base64") }] };
  });

  tool("download", "Click a download link/button and save the file to an absolute path.",
    { target: z.string(), path: z.string() }, async ({ target, path }) => {
      const out = await ab(["download", target, path], { timeout: 300000 });
      await release();
      return text(out);
    });

  tool("tabs", "List the bot's open tabs.", {}, async () => text(await tabs()));

  tool("request_login",
    "Open a login page for the USER to sign in by hand. The user types the credentials in the bot's window; you never see them. Then wait for the user to say they are done.",
    { url: z.string().url(), reason: z.string() }, async ({ url, reason }) => {
      await start();
      await newTab(url);
      try { const [w] = await botWindows(); if (w) await ad(["focus-window", "--window-id", w.id]); } catch {}
      return text(`Opened ${url} in the bot's Chrome. Tell the user: "${reason}. Please sign in in the bot's Chrome window and tell me when you're done." Do not continue until they confirm.`);
    });

  tool("desktop_snapshot",
    "Snapshot the bot's Chrome window through OS accessibility (agent-desktop): Chrome menus, native dialogs, permission prompts, file pickers.",
    { window_id: z.string().optional() }, async ({ window_id }) => {
      const wins = await botWindows();
      const id = window_id || wins.find((w) => w.is_focused)?.id || wins[0]?.id;
      if (!id) return fail("The bot's Chrome has no accessible window.");
      const res = await ad(["snapshot", "--app", "Google Chrome", "--window-id", id, "-i", "--compact"]);
      return res.ok ? text({ windows: wins.map(({ id, title }) => ({ id, title })), snapshot: res.data }) : fail(JSON.stringify(res.error));
    });

  tool("desktop_click", "Click a ref from desktop_snapshot (headless, through accessibility).",
    { ref: z.string() }, async ({ ref }) => {
      const res = await ad(["click", ref]);
      return res.ok ? text(res.data) : fail(JSON.stringify(res.error));
    });

  await server.connect(new StdioServerTransport());
}
