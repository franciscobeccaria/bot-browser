# bot-browser

A real Chrome with its own permanent profile for your coding agents.

You sign in by hand once — Google, Gmail, ChatGPT, X, whatever — and Claude
Code, Codex or any MCP client can use those sessions from then on, across
Chrome and computer restarts. It's the "the bot has its own browser with my
logins" part of hosted agents like Grok Bot, running on your own machine with
the subscriptions you already pay for.

- **Real Chrome, no automation flags.** Not Chromium for Testing, no
  `--enable-automation`; `navigator.webdriver` is `false`. Google lets you sign
  in normally.
- **Its own profile.** `~/.bot-browser/profile`, readable only by your user.
  Your personal Chrome stays untouched.
- **Two ways to drive the same window.** [agent-browser](https://github.com/vercel-labs/agent-browser)
  over CDP (read, navigate, click, download) and
  [agent-desktop](https://github.com/vercel-labs/agent-desktop) over OS
  accessibility (Chrome menus, native dialogs, file pickers).
- **You type the credentials.** The agent opens the login page and waits; it
  never sees, stores or exports passwords or cookies.
- **Works with any agent.** An MCP server for clients that speak MCP, and a
  skill + CLI for agents that run shell commands.

## Install

Requires macOS (Linux: CDP works, agent-desktop is untested), Google Chrome and
Node 20+.

```bash
npx bot-browser setup      # installs agent-browser + agent-desktop, creates the profile,
                           # guides the macOS Accessibility permission, installs the skill
npx bot-browser login      # opens Google, ChatGPT and X: sign in by hand
```

Connect it to your agent:

```bash
claude mcp add bot-browser -- npx -y bot-browser mcp
codex mcp add bot-browser -- npx -y bot-browser mcp
```

Then ask: *"check my unread Gmail with the bot browser"*, *"generate an image
in ChatGPT and download it"*, *"read my X bookmarks"*.

## MCP tools

| Tool | What it does |
| --- | --- |
| `status`, `tabs` | Is it running, what's open |
| `open`, `read`, `snapshot`, `screenshot` | Navigate and read pages |
| `click`, `fill`, `press` | Act on the page |
| `download` | Save a file to a path |
| `request_login` | Open a login page for **you** to sign in; the agent waits |
| `desktop_snapshot`, `desktop_click` | Operate the window through accessibility |

The server tells the model the rules: read by default, ask before sending or
changing anything, never handle credentials.

## CLI

```text
bot-browser setup | login [urls] | start [urls] | stop | restart | status | mcp | port | pid
```

Env: `BOT_BROWSER_HOME` (`~/.bot-browser`), `BOT_BROWSER_PORT` (`9333`),
`BOT_BROWSER_CHROME`.

`~/.bot-browser/config.json` can block URLs the agent must never open, e.g.
your X home timeline (opening it marks posts as seen):

```json
{ "blockedUrls": ["^https?://(www\\.)?x\\.com/?(home)?(\\?.*)?$"] }
```

## Security

The profile holds real, logged-in sessions (cookies encrypted by Chrome with a
key in your OS keychain). While the bot's Chrome is open, any local process can
drive it through `127.0.0.1:9333`, exactly like any Chrome with remote
debugging. Stop it with `bot-browser stop` when you don't need it. Never copy
or sync the profile.

## Why not…

- **Claude in Chrome / the ChatGPT extension:** they drive *your* Chrome, inside
  their own app. bot-browser is a separate browser any terminal agent can share.
- **agent-browser `--profile`:** it's the engine underneath. bot-browser adds a
  real Chrome without automation flags, a fixed port several agents share,
  agent-desktop on the same window, an MCP server and the safety rules.
- **Cloud browsers (Browserbase, Kernel, Steel…):** great infra, but your
  sessions live on someone else's servers and you pay per hour.

See [ROADMAP.md](ROADMAP.md) for what's next (remote access, smoother logins).

## License

MIT
