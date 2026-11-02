// Smoke test: starts the MCP server over stdio and calls each read-only tool.
// Usage: node test/smoke.mjs   (opens example.com in the bot's Chrome)
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "smoke", version: "0" });
await client.connect(new StdioClientTransport({ command: "node", args: ["bin/bot-browser.js", "mcp"] }));
const call = async (name, args = {}) => {
  const r = await client.callTool({ name, arguments: args });
  const c = r.content[0];
  console.log(`${r.isError ? "✗" : "✓"} ${name}: ${c.type === "text" ? c.text.slice(0, 160).replace(/\n/g, " ⏎ ") : `[${c.type} ${c.data.length} b64]`}`);
  return r;
};
console.log("tools:", (await client.listTools()).tools.map((t) => t.name).join(", "));
await call("status");
await call("open", { url: "https://example.com" });
await call("read", { what: "title" });
await call("snapshot");
await call("screenshot");
await call("desktop_snapshot");
await client.close();
