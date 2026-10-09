import { describe, it, expect } from "vitest";
import {
  detectMarkers,
  replaceManagedSection,
  extractManagedSection
} from "../src/utils/markers.js";

const sample = `# 작업 규칙

<!-- ch:managed start -->
- rule A
- rule B
<!-- ch:managed end -->

<!-- ch:user start -->
custom text here
<!-- ch:user end -->
`;

describe("detectMarkers", () => {
  it("detects both markers present", () => {
    expect(detectMarkers(sample)).toBe("both");
  });

  it("detects none when markers absent", () => {
    expect(detectMarkers("# just text\n")).toBe("none");
  });

  it("detects broken when only one managed marker", () => {
    expect(detectMarkers("<!-- ch:managed start -->\nX\n")).toBe("broken");
  });

  it("accepts CRLF (Review Focus #1)", () => {
    const crlf = sample.replace(/\n/g, "\r\n");
    expect(detectMarkers(crlf)).toBe("both");
  });

  it("accepts no-space marker (Review Focus #1)", () => {
    const compact = sample.replace(/<!-- ch:managed start -->/, "<!--ch:managed start-->")
                           .replace(/<!-- ch:managed end -->/, "<!--ch:managed end-->");
    expect(detectMarkers(compact)).toBe("both");
  });

  it("accepts indented marker (Review Focus #1)", () => {
    const indented = sample.replace(/<!-- ch:managed start -->/, "  <!-- ch:managed start -->");
    expect(detectMarkers(indented)).toBe("both");
  });
});

describe("extractManagedSection", () => {
  it("returns content between managed markers", () => {
    const got = extractManagedSection(sample);
    expect(got).toContain("rule A");
    expect(got).toContain("rule B");
    expect(got).not.toContain("ch:managed");
    expect(got).not.toContain("custom text");
  });
});

describe("replaceManagedSection", () => {
  it("replaces managed body only, preserving outside and ch:user", () => {
    const updated = replaceManagedSection(sample, "- new rule 1\n- new rule 2");
    expect(updated).toContain("# 작업 규칙");
    expect(updated).toContain("custom text here");
    expect(updated).toContain("- new rule 1");
    expect(updated).not.toContain("- rule A");
  });

  it("preserves content above ch:managed start", () => {
    const withAbove = "FREEFORM TOP\n\n" + sample;
    const updated = replaceManagedSection(withAbove, "- X");
    expect(updated.startsWith("FREEFORM TOP")).toBe(true);
  });

  it("preserves content below ch:user end", () => {
    const withBelow = sample + "\nFREEFORM BOTTOM\n";
    const updated = replaceManagedSection(withBelow, "- X");
    expect(updated.trimEnd().endsWith("FREEFORM BOTTOM")).toBe(true);
  });
});
