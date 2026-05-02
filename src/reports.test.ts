import { describe, expect, it } from "vitest";
import { diffSummary, renderEvaluation, renderReport, renderReportIndex } from "./reports.js";
import type { SessionMetadata } from "./types.js";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach } from "vitest";
import { createSessionDir, writeMetadata } from "./sessions.js";

let tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

describe("diffSummary", () => {
  it("counts added and removed lines", () => {
    expect(diffSummary("+++ b/a.ts\n--- a/a.ts\n+one\n-two\n context")).toEqual({ added: 1, removed: 1 });
  });
});

describe("renderReportIndex", () => {
  it("renders previous session reports", async () => {
    const dir = await mkdtemp(join(tmpdir(), "agent-lens-report-index-"));
    tempDirs.push(dir);
    const path = await createSessionDir(dir, "2026-05-02T00-00-00-000Z");
    const metadata: SessionMetadata = {
      id: "2026-05-02T00-00-00-000Z",
      agent: "codex",
      command: ["codex", "--yolo"],
      workspaceRoot: dir,
      startedAt: "2026-05-02T00:00:00.000Z",
      endedAt: "2026-05-02T00:01:00.000Z",
      exitCode: 0,
      changedFiles: ["src/auth.ts"],
      beforeDiffPath: join(path, "before.diff"),
      afterDiffPath: join(path, "after.diff")
    };
    await writeFile(metadata.afterDiffPath, "");
    await writeMetadata(path, metadata);

    const index = await renderReportIndex(dir);

    expect(index).toContain("Agent Lens Report Index");
    expect(index).toContain("2026-05-02T00-00-00-000Z");
    expect(index).toContain(".agent-lens/sessions/2026-05-02T00-00-00-000Z/report.md");
  });
});

describe("renderReport", () => {
  it("renders core session details", () => {
    const metadata: SessionMetadata = {
      id: "session-1",
      agent: "codex",
      command: ["codex"],
      workspaceRoot: "/repo",
      startedAt: "2026-05-02T00:00:00.000Z",
      endedAt: "2026-05-02T00:01:00.000Z",
      exitCode: 0,
      changedFiles: ["src/auth.ts"],
      beforeDiffPath: "/repo/.agent-lens/sessions/session-1/before.diff",
      afterDiffPath: "/repo/.agent-lens/sessions/session-1/after.diff"
    };

    const report = renderReport(metadata, [], "+change");
    expect(report).toContain("Agent Lens Report");
    expect(report).toContain("`codex`");
    expect(report).toContain("`src/auth.ts`");
  });
});

describe("renderEvaluation", () => {
  it("renders llm evaluation details", () => {
    const rendered = renderEvaluation({
      score: 7,
      summary: "Reasonable change with validation gaps.",
      strengths: ["Focused files"],
      concerns: ["No test signal"],
      reviewedAt: "2026-05-02T00:02:00.000Z",
      provider: "volcengine",
      model: "ep-test"
    });

    expect(rendered).toContain("LLM Evaluation");
    expect(rendered).toContain("7/10");
    expect(rendered).toContain("No test signal");
  });
});
