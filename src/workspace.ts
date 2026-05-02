import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { runCapture } from "./process.js";

export async function findGitRoot(cwd = process.cwd()): Promise<string | null> {
  const result = await runCapture("git", ["rev-parse", "--show-toplevel"], cwd);
  if (result.exitCode !== 0) {
    return null;
  }

  return result.stdout.trim();
}

export function agentLensDir(workspaceRoot: string): string {
  return join(workspaceRoot, ".agent-lens");
}

export function sessionsDir(workspaceRoot: string): string {
  return join(agentLensDir(workspaceRoot), "sessions");
}

export async function ensureAgentLensDirs(workspaceRoot: string): Promise<void> {
  await mkdir(sessionsDir(workspaceRoot), { recursive: true });
}
