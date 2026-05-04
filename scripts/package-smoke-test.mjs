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

    assert.ok(Object.keys(sdk).length > 0, 'root package import should expose exports')
    assert.equal(typeof readOnly.ReadOnlySession, 'function')
    assert.equal(typeof readOnly.getOptionChain, 'function')
    assert.equal(readOnly.placeOrder, undefined)
    assert.equal(readOnly.Account, undefined)
  `

  execFileSync(process.execPath, ['--input-type=module', '--eval', smokeTest], {
    cwd: projectDir,
    stdio: 'inherit'
  })

  console.log(`Package smoke test passed for ${packed.filename}.`)
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
