# Integration Tests

If I ever write any integration tests, they'll live here under `tests/`.

# Unit Tests

Unit tests live next to the file they test and their filenames end in `unit.test.js`.
They are not in this directory.

# Fixtures

Data used for testing will live under `tests/fixtures/`.

# Running Tests

Run these from the project root (one directory back).


```sh
# Run all tests
yarn test

# Or run all tests verbosely

jest --verbose

# Or run one test verbosely

jest --verbose index.unit.test.js

# Or run all tests verbosely and rerun tests when files change

jest --verbose --watch
```
