# tastytrade-ts-sdk

TypeScript port of [`tastyware/tastytrade`](https://github.com/tastyware/tastytrade).

Behavioral source of truth is tastyware. The official `@tastytrade/api` SDK can be
used internally only where tests prove the behavior matches tastyware.

Current implemented slice:

- tastyware-compatible response/error helpers
- dash-case API alias serialization
- exact decimal string handling and price-effect sign helpers
- async `Session` with OAuth refresh, request helpers, and pagination
- core order models and request serialization
- dxFeed compact event mapping
- market-calendar expiration helpers used by tastyware

Run:

```sh
npm install
npm test
npm run test:e2e
```

## Local Credentials

Copy `.env.example` to `.env` and fill in your OAuth client secret and refresh
token:

```sh
TT_API_CLIENT_SECRET=your-oauth-client-secret
TT_REFRESH_TOKEN=your-refresh-token
# TT_SECRET / TT_CLIENT_SECRET and TT_REFRESH are also accepted aliases.
TT_CLIENT_ID=your-oauth-client-id
TT_ACCOUNT_ID=your-account-number
TT_IS_TEST=false
```

`.env` and `.env.local` are ignored by git. The repo npm config automatically
loads those files for Node processes started through `npm run`, so `new
Session()` can read `TT_API_CLIENT_SECRET`, `TT_CLIENT_SECRET`, or
`TT_SECRET`, plus `TT_REFRESH_TOKEN` or `TT_REFRESH`, without shell exports.
The Python-style names are preferred when both naming styles are present.

`TT_CLIENT_ID` and `TT_ACCOUNT_ID` are loaded too, but they are for your app
code. The SDK refresh flow follows tastyware and only needs the OAuth client
secret and refresh token. Account methods still require you to pass an account
number when you want one specific account.

Set `TT_IS_TEST=true` when the OAuth app, refresh token, and account are from
the tastytrade sandbox/cert environment. Production credentials should leave it
unset or `false`.

## E2E Tests

Live E2E tests are separate from the unit suite:

```sh
npm run test:e2e
```

The first E2E test authenticates, loads `TT_ACCOUNT_ID`, and fetches that
account's current USD balance. It skips automatically unless these values are
available in `.env`, `.env.local`, or the shell:

```sh
TT_ACCOUNT_ID=...
TT_API_CLIENT_SECRET=...
TT_REFRESH_TOKEN=...
# TT_IS_TEST=true for sandbox/cert credentials
```
