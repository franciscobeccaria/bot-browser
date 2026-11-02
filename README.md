# bot-browser

Un Chrome real con un perfil propio y permanente para tu agente, como el
navegador de GrokBot: iniciás sesión a mano una vez (Google, Gmail, ChatGPT,
X…) y el agente lo usa con esas sesiones, todas las veces que quiera, aunque
reinicies Chrome o la Mac.

- **agent-browser** lo maneja por CDP (`127.0.0.1:9333`): leer, navegar, clickear.
- **agent-desktop** maneja la misma ventana por accesibilidad de macOS: menús de
  Chrome, diálogos nativos, permisos, sitios que no se llevan con CDP.

Es Chrome de verdad, lanzado sin flags de automatización (`navigator.webdriver`
es `false`), con un `--user-data-dir` propio. Chrome no abre el puerto de debug
sobre tu perfil personal, y está bien: el bot tiene el suyo.

## Instalar

```bash
npm i -g agent-browser agent-desktop
agent-desktop permissions --guide          # Accesibilidad (y Screen Recording)
ln -s "$PWD/bin/bot-browser" ~/.local/bin/bot-browser
ln -s "$PWD/skills/bot-browser" ~/.claude/skills/bot-browser
```

## Usar

```bash
bot-browser login        # abre Google, Gmail, ChatGPT y X: iniciá sesión vos
bot-browser status
agent-browser --session bot connect 9333 && agent-browser --session bot get title
```

Después, al agente: "mirá mi Gmail con el navegador del bot".

## Cuidado

El perfil (`~/.bot-browser/profile`, 0700) tiene sesiones reales. Cualquier
proceso local puede usar el puerto 9333 mientras está abierto. Nunca está en
este repo; no lo copies ni lo subas.

## Próximos pasos (ideas)

- **Producto local**: `npx bot-browser setup` que instala dependencias, crea el
  perfil, guía permisos e instala la skill para Claude Code y Codex. Landing con
  link de descarga. Opcional: `bot-browser mcp`, un servidor MCP local para
  cualquier agente.
- **Cloud**: VM con Chrome real y noVNC para hacer el login a mano, perfil en
  disco persistente, y un MCP remoto (HTTP + OAuth) que se agrega como conector
  en claude.ai o ChatGPT.
- **Credenciales seguras**: una tarjeta que tipea la contraseña directo en el
  sitio sin que pase por el modelo (como el login seguro de OpenBot).
