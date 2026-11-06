import { test, expect } from "@playwright/test";
import { formatRanges, parseRanges } from "../lib/ranges";

test.describe("page ranges", () => {
  test("parses pages and ranges, in order, without duplicates", () => {
    expect(parseRanges("2, 5-7", 10)).toEqual({ pages: [2, 5, 6, 7] });
    expect(parseRanges("5 - 7", 10).pages).toEqual([5, 6, 7]);
    expect(parseRanges("3,1,3,2", 10).pages).toEqual([1, 2, 3]);
    expect(parseRanges("", 10).pages).toEqual([]);
  });
  test("explains what is wrong in plain words", () => {
    expect(parseRanges("11", 10).error).toBe("Pages go from 1 to 10.");
    expect(parseRanges("0", 10).error).toBe("Pages go from 1 to 10.");
    expect(parseRanges("7-5", 10).error).toContain("backwards");
    expect(parseRanges("two", 10).error).toContain("isn't a page");
  });
  test("formats a selection back into the shortest ranges", () => {
    expect(formatRanges([2, 5, 6, 7])).toBe("2, 5-7");
    expect(formatRanges([1, 2, 3])).toBe("1-3");
    expect(formatRanges([4])).toBe("4");
    expect(formatRanges([])).toBe("");
    expect(formatRanges(new Set([9, 3, 4, 1]))).toBe("1, 3-4, 9");
  });
});
