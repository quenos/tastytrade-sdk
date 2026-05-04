import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const tscCommand = process.platform === 'win32' ? 'tsc.cmd' : 'tsc'
const rootDir = process.cwd()
const tempDir = mkdtempSync(join(tmpdir(), 'tastytrade-package-types-'))

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
    join(sourceDir, 'read-only-negative.ts'),
    `
      import type { ReadOnlySession } from 'tastytrade-ts-sdk/read-only'
      import * as readOnly from 'tastytrade-ts-sdk/read-only'
      import * as readOnlyAlias from 'tastytrade-ts-sdk/read_only'

      type AssertNever<T extends never> = T

      type ForbiddenReadOnlyExports =
        | 'Account'
        | 'Session'
        | 'NewOrder'
        | 'placeOrder'
        | '_post'
        | '_put'
        | '_delete'

      type ForbiddenReadOnlySessionMembers =
        | 'fetch'
        | 'headers'
        | 'session_token'
        | 'streamer_token'
        | '_get'
        | '_a_get'
        | '_post'
        | '_a_post'
        | '_put'
        | '_a_put'
        | '_delete'
        | '_a_delete'

      type _NoForbiddenExports = AssertNever<Extract<ForbiddenReadOnlyExports, keyof typeof readOnly>>
      type _NoForbiddenAliasExports = AssertNever<Extract<ForbiddenReadOnlyExports, keyof typeof readOnlyAlias>>
      type _NoForbiddenSessionMembers = AssertNever<Extract<ForbiddenReadOnlySessionMembers, keyof ReadOnlySession>>

      declare const session: ReadOnlySession

      // @ts-expect-error read-only entrypoint must not expose Account.
      readOnly.Account
      // @ts-expect-error read-only entrypoint must not expose Session.
      readOnly.Session
      // @ts-expect-error read-only entrypoint must not expose NewOrder.
      readOnly.NewOrder
      // @ts-expect-error read-only entrypoint must not expose placeOrder.
      readOnly.placeOrder
      // @ts-expect-error read-only entrypoint must not expose _post.
      readOnly._post
      // @ts-expect-error read-only entrypoint must not expose _put.
      readOnly._put
      // @ts-expect-error read-only entrypoint must not expose _delete.
      readOnly._delete
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
      // @ts-expect-error read-only session must not expose write internals.
      session._post
      // @ts-expect-error read-only session must not expose write internals.
      session._put
      // @ts-expect-error read-only session must not expose write internals.
      session._delete
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
