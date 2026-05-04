import { Session } from './session.js'
import { parseTastyObject, type JsonMap } from './utils.js'

export class SymbolData {
  [key: string]: unknown
  symbol?: string
  description?: string
  data: JsonMap

  constructor(input: JsonMap = {}) {
    this.data = parseTastyObject(input)
    Object.assign(this, this.data)
  }
}

export async function symbolSearch(session: Session, text: string): Promise<SymbolData[]> {
  const symbol = text.replaceAll('/', '%2F')
  await session.refresh()
  const response = await session.fetch(new URL(`/symbols/search/${symbol}`, session.base_url).toString(), {
    method: 'GET',
    headers: session.headers
  })
  if (Math.floor(response.status / 100) !== 2) {
    return []
  }
  const json = (await response.json()) as { data?: JsonMap }
  const data = json.data ?? {}
  return ((data.items as JsonMap[] | undefined) ?? []).map((item) => new SymbolData(item))
}

export const symbol_search = symbolSearch
export const a_symbol_search = symbolSearch
