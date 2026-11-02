# Roadmap

v0.1 solves the core pain for one machine: a browser that keeps your logins,
shared by every agent you run. What's missing to replace a hosted agent's
"own computer" entirely:

## v0.2 — Reach it when you're away from the machine

- **Remote MCP.** `bot-browser mcp --http` behind a tunnel (Cloudflare Tunnel /
  Tailscale) with OAuth, so claude.ai or ChatGPT on the web and phone can use
  the same browser and sessions.
- **Watch it work.** A live view of the bot's window from the phone (screencast
  over the same tunnel) to approve steps and to sign in when a session expires.

## v0.3 — Smoother credentials

- **Secure login card.** When a page needs a password or 2FA, a local form
  (outside the chat) types it straight into the page. The model never gets the
  value, not even as a tool argument.
- **Password manager handoff.** Fill from 1Password / Bitwarden / the macOS
  keychain on the user's confirmation, instead of typing by hand.
- **Session health.** `bot-browser doctor` checks each saved site is still
  signed in (without opening feeds) and tells you which one needs you.

## v0.4 — Always on, without your laptop

- **Cloud runner.** The same profile on a small always-on machine (a home mini
  PC or a VPS) with the login done through the live view. Weigh first against
  hosted browsers that already offer persistent profiles.

## Later

- Proactive routines (schedules that run an agent with the browser and send you
  the result), then bots. Out of scope until the browser part is solid.
