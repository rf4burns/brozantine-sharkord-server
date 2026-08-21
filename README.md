# Brozantine Sharkord Server

Private [Sharkord](https://github.com/Sharkord/sharkord) fork that runs Brozantine's self-hosted chat: text, voice, video, and screen share on your own box.

**Live:** [https://sharkord.brozantine.com](https://sharkord.brozantine.com)

This repo is the Bun monorepo: server (tRPC, SQLite, mediasoup) plus the React web client. It is not the Flutter apps.

| Client | Repo |
| --- | --- |
| Flutter web SPA | [rf4burns/brozantine-sharkord-frontend](https://github.com/rf4burns/brozantine-sharkord-frontend) |
| Native Windows desktop | [KillerAuzzie/Sharkord-native-source](https://github.com/KillerAuzzie/Sharkord-native-source) |

> [!NOTE]
> Sharkord is still in alpha. Bugs, incomplete features, and breaking changes are expected.

## What it is

Sharkord is a self-hosted communication platform for small groups. Think TeamSpeak: focused, lightweight, easy to run, no paywalls. It is not a Discord clone and is not aimed at huge communities.

Upstream docs: [sharkord.com/docs](https://sharkord.com/docs).

This Brozantine fork keeps that core and adds host-specific client work used on `sharkord.brozantine.com` (saved-host rail, KLIPY GIFs on Brozantine hosts, music-bot controls, YouTube resolve, and other native-parity UI).

## Architecture

Bun workspaces. `bun install` at the root, then `./start.sh` (tmux) or `bun dev` in each app.

| Workspace | Role |
| --- | --- |
| `apps/server` | Bun + tRPC + Drizzle (SQLite) + mediasoup (voice SFU) |
| `apps/client` | React + Vite + Redux Toolkit + Tailwind |
| `packages/shared` | Types, enums, and helpers used by both sides |
| `packages/ui` | Presentational components only |
| `packages/plugin-sdk` | Public API for plugins |
| `packages/e2e` | Playwright tests |

Client and server talk over **tRPC** (queries, mutations, WebSocket subscriptions). Login, uploads, static files, health, and plugin bundles live under `apps/server/src/http`.

Runtime state (voice rooms, mediasoup transports) stays in memory. Anything persistent goes through SQLite.

## Requirements

- [Bun](https://bun.sh/) (this repo pins `1.3.14`)
- [Tmux](https://github.com/tmux/tmux) (optional, for `./start.sh`)

## Development

1. Clone this repository.
2. Run `bun install` at the repo root.
3. Start the app:
   - With tmux: `./start.sh`
   - Without tmux: `bun dev` in `apps/client` and in `apps/server`

The React client is proxied against the server on **port 4991**. Voice/WebRTC uses **port 40000** (TCP and UDP).

Dev data (database and uploads) lives in `apps/server/data`. Delete that folder for a clean reset.

On first launch the server prints an owner bootstrap token. Anyone with that token can take owner. Store it; do not share it.

## Tests

```bash
bun run test
```

Use `bun run test`, not bare `bun test` at the root.

Before finishing a change:

```bash
bun run magic
```

That runs format, typecheck, and lint.

## Production

Stock Sharkord also ships a standalone binary and Docker image. For a vanilla binary, see [upstream releases](https://github.com/Sharkord/sharkord/releases).

Docker (upstream image):

```bash
docker run \
  -p 4991:4991/tcp \
  -p 40000:40000/tcp \
  -p 40000:40000/udp \
  -v ./data:/home/bun/.config/sharkord \
  --name sharkord \
  sharkord/sharkord:latest
```

Then open [http://localhost:4991](http://localhost:4991). Put HTTPS in front of it in production (Caddy/nginx). Browsers block mic/camera on plain HTTP except localhost.

Brozantine production is `sharkord.brozantine.com`. The Flutter web client is served in front of this process; stock Sharkord UI can still sit at `/vanilla/` on the same host.

## Contributing

This GitHub repo is Brozantine's private fork. Upstream Sharkord contribution rules are in [CONTRIBUTING.md](CONTRIBUTING.md) (issue first, PRs to `development`, CI must pass).

## License

MIT. See [LICENSE](LICENSE). Copyright remains with the Sharkord team for upstream code.
