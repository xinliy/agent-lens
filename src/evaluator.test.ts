import { describe, expect, it } from "vitest";
import { buildEvaluationPrompt, parseEvaluation } from "./evaluator.js";
import type { AgentLensConfig, SessionMetadata } from "./types.js";

const config: AgentLensConfig = {
  eval: {
    enabled: true,
    provider: "volcengine",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    apiKeyEnv: "ARK_API_KEY",
    modelEnv: "ARK_MODEL",
    maxDiffChars: 20
  }
};

const metadata: SessionMetadata = {
  id: "session",
  agent: "codex",
  command: ["codex"],
  workspaceRoot: "/repo",
  startedAt: "2026-05-02T00:00:00.000Z",
  endedAt: "2026-05-02T00:01:00.000Z",
  exitCode: 0,
  changedFiles: ["src/auth.ts"],
  beforeDiffPath: "/repo/before.diff",
  afterDiffPath: "/repo/after.diff"
};

describe("evaluator", () => {
  it("builds a truncated review prompt", () => {
    const prompt = buildEvaluationPrompt(metadata, "+".repeat(50), config);
    expect(prompt).toContain("Changed files: src/auth.ts");
    expect(prompt).toContain("Diff was truncated");
  });

  it("parses json evaluation", () => {
    const evaluation = parseEvaluation(JSON.stringify({
      score: 8,
      summary: "Focused change.",
      strengths: ["Small diff"],
      concerns: ["Tests unclear"]
    }), "volcengine", "ep-test");

    expect(evaluation.score).toBe(8);
    expect(evaluation.provider).toBe("volcengine");
    expect(evaluation.model).toBe("ep-test");
  });
});
