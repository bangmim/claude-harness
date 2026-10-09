import path from "node:path";
import os from "node:os";
import { readdir, stat, mkdir, copyFile } from "node:fs/promises";
import { fileExists, backupFile, timestampString } from "../utils/copy.js";
export async function installUser(manifest, opts) {
    const report = { skipped: [], installed: [], overwritten: [] };
    const backupDir = path.join(os.homedir(), ".claude/.backup", timestampString());
    for (const entry of manifest.user) {
        const srcAbs = path.join(opts.packageRoot, entry.source);
        const dstAbs = entry.target;
        if (entry.recursive) {
            await installRecursive(srcAbs, dstAbs, opts, report, backupDir, entry);
        }
        else {
            await installOne(srcAbs, dstAbs, opts, report, backupDir, entry);
        }
    }
    if (report.overwritten.length > 0)
        report.backupDir = backupDir;
    return report;
}
async function installOne(srcAbs, dstAbs, opts, report, backupDir, _entry) {
    const exists = await fileExists(dstAbs);
    if (!exists) {
        if (!opts.dryRun) {
            await mkdir(path.dirname(dstAbs), { recursive: true });
            await copyFile(srcAbs, dstAbs);
        }
        report.installed.push(dstAbs);
        return;
    }
    if (!opts.force) {
        report.skipped.push(dstAbs);
        return;
    }
    if (!opts.dryRun) {
        await backupFile(dstAbs, backupDir);
        await copyFile(srcAbs, dstAbs);
    }
    report.overwritten.push(dstAbs);
}
async function installRecursive(srcRoot, dstRoot, opts, report, backupDir, entry) {
    async function walk(srcDir, dstDir) {
        const entries = await readdir(srcDir);
        for (const name of entries) {
            const srcChild = path.join(srcDir, name);
            const dstChild = path.join(dstDir, name);
            const st = await stat(srcChild);
            if (st.isDirectory()) {
                await walk(srcChild, dstChild);
            }
            else {
                await installOne(srcChild, dstChild, opts, report, backupDir, entry);
            }
        }
    }
    await walk(srcRoot, dstRoot);
}
