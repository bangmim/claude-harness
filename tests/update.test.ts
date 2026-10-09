import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runUpdate } from "../src/commands/update.js";

let tmpPkg: string;
let tmpCwd: string;

const SAMPLE_HARNESS_CLAUDE = `# 작업 규칙

<!-- ch:managed start -->
- new managed rule
<!-- ch:managed end -->

<!-- ch:user start -->
<!-- ch:user end -->
`;

const SAMPLE_LOCAL_CLAUDE = `# 작업 규칙

<!-- ch:managed start -->
- old managed rule
<!-- ch:managed end -->

<!-- ch:user start -->
MY CUSTOM PROJECT NOTE
<!-- ch:user end -->
`;

beforeEach(() => {
  tmpPkg = mkdtempSync(path.join(tmpdir(), "ch-pkg-"));
  tmpCwd = mkdtempSync(path.join(tmpdir(), "ch-cwd-"));
  mkdirSync(path.join(tmpPkg, "templates/project"), { recursive: true });
  writeFileSync(path.join(tmpPkg, "templates/project/CLAUDE.md"), SAMPLE_HARNESS_CLAUDE);
  writeFileSync(path.join(tmpPkg, "templates/project/PLAN.md"), "# plan\n");
  writeFileSync(path.join(tmpPkg, "manifest.json"), JSON.stringify({
    user: [],
    project: [
      { source: "templates/project/CLAUDE.md", target: "./CLAUDE.md", mode: "markers" },
      { source: "templates/project/PLAN.md", target: "./PLAN.md", mode: "init-only" }
    ]
  }));
});

describe("runUpdate", () => {
  it("markers mode: replaces managed body, preserves ch:user", async () => {
    writeFileSync(path.join(tmpCwd, "CLAUDE.md"), SAMPLE_LOCAL_CLAUDE);
    await runUpdate({
      packageRoot: tmpPkg, cwd: tmpCwd, dryRun: false,
      prompt: async () => false, log: () => {}
    });
    const updated = readFileSync(path.join(tmpCwd, "CLAUDE.md"), "utf8");
    expect(updated).toContain("new managed rule");
    expect(updated).not.toContain("old managed rule");
    expect(updated).toContain("MY CUSTOM PROJECT NOTE");
  });

  it("init-only mode: never touches existing file", async () => {
    writeFileSync(path.join(tmpCwd, "PLAN.md"), "MY PLAN WITH REAL WORK");
    await runUpdate({
      packageRoot: tmpPkg, cwd: tmpCwd, dryRun: false,
      prompt: async () => false, log: () => {}
    });
    expect(readFileSync(path.join(tmpCwd, "PLAN.md"), "utf8")).toBe("MY PLAN WITH REAL WORK");
  });

  it("installs all missing files when nothing exists (Review Focus #4)", async () => {
    await runUpdate({
      packageRoot: tmpPkg, cwd: tmpCwd, dryRun: false,
      prompt: async () => false, log: () => {}
    });
    expect(existsSync(path.join(tmpCwd, "CLAUDE.md"))).toBe(true);
    expect(existsSync(path.join(tmpCwd, "PLAN.md"))).toBe(true);
  });

  it("markers mode broken: prompts for full replace", async () => {
    writeFileSync(path.join(tmpCwd, "CLAUDE.md"), "no markers here");
    let promptCalled = false;
    await runUpdate({
      packageRoot: tmpPkg, cwd: tmpCwd, dryRun: false,
      prompt: async () => { promptCalled = true; return false; },
      log: () => {}
    });
    expect(promptCalled).toBe(true);
    expect(readFileSync(path.join(tmpCwd, "CLAUDE.md"), "utf8")).toBe("no markers here");
  });
});
