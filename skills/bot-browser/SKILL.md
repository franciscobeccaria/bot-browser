---
name: bot-browser
description: Use the bot's own real Chrome — a dedicated, permanent profile where Francisco already logged in by hand to Google/Gmail, ChatGPT, X and others — to read or operate websites with his sessions, via agent-browser (CDP) and agent-desktop (macOS accessibility) on the same window. Fire when a task needs a logged-in site ("mirá mi Gmail", "abrí ChatGPT", "entrá a X", "usá el navegador del bot", "bot browser"), when an API isn't available and a real session is, or when a page blocks automation and needs a real browser. Not for Francisco's personal Chrome profile, and never for typing or reading credentials.
metadata:
  author: francisco
  version: "0.1.0"
---

# bot-browser — the agent's own Chrome

A real Google Chrome (not Chromium for Testing, no `--enable-automation`,
`navigator.webdriver` is false) running with its own permanent profile at
`~/.bot-browser/profile`. Sessions live in that profile and survive restarts.
CDP listens on `127.0.0.1:9333`.

## Start / check

```bash
bot-browser status            # corriendo? pestañas abiertas
bot-browser start [urls...]   # arranca si no está (idempotente)
bot-browser login [urls...]   # abre las páginas de login para que Francisco entre a mano
bot-browser stop | restart
```

## Read and act on the web: agent-browser over CDP

```bash
agent-browser --session bot connect 9333
agent-browser --session bot open https://mail.google.com
agent-browser --session bot snapshot -i
agent-browser --session bot get title
agent-browser --session bot close     # suelta la conexión; el Chrome del bot sigue vivo
```

Always `--session bot`. Never launch agent-browser without `connect` (it would
open its own throwaway browser without the sessions).

## Operate the window like a person: agent-desktop

For Chrome UI, native dialogs, permission prompts, file pickers, or sites that
misbehave under CDP. Francisco's personal Chrome is the same app name, so
**always target the bot's window by pid**:

```bash
P=$(bot-browser pid)
agent-desktop list-windows --app "Google Chrome"     # elegí el id con "pid": $P
agent-desktop snapshot --app "Google Chrome" --window-id w-XXXX -i --compact
agent-desktop click @<snapshot>:eN                   # después, verificar con otro snapshot o con agent-browser
```

Run `agent-desktop skills get desktop` once per session for the loop and retry
rules. Headless by default; use `--headed` only if Francisco allows physical
input.

## Downloads

- To a chosen folder: `agent-browser --session bot download <sel|@ref> <path>`.
  Works for ChatGPT images (open the image viewer, then its "Download" button).
- Gotcha: after one `download`, **every** download in that CDP session goes to
  that folder with a GUID name, even plain clicks. `agent-browser --session bot
  close` resets it, and downloads go back to `~/Downloads`.
- A human-style click with agent-desktop (after `close`) lands in `~/Downloads`.

## Gotchas

- `eval` runs in the page's global scope: wrap in `(()=>{ ... })()` or a second
  run fails with "Identifier already declared".
- agent-desktop on huge pages fails with "RefMap exceeds 1MB": use
  `--skeleton`, `--max-depth` or `--root @ref`.
- `agent-desktop screenshot --app "Google Chrome"` is ambiguous (personal
  Chrome too): pass `--window-id`.
- ChatGPT: composer is the textbox "Ask ChatGPT"; `fill` then `press Enter`.
  Image is done when `[data-testid=stop-button]` is gone and an
  `img[alt^="Generated image"]` exists (~1–2 min).

## Rules

- **Read by default.** Sending, posting, buying, deleting, or changing account
  data needs Francisco's explicit OK for that action.
- **Credentials are typed by Francisco in the window.** If a page asks for a
  password, 2FA code or captcha: stop, tell him which tab, and wait. Never ask
  for the password in chat, never type it, never screenshot the login form.
- **Never read, print, copy or export cookies, tokens or `Login Data`**, and
  never copy the profile. No `state save`, no cookie export.
- Never touch the personal Chrome window (other pid).
- Snapshots and screenshots can contain private mail/chats: don't paste them
  into commits, PRs or public places.
