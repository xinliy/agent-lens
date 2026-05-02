#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { commandExists } from "./process.js";
import { resolveAgentCommand } from "./agents.js";
import { ensureConfig, evalEnvStatus, readConfig } from "./config.js";
import { evaluateSession } from "./evaluator.js";
import { gitChangedFiles, gitDiff, gitStatus, writeGitSnapshot } from "./git.js";
import {
  appendEvent,
  createSessionDir,
  createSessionId,
  displaySessionName,
  listSessionPaths,
  latestSessionPath,
  readMetadata,
  writeMetadata
} from "./sessions.js";
import { writeReport, writeReportIndex } from "./reports.js";
import { claudeStartArgs, codexStartArgs } from "./shortcuts.js";
import { agentLensDir, ensureAgentLensDirs, findGitRoot } from "./workspace.js";
import type { SessionMetadata } from "./types.js";

type CliResult = {
  exitCode: number;
};

function usage(): string {
  return `Usage:
  agent-lens doctor
  agent-lens init
  agent-lens codex [...codex args]
  agent-lens claude [...claude args]
  agent-lens start -- codex [...codex args]
  agent-lens start -- <command>
  agent-lens report
  agent-lens timeline
  agent-lens eval status
  agent-lens eval latest
  agent-lens explain <file>
`;
}

async function requireWorkspace(): Promise<string> {
  const workspaceRoot = await findGitRoot();
  if (!workspaceRoot) {
    throw new Error("Agent Lens must be run inside a git repository.");
  }

  return workspaceRoot;
}

async function runWrappedCommand(command: string[], cwd: string): Promise<number | null> {
  return await new Promise((resolve) => {
    const child = spawn(command[0], command.slice(1), {
      cwd,
      stdio: "inherit",
      shell: false
    });

    child.on("error", (error) => {
      console.error(`Failed to run ${command[0]}: ${error.message}`);
      resolve(127);
    });

    child.on("close", (code) => {
      resolve(code);
    });
  });
}

async function doctor(): Promise<CliResult> {
  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  const gitAvailable = await commandExists("git");
  const codexAvailable = await commandExists("codex");
  const claudeAvailable = await commandExists("claude");
  const workspaceRoot = await findGitRoot();

  console.log(`Node >=20: ${nodeMajor >= 20 ? "ok" : "missing"} (${process.versions.node})`);
  console.log(`git: ${gitAvailable ? "ok" : "missing"}`);
  console.log(`git repo: ${workspaceRoot ? `ok (${workspaceRoot})` : "missing"}`);
  console.log(`codex: ${codexAvailable ? "ok" : "missing"}`);
  console.log(`claude: ${claudeAvailable ? "ok" : "missing"}`);

  return { exitCode: nodeMajor >= 20 && gitAvailable ? 0 : 1 };
}

async function init(): Promise<CliResult> {
  const workspaceRoot = await requireWorkspace();
  await ensureAgentLensDirs(workspaceRoot);
  await ensureConfig(workspaceRoot);
  console.log(`Initialized ${agentLensDir(workspaceRoot)}`);
  return { exitCode: 0 };
}

function commandAfterDoubleDash(args: string[]): string[] {
  const markerIndex = args.indexOf("--");
  if (markerIndex >= 0) {
    return args.slice(markerIndex + 1);
  }

  return args;
}

