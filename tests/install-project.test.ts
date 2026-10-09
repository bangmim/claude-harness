import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { analyzeProjectState, installProject } from "../src/install/project.js";
import type { Manifest } from "../src/utils/manifest.js";

let tmpPkg: string;
let tmpCwd: string;

beforeEach(() => {
  tmpPkg = mkdtempSync(path.join(tmpdir(), "ch-pkg-"));
  tmpCwd = mkdtempSync(path.join(tmpdir(), "ch-cwd-"));
  mkdirSync(path.join(tmpPkg, "templates/project"), { recursive: true });
  writeFileSync(path.join(tmpPkg, "templates/project/CLAUDE.md"), "HARNESS CLAUDE");
  writeFileSync(path.join(tmpPkg, "templates/project/PLAN.md"), "# {{PROJECT_NAME}}\n");
});

function manifest(): Manifest {
  return {
    user: [],
    project: [
      { source: "templates/project/CLAUDE.md", target: "./CLAUDE.md", mode: "markers" },
      {
        source: "templates/project/PLAN.md",
        target: "./PLAN.md",
        mode: "init-only",
        substitute: { "{{PROJECT_NAME}}": "basename(cwd)" }
      }
    ]
  };
}

describe("analyzeProjectState", () => {
  it("marks all NEW when nothing installed", async () => {
    const states = await analyzeProjectState(manifest(), { packageRoot: tmpPkg, cwd: tmpCwd });
    expect(states.map(s => s.state)).toEqual(["NEW", "NEW"]);
  });

  it("marks SAME when identical", async () => {
    writeFileSync(path.join(tmpCwd, "CLAUDE.md"), "HARNESS CLAUDE");
    const states = await analyzeProjectState(manifest(), { packageRoot: tmpPkg, cwd: tmpCwd });
    expect(states.find(s => s.dstAbs.endsWith("CLAUDE.md"))!.state).toBe("SAME");
  });

  it("marks DIFFERENT when content differs", async () => {
    writeFileSync(path.join(tmpCwd, "CLAUDE.md"), "USER MODIFIED");
    const states = await analyzeProjectState(manifest(), { packageRoot: tmpPkg, cwd: tmpCwd });
    expect(states.find(s => s.dstAbs.endsWith("CLAUDE.md"))!.state).toBe("DIFFERENT");
  });
});

