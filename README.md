# Hijri Converter — محوّل التاريخ

Gregorian ⇄ Hijri date converter following **Shia calendar authorities**, for Android (and iOS).
English and Arabic (RTL), light and dark themes, fully offline.

- **Methods**: Iran official calendar (default — real published month starts through Shawwal 1447,
  calculated after), Sayyed Fadlallah's office (astronomical, shared-night visibility), Sayyed
  Sistani's office (naked-eye at Najaf), and Umm al-Qura for reference. ±2-day manual adjustment.
- **Home**: today in both calendars with Shia occasions and the "eve of …" hint after Maghrib, a
  two-way converter with wheel pickers, copy/share, and a days-between calculator.
- **Settings**: language, theme, calculation method, adjustment, intro replay, about.

Bare React Native CLI 0.87 + TypeScript, Yarn 1.

```bash
yarn install
yarn start        # Metro
yarn android      # or see help.md for building with Gradle directly on Windows
yarn test         # calendar engine golden tests
yarn bump patch   # version bump (package.json + Android + iOS)
```

Docs: [`CLAUDE.md`](./CLAUDE.md) (architecture and the calendar engine), [`help.md`](./help.md)
(commands), [`TODO.md`](./TODO.md) (status), [`CONTINUE_PROJECT.md`](./CONTINUE_PROJECT.md) (handoff).

Data: Iranian month starts from [qamari](https://github.com/roozbehp/qamari) (CC0). Astronomy:
[astronomy-engine](https://github.com/cosinekitty/astronomy) (MIT, build-time only).
