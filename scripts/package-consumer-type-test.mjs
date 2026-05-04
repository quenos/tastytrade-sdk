import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const tscCommand = process.platform === 'win32' ? 'tsc.cmd' : 'tsc'
const rootDir = process.cwd()
const tempDir = mkdtempSync(join(tmpdir(), 'tastytrade-package-types-'))
const forbiddenReadOnlyImports = [
  'Session',
  'LowLevelReadOnlySession',
  'LowLevelReadOnlySessionLike',
  'Account',
  'OrderAction',
  'OrderStatus',
  'OrderTimeInForce',
  'OrderType',
  'ComplexOrderType',
  'FillInfo',
  'FillInfoInput',
  'Leg',
  'LegInput',
  'Tradeable',
  'buildLeg',
  'TradeableTastytradeData',
  'TradeableTastytradeDataInput',
  'Message',
  'MessageInput',
  'OrderConditionPriceComponent',
  'OrderCondition',
  'OrderRule',
  'AdvancedInstructions',
  'AdvancedInstructionsInput',
  'NewOrder',
  'NewOrderInput',
  'NewComplexOrder',
  'NewComplexOrderInput',
  'PlacedOrder',
  'PlacedComplexOrder',
  'BuyingPowerEffect',
  'FeeCalculation',
  'PlacedOrderResponse',
  'PlacedComplexOrderResponse',
  'OrderPlacementOptions',
  'DeleteOrderIntent',
  'DeleteComplexOrderIntent',
  'ReplaceOrderIntent',
  'placeOrder',
  'place_order',
  'a_place_order',
  'placeComplexOrder',
  'place_complex_order',
  'a_place_complex_order',
  'replaceOrder',
  'replace_order',
  'a_replace_order',
  'deleteOrder',
  'delete_order',
  'a_delete_order',
  'deleteComplexOrder',
  'delete_complex_order',
  'a_delete_complex_order',
  'getOrderBuyingPowerEffect',
  'get_order_buying_power_effect',
  'a_get_order_buying_power_effect',
  'PaperSession',
  'PaperSessionOptions',
  'PaperAlertStreamer',
  'createAccount',
  'deleteAccount',
  'deposit',
  'temporaryAccount',
  'PrivateWatchlist',
  'createPrivateWatchlist',
  'create_private_watchlist',
  'a_create_private_watchlist',
  'updatePrivateWatchlist',
  'update_private_watchlist',
  'a_update_private_watchlist',
  'deletePrivateWatchlist',
  'delete_private_watchlist',
  'a_delete_private_watchlist',
  '_get',
  '_a_get',
  '_paginate',
  '_post',
  '_a_post',
  '_put',
  '_a_put',
  '_delete',
  '_a_delete',
  'headers',
  'session_token',
  'streamer_token',
  'exportSensitiveSessionSnapshot',
  'getCustomer',
  'get_customer',
  'a_get_customer'
]
const forbiddenReadOnlyValueExports = [
  'Session',
  'LowLevelReadOnlySession',
  'Account',
  'OrderAction',
  'OrderStatus',
  'OrderTimeInForce',
  'OrderType',
  'ComplexOrderType',
  'FillInfo',
  'Leg',
  'buildLeg',
  'TradeableTastytradeData',
  'Message',
  'OrderConditionPriceComponent',
  'OrderCondition',
  'OrderRule',
  'AdvancedInstructions',
  'NewOrder',
  'NewComplexOrder',
  'PlacedOrder',
  'PlacedComplexOrder',
  'BuyingPowerEffect',
  'FeeCalculation',
  'PlacedOrderResponse',
  'PlacedComplexOrderResponse',
  'placeOrder',
  'place_order',
  'a_place_order',
  'placeComplexOrder',
  'place_complex_order',
  'a_place_complex_order',
  'replaceOrder',
  'replace_order',
  'a_replace_order',
  'deleteOrder',
  'delete_order',
  'a_delete_order',
  'deleteComplexOrder',
  'delete_complex_order',
  'a_delete_complex_order',
  'getOrderBuyingPowerEffect',
  'get_order_buying_power_effect',
  'a_get_order_buying_power_effect',
  'PaperSession',
  'PaperAlertStreamer',
  'createAccount',
  'deleteAccount',
  'deposit',
  'temporaryAccount',
  'PrivateWatchlist',
  'createPrivateWatchlist',
  'create_private_watchlist',
  'a_create_private_watchlist',
  'updatePrivateWatchlist',
  'update_private_watchlist',
  'a_update_private_watchlist',
  'deletePrivateWatchlist',
  'delete_private_watchlist',
  'a_delete_private_watchlist',
  '_get',
  '_a_get',
  '_paginate',
  '_post',
  '_a_post',
  '_put',
  '_a_put',
  '_delete',
  '_a_delete',
  'headers',
  'session_token',
  'streamer_token',
  'exportSensitiveSessionSnapshot',
  'getCustomer',
  'get_customer',
  'a_get_customer'
]
const forbiddenReadOnlySessionMembers = [
  'session',
  'fetch',
  'headers',
  'session_token',
  'sessionToken',
  'streamer_token',
  'streamerToken',
  '_get',
  '_a_get',
  '_paginate',
  '_post',
  '_a_post',
  '_put',
  '_a_put',
  '_delete',
  '_a_delete',
  'requestData',
  'requestJson',
  'url',
  'exportSensitiveSessionSnapshot',
  'getCustomer',
  'get_customer',
  'a_get_customer',
  'placeOrder',
  'place_order',
  'a_place_order',
  'placeComplexOrder',
  'place_complex_order',
  'a_place_complex_order',
  'replaceOrder',
  'replace_order',
  'a_replace_order',
  'deleteOrder',
  'delete_order',
  'a_delete_order',
  'deleteComplexOrder',
  'delete_complex_order',
  'a_delete_complex_order',
  'getOrderBuyingPowerEffect',
  'get_order_buying_power_effect',
  'a_get_order_buying_power_effect',
  'createAccount',
  'deleteAccount',
  'deposit',
  'temporaryAccount',
  'createPrivateWatchlist',
  'updatePrivateWatchlist',
  'deletePrivateWatchlist',
  'remove',
  'a_remove',
  'upload',
  'a_upload',
  'update',
  'a_update',
  'addSymbol',
  'add_symbol',
  'removeSymbol',
  'remove_symbol'
]

