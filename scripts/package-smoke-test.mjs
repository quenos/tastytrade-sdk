import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const rootDir = process.cwd()
const tempDir = mkdtempSync(join(tmpdir(), 'tastytrade-package-smoke-'))

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
  mkdirSync(projectDir)
  writeFileSync(join(projectDir, 'package.json'), '{"private":true,"type":"module"}\n')

  execFileSync(npmCommand, ['install', '--silent', '--ignore-scripts', '--no-audit', '--no-fund', tarballPath], {
    cwd: projectDir,
    stdio: 'inherit'
  })

  const smokeTest = `
    import assert from 'node:assert/strict'

    const sdk = await import('tastytrade-ts-sdk')
    const readOnly = await import('tastytrade-ts-sdk/read-only')
    const session = await import('tastytrade-ts-sdk/session')

    assert.ok(Object.keys(sdk).length > 0, 'root package import should expose exports')
    assert.equal(sdk.ReadOnlySession, undefined)
    assert.equal(typeof readOnly.ReadOnlySession, 'function')
    assert.equal(typeof readOnly.getOptionChain, 'function')
    assert.equal(readOnly.placeOrder, undefined)
    assert.equal(readOnly.Account, undefined)
    assert.equal(typeof session.Session, 'function')
    assert.equal(typeof session.ReadOnlySession, 'function')
    assert.equal(session.LowLevelReadOnlySession, session.ReadOnlySession)
    assert.notEqual(session.ReadOnlySession, readOnly.ReadOnlySession)
    assert.equal(session.getOptionChain, undefined)
    assert.equal(session.getMarketDataByType, undefined)
    assert.equal(session.DXLinkStreamer, undefined)

    const lowLevelSession = new session.ReadOnlySession({
      providerSecret: 'secret',
      refreshToken: 'refresh',
      fetch: async () => new Response()
    })
    const readOnlySession = new readOnly.ReadOnlySession({
      providerSecret: 'secret',
      refreshToken: 'refresh',
      fetch: async () => new Response()
    })

    assert.equal(typeof lowLevelSession._get, 'function')
    assert.equal(typeof lowLevelSession.headers, 'object')
    assert.equal(typeof lowLevelSession.session_token, 'string')
    assert.equal(readOnlySession._get, undefined)
    assert.equal(readOnlySession.headers, undefined)
    assert.equal(readOnlySession.session_token, undefined)
  `

  execFileSync(process.execPath, ['--input-type=module', '--eval', smokeTest], {
    cwd: projectDir,
    stdio: 'inherit'
  })

  console.log(`Package smoke test passed for ${packed.filename}.`)
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
