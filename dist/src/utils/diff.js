import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileExists } from "./copy.js";
export async function compareFiles(srcAbs, dstAbs) {
    if (!(await fileExists(dstAbs)))
        return "NEW";
    const [a, b] = await Promise.all([
        readFile(srcAbs).then(buf => createHash("sha256").update(buf).digest("hex")),
        readFile(dstAbs).then(buf => createHash("sha256").update(buf).digest("hex"))
    ]);
    return a === b ? "SAME" : "DIFFERENT";
}
export function formatDiffPreview(expected, actual, maxLines = 20) {
    const exp = expected.split("\n");
    const act = actual.split("\n");
    const lines = [];
    const n = Math.max(exp.length, act.length);
    for (let i = 0; i < n && lines.length < maxLines; i++) {
        if (exp[i] === act[i])
            continue;
        if (exp[i] !== undefined)
            lines.push(`- ${exp[i]}`);
        if (act[i] !== undefined)
            lines.push(`+ ${act[i]}`);
    }
    if (lines.length >= maxLines)
        lines.push(`... (truncated at ${maxLines} lines)`);
    return lines.join("\n");
}
