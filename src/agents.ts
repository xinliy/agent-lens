import type { AgentName } from "./types.js";

export type AgentCommand = {
  agent: AgentName;
  command: string[];
};

export function resolveAgentCommand(command: string[]): AgentCommand {
  if (command.length === 0) {
    throw new Error("Missing command. Try: agent-lens start -- codex");
  }

  const [binary, ...args] = command;
  if (binary === "codex") {
    return { agent: "codex", command: [binary, ...args] };
  }

  if (binary === "claude") {
    return { agent: "claude", command: [binary, ...args] };
  }

  return { agent: "generic", command: [binary, ...args] };
}
