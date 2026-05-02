import { describe, expect, it } from "vitest";
import { claudeStartArgs, codexStartArgs } from "./shortcuts.js";

describe("launcher shortcuts", () => {
  it("preserves Codex arguments", () => {
    expect(codexStartArgs(["--yolo", "fix tests"])).toEqual(["--", "codex", "--yolo", "fix tests"]);
  });

  it("preserves Claude arguments", () => {
    expect(claudeStartArgs(["--dangerously-skip-permissions"])).toEqual([
      "--",
      "claude",
      "--dangerously-skip-permissions"
    ]);
  });
});
