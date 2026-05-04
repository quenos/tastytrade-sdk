import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const packOutput = execFileSync(npmCommand, ['pack', '--dry-run', '--json'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit']
})

const [packed] = JSON.parse(packOutput)
assert.ok(packed, 'npm pack --dry-run did not report package metadata.')
assert.ok(Array.isArray(packed.files), 'npm pack --dry-run did not report package files.')

const files = packed.files.map((file) => normalizePackagePath(file.path)).sort()
const fileSet = new Set(files)

const requiredFiles = ['.env.example', 'CHANGELOG.md', 'LICENSE', 'README.md', 'package.json']
for (const file of requiredFiles) {
  assert.ok(fileSet.has(file), `Package is missing required file: ${file}`)
}

assert.ok(
  files.some((file) => file.startsWith('dist/src/')),
  'Package is missing built dist/src files.'
)
assert.ok(fileSet.has('dist/src/index.js'), 'Package is missing dist/src/index.js.')
assert.ok(fileSet.has('dist/src/index.d.ts'), 'Package is missing dist/src/index.d.ts.')

const unexpectedFiles = files.filter((file) => !isAllowedPackageFile(file))
assert.deepEqual(unexpectedFiles, [], `Package contains unexpected files:\n${unexpectedFiles.join('\n')}`)

const forbiddenFiles = files.filter(isForbiddenLocalArtifact)
assert.deepEqual(forbiddenFiles, [], `Package contains forbidden local artifacts:\n${forbiddenFiles.join('\n')}`)

console.log(`Package dry-run contents passed for ${packed.name}@${packed.version} (${files.length} files).`)

function normalizePackagePath(path) {
  assert.equal(typeof path, 'string', 'npm pack reported a file without a string path.')
  return path.replaceAll('\\', '/').replace(/^package\//, '')
}

function isAllowedPackageFile(file) {
  return requiredFiles.includes(file) || file.startsWith('dist/src/')
}

function isForbiddenLocalArtifact(file) {
  return (
    file === '.env' ||
    file === '.env.local' ||
    file === '.DS_Store' ||
    file === 'tastytrade.auth.json' ||
    file.startsWith('node_modules/') ||
    file.startsWith('coverage/') ||
    file.startsWith('dist/tests/') ||
    file.startsWith('tests/') ||
    file.startsWith('src/') ||
    file.startsWith('scripts/') ||
    file.startsWith('npm-debug.log')
  )
}
