# Shuffle Program

Generates 10,000 unique integers (1–10,000) in a random order each run. Exposed as a small REST API with a browser UI for viewing the results. No third-party runtime dependencies — just Node.js.

## How it works

The obvious approach to this problem is to pick random numbers one at a time and skip any you've already seen. That works, but it gets slow toward the end when most of your picks are collisions. The last few hundred numbers can take as many retries as the first few thousand combined.

Fisher-Yates sidesteps that entirely. You start with the numbers already in order and walk backwards through the array, swapping each element with a randomly chosen one before it (or itself). Every permutation comes out equally likely, it runs in O(n) time, and there are no retries or collision checks. Once I decided on the algorithm, the rest was just plumbing.

I used `Int32Array` instead of a regular JS array for the shuffle buffer — typed arrays are more memory-efficient for this kind of thing and V8 handles them faster. Doesn't matter much at 10,000 elements, but it's the right tool for the job.

After each shuffle, `verifyResult` checks the output has the right length, no values outside [1, 10000], and no duplicates. The result and timing show up in the browser UI.

## Setup

Requires Node.js v18+.

```bash
npm install       # only needed for nodemon (dev dependency)
npm start         # http://localhost:3000
npm run dev       # same as npm start but restarts on file changes
npm test          # run the test suite
```

## API

**`POST /api/shuffle`** — runs a fresh shuffle, caches it in memory, returns metadata.

```json
{ "shuffledAt": "2026-03-18T14:22:01.123Z", "elapsed": 1.847, "verified": true, "total": 10000 }
```

**`GET /api/numbers?page=1&pageSize=100`** — returns a paginated slice of the last shuffle. `pageSize` caps at 1000.

The split between these two endpoints is intentional — the shuffle result stays in memory server-side, and the client just pages through it. Keeps the POST response small and the UI snappy.

## Tests

```bash
npm test
```

Uses the built-in `node:test` runner so there's nothing extra to install. Covers `generateNumbersToShuffle`, `shuffleInPlace`, `verifyResult`, and `runShuffle` — edge cases, error conditions, and a basic statistical check that two consecutive shuffles don't come out identical.

## Notes

The server is intentionally framework-free. Node's built-in `http`, `fs`, `path`, and `url` modules handle everything here — adding Express for a two-route server felt like overkill. `shuffle.js` is kept as pure logic with no knowledge of HTTP, which is what makes the unit tests clean and straightforward.
