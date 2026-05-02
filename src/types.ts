export type AgentName = "codex" | "claude" | "generic";

export type SessionMetadata = {
  id: string;
  agent: AgentName;
  command: string[];
  workspaceRoot: string;
  startedAt: string;
  endedAt?: string;
  exitCode?: number | null;
  changedFiles: string[];
  beforeDiffPath: string;
  afterDiffPath: string;
};

export type SessionEvent = {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
};

export type RiskFinding = {
  level: "low" | "medium" | "high";
  title: string;
  detail: string;
};

export type EvalProvider = "volcengine";

export type EvalConfig = {
  enabled: boolean;
  provider: EvalProvider;
  baseUrl: string;
  modelEnv: string;
  apiKeyEnv: string;
  maxDiffChars: number;
};

export type AgentLensConfig = {
  eval: EvalConfig;
};

export type LlmEvaluation = {
  score: number;
  summary: string;
  strengths: string[];
  concerns: string[];
  reviewedAt: string;
  provider: EvalProvider;
  model: string;
};
