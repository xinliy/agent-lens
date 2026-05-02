import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { agentLensDir } from "./workspace.js";
import type { AgentLensConfig } from "./types.js";

export const defaultConfig: AgentLensConfig = {
  eval: {
    enabled: false,
    provider: "volcengine",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    modelEnv: "ARK_MODEL",
    apiKeyEnv: "ARK_API_KEY",
    maxDiffChars: 12000
  }
};

export function configPath(workspaceRoot: string): string {
  return join(agentLensDir(workspaceRoot), "config.json");
}

export async function ensureConfig(workspaceRoot: string): Promise<void> {
  const path = configPath(workspaceRoot);
  try {
    await readFile(path, "utf8");
  } catch {
    await mkdir(agentLensDir(workspaceRoot), { recursive: true });
    await writeFile(path, `${JSON.stringify(defaultConfig, null, 2)}\n`);
  }
}

export async function readConfig(workspaceRoot: string): Promise<AgentLensConfig> {
  try {
    const raw = await readFile(configPath(workspaceRoot), "utf8");
    const parsed = JSON.parse(raw) as Partial<AgentLensConfig>;

    return {
      eval: {
        ...defaultConfig.eval,
        ...parsed.eval
      }
    };
  } catch {
    return defaultConfig;
  }
}

export function evalEnvStatus(config: AgentLensConfig, env: NodeJS.ProcessEnv = process.env): {
  apiKeyReady: boolean;
  modelReady: boolean;
  apiKeyEnv: string;
  modelEnv: string;
} {
  return {
    apiKeyReady: Boolean(env[config.eval.apiKeyEnv]),
    modelReady: Boolean(env[config.eval.modelEnv]),
    apiKeyEnv: config.eval.apiKeyEnv,
    modelEnv: config.eval.modelEnv
  };
}
