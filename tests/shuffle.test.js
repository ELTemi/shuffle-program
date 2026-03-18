"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  generateNumbersToShuffle,
  shuffleInPlace,
  verifyResult,
  runShuffle,
  LO_BOUND,
  HI_BOUND,
} = require("../shuffle");

// ── generateNumbersToShuffle ──────────────────────────────────────────────────

describe("generateNumbersToShuffle", () => {
  it("returns an Int32Array", () => {
    const result = generateNumbersToShuffle(1, 5);
    assert.ok(result instanceof Int32Array);
  });

  it("returns the correct length", () => {
    assert.equal(generateNumbersToShuffle(1, 10).length, 10);
    assert.equal(generateNumbersToShuffle(1, 10000).length, 10000);
  });

  it("starts at lowerBound and ends at upperBound", () => {
    const result = generateNumbersToShuffle(1, 100);
    assert.equal(result[0], 1);
    assert.equal(result[result.length - 1], 100);
  });

  it("contains consecutive integers with no gaps", () => {
    const result = generateNumbersToShuffle(1, 50);
    for (let i = 0; i < result.length; i++) {
      assert.equal(result[i], i + 1);
    }
  });

  it("works for a single-element range", () => {
    const result = generateNumbersToShuffle(7, 7);
    assert.equal(result.length, 1);
    assert.equal(result[0], 7);
  });

  it("works for negative ranges", () => {
    const result = generateNumbersToShuffle(-3, 3);
    assert.equal(result.length, 7);
    assert.equal(result[0], -3);
    assert.equal(result[result.length - 1], 3);
  });

  it("throws RangeError when lowerBound > upperBound", () => {
    assert.throws(
      () => generateNumbersToShuffle(10, 1),
      RangeError,
    );
  });

  it("throws RangeError for non-integer lowerBound", () => {
    assert.throws(
      () => generateNumbersToShuffle(1.5, 10),
      RangeError,
    );
  });

  it("throws RangeError for non-integer upperBound", () => {
    assert.throws(
      () => generateNumbersToShuffle(1, 9.9),
      RangeError,
    );
  });

  it("throws RangeError for non-finite values", () => {
    assert.throws(() => generateNumbersToShuffle(Infinity, 10), RangeError);
    assert.throws(() => generateNumbersToShuffle(1, NaN),      RangeError);
  });
});

// ── shuffleInPlace ────────────────────────────────────────────────────────────

describe("shuffleInPlace", () => {
  it("returns the same array reference (mutates in place)", () => {
    const arr = new Int32Array([1, 2, 3, 4, 5]);
    const result = shuffleInPlace(arr);
    assert.equal(result, arr);
  });

  it("preserves the array length", () => {
    const arr = generateNumbersToShuffle(1, 100);
    shuffleInPlace(arr);
    assert.equal(arr.length, 100);
  });

  it("contains exactly the same set of values after shuffling", () => {
    const arr = generateNumbersToShuffle(1, 200);
    const before = new Set(arr);
    shuffleInPlace(arr);
    const after = new Set(arr);

    assert.equal(after.size, before.size);
    for (const n of before) assert.ok(after.has(n));
  });

  it("handles a single-element array without error", () => {
    const arr = new Int32Array([42]);
    shuffleInPlace(arr);
    assert.equal(arr[0], 42);
  });

  it("produces a different order on repeated runs (statistical check)", () => {
    // The chance of two independent shuffles of 100 elements being identical
    // is 1/100! — effectively impossible.
    const a = shuffleInPlace(generateNumbersToShuffle(1, 100));
    const b = shuffleInPlace(generateNumbersToShuffle(1, 100));
    const identical = Array.from(a).every((v, i) => v === b[i]);
    assert.ok(!identical, "Two independent shuffles should not be identical");
  });
});

// ── verifyResult ──────────────────────────────────────────────────────────────

describe("verifyResult", () => {
  it("returns true for a correctly shuffled full range", () => {
    const shuffled = shuffleInPlace(generateNumbersToShuffle(LO_BOUND, HI_BOUND));
    assert.equal(verifyResult(shuffled), true);
  });

  it("returns true for the unshuffled (sorted) range", () => {
    const sorted = generateNumbersToShuffle(LO_BOUND, HI_BOUND);
    assert.equal(verifyResult(sorted), true);
  });

  it("returns false when the array is too short", () => {
    const short = generateNumbersToShuffle(LO_BOUND, HI_BOUND - 1);
    assert.equal(verifyResult(short), false);
  });

  it("returns false when the array is too long", () => {
    const long = new Int32Array(HI_BOUND + 1);
    assert.equal(verifyResult(long), false);
  });

  it("returns false when a value is below LO_BOUND", () => {
    const arr = generateNumbersToShuffle(LO_BOUND, HI_BOUND);
    arr[0] = LO_BOUND - 1;
    assert.equal(verifyResult(arr), false);
  });

  it("returns false when a value is above HI_BOUND", () => {
    const arr = generateNumbersToShuffle(LO_BOUND, HI_BOUND);
    arr[0] = HI_BOUND + 1;
    assert.equal(verifyResult(arr), false);
  });

  it("returns false when a duplicate exists", () => {
    const arr = generateNumbersToShuffle(LO_BOUND, HI_BOUND);
    arr[0] = arr[1]; // force a duplicate
    assert.equal(verifyResult(arr), false);
  });
});

// ── runShuffle ────────────────────────────────────────────────────────────────

describe("runShuffle", () => {
  it("returns an object with the expected keys", () => {
    const result = runShuffle();
    for (const key of ["numbers", "shuffledAt", "elapsed", "verified", "total"]) {
      assert.ok(Object.hasOwn(result, key), `missing key: ${key}`);
    }
  });

  it("numbers array has the correct length", () => {
    const { numbers } = runShuffle();
    assert.equal(numbers.length, HI_BOUND - LO_BOUND + 1);
  });

  it("total matches the numbers array length", () => {
    const { numbers, total } = runShuffle();
    assert.equal(total, numbers.length);
  });

  it("verified is true", () => {
    assert.equal(runShuffle().verified, true);
  });

  it("elapsed is a non-negative number", () => {
    const { elapsed } = runShuffle();
    assert.equal(typeof elapsed, "number");
    assert.ok(elapsed >= 0);
  });

  it("shuffledAt is a valid ISO 8601 timestamp", () => {
    const { shuffledAt } = runShuffle();
    assert.ok(!isNaN(Date.parse(shuffledAt)), `invalid timestamp: ${shuffledAt}`);
  });

  it("produces a different order on each call", () => {
    const a = runShuffle().numbers;
    const b = runShuffle().numbers;
    const identical = a.every((v, i) => v === b[i]);
    assert.ok(!identical, "Two consecutive shuffles should not be identical");
  });
});