# Changelog

## 0.1.0

Initial pre-1.0 package baseline.

- Install: npm registry installs are the intended production path only after a published release is smoke-tested; GitHub installs should be pinned to a commit or tag and are supported by the `prepare` lifecycle build; local tarballs are intended for package testing.
- Release gates: CI and `prepublishOnly` include lint, formatting, tests, package smoke tests, dry-run package contents, consumer type tests, and production dependency audit.
- Runtime: requires Node.js 20 or newer.
- Compatibility goal: preserve tastyware-compatible contracts where implemented and covered by tests.
- Entrypoints: root exports broad SDK capabilities; `tastytrade-ts-sdk/read-only` is the recommended surface for scanner and market-data applications.
- Credentials: `Session()` reads `TT_API_CLIENT_SECRET` with accepted aliases `TT_SECRET` and `TT_CLIENT_SECRET`, plus `TT_REFRESH_TOKEN` with accepted alias `TT_REFRESH`; secrets are not committed and should be loaded from environment or ignored `.env` files.
- Live-order safety: the documented live E2E suite is read-only; any future mutation E2E suite must require `TT_ENABLE_MUTATION_E2E=I_UNDERSTAND_THIS_CAN_AFFECT_A_REAL_ACCOUNT`.
- Known limitations: pre-1.0 API surface may change, only the implemented tastyware-compatible slice is covered, and release builds are not production-ready until CI, package smoke tests, dry-run package contents, audit, and release gates pass.
