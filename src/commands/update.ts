import path from "node:path";
import { mkdir, copyFile, readdir, stat } from "node:fs/promises";
import { loadManifest, Manifest, ManifestEntry } from "../utils/manifest.js";
import { fileExists, backupFile, timestampString, readFileUtf8, writeFileUtf8 } from "../utils/copy.js";
import { detectMarkers, replaceManagedSection, extractManagedSection } from "../utils/markers.js";
import { compareFiles } from "../utils/diff.js";

type RunUpdateOpts = {
  packageRoot: string;
  cwd: string;
  dryRun: boolean;
  prompt: (q: string) => Promise<boolean>;
  log: (s: string) => void;
};

export async function runUpdate(opts: RunUpdateOpts): Promise<void> {
  const manifest: Manifest = loadManifest(opts.packageRoot);

  const backupDir = path.join(opts.cwd, ".backup", timestampString());
  let changed = 0;
  let skipped = 0;

  for (const entry of manifest.project) {
    const srcAbs = path.join(opts.packageRoot, entry.source);
    const dstRel = entry.target.startsWith("./") ? entry.target.slice(2) : entry.target;
    const dstAbs = path.join(opts.cwd, dstRel);

    if (entry.recursive) {
      const r = await updateRecursive(srcAbs, dstAbs, entry, backupDir, opts);
      changed += r.changed;
      skipped += r.skipped;
    } else {
      const r = await updateOne(srcAbs, dstAbs, entry, backupDir, opts);
      if (r === "changed") changed++;
      else skipped++;
    }
  }

  opts.log(`\n✅ 업데이트 완료`);
  opts.log(`  변경된 파일: ${changed}개`);
  opts.log(`  skip: ${skipped}개`);
  if (changed > 0) {
    opts.log(`💾 백업: ${backupDir}`);
    opts.log(`💡 오래된 백업은 수동 삭제 가능: rm -rf .backup/<old-timestamp>/`);
  }
  opts.log(`  사용자 파일(PLAN.md, ch:user 영역)은 손대지 않았습니다.`);
}

async function updateOne(
  srcAbs: string,
  dstAbs: string,
  entry: ManifestEntry,
  backupDir: string,
  opts: RunUpdateOpts
): Promise<"changed" | "skipped"> {
  const exists = await fileExists(dstAbs);

  if (!exists) {
    if (!opts.dryRun) {
      await mkdir(path.dirname(dstAbs), { recursive: true });
      await copyFile(srcAbs, dstAbs);
    }
    opts.log(`  installed: ${path.relative(opts.cwd, dstAbs)}`);
    return "changed";
  }

  if (entry.mode === "init-only") {
    opts.log(`  skip (init-only): ${path.relative(opts.cwd, dstAbs)}`);
    return "skipped";
  }

  if (entry.mode === "whole") {
    const state = await compareFiles(srcAbs, dstAbs);
    if (state === "SAME") {
      opts.log(`  skip (same): ${path.relative(opts.cwd, dstAbs)}`);
      return "skipped";
    }
    if (!opts.dryRun) {
      await backupFile(dstAbs, backupDir);
      await copyFile(srcAbs, dstAbs);
    }
    opts.log(`  updated (whole): ${path.relative(opts.cwd, dstAbs)}`);
    return "changed";
  }

  const content = await readFileUtf8(dstAbs);
  const state = detectMarkers(content);
  if (state === "both" || state === "managed-only") {
    const srcContent = await readFileUtf8(srcAbs);
    const newManagedBody = extractManagedSection(srcContent);
    if (!newManagedBody) throw new Error(`하네스 템플릿에 ch:managed 섹션이 없습니다: ${srcAbs}`);
    const updated = replaceManagedSection(content, newManagedBody);
    if (updated === content) {
      opts.log(`  skip (same managed): ${path.relative(opts.cwd, dstAbs)}`);
      return "skipped";
    }
    if (!opts.dryRun) {
      await backupFile(dstAbs, backupDir);
      await writeFileUtf8(dstAbs, updated);
    }
    opts.log(`  updated (managed section): ${path.relative(opts.cwd, dstAbs)}`);
    return "changed";
  }

  const ok = await opts.prompt(
    `${path.relative(opts.cwd, dstAbs)} 에 ch:managed 마커가 없거나 깨져있습니다. 전체 교체할까요? (y/N)`
  );
  if (!ok) {
    opts.log(`  skip (user declined): ${path.relative(opts.cwd, dstAbs)}`);
    return "skipped";
  }
  if (!opts.dryRun) {
    await backupFile(dstAbs, backupDir);
    await copyFile(srcAbs, dstAbs);
  }
  opts.log(`  updated (full replace): ${path.relative(opts.cwd, dstAbs)}`);
  return "changed";
}

async function updateRecursive(
  srcRoot: string,
  dstRoot: string,
  entry: ManifestEntry,
  backupDir: string,
  opts: RunUpdateOpts
): Promise<{ changed: number; skipped: number }> {
  let changed = 0;
  let skipped = 0;
  async function walk(srcDir: string, dstDir: string): Promise<void> {
    const names = await readdir(srcDir);
    for (const name of names) {
      const srcChild = path.join(srcDir, name);
      const dstChild = path.join(dstDir, name);
      const st = await stat(srcChild);
      if (st.isDirectory()) {
        await walk(srcChild, dstChild);
      } else {
        const r = await updateOne(srcChild, dstChild, entry, backupDir, opts);
        if (r === "changed") changed++;
        else skipped++;
      }
    }
  }
  await walk(srcRoot, dstRoot);
  return { changed, skipped };
}
