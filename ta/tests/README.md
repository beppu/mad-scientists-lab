# Integration Tests

If I ever write any integration tests, they'll live here under `tests/`.

# Unit Tests

Unit tests live next to the file they test and their filenames end in `unit.test.js`.
They are not in this directory.

# Fixtures

Data used for testing will live under `tests/fixtures/`.

# Running Tests

```sh
yarn test

# Or

jest --verbose

# Or

jest --verbose ../index.unit.test.js

# Or

jest --verbose --watch
```
