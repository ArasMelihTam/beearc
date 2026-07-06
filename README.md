# 🐝 Beearc

A 100% free, open-source, **offline-first** beekeeping management app.

Built for hobby and sideline beekeepers (1–100 hives) standing in a field with no signal, wearing sticky gloves, in direct sunlight.

- No ads, no tracking, no analytics, no login required for core use. Ever.
- All data lives on your device (SQLite). The network is an optional extra, never a requirement.
- Bilingual: Türkçe & English.
- Funded by voluntary donations only.

## Status

🚧 In early development. Not yet released. See [docs/STATE.md](docs/STATE.md) for current progress.

## Tech

Expo (React Native) + TypeScript · expo-router · expo-sqlite + Drizzle ORM · Zustand · i18n (TR/EN)

## Design Language

- Primary: #D29D30 (Honey Gold)
- Background: #F8F7DE (Parchment White) / #121212 (Dark)
- Text: #3A200C (Dark Umber)
- Status: Sage #7A9E7E / Terracotta #C06E52 / Slate #2C3E50
- Accessibility: WCAG AA contrast, 56dp primary tap targets, outdoor-readable

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone.

## License

[GPL-3.0](LICENSE) — free forever, and forks must stay free too.
