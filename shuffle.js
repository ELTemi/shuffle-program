"use strict";

const LO_BOUND = 1;
const HI_BOUND = 10000;

/**
 * Populates an Int32Array with consecutive integers from lowerBound to
 * upperBound (both inclusive).
 *
 * @param {number} lowerBound - Must be a safe integer.
 * @param {number} upperBound - Must be a safe integer >= lowerBound.
 * @returns {Int32Array}
 * @throws {RangeError}
 */

function generateNumbersToShuffle(lowerBound, upperBound) {
  if (!Number.isSafeInteger(lowerBound) || !Number.isSafeInteger(upperBound)) {
    throw new RangeError(
      `lowerBound and upperBound must be safe integers; received lowerBound=${lowerBound}, upperBound=${upperBound}`,
    );
  }
  if (lowerBound > upperBound) {
    throw new RangeError(
      `lowerBound must be <= upperBound; received lowerBound=${lowerBound}, upperBound=${upperBound}`,
    );
  }

  const length = upperBound - lowerBound + 1;
  const arr = new Int32Array(length);
  for (let i = 0; i < length; i++) {
    arr[i] = i + lowerBound;
  }
  return arr;
}

/**
 * Shuffles an Int32Array in place using the Fisher-Yates algorithm.
 * Produces a uniformly random permutation in O(n) time.
 *
 * @param {Int32Array} arr - Modified in place.
 * @returns {Int32Array}
 */
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Verifies the result contains exactly the integers from LO_BOUND to HI_BOUND
 * with no duplicates and no out-of-range values.
 *
 * @param {Int32Array} numbers
 * @returns {boolean}
 */
function verifyResult(numbers) {
  const expected = HI_BOUND - LO_BOUND + 1;
  if (numbers.length !== expected) return false;

  const seen = new Set();
  for (const n of numbers) {
    if (n < LO_BOUND || n > HI_BOUND) return false;
    if (seen.has(n)) return false;
    seen.add(n);
  }
  return true;
}

/**
 * Generates a shuffled list of unique integers from LO_BOUND to HI_BOUND.
 * Times the shuffle and verifies the result before returning.
 *
 * @returns {{ numbers: number[], shuffledAt: string, elapsed: number, verified: boolean, total: number }}
 */
function runShuffle() {
  const numbers = generateNumbersToShuffle(LO_BOUND, HI_BOUND);

  const t0      = performance.now();
  const shuffled = shuffleInPlace(numbers);
  const elapsed  = parseFloat((performance.now() - t0).toFixed(3));

  return {
    numbers:    Array.from(shuffled),
    shuffledAt: new Date().toISOString(),
    elapsed,
    verified:   verifyResult(shuffled),
    total:      shuffled.length,
  };
}

module.exports = {
  generateNumbersToShuffle,
  shuffleInPlace,
  verifyResult,
  runShuffle,
  LO_BOUND,
  HI_BOUND,
};