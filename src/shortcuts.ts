export function codexStartArgs(args: string[]): string[] {
  return ["--", "codex", ...args];
}

export function claudeStartArgs(args: string[]): string[] {
  return ["--", "claude", ...args];
}
