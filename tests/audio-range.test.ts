import test from "node:test";
import assert from "node:assert/strict";
import { byteRange } from "../scripts/byte-range.mjs";
test("audio byte ranges support seeks, suffixes and open-ended requests", () => {
  assert.deepEqual(byteRange("bytes=20-39", 100), { start: 20, end: 39 });
  assert.deepEqual(byteRange("bytes=50-", 100), { start: 50, end: 99 });
  assert.deepEqual(byteRange("bytes=-10", 100), { start: 90, end: 99 });
  assert.deepEqual(byteRange("bytes=90-200", 100), { start: 90, end: 99 });
});
test("invalid or unsatisfiable media ranges are rejected", () => {
  for (const range of [
    "bytes=100-",
    "bytes=60-20",
    "bytes=-0",
    "bytes=-",
    "bytes=0-1,3-4",
    "not-a-range",
  ])
    assert.equal(byteRange(range, 100), null);
});
