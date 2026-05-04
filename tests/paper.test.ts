import assert from 'node:assert/strict'
import test from 'node:test'

import { PaperAlertStreamer, PaperSession } from '../src/index.js'

test('PaperSession uses paper API headers and skips OAuth refresh', async () => {
  const calls: string[] = []
  const session = new PaperSession('paper-key', {
    fetch: async (url) => {
      calls.push(String(url))
      return new Response(
        JSON.stringify({
          data: {
            'account-number': 'PAPER1',
            nickname: 'demo'
          }
        }),
        { status: 200 }
      )
    }
  })

  const account = await session.createAccount('demo', 'Cash', 5000)

  assert.equal(session.base_url, 'https://tastyware.dev/api')
  assert.equal(session.headers['X-Api-Key'], 'paper-key')
  assert.equal(calls[0], 'https://tastyware.dev/api/accounts')
  assert.equal(account.account_number, 'PAPER1')
})

test('PaperSession deposit formats money as two decimal places', async () => {
  const calls: string[] = []
  const session = new PaperSession('paper-key', {
    fetch: async (url) => {
      calls.push(String(url))
      return new Response(JSON.stringify({ data: {} }), { status: 200 })
    }
  })

  await session.deposit({ account_number: 'PAPER1' }, '-42')

  assert.equal(calls[0], 'https://tastyware.dev/api/accounts/deposit?account_number=PAPER1&amount=-42.00')
})

test('PaperAlertStreamer points at paper notifications websocket', () => {
  const session = new PaperSession('paper-key', { fetch: async () => new Response(JSON.stringify({ data: {} }), { status: 200 }) })
  const streamer = new PaperAlertStreamer(session, () => ({
    sent: [],
    send() {},
    close() {},
    onmessage: null,
    onerror: null,
    onclose: null
  }))

  assert.equal(streamer.base_url, 'wss://tastyware.dev/api/notifications')
})

