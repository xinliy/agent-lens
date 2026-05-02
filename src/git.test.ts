import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { gitChangedFiles, gitDiff } from "./git.js";
import { runCapture } from "./process.js";

let tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

describe("git capture", () => {
  it("includes untracked files in changed files and diff output", async () => {
    const dir = await mkdtemp(join(tmpdir(), "agent-lens-git-"));
    tempDirs.push(dir);
    await runCapture("git", ["init"], dir);
    await mkdir(join(dir, "src"));
    await writeFile(join(dir, "src", "new.ts"), "export const value = 1;\n");

    await expect(gitChangedFiles(dir)).resolves.toEqual(["src/new.ts"]);
    await expect(gitDiff(dir)).resolves.toContain("export const value = 1;");
  });
});
