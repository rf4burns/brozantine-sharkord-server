# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/).

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
