import { describe, it, expect } from "vitest";
import { parseManifest } from "../src/utils/manifest.js";

describe("parseManifest", () => {
  it("accepts valid manifest with all modes", () => {
    const raw = {
      user: [
        { source: "a.md", target: "~/.claude/a.md", mode: "whole" }
      ],
      project: [
        { source: "b.md", target: "./b.md", mode: "markers" },
        { source: "c.md", target: "./c.md", mode: "init-only" },
        { source: "d", target: "./d", mode: "whole", recursive: true }
      ]
    };
    const parsed = parseManifest(raw);
    expect(parsed.user).toHaveLength(1);
    expect(parsed.project).toHaveLength(3);
    expect(parsed.project[1].mode).toBe("init-only");
  });

  it("rejects unknown mode", () => {
    const raw = { user: [], project: [{ source: "a", target: "./a", mode: "weird" }] };
    expect(() => parseManifest(raw)).toThrow();
  });

  it("accepts substitute map", () => {
    const raw = {
      user: [],
      project: [{ source: "PLAN.md", target: "./PLAN.md", mode: "init-only", substitute: { "{{X}}": "Y" } }]
    };
    const parsed = parseManifest(raw);
    expect(parsed.project[0].substitute).toEqual({ "{{X}}": "Y" });
  });
});