describe("installProject", () => {
  it("installs NEW files, substitutes {{PROJECT_NAME}}", async () => {
    const states = await analyzeProjectState(manifest(), { packageRoot: tmpPkg, cwd: tmpCwd });
    const prompt = async () => false;
    const report = await installProject(states, { force: false, dryRun: false, prompt, cwd: tmpCwd });
    expect(report.installed).toContain(path.join(tmpCwd, "CLAUDE.md"));
    const plan = readFileSync(path.join(tmpCwd, "PLAN.md"), "utf8");
    expect(plan).toBe(`# ${path.basename(tmpCwd)}\n`);
  });

  it("skips DIFFERENT when prompt returns false (default N)", async () => {
    writeFileSync(path.join(tmpCwd, "CLAUDE.md"), "USER MODIFIED");
    const states = await analyzeProjectState(manifest(), { packageRoot: tmpPkg, cwd: tmpCwd });
    const prompt = async () => false;
    const report = await installProject(states, { force: false, dryRun: false, prompt, cwd: tmpCwd });
    expect(report.skipped.map(p => path.basename(p))).toContain("CLAUDE.md");
    expect(readFileSync(path.join(tmpCwd, "CLAUDE.md"), "utf8")).toBe("USER MODIFIED");
  });

  it("overwrites DIFFERENT when prompt returns true, with backup", async () => {
    writeFileSync(path.join(tmpCwd, "CLAUDE.md"), "USER MODIFIED");
    const states = await analyzeProjectState(manifest(), { packageRoot: tmpPkg, cwd: tmpCwd });
    const prompt = async () => true;
    const report = await installProject(states, { force: false, dryRun: false, prompt, cwd: tmpCwd });
    expect(report.overwritten.map(p => path.basename(p))).toContain("CLAUDE.md");
    expect(readFileSync(path.join(tmpCwd, "CLAUDE.md"), "utf8")).toBe("HARNESS CLAUDE");
    expect(report.backupDir).toBeDefined();
    expect(existsSync(path.join(report.backupDir!, "CLAUDE.md"))).toBe(true);
  });

  it("init-only: skips if dst exists (even DIFFERENT)", async () => {
    writeFileSync(path.join(tmpCwd, "PLAN.md"), "USER PLAN");
    const states = await analyzeProjectState(manifest(), { packageRoot: tmpPkg, cwd: tmpCwd });
    const prompt = async () => true;
    const report = await installProject(states, { force: false, dryRun: false, prompt, cwd: tmpCwd });
    expect(report.skipped.map(p => path.basename(p))).toContain("PLAN.md");
    expect(readFileSync(path.join(tmpCwd, "PLAN.md"), "utf8")).toBe("USER PLAN");
  });

  it("{{PROJECT_NAME}} substitution preserves special chars (Review Focus #2)", async () => {
    const spacedCwd = mkdtempSync(path.join(tmpdir(), "ch space "));
    const states = await analyzeProjectState(manifest(), { packageRoot: tmpPkg, cwd: spacedCwd });
    const report = await installProject(states, { force: false, dryRun: false, prompt: async () => false, cwd: spacedCwd });
    const plan = readFileSync(path.join(spacedCwd, "PLAN.md"), "utf8");
    expect(plan).toContain(path.basename(spacedCwd));
  });

  it("markers-mode DIFFERENT with valid markers: replaces managed section only, preserves ch:user, no prompt", async () => {
    const harnessCLAUDE = `# 작업 규칙

<!-- ch:managed start -->
- new managed rule
<!-- ch:managed end -->

<!-- ch:user start -->
<!-- ch:user end -->
`;
    const localCLAUDE = `# 작업 규칙

<!-- ch:managed start -->
- old managed rule
<!-- ch:managed end -->

<!-- ch:user start -->
MY CUSTOM RULES THAT MUST SURVIVE
<!-- ch:user end -->
`;
    writeFileSync(path.join(tmpPkg, "templates/project/CLAUDE.md"), harnessCLAUDE);
    writeFileSync(path.join(tmpCwd, "CLAUDE.md"), localCLAUDE);

    let promptCalled = false;
    const states = await analyzeProjectState(manifest(), { packageRoot: tmpPkg, cwd: tmpCwd });
    const report = await installProject(states, {
      force: false, dryRun: false,
      prompt: async () => { promptCalled = true; return true; },
      cwd: tmpCwd
    });

    const updated = readFileSync(path.join(tmpCwd, "CLAUDE.md"), "utf8");
    expect(updated).toContain("new managed rule");
    expect(updated).not.toContain("old managed rule");
    expect(updated).toContain("MY CUSTOM RULES THAT MUST SURVIVE");
    expect(promptCalled).toBe(false);
    expect(report.overwritten.map(p => path.basename(p))).toContain("CLAUDE.md");
  });

  it("DIFFERENT whole-mode prompt shows diff preview (spec 5.3)", async () => {
    const wholeManifest = {
      user: [],
      project: [
        { source: "templates/project/CLAUDE.md", target: "./CLAUDE.md", mode: "whole" as const }
      ]
    };
    writeFileSync(path.join(tmpCwd, "CLAUDE.md"), "LOCAL VERSION LINE 1\nLOCAL LINE 2");
    writeFileSync(path.join(tmpPkg, "templates/project/CLAUDE.md"), "HARNESS LINE 1\nHARNESS LINE 2");

    const logs: string[] = [];
    const states = await analyzeProjectState(wholeManifest, { packageRoot: tmpPkg, cwd: tmpCwd });
    await installProject(states, {
      force: false, dryRun: false,
      prompt: async (q) => { logs.push(`PROMPT: ${q}`); return false; },
      cwd: tmpCwd,
      log: (s: string) => logs.push(s)
    } as any);

    const combined = logs.join("\n");
    expect(combined).toMatch(/[-+] (LOCAL|HARNESS)/);
  });
});
