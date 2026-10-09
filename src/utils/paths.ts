import os from "node:os";
import path from "node:path";

export function expandPath(p: string): string {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

export const USER_CLAUDE_DIR = expandPath("~/.claude");

export function projectClaudeDir(cwd: string = process.cwd()): string {
  return path.join(cwd, ".claude");
}