async function start(args: string[]): Promise<CliResult> {
  const workspaceRoot = await requireWorkspace();
  await ensureAgentLensDirs(workspaceRoot);

  const requestedCommand = commandAfterDoubleDash(args);
  const agentCommand = resolveAgentCommand(requestedCommand);

  if ((agentCommand.agent === "codex" || agentCommand.agent === "claude") && !(await commandExists(agentCommand.command[0]))) {
    throw new Error(`${agentCommand.command[0]} CLI was not found in PATH.`);
  }

  const sessionId = createSessionId();
  const path = await createSessionDir(workspaceRoot, sessionId);
  const beforeDiffPath = join(path, "before.diff");
  const afterDiffPath = join(path, "after.diff");
  const startedAt = new Date().toISOString();

  await writeGitSnapshot(workspaceRoot, beforeDiffPath);
  await appendEvent(path, {
    type: "session.start",
    timestamp: startedAt,
    data: { agent: agentCommand.agent, command: agentCommand.command }
  });

  const exitCode = await runWrappedCommand(agentCommand.command, workspaceRoot);
  const endedAt = new Date().toISOString();

  await writeGitSnapshot(workspaceRoot, afterDiffPath);
  const changedFiles = await gitChangedFiles(workspaceRoot);

  const metadata: SessionMetadata = {
    id: sessionId,
    agent: agentCommand.agent,
    command: agentCommand.command,
    workspaceRoot,
    startedAt,
    endedAt,
    exitCode,
    changedFiles,
    beforeDiffPath,
    afterDiffPath
  };

  await appendEvent(path, {
    type: "session.stop",
    timestamp: endedAt,
    data: { exitCode, changedFiles }
  });
  await writeMetadata(path, metadata);
  const reportPath = await writeReport(workspaceRoot, path, metadata);

  console.log(`Agent Lens session: ${sessionId}`);
  console.log(`Report: ${reportPath}`);

  const config = await readConfig(workspaceRoot);
  const envStatus = evalEnvStatus(config);
  if (config.eval.enabled && envStatus.apiKeyReady && envStatus.modelReady) {
    console.log("LLM evaluation: running");
    try {
      const evaluation = await evaluateSession(workspaceRoot, path, metadata);
      await writeReport(workspaceRoot, path, metadata);
      console.log(`LLM evaluation: ${evaluation.score}/10`);
    } catch (error) {
      console.error(`LLM evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { exitCode: exitCode ?? 1 };
}

async function report(): Promise<CliResult> {
  const workspaceRoot = await requireWorkspace();
  const latest = await latestSessionPath(workspaceRoot);
  if (!latest) {
    throw new Error("No Agent Lens sessions found. Run: agent-lens start -- codex");
  }

  const metadata = await readMetadata(latest);
  const reportPath = await writeReport(workspaceRoot, latest, metadata);
  console.log(`Report: ${reportPath}`);
  return { exitCode: 0 };
}

async function timeline(): Promise<CliResult> {
  const workspaceRoot = await requireWorkspace();
  const paths = await listSessionPaths(workspaceRoot);
  if (paths.length === 0) {
    throw new Error("No Agent Lens sessions found.");
  }

  for (const path of [...paths].reverse()) {
    const metadata = await readMetadata(path);
    console.log(`${metadata.id}  ${metadata.agent}  files:${metadata.changedFiles.length}  exit:${metadata.exitCode ?? "unknown"}  ${metadata.command.join(" ")}`);
  }

  const indexPath = await writeReportIndex(workspaceRoot);
  console.log(`Index: ${indexPath}`);
  return { exitCode: 0 };
}

async function evalCommand(args: string[]): Promise<CliResult> {
  const [subcommand] = args;
  const workspaceRoot = await requireWorkspace();
  const config = await readConfig(workspaceRoot);
  const envStatus = evalEnvStatus(config);

  if (!subcommand || subcommand === "status") {
    console.log(`enabled: ${config.eval.enabled}`);
    console.log(`provider: ${config.eval.provider}`);
    console.log(`baseUrl: ${config.eval.baseUrl}`);
    console.log(`api key env: ${envStatus.apiKeyEnv} ${envStatus.apiKeyReady ? "(set)" : "(missing)"}`);
    console.log(`model env: ${envStatus.modelEnv} ${envStatus.modelReady ? "(set)" : "(missing)"}`);
    return { exitCode: envStatus.apiKeyReady && envStatus.modelReady ? 0 : 1 };
  }

  if (subcommand === "latest") {
    const latest = await latestSessionPath(workspaceRoot);
    if (!latest) {
      throw new Error("No Agent Lens sessions found.");
    }

    if (!envStatus.apiKeyReady || !envStatus.modelReady) {
      throw new Error(`Missing evaluator env. Set ${envStatus.apiKeyEnv} and ${envStatus.modelEnv}.`);
    }

    const metadata = await readMetadata(latest);
    console.log(`Evaluating session ${metadata.id} with ${config.eval.provider}...`);
    const evaluation = await evaluateSession(workspaceRoot, latest, metadata);
    await writeReport(workspaceRoot, latest, metadata);
    console.log(`LLM evaluation: ${evaluation.score}/10`);
    return { exitCode: 0 };
  }

  throw new Error("Unknown eval command. Try: agent-lens eval status");
}

async function explain(file: string | undefined): Promise<CliResult> {
  if (!file) {
    throw new Error("Missing file. Try: agent-lens explain src/auth.ts");
  }

  const workspaceRoot = await requireWorkspace();
  const latest = await latestSessionPath(workspaceRoot);
  if (!latest) {
    throw new Error("No Agent Lens sessions found.");
  }

  const metadata = await readMetadata(latest);
  const touched = metadata.changedFiles.includes(file);
  const afterDiff = await readFile(metadata.afterDiffPath, "utf8");
  const status = await gitStatus(workspaceRoot);
  const diff = await gitDiff(workspaceRoot);

  console.log(`File: ${file}`);
  console.log(`Session: ${displaySessionName(latest)}`);
  console.log(`Agent: ${metadata.agent}`);
  console.log(`Command: ${metadata.command.join(" ")}`);
  console.log(`Exit code: ${metadata.exitCode ?? "unknown"}`);
  console.log(`Changed in latest session: ${touched ? "yes" : "no"}`);
  console.log(`Current git status lines: ${status.split("\n").filter(Boolean).length}`);
  console.log(`Current diff lines: ${diff.split("\n").filter(Boolean).length}`);
  console.log(`Captured diff lines: ${afterDiff.split("\n").filter(Boolean).length}`);

  return { exitCode: touched ? 0 : 1 };
}

export async function runCli(argv = process.argv.slice(2)): Promise<CliResult> {
  const [command, ...args] = argv;

  try {
    if (!command || command === "--help" || command === "-h") {
      console.log(usage());
      return { exitCode: command ? 0 : 1 };
    }

    if (command === "doctor") {
      return await doctor();
    }
    if (command === "init") {
      return await init();
    }
    if (command === "codex") {
      return await start(codexStartArgs(args));
    }
    if (command === "claude") {
      return await start(claudeStartArgs(args));
    }
    if (command === "start") {
      return await start(args);
    }
    if (command === "report") {
      return await report();
    }
    if (command === "timeline") {
      return await timeline();
    }
    if (command === "eval") {
      return await evalCommand(args);
    }
    if (command === "explain") {
      return await explain(args[0]);
    }

    throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return { exitCode: 1 };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runCli();
  process.exitCode = result.exitCode;
}
