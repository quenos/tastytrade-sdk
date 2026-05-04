# tastytrade-ts-sdk

TypeScript port of [`tastyware/tastytrade`](https://github.com/tastyware/tastytrade).

Behavioral source of truth is tastyware. The official `@tastytrade/api` SDK can be
used internally only where tests prove the behavior matches tastyware.

## Compliance and Risk Notice

This project is unofficial and is not endorsed, supported, or maintained by
tastytrade or tastyware. It is provided for educational purposes only and does
not provide investment, financial, legal, tax, or trading advice.

Use this software at your own risk. Real trading accounts can lose money. To
the maximum extent permitted by law, the authors and contributors provide this
software without warranty and accept no liability for losses, damages, API
access issues, data issues, account activity, or other consequences from its
use.

You are responsible for complying with tastytrade API terms and any market-data
or account-data restrictions that apply to you, including not redistributing
market or account data without permission. You are also responsible for storing,
handling, and sharing credentials, refresh tokens, access tokens, account
numbers, and other sensitive data securely.

## API Stability

This package is pre-1.0. Public APIs, exported types, subpath exports, and
tastyware compatibility details can change before a stable release. The project
aims to preserve tastyware-compatible behavior for the implemented surface, but
only behavior covered by tests and release gates should be treated as supported.

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

## Quick Start

Requires Node.js 20 or newer.

Install from npm for production once a release has passed the release gates:

```sh
npm install tastytrade-ts-sdk
```

Install from a local checkout while developing this SDK:

```sh
npm install /path/to/tastytrade-ts-sdk
```

Or test the same artifact shape that npm publishing will use:

```sh
npm pack --pack-destination /tmp/tastytrade-pack
npm install /tmp/tastytrade-pack/tastytrade-ts-sdk-0.1.0.tgz
```

Install from GitHub when you need a commit directly. This is supported because
the package `prepare` lifecycle builds `dist` during dependency installation:

```sh
npm install github:Quenos/tastytrade-sdk
```

Account, balance, position, option-chain, and market-data calls use REST and do
not require WebSocket. dxLink streaming does; in Node, install a WebSocket
implementation such as `ws` and pass a factory to `DXLinkStreamer`.

Create `.env` in this repo for examples/tests, or export the same variables in
your app:

```sh
TT_API_CLIENT_SECRET=your-oauth-client-secret
TT_REFRESH_TOKEN=your-refresh-token
TT_ACCOUNT_ID=your-account-number
TT_CLIENT_ID=your-oauth-client-id
# TT_IS_TEST=true for sandbox/cert credentials
```

`Session()` reads `TT_API_CLIENT_SECRET` and `TT_REFRESH_TOKEN` from
`process.env`. In this repo, commands started with `npm run ...` load `.env`
and `.env.local` automatically. `TT_CLIENT_ID` and `TT_ACCOUNT_ID` are available
to your app code; account methods still take an explicit account number.

```ts
import WebSocket from 'ws'
import type { WebSocketLike } from 'tastytrade-ts-sdk'
import {
  Account,
  DXLinkStreamer,
  Greeks,
  InstrumentType,
  Option,
  OptionType,
  Quote,
  Session,
  TimeAndSale,
  getMarketData,
  getOptionChain
} from 'tastytrade-ts-sdk'

const session = new Session()
const accountId = process.env.TT_ACCOUNT_ID
if (!accountId) throw new Error('Set TT_ACCOUNT_ID.')

const account = await Account.get(session, accountId)

const balance = await account.getBalances(session)
const positions = await account.getPositions(session, {
  include_closed: false,
  include_marks: true,
  net_positions: true
})

const spyMarketData = await getMarketData(session, 'SPY', InstrumentType.EQUITY)
const spyReferencePrice = firstNumber(spyMarketData.mark, spyMarketData.last, spyMarketData.mid, spyMarketData.close)
if (spyReferencePrice == null) throw new Error('No SPY reference price found.')

const spyChain = await getOptionChain(session, 'SPY')
const pair = selectOptionPairAroundDte(spyChain, 45, spyReferencePrice)
if (!pair) throw new Error('No usable SPY call/put pair found around 45 DTE.')

const streamer = new DXLinkStreamer(
  session,
  (url: string): WebSocketLike => new WebSocket(url) as unknown as WebSocketLike
)
await streamer.connect()
try {
  await streamer.subscribe(Quote, 'SPY')
  const quote = await streamer.getEvent(Quote)

  await streamer.subscribe(TimeAndSale, 'SPY')
  let tradePrint: TimeAndSale | null = null
  for await (const event of streamer.listen(TimeAndSale)) {
    if (event.event_symbol === 'SPY' && !event.pending && !event.remove && Number(event.price) > 0) {
      tradePrint = event
      break
    }
  }
  if (!tradePrint) throw new Error('No SPY trade print received.')

  const optionSymbols = [pair.call.streamer_symbol, pair.put.streamer_symbol].filter(
    (symbol): symbol is string => Boolean(symbol)
  )
  await streamer.subscribe(Greeks, optionSymbols)
  const greeks = await streamer.getEvent(Greeks)

  console.log({
    cashBalance: balance.cash_balance?.toString(),
    positionCount: positions.length,
    quote: { bid: quote.bid_price?.toString(), ask: quote.ask_price?.toString() },
    tradePrint: { price: tradePrint.price?.toString(), size: tradePrint.size },
    greeks: { symbol: greeks.event_symbol, delta: greeks.delta?.toString() }
  })
} finally {
  await streamer.close()
}

function selectOptionPairAroundDte(
  chain: Record<string, Option[]>,
  targetDte: number,
  underlyingPrice: number
): { expiration: string; dte: number; call: Option; put: Option } | null {
  const today = startOfUtcDay(new Date())
  const expirations = Object.entries(chain)
    .map(([expiration, options]) => ({
      expiration,
      options,
      dte: Math.round((startOfUtcDay(new Date(`${expiration}T00:00:00Z`)).getTime() - today.getTime()) / 86_400_000)
    }))
    .filter(({ dte, options }) => dte > 0 && options.length > 0)
    .sort((a, b) => Math.abs(a.dte - targetDte) - Math.abs(b.dte - targetDte))

  for (const { expiration, dte, options } of expirations) {
    const calls = new Map<string, Option>()
    const puts = new Map<string, Option>()
    for (const option of options) {
      const strike = option.strike_price?.toString()
      if (!strike || !option.streamer_symbol) continue
      if (option.option_type === OptionType.CALL) calls.set(strike, option)
      if (option.option_type === OptionType.PUT) puts.set(strike, option)
    }
    const strike = Array.from(calls.keys())
      .filter((candidate) => puts.has(candidate))
      .sort((a, b) => Math.abs(Number(a) - underlyingPrice) - Math.abs(Number(b) - underlyingPrice))[0]
    if (strike) return { expiration, dte, call: calls.get(strike)!, put: puts.get(strike)! }
  }
  return null
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (value == null) continue
    const number = Number(value.toString())
    if (Number.isFinite(number) && number > 0) return number
  }
  return null
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}
```

Install `ws` separately for the streaming example: `npm install ws`. dxLink
quote tokens are not fetched when `TT_IS_TEST=true`.

## Read-only market-data usage

Scanner apps such as Income Navigator should import from the read-only
entrypoint so the application surface is limited to market data, option-chain,
calendar, metrics, search, and dxLink streaming APIs:

```ts
import WebSocket from 'ws'
import type { WebSocketLike } from 'tastytrade-ts-sdk/read-only'
import {
  Candle,
  DXLinkStreamer,
  Greeks,
  Quote,
  ReadOnlySession,
  getMarketDataByType,
  getOptionChain
} from 'tastytrade-ts-sdk/read-only'

const session = new ReadOnlySession()
const [spy] = await getMarketDataByType(session, { equities: ['SPY'] })
const chain = await getOptionChain(session, 'SPY')

const streamer = new DXLinkStreamer(
  session,
  (url: string): WebSocketLike => new WebSocket(url) as unknown as WebSocketLike
)

await streamer.connect()
try {
  await streamer.subscribe(Quote, 'SPY')
  await streamer.subscribe(Greeks, '.SPY240621C500')
  await streamer.subscribeCandle('SPY', '5m')

  const quote = await streamer.getEvent(Quote)
  const greeks = await streamer.getEvent(Greeks)
  const candle = await streamer.getEvent(Candle)

  console.log({ spy, expirations: Object.keys(chain), quote, greeks, candle })
} finally {
  await streamer.close()
}
```

The read-only entrypoint intentionally excludes order placement, replacement,
and cancellation; paper trading mutation; watchlist mutation; and raw write
helpers. Root imports from `tastytrade-ts-sdk` expose broader SDK capabilities
and should not be used by Income Navigator.

`tastytrade-ts-sdk/session` is a public low-level session plumbing subpath. It
exports `Session` plus internal-style read-capable session adapters such as
`LowLevelReadOnlySession` and the compatibility name `ReadOnlySession`. Those
session-level adapters are not the constrained read-only facade: they expose raw
request helpers, mutable headers, and bearer-token state for lower-level SDK
modules. Scanner apps should import `ReadOnlySession` only from
`tastytrade-ts-sdk/read-only`.

`Session.serialize()` and `ReadOnlySession.serialize()` are safe and redacted by
default. `exportSensitiveSessionSnapshot()` intentionally contains secrets and
bearer tokens for explicit sensitive persistence or handoff workflows. Live
order placement, replacement, and cancellation require explicit intent objects:
`{ mode: 'live', confirm: 'PLACE_LIVE_ORDER' }`,
`{ mode: 'live', confirm: 'REPLACE_LIVE_ORDER' }`,
`{ mode: 'live', confirm: 'DELETE_LIVE_ORDER' }`, or
`{ mode: 'live', confirm: 'DELETE_LIVE_COMPLEX_ORDER' }`.

## Distribution and Release

The recommended production distribution path is npm. GitHub dependencies are
supported for commit-pinned installs because `prepare` builds `dist`, but npm
releases provide the clearest production contract. Local tarballs are for
testing package contents and consumer install behavior before publishing.

This package is not production-ready until the release gates pass for the exact
commit being released:

```sh
npm ci
npm run build
npm run lint
npm run format:check
npm test
npm run test:package
npm run test:pack
npm run test:types
npm audit --omit=dev --audit-level=moderate
```

Release checklist:

- Confirm the version and `CHANGELOG.md` describe the release.
- Confirm CI is green on Node.js 20 and 22.
- Confirm lint, formatting, tests, package smoke tests, dry-run package contents, consumer type tests, and production dependency audit pass.
- Run `npm run test:pack` so the dry-run package contains only the intended `dist/src`, README, changelog, license, package metadata, and `.env.example` files.
- Publish to npm only after all release gates pass.

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

Live E2E tests are read-only. They authenticate, load `.env` and `.env.local`
automatically through `npm run`, and exercise read-only account, option-chain,
market-data, and streamer paths. They skip automatically unless the needed
values are available in `.env`, `.env.local`, or the shell:

```sh
TT_ACCOUNT_ID=...
TT_API_CLIENT_SECRET=...
TT_REFRESH_TOKEN=...
# TT_IS_TEST=true for sandbox/cert credentials
```

Live E2E tests must not place, replace, cancel, preview, or dry-run orders. Any
future mutation E2E tests must live in an explicit opt-in mutation suite and
must be guarded by:

```sh
TT_ENABLE_MUTATION_E2E=I_UNDERSTAND_THIS_CAN_AFFECT_A_REAL_ACCOUNT
```
