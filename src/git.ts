import { stat, writeFile } from "node:fs/promises";
import { runCapture } from "./process.js";

export async function gitStatus(workspaceRoot: string): Promise<string> {
  const result = await runCapture("git", ["status", "--porcelain=v1", "--untracked-files=all"], workspaceRoot);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || "Failed to read git status.");
  }

  return result.stdout;
}

export async function gitUntrackedFiles(workspaceRoot: string): Promise<string[]> {
  const result = await runCapture("git", ["ls-files", "--others", "--exclude-standard"], workspaceRoot);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || "Failed to read untracked files.");
  }

  return result.stdout.split("\n").map((line) => line.trim()).filter(Boolean).sort();
}

export async function gitDiff(workspaceRoot: string): Promise<string> {
  const result = await runCapture("git", ["diff", "--binary"], workspaceRoot);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || "Failed to read git diff.");
  }

  const untrackedDiffs: string[] = [];
  for (const file of await gitUntrackedFiles(workspaceRoot)) {
    const fileStat = await stat(`${workspaceRoot}/${file}`).catch(() => null);
    if (!fileStat?.isFile()) {
      continue;
    }

    const untrackedDiff = await runCapture("git", ["diff", "--no-index", "--", "/dev/null", file], workspaceRoot);
    if (untrackedDiff.stdout.trim()) {
      untrackedDiffs.push(untrackedDiff.stdout);
    }
  }

  return [result.stdout, ...untrackedDiffs].filter(Boolean).join("\n");
}

export async function gitChangedFiles(workspaceRoot: string): Promise<string[]> {
  const diffResult = await runCapture("git", ["diff", "--name-only"], workspaceRoot);
  const status = await gitStatus(workspaceRoot);
  const files = new Set<string>();

  if (diffResult.exitCode === 0) {
    for (const line of diffResult.stdout.split("\n")) {
      if (line.trim()) {
        files.add(line.trim());
      }
    }
  }

  for (const line of status.split("\n")) {
    if (!line.trim()) {
      continue;
    }

    const path = line.slice(3).trim();
    if (path.includes(" -> ")) {
      const [, nextPath] = path.split(" -> ");
      files.add(nextPath);
    } else {
      files.add(path);
    }
  }

  return [...files].sort();
}

export async function writeGitSnapshot(workspaceRoot: string, targetPath: string): Promise<void> {
  const diff = await gitDiff(workspaceRoot);
  await writeFile(targetPath, diff);
}
