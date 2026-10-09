import path from "node:path";
import { mkdir, copyFile, readdir, stat } from "node:fs/promises";
import type { Manifest, ManifestEntry } from "../utils/manifest.js";
import { compareFiles, FileState, formatDiffPreview } from "../utils/diff.js";
import { backupFile, timestampString, readFileUtf8, writeFileUtf8 } from "../utils/copy.js";
import { detectMarkers, extractManagedSection, replaceManagedSection } from "../utils/markers.js";
import type { InstallReport } from "./user.js";

export type ProjectFileStatus = {
  entry: ManifestEntry;
  srcAbs: string;
  dstAbs: string;
  state: FileState;
};

type AnalyzeOpts = { packageRoot: string; cwd: string };

export async function analyzeProjectState(manifest: Manifest, opts: AnalyzeOpts): Promise<ProjectFileStatus[]> {
  const results: ProjectFileStatus[] = [];
  for (const entry of manifest.project) {
    const srcAbs = path.join(opts.packageRoot, entry.source);
    const dstRel = entry.target.startsWith("./") ? entry.target.slice(2) : entry.target;
    const dstAbs = path.join(opts.cwd, dstRel);

    if (entry.recursive) {
      await walkCompare(srcAbs, dstAbs, entry, results);
    } else {
      const state = await compareFiles(srcAbs, dstAbs);
      results.push({ entry, srcAbs, dstAbs, state });
    }
  }
  return results;
}

async function walkCompare(
  srcRoot: string,
  dstRoot: string,
  entry: ManifestEntry,
  results: ProjectFileStatus[]
): Promise<void> {
  async function walk(srcDir: string, dstDir: string): Promise<void> {
    const names = await readdir(srcDir);
    for (const name of names) {
      const srcChild = path.join(srcDir, name);
      const dstChild = path.join(dstDir, name);
      const st = await stat(srcChild);
      if (st.isDirectory()) {
        await walk(srcChild, dstChild);
      } else {
        const state = await compareFiles(srcChild, dstChild);
        results.push({ entry, srcAbs: srcChild, dstAbs: dstChild, state });
      }
    }
  }
  await walk(srcRoot, dstRoot);
}

type InstallOpts = {
  force: boolean;
  dryRun: boolean;
  prompt: (question: string) => Promise<boolean>;
  cwd: string;
  log?: (line: string) => void;
};

export async function installProject(statuses: ProjectFileStatus[], opts: InstallOpts): Promise<InstallReport> {
  const report: InstallReport = { skipped: [], installed: [], overwritten: [] };
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
      if (entry.mode === "markers") {
        const dstContent = await readFileUtf8(dstAbs);
        const markerState = detectMarkers(dstContent);
        if (markerState === "both" || markerState === "managed-only") {
          const srcContent = await readFileUtf8(srcAbs);
          const newBody = extractManagedSection(srcContent);
          if (newBody !== null) {
            const updated = replaceManagedSection(dstContent, newBody);
            if (updated === dstContent) {
              report.skipped.push(dstAbs);
              continue;
            }
            if (!opts.dryRun) {
              await backupFile(dstAbs, backupDir);
              await writeFileUtf8(dstAbs, updated);
            }
            report.overwritten.push(dstAbs);
            continue;
          }
        }
      }

      const srcContent = await readFileUtf8(srcAbs);
      const dstContent = await readFileUtf8(dstAbs);
      opts.log?.(formatDiffPreview(dstContent, srcContent));

      let overwrite = opts.force;
      if (!overwrite) {
        overwrite = await opts.prompt(
          `${path.relative(opts.cwd, dstAbs)} 에 로컬 버전이 있습니다. 하네스 버전으로 덮어쓸까요? (y/N)`
        );
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

  if (report.overwritten.length > 0) report.backupDir = backupDir;
  return report;
}

async function writeWithSubstitutions(
  srcAbs: string,
  dstAbs: string,
  entry: ManifestEntry,
  cwd: string
): Promise<void> {
  if (!entry.substitute) {
    await mkdir(path.dirname(dstAbs), { recursive: true });
    await copyFile(srcAbs, dstAbs);
    return;
  }
  const content = await readFileUtf8(srcAbs);
  const substituted = applySubstitutions(content, entry.substitute, cwd);
  await writeFileUtf8(dstAbs, substituted);
}

function applySubstitutions(content: string, subs: Record<string, string>, cwd: string): string {
  let out = content;
  for (const [key, val] of Object.entries(subs)) {
    const resolvedVal = val === "basename(cwd)" ? path.basename(cwd) : val;
    out = out.split(key).join(resolvedVal);
  }
  return out;
}
