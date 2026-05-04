import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

for (const file of ['.env', '.env.local']) {
  const path = resolve(process.cwd(), file)
  if (existsSync(path)) loadEnvFile(path)
}

function loadEnvFile(path) {
  const text = readFileSync(path, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match) continue

    const [, key, rawValue] = match
    if (process.env[key] !== undefined) continue
    process.env[key] = parseValue(rawValue)
  }
}

function parseValue(value) {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed.replace(/\s+#.*$/, '')
}
