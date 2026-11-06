/**
 * How big a file this site will take. Everything happens in one browser tab, and the tab holds the file several times over
 * (read, parsed, and the result), so memory is the real limit, and a phone has the least. Over WARN the tool says so; over MAX
 * it refuses, instead of letting the tab run out of memory without a word.
 */
export const WARN_BYTES = 50 * 1024 * 1024;
export const MAX_BYTES = 300 * 1024 * 1024;
