---
name: bot-browser
description: Use the bot's own real Chrome — a dedicated, permanent profile where the user already signed in by hand (Google/Gmail, ChatGPT, X, etc.) — to read or operate websites with their sessions, via agent-browser (CDP) and agent-desktop (OS accessibility) on the same window. Fire when a task needs a logged-in site ("check my Gmail", "open ChatGPT", "read my X bookmarks", "use the bot browser"), when there's no API but there is a real session, or when a page blocks automation and needs a real browser. Not for the user's personal Chrome profile, and never for typing or reading credentials.
metadata:
  version: "0.1.0"
---

# bot-browser — the agent's own Chrome

A real Google Chrome (not Chromium for Testing, no `--enable-automation`,
`navigator.webdriver` is false) with its own permanent profile at
`~/.bot-browser/profile`. Sessions live there and survive restarts. CDP
listens on `127.0.0.1:9333`.

If the `bot-browser` MCP server is connected, prefer its tools (`open`,
`snapshot`, `read`, `click`, `fill`, `download`, `request_login`,
`desktop_snapshot`...). Otherwise use the CLI below.

## Start / check

```bash
bot-browser status            # running? open tabs
bot-browser start [urls...]   # starts if needed (idempotent)
bot-browser login [urls...]   # opens login pages for the USER to sign in by hand
bot-browser stop | restart
```

Before opening a URL, read `~/.bot-browser/config.json`: never open anything
matching `blockedUrls` (the MCP server enforces it; with the CLI it's on you).

## Web: agent-browser over CDP

```bash
agent-browser --session bot connect 9333
agent-browser --session bot open https://mail.google.com
agent-browser --session bot snapshot -i
agent-browser --session bot get title
agent-browser --session bot close     # drops the connection; the bot's Chrome keeps running
```

Always `--session bot` and `connect` first: without it agent-browser launches
its own throwaway browser with none of the sessions.

## Window: agent-desktop over accessibility

For Chrome's own UI, native dialogs, permission prompts, file pickers, or
sites that misbehave under CDP. The user's personal Chrome has the same app
name, so **always target the bot's window by pid**:

```bash
P=$(bot-browser pid)
agent-desktop list-windows --app "Google Chrome"     # pick the id whose "pid" is $P
agent-desktop snapshot --app "Google Chrome" --window-id w-XXXX -i --compact
agent-desktop click @<snapshot>:eN                   # then verify with a new snapshot
```

Run `agent-desktop skills get desktop` once per session. Headless by default;
`--headed` only if the user allows physical input.

## Downloads

- To a chosen folder: `agent-browser --session bot download <sel|@ref> <path>`.
- After one `download`, **every** download in that CDP session goes to that
  folder with a GUID name. `agent-browser --session bot close` resets it and
  downloads go back to `~/Downloads` (the MCP `download` tool does this for you).

## Gotchas

- `eval` runs in the page's global scope: wrap code in `(()=>{ ... })()` or a
  second run fails with "Identifier already declared".
- agent-desktop on huge pages fails with "RefMap exceeds 1MB": use
  `--skeleton`, `--max-depth` or `--root @ref`.
- `agent-desktop screenshot --app "Google Chrome"` is ambiguous when the user's
  Chrome is open too: pass `--window-id`.
- ChatGPT: the composer is the textbox "Ask ChatGPT"; `fill` then `press Enter`.
  An image is done when `[data-testid=stop-button]` is gone and an
  `img[alt^="Generated image"]` exists (1–2 min). Download it from the image
  viewer's "Download" button.
- X: `/i/bookmarks` redirects to `/i/history` (tabs "Guardados/Bookmarks" and
  "Likes"). Opening the home timeline marks tweets as seen for the user; go
  straight to bookmarks, profiles or status URLs.
- X videos: the player requests a public `.m3u8` from `video.twimg.com`
  (`agent-browser network requests --filter video.twimg.com`); match it to the
  main tweet by the video id in the `<video>` poster and `ffmpeg -i <m3u8> -c
  copy out.mp4`. No cookies needed.

## Rules

- **Read by default.** Sending, posting, buying, deleting, or changing account
  data needs the user's explicit OK for that action.
- **Credentials are typed by the user in the window.** If a page asks for a
  password, 2FA code or captcha: stop, open it with `bot-browser login <url>`
  (or the `request_login` tool), tell the user which tab, and wait. Never ask
  for a password in chat, never type it, never screenshot a login form.
- **Never read, print, copy or export cookies, tokens or saved passwords**, and
  never copy the profile. No `state save`, no cookie export.
- Never touch the user's personal Chrome window (other pid).
- Snapshots and screenshots can contain private mail and chats: keep them out
  of commits, PRs and public places.

## Keep this skill improving

When you hit a trap that is not written here (a redirect, a selector that
changed, a flag that behaves differently, a step that fails), fix the run and
then add one line to **Gotchas** with the symptom and the fix, and commit it in
this skill's repo with a short message. Do not rewrite sections, do not add
anything you did not verify in the run, and never write private content
(mail, chats, posts, cookies) into the skill.
