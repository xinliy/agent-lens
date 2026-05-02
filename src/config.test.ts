import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { configPath, ensureConfig, evalEnvStatus, readConfig } from "./config.js";

let tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

describe("config", () => {
  it("creates disabled evaluator config by default", async () => {
    const dir = await mkdtemp(join(tmpdir(), "agent-lens-config-"));
    tempDirs.push(dir);

    await ensureConfig(dir);

    const config = await readConfig(dir);
    expect(config.eval.enabled).toBe(false);
    expect(config.eval.provider).toBe("volcengine");
    await expect(readFile(configPath(dir), "utf8")).resolves.toContain("ARK_API_KEY");
  });

  it("reports evaluator env readiness", () => {
    const status = evalEnvStatus({
      eval: {
        enabled: true,
        provider: "volcengine",
        baseUrl: "https://example.com",
        apiKeyEnv: "ARK_API_KEY",
        modelEnv: "ARK_MODEL",
        maxDiffChars: 12000
      }
    }, {
      ARK_API_KEY: "secret",
      ARK_MODEL: "ep-test"
    });

    expect(status.apiKeyReady).toBe(true);
    expect(status.modelReady).toBe(true);
  });
});
