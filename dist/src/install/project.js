import path from "node:path";
import { mkdir, copyFile, readdir, stat } from "node:fs/promises";
import { compareFiles } from "../utils/diff.js";
import { backupFile, timestampString, readFileUtf8, writeFileUtf8 } from "../utils/copy.js";
export async function analyzeProjectState(manifest, opts) {
    const results = [];
    for (const entry of manifest.project) {
        const srcAbs = path.join(opts.packageRoot, entry.source);
        const dstRel = entry.target.startsWith("./") ? entry.target.slice(2) : entry.target;
        const dstAbs = path.join(opts.cwd, dstRel);
        if (entry.recursive) {
            await walkCompare(srcAbs, dstAbs, entry, results);
        }
        else {
            const state = await compareFiles(srcAbs, dstAbs);
            results.push({ entry, srcAbs, dstAbs, state });
        }
    }
    return results;
}
async function walkCompare(srcRoot, dstRoot, entry, results) {
    async function walk(srcDir, dstDir) {
        const names = await readdir(srcDir);
        for (const name of names) {
            const srcChild = path.join(srcDir, name);
            const dstChild = path.join(dstDir, name);
            const st = await stat(srcChild);
            if (st.isDirectory()) {
                await walk(srcChild, dstChild);
            }
            else {
                const state = await compareFiles(srcChild, dstChild);
                results.push({ entry, srcAbs: srcChild, dstAbs: dstChild, state });
            }
        }
    }
    await walk(srcRoot, dstRoot);
}
export async function installProject(statuses, opts) {
    const report = { skipped: [], installed: [], overwritten: [] };
    const backupDir = path.join(opts.cwd, ".backup", timestampString());
    for (const s of statuses) {
        const { entry, srcAbs, dstAbs, state } = s;
        if (entry.mode === "init-only" && state !== "NEW") {
            report.skipped.push(dstAbs);
            continue;
        }
        if (state === "SAME") {
            report.skipped.push(dstAbs);
            continue;
        }
        if (state === "DIFFERENT") {
            let overwrite = opts.force;
            if (!overwrite) {
                overwrite = await opts.prompt(`${path.relative(opts.cwd, dstAbs)} 에 로컬 버전이 있습니다. 하네스 버전으로 덮어쓸까요? (y/N)`);
            }
            if (!overwrite) {
                report.skipped.push(dstAbs);
                continue;
            }
            if (!opts.dryRun) {
                await backupFile(dstAbs, backupDir);
                await writeWithSubstitutions(srcAbs, dstAbs, entry, opts.cwd);
            }
            report.overwritten.push(dstAbs);
            continue;
        }
        if (!opts.dryRun) {
            await writeWithSubstitutions(srcAbs, dstAbs, entry, opts.cwd);
        }
        report.installed.push(dstAbs);
    }
    if (report.overwritten.length > 0)
        report.backupDir = backupDir;
    return report;
}
async function writeWithSubstitutions(srcAbs, dstAbs, entry, cwd) {
    if (!entry.substitute) {
        await mkdir(path.dirname(dstAbs), { recursive: true });
        await copyFile(srcAbs, dstAbs);
        return;
    }
    const content = await readFileUtf8(srcAbs);
    const substituted = applySubstitutions(content, entry.substitute, cwd);
    await writeFileUtf8(dstAbs, substituted);
}
function applySubstitutions(content, subs, cwd) {
    let out = content;
    for (const [key, val] of Object.entries(subs)) {
        const resolvedVal = val === "basename(cwd)" ? path.basename(cwd) : val;
        out = out.split(key).join(resolvedVal);
    }
    return out;
}
