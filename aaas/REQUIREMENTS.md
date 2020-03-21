# Public API

The following functionality should be read-only and not user-specific.

## List of Exchanges

Parameters

None

Output

Return a list of all the exchanges supported by this service.

## List of Markets

Parameters

- exchanges

Output

Return a list of markets available for the given exchange.

## List of Timeframes

Parameters

- exchange

Output

Return a list of candlestick timeframes natively supported by the exchanges API.

## List of Alerts

Parameters

None

Output

Return a list of the alerts supported by this alerts service.

## Alert Specs

Parameters

- alert

Output

Return a structured description of the parameters the given alert takes.

# Private API

## Authentication

It must be possible to distinguish users from each other.

## Create Alert

Parameters

- exchange
- market
- timeframe
- alert
- alertParameters

Output

Return whether the alert was successfully created or not.

## Edit Alert

Parameters

- alertId
- alertParameters

Output

Return whether the alert was successfully edited or not.

## Delete Alert

Parameters

- alertId

Output

Return whether the alert was successfully deleted or not.

# Parting Thoughts

This could be implemented as a REST API or a GraphQL API.  Almost any database could be made to work as well. There are a lot of ways to correctly implement these requirements.
