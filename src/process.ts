import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export async function runCapture(command: string, args: string[], cwd: string): Promise<CommandResult> {
  try {
    const result = await execFileAsync(command, args, {
      cwd,
      maxBuffer: 20 * 1024 * 1024
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0
    };
  } catch (error) {
    const err = error as Error & {
      stdout?: string;
      stderr?: string;
      code?: number | string;
    };

    return {
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? err.message,
      exitCode: typeof err.code === "number" ? err.code : 1
    };
  }
}

export async function commandExists(command: string): Promise<boolean> {
  const result = await runCapture(process.platform === "win32" ? "where" : "which", [command], process.cwd());
  return result.exitCode === 0;
}
