#!/usr/bin/env node

/*
 * alert has two jobs
 * - deliver messages in various ways
 * - rate limit messages to once per candle
 *   To remember what messages we've sent between invocations, we're going to use sqlite.
 *   To uniquely identify a message, create a key based on:
 *   \ exchange
 *   \ market
 *   \ timeframe (very important)
 *   \ message   (if I ever introduce template variables, this will stop working)
 *
 *   A `sent` table with columns (id, timeframe, created_at) will be used
 *   id will be a string that concats exchange, market, timeframe, and message together.
 *   id should be indexed for fast lookup.
 */

const { Alerts, deliveryMethods } = require('../alerts')
const program = require('commander')

async function main() {
  const alerts = new Alerts()
  await alerts.init()
}

main()
