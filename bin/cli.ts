#!/usr/bin/env node
import { Command } from "commander";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInit } from "../src/commands/init.js";
import { runUpdate } from "../src/commands/update.js";

const program = new Command();
program
  .name("claude-harness")
  .description("One-command Claude Code project harness installer")
  .version("0.1.0");

program
  .command("init")
  .description("Install harness (user + project levels)")
  .option("--force", "Overwrite existing files without prompting", false)
  .option("--project-only", "Skip user-level installation", false)
  .option("--dry-run", "Show what would be installed, don't write", false)
  .action(async (opts) => {
    await runInit({
      packageRoot: packageRoot(),
      cwd: process.cwd(),
      force: opts.force,
      projectOnly: opts.projectOnly,
      dryRun: opts.dryRun,
      prompt,
      log: console.log
    });
  });

program
  .command("update")
  .description("Update harness-managed sections (preserve user files)")
  .option("--dry-run", "Show what would change, don't write", false)
  .action(async (opts) => {
    await runUpdate({
      packageRoot: packageRoot(),
      cwd: process.cwd(),
      dryRun: opts.dryRun,
      prompt,
      log: console.log
    });
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(`\n❌ 에러: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});

function packageRoot(): string {
  return path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
}

async function prompt(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question(`${question} `)).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}
