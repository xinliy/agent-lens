import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSessionDir, latestSessionPath, listSessionPaths } from "./sessions.js";

let tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

describe("session listing", () => {
  it("lists sessions in chronological order and finds the latest", async () => {
    const dir = await mkdtemp(join(tmpdir(), "agent-lens-sessions-"));
    tempDirs.push(dir);

    const first = await createSessionDir(dir, "2026-05-02T00-00-00-000Z");
    const second = await createSessionDir(dir, "2026-05-02T00-01-00-000Z");

    await expect(listSessionPaths(dir)).resolves.toEqual([first, second]);
    await expect(latestSessionPath(dir)).resolves.toBe(second);
  });
});
