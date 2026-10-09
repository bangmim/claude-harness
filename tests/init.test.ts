import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runInit } from "../src/commands/init.js";

let tmpPkg: string;
let tmpCwd: string;

beforeEach(() => {
  tmpPkg = mkdtempSync(path.join(tmpdir(), "ch-pkg-"));
  tmpCwd = mkdtempSync(path.join(tmpdir(), "ch-cwd-"));
  mkdirSync(path.join(tmpPkg, "templates/project"), { recursive: true });
  writeFileSync(path.join(tmpPkg, "templates/project/CLAUDE.md"), "HARNESS CLAUDE");
  writeFileSync(path.join(tmpPkg, "templates/project/PLAN.md"), "# {{PROJECT_NAME}}\n");
  writeFileSync(path.join(tmpPkg, "manifest.json"), JSON.stringify({
    user: [],
    project: [
      { source: "templates/project/CLAUDE.md", target: "./CLAUDE.md", mode: "markers" },
      { source: "templates/project/PLAN.md", target: "./PLAN.md", mode: "init-only",
        substitute: { "{{PROJECT_NAME}}": "basename(cwd)" } }
    ]
  }));
});

describe("runInit", () => {
  it("installs project files on empty cwd", async () => {
    const logs: string[] = [];
    await runInit({
      packageRoot: tmpPkg,
      cwd: tmpCwd,
      force: false,
      projectOnly: true,
      dryRun: false,
      prompt: async () => false,
      log: (s) => logs.push(s)
    });
    expect(existsSync(path.join(tmpCwd, "CLAUDE.md"))).toBe(true);
    expect(existsSync(path.join(tmpCwd, "PLAN.md"))).toBe(true);
    expect(logs.some(l => l.includes("설치 완료"))).toBe(true);
  });

  it("adds .backup/ to .gitignore", async () => {
    await runInit({
      packageRoot: tmpPkg, cwd: tmpCwd, force: false, projectOnly: true, dryRun: false,
      prompt: async () => false, log: () => {}
    });
    const gi = readFileSync(path.join(tmpCwd, ".gitignore"), "utf8");
    expect(gi).toContain(".backup/");
  });

  it("does not duplicate .backup/ in existing .gitignore", async () => {
    writeFileSync(path.join(tmpCwd, ".gitignore"), "node_modules/\n.backup/\n");
    await runInit({
      packageRoot: tmpPkg, cwd: tmpCwd, force: false, projectOnly: true, dryRun: false,
      prompt: async () => false, log: () => {}
    });
    const gi = readFileSync(path.join(tmpCwd, ".gitignore"), "utf8");
    const occurrences = gi.split("\n").filter(l => l.trim() === ".backup/").length;
    expect(occurrences).toBe(1);
  });

  it("works when run inside a worktree-like layout (Review Focus #3)", async () => {
    writeFileSync(path.join(tmpCwd, ".git"), "gitdir: /tmp/some-main-repo/.git/worktrees/x\n");
    await runInit({
      packageRoot: tmpPkg, cwd: tmpCwd, force: false, projectOnly: true, dryRun: false,
      prompt: async () => false, log: () => {}
    });
    expect(existsSync(path.join(tmpCwd, "CLAUDE.md"))).toBe(true);
  });
});
