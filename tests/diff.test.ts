import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { compareFiles, formatDiffPreview } from "../src/utils/diff.js";

let tmp: string;
beforeEach(() => {
  tmp = mkdtempSync(path.join(tmpdir(), "ch-diff-"));
});

describe("compareFiles", () => {
  it("returns NEW when destination missing", async () => {
    const src = path.join(tmp, "src.txt");
    writeFileSync(src, "x");
    expect(await compareFiles(src, path.join(tmp, "nope.txt"))).toBe("NEW");
  });

  it("returns SAME when content identical", async () => {
    const src = path.join(tmp, "src.txt");
    const dst = path.join(tmp, "dst.txt");
    writeFileSync(src, "abc");
    writeFileSync(dst, "abc");
    expect(await compareFiles(src, dst)).toBe("SAME");
  });

  it("returns DIFFERENT when content differs", async () => {
    const src = path.join(tmp, "src.txt");
    const dst = path.join(tmp, "dst.txt");
    writeFileSync(src, "abc");
    writeFileSync(dst, "xyz");
    expect(await compareFiles(src, dst)).toBe("DIFFERENT");
  });
});

describe("formatDiffPreview", () => {
  it("shows + and - prefixed lines", () => {
    const out = formatDiffPreview("a\nb\nc", "a\nx\nc");
    expect(out).toContain("- b");
    expect(out).toContain("+ x");
  });

  it("truncates to maxLines", () => {
    const expected = "a\n".repeat(50);
    const actual = "b\n".repeat(50);
    const out = formatDiffPreview(expected, actual, 10);
    expect(out.split("\n").length).toBeLessThanOrEqual(12);
  });
});
