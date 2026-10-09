import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  fileExists,
  readFileUtf8,
  writeFileUtf8,
  copyFileSameContentSkip,
  backupFile,
  timestampString
} from "../src/utils/copy.js";

let tmp: string;
beforeEach(() => {
  tmp = mkdtempSync(path.join(tmpdir(), "ch-copy-"));
});

describe("fileExists", () => {
  it("returns true if exists", async () => {
    const p = path.join(tmp, "a.txt");
    writeFileSync(p, "hi");
    expect(await fileExists(p)).toBe(true);
  });
  it("returns false if not", async () => {
    expect(await fileExists(path.join(tmp, "nope.txt"))).toBe(false);
  });
});

describe("writeFileUtf8", () => {
  it("creates parent dir if missing", async () => {
    const p = path.join(tmp, "nested/deep/a.txt");
    await writeFileUtf8(p, "hello");
    expect(readFileSync(p, "utf8")).toBe("hello");
  });
});

describe("copyFileSameContentSkip", () => {
  it("writes when destination missing", async () => {
    const src = path.join(tmp, "src.txt");
    const dst = path.join(tmp, "dst.txt");
    writeFileSync(src, "hello");
    const result = await copyFileSameContentSkip(src, dst);
    expect(result).toBe("wrote");
    expect(readFileSync(dst, "utf8")).toBe("hello");
  });

  it("skips when destination has same content (Review Focus #5)", async () => {
    const src = path.join(tmp, "src.txt");
    const dst = path.join(tmp, "dst.txt");
    writeFileSync(src, "hello");
    writeFileSync(dst, "hello");
    const mtimeBefore = require("node:fs").statSync(dst).mtimeMs;
    await new Promise(r => setTimeout(r, 10));
    const result = await copyFileSameContentSkip(src, dst);
    expect(result).toBe("skipped-same");
    const mtimeAfter = require("node:fs").statSync(dst).mtimeMs;
    expect(mtimeAfter).toBe(mtimeBefore);
  });

  it("writes when destination has different content", async () => {
    const src = path.join(tmp, "src.txt");
    const dst = path.join(tmp, "dst.txt");
    writeFileSync(src, "new");
    writeFileSync(dst, "old");
    const result = await copyFileSameContentSkip(src, dst);
    expect(result).toBe("wrote");
    expect(readFileSync(dst, "utf8")).toBe("new");
  });
});

describe("backupFile", () => {
  it("copies file to backup root with original filename", async () => {
    const src = path.join(tmp, "a.txt");
    writeFileSync(src, "data");
    const backupRoot = path.join(tmp, ".backup/20261009-120000");
    const backupPath = await backupFile(src, backupRoot);
    expect(existsSync(backupPath)).toBe(true);
    expect(readFileSync(backupPath, "utf8")).toBe("data");
    expect(backupPath).toContain(backupRoot);
  });
});

describe("timestampString", () => {
  it("returns YYYYMMDD-HHMMSS format", () => {
    const ts = timestampString();
    expect(ts).toMatch(/^\d{8}-\d{6}$/);
  });
});
