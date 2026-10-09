import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { loadManifest } from "../utils/manifest.js";
import { fileExists } from "../utils/copy.js";
import { installUser } from "../install/user.js";
import { analyzeProjectState, installProject } from "../install/project.js";
export async function runInit(opts) {
    const manifest = loadManifest(opts.packageRoot);
    await envCheck(opts);
    let userReport = { skipped: [], installed: [], overwritten: [] };
    if (!opts.projectOnly) {
        opts.log("\n[1/3] 사용자 레벨 설치 (~/.claude/)");
        userReport = await installUser(manifest, {
            packageRoot: opts.packageRoot,
            force: opts.force,
            dryRun: opts.dryRun
        });
        reportLine(opts.log, userReport, "사용자");
    }
    opts.log("\n[2/3] 프로젝트 레벨 상태 분석");
    const statuses = await analyzeProjectState(manifest, {
        packageRoot: opts.packageRoot,
        cwd: opts.cwd
    });
    for (const s of statuses) {
        opts.log(`  ${s.state.padEnd(10)} ${path.relative(opts.cwd, s.dstAbs)}`);
    }
    opts.log("\n[3/3] 프로젝트 레벨 설치");
    const projReport = await installProject(statuses, {
        force: opts.force,
        dryRun: opts.dryRun,
        prompt: opts.prompt,
        cwd: opts.cwd,
        log: opts.log
    });
    reportLine(opts.log, projReport, "프로젝트");
    if (!opts.dryRun) {
        await ensureGitignore(opts.cwd);
    }
    opts.log("\n✅ 설치 완료");
    if (projReport.backupDir || userReport.backupDir) {
        opts.log(`💾 백업 위치: ${projReport.backupDir ?? userReport.backupDir}`);
        opts.log(`💡 오래된 백업은 수동 삭제 가능: rm -rf .backup/<old-timestamp>/`);
    }
    opts.log("\n다음 단계:");
    opts.log("  1. PLAN.md 열어서 작업 범위 적기");
    opts.log("  2. git init && git checkout -b feat/<...>");
    opts.log("  3. Claude Code 열어서 작업 시작");
}
async function envCheck(opts) {
    const hasEnv = await fileExists(path.join(opts.cwd, ".env"));
    const hasNodeModules = await fileExists(path.join(opts.cwd, "node_modules"));
    if ((hasEnv || hasNodeModules) && !opts.dryRun && !opts.force) {
        const ok = await opts.prompt("이미 진행 중인 프로젝트 같습니다 (.env 또는 node_modules 감지). 계속할까요? (y/N)");
        if (!ok) {
            opts.log("취소되었습니다.");
            process.exit(0);
        }
    }
}
async function ensureGitignore(cwd) {
    const giPath = path.join(cwd, ".gitignore");
    let content = "";
    if (await fileExists(giPath)) {
        content = await readFile(giPath, "utf8");
    }
    const lines = content.split("\n").map(l => l.trim());
    if (!lines.includes(".backup/")) {
        const newContent = content.endsWith("\n") || content === "" ? content + ".backup/\n" : content + "\n.backup/\n";
        await writeFile(giPath, newContent, "utf8");
    }
}
function reportLine(log, report, label) {
    log(`  ${label}: 신규 ${report.installed.length}, skip ${report.skipped.length}, 덮어씀 ${report.overwritten.length}`);
}
