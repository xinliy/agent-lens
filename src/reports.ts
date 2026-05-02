import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { readEvaluation } from "./evaluator.js";
import { analyzeRisks } from "./risk.js";
import { listSessionPaths, readMetadata } from "./sessions.js";
import type { LlmEvaluation, RiskFinding, SessionMetadata } from "./types.js";

export function diffSummary(diff: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;

  for (const line of diff.split("\n")) {
    if (line.startsWith("+++") || line.startsWith("---")) {
      continue;
    }
    if (line.startsWith("+")) {
      added += 1;
    }
    if (line.startsWith("-")) {
      removed += 1;
    }
  }

  return { added, removed };
}

export function renderEvaluation(evaluation: LlmEvaluation | null): string {
  if (!evaluation) {
    return "";
  }

  const strengths = evaluation.strengths.length > 0
    ? evaluation.strengths.map((item) => `- ${item}`).join("\n")
    : "- No strengths returned.";
  const concerns = evaluation.concerns.length > 0
    ? evaluation.concerns.map((item) => `- ${item}`).join("\n")
    : "- No concerns returned.";

  return `
## LLM Evaluation

- Review confidence: ${evaluation.score}/10
- Provider: ${evaluation.provider}
- Model: \`${evaluation.model}\`
- Reviewed: ${evaluation.reviewedAt}

Summary:
${evaluation.summary || "No summary returned."}

Strengths:
${strengths}

Concerns:
${concerns}
`;
}

export function renderReport(metadata: SessionMetadata, risks: RiskFinding[], diff: string, evaluation: LlmEvaluation | null = null): string {
  const summary = diffSummary(diff);
  const changedFiles = metadata.changedFiles.length > 0
    ? metadata.changedFiles.map((file) => `- \`${file}\``).join("\n")
    : "- No changed files detected.";
  const riskLines = risks.length > 0
    ? risks.map((risk) => `- **${risk.level.toUpperCase()}** ${risk.title}: ${risk.detail}`).join("\n")
    : "- No deterministic risk hints detected.";

  return `# Agent Lens Report

## Session

- Session: \`${metadata.id}\`
- Agent: \`${metadata.agent}\`
- Command: \`${metadata.command.join(" ")}\`
- Started: ${metadata.startedAt}
- Ended: ${metadata.endedAt ?? "unknown"}
- Exit code: ${metadata.exitCode ?? "unknown"}

## Diff Summary

- Files changed: ${metadata.changedFiles.length}
- Lines added: ${summary.added}
- Lines removed: ${summary.removed}

## Changed Files

${changedFiles}

## Risk Hints

${riskLines}

## Review Focus

- Inspect changed files with medium or high risk hints first.
- Confirm tests or validation were run for behavior changes.
- Treat this report as local evidence, not as proof of correctness.
${renderEvaluation(evaluation)}`;
}

export async function writeReport(workspaceRoot: string, sessionPath: string, metadata: SessionMetadata): Promise<string> {
  const diff = await readFile(metadata.afterDiffPath, "utf8");
  const risks = analyzeRisks(metadata.changedFiles, metadata.command, diff);
  const evaluation = await readEvaluation(sessionPath);
  const report = renderReport(metadata, risks, diff, evaluation);
  const sessionReportPath = join(sessionPath, "report.md");
  const rootReportPath = join(workspaceRoot, "AGENT_LENS_REPORT.md");

  await writeFile(sessionReportPath, report);
  await writeFile(rootReportPath, report);
  await writeReportIndex(workspaceRoot);

  return rootReportPath;
}

export async function renderReportIndex(workspaceRoot: string): Promise<string> {
  const paths = await listSessionPaths(workspaceRoot);
  const rows: string[] = [];

  for (const path of [...paths].reverse()) {
    const metadata = await readMetadata(path);
    rows.push(
      `| \`${metadata.id}\` | \`${metadata.agent}\` | \`${metadata.command.join(" ")}\` | ${metadata.changedFiles.length} | ${metadata.exitCode ?? "unknown"} | \`.agent-lens/sessions/${metadata.id}/report.md\` |`
    );
  }

  const table = rows.length > 0
    ? rows.join("\n")
    : "| No sessions yet. |  |  |  |  |  |";

  return `# Agent Lens Report Index

The root \`AGENT_LENS_REPORT.md\` always points to the latest session. Older reports are kept under \`.agent-lens/sessions/<session-id>/report.md\`.

| Session | Agent | Command | Files | Exit | Report |
|---|---|---:|---:|---:|---|
${table}
`;
}

export async function writeReportIndex(workspaceRoot: string): Promise<string> {
  const indexPath = join(workspaceRoot, "AGENT_LENS_INDEX.md");
  await writeFile(indexPath, await renderReportIndex(workspaceRoot));
  return indexPath;
}