function forbiddenImportAssertions(specifier) {
  return forbiddenReadOnlyImports
    .map(
      (name) => `
      // @ts-expect-error ${specifier} must not export ${name}.
      import type { ${name} } from '${specifier}'`
    )
    .join('\n')
}

try {
  const packOutput = execFileSync(npmCommand, ['pack', '--json', '--pack-destination', tempDir], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit']
  })
  const [packed] = JSON.parse(packOutput)
  assert.ok(packed?.filename, 'npm pack did not report a tarball filename.')

  const tarballPath = resolve(tempDir, packed.filename)
  const projectDir = join(tempDir, 'project')
  const sourceDir = join(projectDir, 'src')
  mkdirSync(sourceDir, { recursive: true })

  writeFileSync(
    join(projectDir, 'package.json'),
    `${JSON.stringify(
      {
        private: true,
        type: 'module',
        scripts: {
          typecheck: 'tsc -p tsconfig.json'
        }
      },
      null,
      2
    )}\n`
  )

  writeFileSync(
    join(projectDir, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          lib: ['ES2022', 'DOM'],
          strict: true,
          noEmit: true,
          skipLibCheck: false
        },
        include: ['src/**/*.ts']
      },
      null,
      2
    )}\n`
  )

  writeFileSync(
    join(sourceDir, 'read-only-consumer.ts'),
    `
      import { Session } from 'tastytrade-ts-sdk'
      import { ReadOnlySession, getOptionChain } from 'tastytrade-ts-sdk/read-only'
      import { ReadOnlySession as ReadOnlySessionAlias } from 'tastytrade-ts-sdk/read_only'

      declare const session: Session

      const readOnlySession: ReadOnlySession = ReadOnlySession.fromSession(session)
      const readOnlySessionAlias: ReadOnlySessionAlias = readOnlySession
      const optionChain = getOptionChain(readOnlySessionAlias, 'SPY')

      optionChain satisfies Promise<Record<string, unknown[]>>
    `
  )

  writeFileSync(
    join(sourceDir, 'session-subpath-consumer.ts'),
    `
      import { Session as RootSession } from 'tastytrade-ts-sdk'
      import {
        LowLevelReadOnlySession,
        ReadOnlySession,
        Session,
        type LowLevelReadOnlySessionLike,
        type ReadOnlySessionLike
      } from 'tastytrade-ts-sdk/session'
      import { ReadOnlySession as FacadeReadOnlySession } from 'tastytrade-ts-sdk/read-only'

      type Assert<T extends true> = T

      declare const session: Session
      declare const rootSession: RootSession

      const lowLevel: ReadOnlySession = ReadOnlySession.fromSession(session)
      const clearerLowLevel: LowLevelReadOnlySession = lowLevel
      const lowLevelLike: LowLevelReadOnlySessionLike = clearerLowLevel
      const compatibilityLike: ReadOnlySessionLike = clearerLowLevel
      const facade: FacadeReadOnlySession = FacadeReadOnlySession.fromSession(rootSession)

      lowLevelLike.headers.Authorization = 'Bearer token'
      lowLevelLike.session_token satisfies string
      lowLevelLike.streamer_token satisfies string
      lowLevelLike.fetch satisfies typeof globalThis.fetch
      lowLevelLike._get('/market-data/by-type') satisfies Promise<Record<string, unknown>>
      compatibilityLike._paginate((item) => item, '/things', { 'page-offset': null, 'per-page': 100 })

      type _FacadeDoesNotExposeRawGet = Assert<'_get' extends keyof FacadeReadOnlySession ? false : true>
      type _LowLevelExposesRawGet = Assert<'_get' extends keyof LowLevelReadOnlySessionLike ? true : false>
      type _LowLevelExposesTokens = Assert<'session_token' extends keyof LowLevelReadOnlySessionLike ? true : false>

      facade satisfies FacadeReadOnlySession
    `
  )

  writeFileSync(
    join(sourceDir, 'read-only-negative.ts'),
    `
      import type { ReadOnlySession } from 'tastytrade-ts-sdk/read-only'
      import * as readOnly from 'tastytrade-ts-sdk/read-only'
      import * as readOnlyAlias from 'tastytrade-ts-sdk/read_only'

      type AssertNever<T extends never> = T

      type ForbiddenReadOnlyExports = ${forbiddenReadOnlyValueExports.map((name) => `| '${name}'`).join('\n        ')}

      type ForbiddenReadOnlySessionMembers = ${forbiddenReadOnlySessionMembers.map((name) => `| '${name}'`).join('\n        ')}

      type _NoForbiddenExports = AssertNever<Extract<ForbiddenReadOnlyExports, keyof typeof readOnly>>
      type _NoForbiddenAliasExports = AssertNever<Extract<ForbiddenReadOnlyExports, keyof typeof readOnlyAlias>>
      type _NoForbiddenSessionMembers = AssertNever<Extract<ForbiddenReadOnlySessionMembers, keyof ReadOnlySession>>

      declare const session: ReadOnlySession

      // @ts-expect-error read-only entrypoint must not expose Session.
      readOnly.Session
      // @ts-expect-error read-only entrypoint must not expose LowLevelReadOnlySession.
      readOnly.LowLevelReadOnlySession
      // @ts-expect-error read-only entrypoint must not expose Account.
      readOnly.Account
      // @ts-expect-error read-only entrypoint must not expose NewOrder.
      readOnly.NewOrder
      // @ts-expect-error read-only entrypoint must not expose PlacedOrderResponse.
      readOnly.PlacedOrderResponse
      // @ts-expect-error read-only entrypoint must not expose BuyingPowerEffect.
      readOnly.BuyingPowerEffect
      // @ts-expect-error read-only entrypoint must not expose PaperSession.
      readOnly.PaperSession
      // @ts-expect-error read-only entrypoint must not expose PrivateWatchlist.
      readOnly.PrivateWatchlist
      // @ts-expect-error read-only entrypoint must not expose createPrivateWatchlist.
      readOnly.createPrivateWatchlist
      // @ts-expect-error read-only entrypoint must not expose _post.
      readOnly._post
      // @ts-expect-error read-only entrypoint must not expose _put.
      readOnly._put
      // @ts-expect-error read-only entrypoint must not expose _delete.
      readOnly._delete
      // @ts-expect-error read_only alias must not expose Session.
      readOnlyAlias.Session
      // @ts-expect-error read_only alias must not expose LowLevelReadOnlySession.
      readOnlyAlias.LowLevelReadOnlySession
      // @ts-expect-error read_only alias must not expose Account.
      readOnlyAlias.Account
      // @ts-expect-error read_only alias must not expose NewOrder.
      readOnlyAlias.NewOrder
      // @ts-expect-error read_only alias must not expose PlacedOrderResponse.
      readOnlyAlias.PlacedOrderResponse
      // @ts-expect-error read_only alias must not expose BuyingPowerEffect.
      readOnlyAlias.BuyingPowerEffect
      // @ts-expect-error read_only alias must not expose PaperSession.
      readOnlyAlias.PaperSession
      // @ts-expect-error read_only alias must not expose PrivateWatchlist.
      readOnlyAlias.PrivateWatchlist
      // @ts-expect-error read_only alias must not expose createPrivateWatchlist.
      readOnlyAlias.createPrivateWatchlist
      // @ts-expect-error read_only alias must not expose _post.
      readOnlyAlias._post
      // @ts-expect-error read_only alias must not expose _put.
      readOnlyAlias._put
      // @ts-expect-error read_only alias must not expose _delete.
      readOnlyAlias._delete
      // @ts-expect-error read-only session must not expose mutable headers.
      session.headers
      // @ts-expect-error read-only session must not expose session bearer token.
      session.session_token
      // @ts-expect-error read-only session must not expose streamer bearer token.
      session.streamer_token
      // @ts-expect-error read-only session must not expose fetch internals.
      session.fetch
      // @ts-expect-error read-only session must not expose low-level read internals.
      session._get
      // @ts-expect-error read-only session must not expose raw pagination internals.
      session._paginate
      // @ts-expect-error read-only session must not expose write internals.
      session._post
      // @ts-expect-error read-only session must not expose write internals.
      session._put
      // @ts-expect-error read-only session must not expose write internals.
      session._delete
      // @ts-expect-error read-only session must not expose token-bearing snapshots.
      session.exportSensitiveSessionSnapshot
      // @ts-expect-error read-only session must not expose authenticated customer helper.
      session.getCustomer
      // @ts-expect-error read-only session must not expose live order submission.
      session.placeOrder
      // @ts-expect-error read-only session must not expose live order replacement.
      session.replaceOrder
      // @ts-expect-error read-only session must not expose live order deletion.
      session.deleteOrder
      // @ts-expect-error read-only session must not expose dry-run buying power previews.
      session.getOrderBuyingPowerEffect
      // @ts-expect-error read-only session must not expose paper account mutations.
      session.createAccount
      // @ts-expect-error read-only session must not expose private watchlist mutations.
      session.createPrivateWatchlist
    `
  )

  writeFileSync(
    join(sourceDir, 'read-only-forbidden-imports.ts'),
    `
      ${forbiddenImportAssertions('tastytrade-ts-sdk/read-only')}
      ${forbiddenImportAssertions('tastytrade-ts-sdk/read_only')}
    `
  )

  writeFileSync(
    join(sourceDir, 'session-subpath-negative.ts'),
    `
      import * as session from 'tastytrade-ts-sdk/session'
      import type { ReadOnlySession as FacadeReadOnlySession } from 'tastytrade-ts-sdk/read-only'

      type AssertNever<T extends never> = T

      type ForbiddenSessionExports =
        | 'getMarketDataByType'
        | 'getOptionChain'
        | 'DXLinkStreamer'
        | 'Quote'
        | 'Greeks'
        | 'Candle'
        | 'Account'
        | 'NewOrder'
        | 'placeOrder'

      type _NoFacadeExportsFromSession = AssertNever<Extract<ForbiddenSessionExports, keyof typeof session>>

      declare const facade: FacadeReadOnlySession

      // @ts-expect-error session subpath must not expose read-only facade helpers.
      session.getOptionChain
      // @ts-expect-error session subpath must not expose read-only facade streamer.
      session.DXLinkStreamer
      // @ts-expect-error hardened facade is not assignable to the low-level session plumbing contract.
      const lowLevel: session.ReadOnlySession = facade

      lowLevel
    `
  )

  execFileSync(npmCommand, ['install', '--silent', '--ignore-scripts', '--no-audit', '--no-fund', tarballPath], {
    cwd: projectDir,
    stdio: 'inherit'
  })

  execFileSync(tscCommand, ['-p', 'tsconfig.json'], {
    cwd: projectDir,
    stdio: 'inherit'
  })

  console.log(`Package consumer type test passed for ${packed.filename}.`)
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
