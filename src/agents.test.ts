import { describe, expect, it } from "vitest";
import { resolveAgentCommand } from "./agents.js";

describe("resolveAgentCommand", () => {
  it("detects Codex", () => {
    expect(resolveAgentCommand(["codex"])).toEqual({ agent: "codex", command: ["codex"] });
  });

  it("detects Claude Code", () => {
    expect(resolveAgentCommand(["claude", "--dangerously-skip-permissions"])).toEqual({
      agent: "claude",
      command: ["claude", "--dangerously-skip-permissions"]
    });
  });

  it("falls back to generic commands", () => {
    expect(resolveAgentCommand(["npm", "test"])).toEqual({ agent: "generic", command: ["npm", "test"] });
  });
});
