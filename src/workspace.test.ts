import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCapture } from "./process.js";
import { agentLensDir, ensureAgentLensDirs, findGitRoot, sessionsDir } from "./workspace.js";

let tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

describe("workspace", () => {
  it("finds the git root", async () => {
    const dir = await mkdtemp(join(tmpdir(), "agent-lens-"));
    tempDirs.push(dir);
    await runCapture("git", ["init"], dir);

    await expect(findGitRoot(dir)).resolves.toBe(dir);
  });

  it("creates Agent Lens directories", async () => {
    const dir = await mkdtemp(join(tmpdir(), "agent-lens-"));
    tempDirs.push(dir);

    await ensureAgentLensDirs(dir);

    expect(agentLensDir(dir)).toBe(join(dir, ".agent-lens"));
    expect(sessionsDir(dir)).toBe(join(dir, ".agent-lens", "sessions"));
  });
});
