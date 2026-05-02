import { appendFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { sessionsDir } from "./workspace.js";
import type { SessionEvent, SessionMetadata } from "./types.js";

export function createSessionId(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function sessionPath(workspaceRoot: string, sessionId: string): string {
  return join(sessionsDir(workspaceRoot), sessionId);
}

export async function createSessionDir(workspaceRoot: string, sessionId: string): Promise<string> {
  const path = sessionPath(workspaceRoot, sessionId);
  await mkdir(path, { recursive: true });
  return path;
}

export async function writeMetadata(path: string, metadata: SessionMetadata): Promise<void> {
  await writeFile(join(path, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`);
}

export async function readMetadata(path: string): Promise<SessionMetadata> {
  return JSON.parse(await readFile(join(path, "metadata.json"), "utf8")) as SessionMetadata;
}

export async function appendEvent(path: string, event: SessionEvent): Promise<void> {
  await appendFile(join(path, "events.jsonl"), `${JSON.stringify(event)}\n`);
}

export async function latestSessionPath(workspaceRoot: string): Promise<string | null> {
  const sessions = await listSessionPaths(workspaceRoot);
  return sessions.at(-1) ?? null;
}

export async function listSessionPaths(workspaceRoot: string): Promise<string[]> {
  const root = sessionsDir(workspaceRoot);
  let entries: string[];

  try {
    entries = await readdir(root);
  } catch {
    return [];
  }

  return entries.filter((entry) => /^\d{4}-\d{2}-\d{2}T/.test(entry)).sort().map((entry) => join(root, entry));
}

export function displaySessionName(path: string): string {
  return basename(path);
}
