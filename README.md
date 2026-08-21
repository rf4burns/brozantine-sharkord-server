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

This Brozantine fork keeps that core and adds the client, server, and permission work below on top of upstream Sharkord `0.0.23`.

## Changes in this fork

Everything here is new versus [Sharkord/sharkord](https://github.com/Sharkord/sharkord) `development`. Ported from the Brozantine native/web Flutter clients unless noted.

### Chat and compose

- **KLIPY GIF picker** in the composer: search, trending, Favourites tab, user-settings key, SPA scrape fallback, and a baked-in key on `sharkord.brozantine.com` / `*.brozantine.com`
- **GIF URL embeds** in the text renderer (`media.klipy.com` and similar) so GIF messages are not a raw link
- **Discord-category emoji picker** with Twemoji glyphs, custom-emoji tab, search, and a frequently-used rail (replaces the GitHub/`@tiptap` catalog)
- **Copy image pixels** from chat and the lightbox (`ClipboardItem` PNG), with URL copy as fallback
- **In-app YouTube**: rate-limited `others.resolveYoutube` via `youtubei.js`; HTML5 `<video>` of the extracted file URL (no iframe)
- **Optimistic paste-send**: image paste uploads immediately with a temp message id and local blob preview, then swaps to the server row
- **Virtuoso-virtualized chat**: windowed DOM, start on the latest message, prepend older history without jump, idle-prune inactive channel maps
- **Jump to bottom** FAB with a new-message count while scrolled up
- **Unread text channels** use white/primary names until opened; mention badges stay red
- **5-minute message grouping**, mention highlight, and overlay-style compose/chat header (topic/status in the header)

### Voice and video

- **Always-on mute/deafen** on the account bar (works outside a channel; local until connected)
- **Mic and speaker device popovers** (input/output + input volume) that apply immediately if already in voice
- **Voice device check** dialog before join (mic, camera, output, gate, test)
- **Push-to-talk** with a capturable keybind (default `` ` ``)
- **In-call mic monitor** (Discord-style: starting monitor force-deafens; undeafen or leave stops it)
- **Change screen-share source** mid-share (`replaceTrack`) plus system/tab audio capture options
- **Music bot panel** when the `music-bot` plugin is installed: play, queue, skip, stop, volume via `plugins.executeAction`; speaking ring on the external audio stream
- **Voice channel status** (reuses `channels.topic`) with `SET_VOICE_CHANNEL_STATUS` (or `MANAGE_CHANNELS`); subtitle under voice names and a context-menu Set status
- **Occupancy and per-member timers** on every voice channel (`occupiedSince` / `joinedAt`, ticking `m:ss` / `h:mm:ss`)
- **Server mute and deafen** (`users.mute` / `users.deafen`), enforced on join/produce/updateState, with distinct icons and member moderation menus
- **ICE restart** (`voice.restartIce`) for send/recv transports
- **Voice connection quality** from RTT and packet loss (excellent / fair / poor)

### Shell, hosts, and appearance

- **Saved-host server rail**: add / switch / remove Sharkord hosts, JWT per host, reconnect on switch
- **Discord-style desktop shell**: 72px rail, no global top bar, channel header, user/voice panels
- **Sharkord mark** branding (favicon, rail, login) instead of Discord Clyde
- **12 appearance presets** (Dark, Midnight, Slate, Charcoal, Ocean, Forest, Dusk, Crimson, Light, Sand, Paper, Arctic) plus accent swatches; default Dark + blurple
- **Sounds settings** tab (opens the sounds dialog)
- **Red mention pills** on channels, DMs, categories, and the server rail (`mentionUnreadByChannel`, `@here` respects online)
- **Mention notification sound** and browser notification click-to-channel
- **Open a DM on a shared saved host** matched by identity
- **User profile extras**: nickname, pronouns, status message, preferences

### Roles, moderation, and audit

- **Role hierarchy**: `roles.position` and `roles.hoist`, drag-reorder (`roles.reorder`), ranking on kick/ban/delete/move/add-remove-role (Owner bypass)
- **Hoisted member-list groups** in the right sidebar
- **Split moderation perms** from `MANAGE_USERS`: `KICK_MEMBERS`, `BAN_MEMBERS`, `DELETE_USERS`, `VIEW_AUDIT_LOG`
- **New member perms**: `MUTE_MEMBERS`, `DEAFEN_MEMBERS`, `MENTION_EVERYONE`, `CHANGE_NICKNAME`, `MANAGE_NICKNAMES`, `EMBED_LINKS` (nicknames and embeds on the default role)
- **`@everyone` / `@here`** mention nodes; stripped without `MENTION_EVERYONE`
- **`EMBED_LINKS`** gates Open Graph / link metadata (DMs still embed)
- **Nickname update** gated; mods can set others via `users.updateNickname`
- **User tombstone delete**: `users.deleted` / `deleted_at`; messages keep the same user id and name; no UI restore
- **Server Audit Log** UI on `activityLog.get` (`VIEW_AUDIT_LOG`), with extra log types for mute, deafen, and nickname

### Server and schema

New tRPC routes: `activityLog.get`, `channels.updateVoiceStatus`, `others.resolveYoutube`, `roles.reorder`, `users.mute`, `users.deafen`, `users.updateNickname`, `voice.restartIce`.

Migrations `0018`–`0020`:

- Users: `nickname`, `pronouns`, `status_message`, `preferences`, `server_muted`, `server_deafened`, `deleted`, `deleted_at`
- Roles: `position`, `hoist`
- Activity log: nullable `user_id` (`ON DELETE SET NULL`) plus type/created indexes
- Permission backfills for Owner and the default role

`youtubei.js` is a server dependency for YouTube extract. Voice timestamps stay in memory (no extra tables).

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
