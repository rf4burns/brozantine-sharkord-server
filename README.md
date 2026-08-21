<div align="center">
  <img src="apps/client/public/kurier-mark.svg" alt="Kurier" width="96" height="96">
  <h1>Kurier</h1>
  <p><strong>Self-hosted messenger for small groups: text, voice, video, and screen share on your own box.</strong></p>

  <p>
    <a href="https://github.com/rf4burns/brozantine-sharkord-server/releases"><img src="https://img.shields.io/github/v/release/rf4burns/brozantine-sharkord-server" alt="Latest release"></a>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/rf4burns/brozantine-sharkord-server" alt="MIT License"></a>
    <a href="https://github.com/rf4burns/brozantine-sharkord-server/commits"><img src="https://img.shields.io/github/last-commit/rf4burns/brozantine-sharkord-server" alt="Last commit"></a>
    <a href="https://bun.sh"><img src="https://img.shields.io/badge/Bun-v1.3.14-black" alt="Bun 1.3.14"></a>
    <a href="https://mediasoup.org"><img src="https://img.shields.io/badge/Mediasoup-v3.19.19-green" alt="Mediasoup 3.19.19"></a>
  </p>

  <p>
    <a href="https://sharkord.brozantine.com">Live</a> ·
    <a href="https://github.com/rf4burns/brozantine-sharkord-server/releases">Releases</a> ·
    <a href="CHANGELOG.md">Changelog</a> ·
    <a href="CONTRIBUTING.md">Contributing</a>
  </p>
</div>

