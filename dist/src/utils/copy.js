import { access, mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
export async function fileExists(abs) {
    try {
        await access(abs);
        return true;
    }
    catch {
        return false;
    }
}
export async function readFileUtf8(abs) {
    return readFile(abs, "utf8");
}
export async function writeFileUtf8(abs, content) {
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, content, "utf8");
}
async function sha256(abs) {
    const buf = await readFile(abs);
    return createHash("sha256").update(buf).digest("hex");
}
export async function copyFileSameContentSkip(src, dst) {
    if (await fileExists(dst)) {
        const [h1, h2] = await Promise.all([sha256(src), sha256(dst)]);
        if (h1 === h2)
            return "skipped-same";
    }
    await mkdir(path.dirname(dst), { recursive: true });
    await copyFile(src, dst);
    return "wrote";
}
export async function backupFile(abs, backupRoot) {
    const backupPath = path.join(backupRoot, path.basename(abs));
    await mkdir(backupRoot, { recursive: true });
    await copyFile(abs, backupPath);
    return backupPath;
}
export function timestampString() {
    const d = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
