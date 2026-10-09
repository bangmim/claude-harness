import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { installUser, InstallReport } from "../src/install/user.js";
import type { Manifest } from "../src/utils/manifest.js";

let tmpPkg: string;
let tmpHome: string;

beforeEach(() => {
  tmpPkg = mkdtempSync(path.join(tmpdir(), "ch-pkg-"));
  tmpHome = mkdtempSync(path.join(tmpdir(), "ch-home-"));
  mkdirSync(path.join(tmpPkg, "templates/user/commands"), { recursive: true });
  writeFileSync(path.join(tmpPkg, "templates/user/commands/blog.md"), "BLOG CONTENT");
});

function manifest(): Manifest {
  return {
    user: [{
      source: "templates/user/commands/blog.md",
      target: path.join(tmpHome, ".claude/commands/blog.md"),
      mode: "whole"
    }],
    project: []
  };
}

describe("installUser", () => {
  it("installs file when destination missing", async () => {
    const report = await installUser(manifest(), { packageRoot: tmpPkg, force: false, dryRun: false });
    expect(report.installed).toHaveLength(1);
    expect(report.skipped).toHaveLength(0);
    expect(readFileSync(path.join(tmpHome, ".claude/commands/blog.md"), "utf8")).toBe("BLOG CONTENT");
  });

  it("skips existing file without --force", async () => {
    mkdirSync(path.join(tmpHome, ".claude/commands"), { recursive: true });
    writeFileSync(path.join(tmpHome, ".claude/commands/blog.md"), "USER CUSTOM");
    const report = await installUser(manifest(), { packageRoot: tmpPkg, force: false, dryRun: false });
    expect(report.skipped).toHaveLength(1);
    expect(readFileSync(path.join(tmpHome, ".claude/commands/blog.md"), "utf8")).toBe("USER CUSTOM");
  });

  it("overwrites with --force (and backs up)", async () => {
    mkdirSync(path.join(tmpHome, ".claude/commands"), { recursive: true });
    writeFileSync(path.join(tmpHome, ".claude/commands/blog.md"), "USER CUSTOM");
    const report = await installUser(manifest(), { packageRoot: tmpPkg, force: true, dryRun: false });
    expect(report.overwritten).toHaveLength(1);
    expect(readFileSync(path.join(tmpHome, ".claude/commands/blog.md"), "utf8")).toBe("BLOG CONTENT");
    expect(report.backupDir).toBeDefined();
    expect(existsSync(path.join(report.backupDir!, "blog.md"))).toBe(true);
  });

  it("dry-run reports but does not write", async () => {
    const report = await installUser(manifest(), { packageRoot: tmpPkg, force: false, dryRun: true });
    expect(report.installed).toHaveLength(1);
    expect(existsSync(path.join(tmpHome, ".claude/commands/blog.md"))).toBe(false);
  });
});