This repo is the Brozantine fork of [Sharkord](https://github.com/Sharkord/sharkord): a Bun monorepo with the server (tRPC, SQLite, mediasoup) and the React web client, rebranded and extended as Kurier.

> [!NOTE]
> Kurier is still in alpha. Bugs, incomplete features, and breaking changes are expected. The React web client works in mobile browsers but is **not optimized for phones or tablets** yet (desktop-first layout with a rough responsive overlay).

## What it is

Kurier is a self-hosted communication platform for families, friends, and small teams. Think TeamSpeak: focused, lightweight, easy to run, no paywalls. It is not a Discord clone and is not aimed at huge communities.

All data stays on your machine. Voice, video, and screen share run through mediasoup on your host. Persistent state lives in SQLite.

## Features

### Chat

- Text channels, DMs, replies, reactions, pins, and file uploads
- Virtualized message list with jump-to-bottom and unread / mention badges
- Message search with operators (`from:`, `mentions:`, `in:`, `has:`, `before:`, `after:`, `during:`, `pinned:`)
- Discord-style emoji picker (Twemoji + custom emoji) and a KLIPY GIF picker
- In-app YouTube playback (extracted file URL, no iframe)
- Per-channel notification overrides, `@everyone` / `@here`, and mention sounds
- Optimistic image paste-send with a local preview until the server row lands

### Voice and video

- Voice channels with video and screen share (change source mid-share)
- Push-to-talk, device picker, input volume, and a pre-join device check
- Always-on mute / deafen on the account bar, plus server mute and deafen
- Occupancy timers, voice channel status, connection quality, and ICE restart
- Drag members between voice channels (Move Members)
- Music bot panel when the `music-bot` plugin is installed

### Roles, members, and moderation

- Role hierarchy, hoist, and drag-reorder
- Split moderation permissions (kick, ban, mute, deafen, nicknames, audit log)
- Hoisted member-list groups, nicknames, pronouns, and status messages
- Server audit log and privileged backup export
- User tombstone delete (messages keep the same user id and name)

### Client and ops

- Saved-host server rail (add / switch / remove Kurier hosts, JWT per host)
- 12 appearance presets plus accent swatches
- In-app updater (binary installs, including systemd `Restart=always`)
- Plugin SDK and marketplace-style plugin management
- UI in English, Čeština, Español, Français, Italiano, Русский, and 中文

## Getting started

Kurier ships as a standalone binary that bundles the server and the React client. Grab the latest build for your platform from [Releases](https://github.com/rf4burns/brozantine-sharkord-server/releases).

### Linux x64

```bash
curl -L https://github.com/rf4burns/brozantine-sharkord-server/releases/latest/download/kurier-linux-x64 -o kurier
chmod +x kurier
./kurier
```

Also published: `kurier-linux-arm64`, `kurier-windows-x64.exe`, and `kurier-macos-arm64`.

### Docker

```bash
docker run \
  -p 4991:4991/tcp \
  -p 40000:40000/tcp \
  -p 40000:40000/udp \
  -v ./data:/home/bun/.config/kurier \
  -e KURIER_WEBRTC_ANNOUNCED_ADDRESS=your.public.hostname \
  --name kurier \
  rf4burns/kurier:latest
```

Images are tagged `latest`, `v0.0.x`, and `dev` (manual development builds). Optional `PUID` / `PGID` remap the container user for bind-mounted volumes.

Then open [http://localhost:4991](http://localhost:4991). Put HTTPS in front of it in production (Caddy or nginx). Browsers block mic and camera on plain HTTP except localhost.

> [!IMPORTANT]
> On first launch the server prints an owner bootstrap token. Anyone with that token can take owner. Store it; do not share it.
>
> Remote voice needs `[webRtc] announcedAddress` in `config.ini` (or `KURIER_WEBRTC_ANNOUNCED_ADDRESS`) set to this host's public IP or hostname. If it is empty, clients may connect but hear nothing.

### From source

1. Install [Bun](https://bun.sh/) (this repo pins `1.3.14`).
2. Clone this repository and run `bun install` at the repo root.
3. Start both apps:
   - With [tmux](https://github.com/tmux/tmux): `./start.sh`
   - Without tmux: `bun dev` in `apps/client` and in `apps/server`

The React client is proxied against the server on **port 4991**. Voice / WebRTC uses **port 40000** (TCP and UDP).

Dev data (database and uploads) lives in `apps/server/data`. Delete that folder for a clean reset.

## Configuration

On first run Kurier writes `config.ini` next to its data directory:

| Platform | Data directory |
| --- | --- |
| Linux | `~/.config/kurier` |
| macOS | `~/Library/Application Support/kurier` |
| Windows | `%APPDATA%\kurier` |
| Docker | `/home/bun/.config/kurier` (bind-mount this) |
| Development | `apps/server/data` |

Useful keys and matching env overrides:

| `config.ini` | Env | Default |
| --- | --- | --- |
| `server.port` | `KURIER_PORT` | `4991` |
| `server.debug` | `KURIER_DEBUG` | `false` (on in development) |
| `server.autoupdate` | `KURIER_AUTOUPDATE` | `false` |
| `webRtc.port` | `KURIER_WEBRTC_PORT` | `40000` |
| `webRtc.announcedAddress` | `KURIER_WEBRTC_ANNOUNCED_ADDRESS` | empty |
| `webRtc.maxBitrate` | `KURIER_WEBRTC_MAX_BITRATE` | `30000000` |

Autoupdate applies to binary installs, not Docker.

## Architecture

Bun workspaces. `bun install` at the root, then `./start.sh` or `bun dev` in each app.

| Workspace | Role |
| --- | --- |
| `apps/server` | Bun + tRPC + Drizzle (SQLite) + mediasoup (voice SFU) |
| `apps/client` | React + Vite + Redux Toolkit + Tailwind |
| `packages/shared` | Types, enums, and helpers used by both sides |
| `packages/ui` | Presentational components only |
| `packages/plugin-sdk` | Public API for plugins |
| `packages/e2e` | Playwright tests |

Client and server talk over **tRPC** (queries, mutations, WebSocket subscriptions). Login, uploads, static files, health, backup export, and plugin bundles live under `apps/server/src/http`.

Runtime state (voice rooms, mediasoup transports) stays in memory. Anything persistent goes through SQLite.

Brozantine production is [sharkord.brozantine.com](https://sharkord.brozantine.com). The Kurier React UI in this repo is the in-tree web client.

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

## Contributing

Contribution rules are in [CONTRIBUTING.md](CONTRIBUTING.md): open an issue first, target `development`, keep CI green. See [AGENTS.md](AGENTS.md) for how the code is organized and [ROADMAP.md](ROADMAP.md) before proposing features.

## License

MIT. See [LICENSE](LICENSE).

## Acknowledgments

Kurier is a Brozantine fork of [Sharkord](https://github.com/Sharkord/sharkord) by the Sharkord team.

Built with [Bun](https://bun.sh), [tRPC](https://trpc.io), [Mediasoup](https://mediasoup.org), [Drizzle ORM](https://orm.drizzle.team), [React](https://react.dev), and [Tailwind CSS](https://tailwindcss.com).
