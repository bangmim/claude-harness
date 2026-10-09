import os from "node:os";
import path from "node:path";
export function expandPath(p) {
    if (p === "~")
        return os.homedir();
    if (p.startsWith("~/"))
        return path.join(os.homedir(), p.slice(2));
    return p;
}
export const USER_CLAUDE_DIR = expandPath("~/.claude");
export function projectClaudeDir(cwd = process.cwd()) {
    return path.join(cwd, ".claude");
}
