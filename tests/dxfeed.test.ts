import assert from 'node:assert/strict'
import test from 'node:test'

import { Candle, Greeks, Quote, Summary, TastytradeError, TimeAndSale, Trade } from '../src/index.js'

test('Summary.fromStream parses infinities and NaN as null', () => {
  const summaryData = [
    'SPY',
    0,
    0,
    'foo',
    0,
    'bar',
    0,
    '-Infinity',
    'Infinity',
    'NaN',
    'NaN',
    'NaN',
    'Infinity'
  ]

  const summary = Summary.fromStream(summaryData)[0]!

  assert.equal(summary.day_open_price, null)
  assert.equal(summary.day_close_price, null)
  assert.equal(summary.day_high_price, null)
})

test('Quote.fromStream rejects non-multiple field counts', () => {
  const quoteData = ['SPY', 0, 0, 0, 0, 'Q', 0, 'Q', 576.88, 576.9, 230.0, 300.0]

  assert.throws(() => Quote.fromStream([...quoteData, 'extra']), TastytradeError)
})

test('Quote.fromStream skips invalid extra chunks', () => {
  const quoteData = ['SPY', 0, 0, 0, 0, 'Q', 0, 'Q', 576.88, 576.9, 230.0, 300.0]
  const extraData = ['SPY', 0, 'bad', 0, 0, 'Q', 0, 'Q', 576.88, 576.9, 230.0, 300.0]

  const quotes = Quote.fromStream([...quoteData, ...extraData])

  assert.equal(quotes.length, 1)
  assert.equal(quotes[0]!.bid_price.toString(), '576.88')
})

test('Trade.fromStream accepts fractional live day volume', () => {
  const tradeData = [
    'SPY',
    0,
    1777906737045,
    0,
    27357,
    'Q',
    20577,
    'ZERO_UP',
    false,
    721.2999,
    0.6499,
    918,
    11114063.278164,
    8004046805.50446
  ]

  const trades = Trade.fromStream(tradeData)

  assert.equal(trades.length, 1)
  assert.equal(trades[0]!.day_volume?.toString(), '11114063.278164')
})

test('Non-nullable decimal NaN chunks are skipped except Candle zero fields', () => {
  const greeksData = ['SPY', 0, 0, 1, 0, 1, 'NaN', 0.2, 0.1, 0.01, -0.01, 0.03, 0.04]
  const candleData = ['SPY', 0, 0, 1, 0, 1, 10, null, null, null, null, null, null, 'NaN', 'Infinity', null, 1]

  assert.deepEqual(Greeks.fromStream(greeksData), [])

  const candle = Candle.fromStream(candleData)[0]!
  assert.equal(candle.open.toString(), '0')
  assert.equal(candle.high.toString(), '0')
  assert.equal(candle.low.toString(), '0')
  assert.equal(candle.close.toString(), '1')
})

test('TimeAndSale buyer and seller accept only null', () => {
  const valid = [
    'SPY',
    0,
    0,
    1,
    0,
    1,
    0,
    'Q',
    576.88,
    100,
    576.87,
    576.9,
    '@',
    'N',
    'BUY',
    false,
    false,
    true,
    'NEW',
    null,
    null
  ]
  const invalid = [...valid.slice(0, -2), 'buyer', null]

  assert.equal(TimeAndSale.fromStream(valid).length, 1)
  assert.equal(TimeAndSale.fromStream(invalid).length, 0)
})
