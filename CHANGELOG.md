# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/).

## [0.0.33] - 2026-08-22

### Fixed

- Dragging a voice member onto another channel works for people in your current channel as well, including members with only the default role.
- GitHub releases use the matching CHANGELOG section as the release body.

## [0.0.32] - 2026-08-22

### Fixed

- Music bot no longer joins a voice channel and instantly leaves without playing; plugin RTP now targets loopback instead of an invalid bind-all address.
- Moving a member into a channel you can view (but not join) works again from the sidebar.

## [0.0.31] - 2026-08-21

### Fixed

- Server no longer crash-loops on startup when user id 1 is missing; `SERVER_STARTED` is logged without a user, and activity-log write failures no longer take down the process.
- In-app updates under systemd replace the binary in place and exit cleanly so Restart=always brings up the new version instead of racing the old one.
- The Updates UI awaits the update request and shows an error toast if it fails.

## [0.0.30] - 2026-08-21

### Added

- Audit log entries name the target member for kicks, bans, mutes, deafens, role changes, nickname updates, and voice moves.
- Role-colored, clickable usernames in more places (search results, audit-related views, and related UI).

### Changed

- Anyone with Move Members can move any voice member (no longer limited by role rank).
- Unicode emoji in the picker, compose box, messages, and reactions consistently use Twemoji images.

### Fixed

- After joining or being moved into a voice channel, other participants' audio connects more reliably.
- Being moved into a voice channel shows an error toast when the client cannot follow the move.
- GIF embeds no longer also show a duplicate link preview card.
- Dragging a voice member still works when the name has a profile popover.

## [0.0.29] - 2026-08-21

### Changed

- Member list groups online members under hoisted roles; everyone else is under Online or Offline. Owner and default roles are not used as section headers.
- Chat spacing around message groups, reply previews, the compose box, and the bottom of the message list.

### Fixed

- The owner role now includes Move Members, so dragging people between voice channels works for the server owner.
- Member list order uses nicknames, not only account usernames.
- The member list overflow count matches how many people are actually shown.

## [0.0.28] - 2026-08-21

### Fixed

- Dragging a voice member onto another channel works again, including drops on the member list (not only the channel header).
- Owner accounts cannot be deleted from server settings or the delete-user API.

## [0.0.27] - 2026-08-21

### Fixed

- After server unmute or undeafen, the target can speak again once they unmute their mic (no leave/rejoin required).
- After an in-app server update, the updater relaunches the server process so the service comes back up.

## [0.0.26] - 2026-08-21

### Added

- Message search operators and a filters dropdown (`from:`, `mentions:`, `in:`, `has:`, `before:`, `after:`, `during:`, `pinned:`).
- Emoji picker image preloading when the picker opens and when switching categories.

### Changed

- Member list groups by highest display role (not only hoisted roles); the lowest-ranked role stays visible when offline.
- Offline members keep their role name color in the member list.
- Chat layout spacing around messages, replies, and the compose box.
- In-app updater starts automatically when updates are available.

### Fixed

- Emoji picker Twemoji URLs for gendered and other ZWJ sequences (broken image icons).
- Emoji assets now use Twemoji 15.1.0, with Apple/native fallbacks when an asset is missing.
- Recent emoji entries refresh their image URLs so stale CDN paths are not kept in local storage.

## [0.0.25] - 2026-08-21

### Fixed

- Release workflow now pushes version-bump commits to the branch that triggered Manual Release (not only the git tag).
