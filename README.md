# Shuffle Program

Generates 10,000 unique integers (1–10,000) in a random order each run. Exposed as a small REST API with a browser UI for viewing the results. No third-party runtime dependencies — just Node.js.

## How it works

### Alternatives I considered

**Reject sampling (pick-and-check)** is the first thing most people reach for — generate a random number, check if you've seen it, retry if so. It's simple to write and fine for small ranges, but the performance degrades badly as the list fills up. When you're 90% done, roughly 9 out of every 10 picks will collide and get thrown away. Near the end it can take hundreds of attempts just to find one unused number. Time complexity is O(n²) on average, and worst-case runtime is technically unbounded since you're relying on luck for each pick. For 10,000 numbers it's probably fast enough in practice, but it's doing a lot of unnecessary work.

**Sort-based shuffle** — generate all the numbers, attach a random value to each, then sort by that random value. Gets you a valid shuffle in O(n log n) time and avoids collisions entirely. The problem is you're paying the cost of a sort when you don't need to. It also has a subtle bias if your random values aren't truly unique, which isn't guaranteed with floating-point.

**Fisher-Yates** is the right answer here. You start with the numbers already in order and walk backwards from the last element to the second. At each position `i` you swap the current element with a randomly chosen element from the range `[0, i]` — including itself, so elements can stay put. That's it. Every permutation is equally probable by construction, there are no retries, no wasted picks, and no sorting overhead.

```
[1, 2, 3, 4, 5]
 i=4: swap index 4 with random index in [0,4] → [1, 4, 3, 2, 5] (example)
 i=3: swap index 3 with random index in [0,3] → [2, 4, 3, 1, 5]
 i=2: swap index 2 with random index in [0,2] → [4, 2, 3, 1, 5]
 i=1: swap index 1 with random index in [0,1] → [2, 4, 3, 1, 5]
done
```

### Complexity

| | Reject sampling | Sort-based | Fisher-Yates |
|---|---|---|---|
| Time | O(n²) avg, unbounded worst | O(n log n) | O(n) |
| Space | O(n) | O(n) | O(n) |

All three need O(n) space to hold the output, so there's no difference there. The gap is entirely in time. Fisher-Yates makes exactly n−1 swaps and n−1 random number calls — one pass, no extras.

### Memory

The numbers are stored in an `Int32Array` rather than a plain JS array. A regular JS array of 10,000 numbers stores each value as a 64-bit float (8 bytes) inside a heap object with pointer overhead per element — closer to 80–90 bytes per slot in V8. An `Int32Array` packs values as 32-bit integers with no per-element overhead, so the buffer is exactly 40KB (10,000 × 4 bytes). That's roughly a 20× reduction in memory for the number storage alone. At this scale it doesn't matter, but it's the semantically correct type for a list of integers and V8 can apply tighter optimisations to typed array iteration.

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