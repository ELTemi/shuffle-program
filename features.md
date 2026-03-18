# Features

## Entry point

`server.js` is where everything starts. Running `npm start` spins up a Node.js HTTP server on port 3000 that serves the browser UI as a static file and handles the two API routes. The shuffle logic itself lives in `shuffle.js` and is imported by the server — keeping the algorithm separate from the transport layer.

---

## Shuffle algorithm (`shuffle.js`)

The core of the app. Generates an ordered array of integers from 1 to 10,000, then runs a Fisher-Yates shuffle over it in place. The result is a uniformly random permutation with no repeated values and guaranteed O(n) performance.

A few specifics worth noting:

- Uses `Int32Array` instead of a plain JS array for the number buffer — more compact in memory and faster to iterate.
- `generateNumbersToShuffle` validates its inputs and throws a `RangeError` for non-integers, non-finite values, or an inverted range.
- `shuffleInPlace` mutates the array directly and returns the same reference.
- `runShuffle` wraps everything together — generates, shuffles, times it, verifies the result, and returns an object with the numbers and metadata.

---

## Result verification

After every shuffle, `verifyResult` runs a sanity check on the output. It confirms the array is exactly 10,000 elements, every value falls within [1, 10000], and there are no duplicates. The result shows up as a green PASS or red FAIL badge in the UI.

---

## REST API (`server.js`)

Two endpoints, no framework — just Node's built-in `http` module.

**`POST /api/shuffle`**
Triggers a fresh shuffle and caches the result in memory on the server. Returns only the metadata (total count, elapsed time, verification status, timestamp) so the response stays small. Clients call this first, then page through the numbers separately.

**`GET /api/numbers?page=1&pageSize=100`**
Returns a slice of the most recently shuffled list. Page size defaults to 100 and caps at 1000. Returns a 404 if no shuffle has been run yet and a 400 if the requested page is out of range.

The server also handles directory traversal attempts on static file requests by checking that the resolved path stays within the `public/` directory.

---

## Browser UI (`public/index.html`)

A single-page interface for triggering shuffles and browsing the results.

**Reshuffle button** — calls `POST /api/shuffle` and reloads the first page of results. Disabled while a request is in flight.

**Stats bar** — displays the total number count, the value range (1–10,000), how long the shuffle took in milliseconds, the timestamp it ran at, and the verification badge.

**Number grid** — renders the current page of numbers in a 10-column grid. Each cell highlights on hover.

**Pagination controls** — first, previous, next, and last buttons for navigating between pages. Buttons are disabled when they aren't applicable (e.g. previous is disabled on page 1).

**Loading overlay** — a spinner covers the grid while any request is pending, preventing interaction until the data is ready.

**Error banner** — if a fetch fails for any reason, an inline error message appears above the grid rather than silently dropping the failure.
