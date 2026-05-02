import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { readConfig } from "./config.js";
import { analyzeRisks } from "./risk.js";
import type { AgentLensConfig, LlmEvaluation, SessionMetadata } from "./types.js";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export function evaluationPath(sessionPath: string): string {
  return join(sessionPath, "evaluation.json");
}

export async function readEvaluation(sessionPath: string): Promise<LlmEvaluation | null> {
  try {
    return JSON.parse(await readFile(evaluationPath(sessionPath), "utf8")) as LlmEvaluation;
  } catch {
    return null;
  }
}

export function buildEvaluationPrompt(metadata: SessionMetadata, diff: string, config: AgentLensConfig): string {
  const trimmedDiff = diff.slice(0, config.eval.maxDiffChars);
  const risks = analyzeRisks(metadata.changedFiles, metadata.command, diff);
  const riskLines = risks.map((risk) => `- ${risk.level}: ${risk.title} - ${risk.detail}`).join("\n") || "- none";
  const truncated = diff.length > trimmedDiff.length
    ? `\n\nDiff was truncated from ${diff.length} to ${trimmedDiff.length} characters.`
    : "";

  return `Evaluate this AI coding session for human code review.

Return only JSON with this shape:
{
  "score": 0,
  "summary": "one or two sentences",
  "strengths": ["short bullet"],
  "concerns": ["short bullet"]
}

Scoring rubric:
- 9-10: small, focused, tested, low-risk paths
- 7-8: reasonable but some validation gaps
- 5-6: meaningful risk or unclear test coverage
- 3-4: broad changes, sensitive paths, weak validation
- 0-2: dangerous commands, secret exposure, broken diff, or high-risk untested changes

Session:
- Agent: ${metadata.agent}
- Command: ${metadata.command.join(" ")}
- Exit code: ${metadata.exitCode ?? "unknown"}
- Changed files: ${metadata.changedFiles.join(", ") || "none"}

Deterministic risk hints:
${riskLines}

Diff:
\`\`\`diff
${trimmedDiff}
\`\`\`${truncated}
`;
}

export function parseEvaluation(raw: string, provider: AgentLensConfig["eval"]["provider"], model: string): LlmEvaluation {
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as Partial<LlmEvaluation>;
  const score = Number(parsed.score);

  if (!Number.isFinite(score) || score < 0 || score > 10) {
    throw new Error("LLM evaluation score must be a number from 0 to 10.");
  }

  return {
    score,
    summary: String(parsed.summary ?? "").trim(),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
    concerns: Array.isArray(parsed.concerns) ? parsed.concerns.map(String) : [],
    reviewedAt: new Date().toISOString(),
    provider,
    model
  };
}

export async function requestEvaluation(prompt: string, config: AgentLensConfig, env: NodeJS.ProcessEnv = process.env): Promise<LlmEvaluation> {
  const apiKey = env[config.eval.apiKeyEnv];
  const model = env[config.eval.modelEnv];

  if (!apiKey) {
    throw new Error(`Missing ${config.eval.apiKeyEnv}.`);
  }
  if (!model) {
    throw new Error(`Missing ${config.eval.modelEnv}.`);
  }

  const response = await fetch(`${config.eval.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You are a strict code-review evaluator. Return compact JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new Error(`LLM evaluation request failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM evaluation response did not include message content.");
  }

  return parseEvaluation(content, config.eval.provider, model);
}

export async function evaluateSession(workspaceRoot: string, sessionPath: string, metadata: SessionMetadata): Promise<LlmEvaluation> {
  const config = await readConfig(workspaceRoot);
  const diff = await readFile(metadata.afterDiffPath, "utf8");
  const prompt = buildEvaluationPrompt(metadata, diff, config);
  const evaluation = await requestEvaluation(prompt, config);

  await writeFile(evaluationPath(sessionPath), `${JSON.stringify(evaluation, null, 2)}\n`);

  return evaluation;
}
