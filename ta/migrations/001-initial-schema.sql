-- Up
CREATE TABLE sent (
  exchange string not null,
  market string not null,
  timeframe string not null,
  candle_at decimal not null,
  message string not null,
  created_at integer
);
CREATE UNIQUE INDEX idx_sent ON sent (exchange, market, timeframe, candle_at, message);

-- Down
DROP TABLE sent;
