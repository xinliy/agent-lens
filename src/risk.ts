import type { RiskFinding } from "./types.js";

const secretPathPattern = /(^|\/)(\.env|.*secret.*|.*token.*|.*key.*|id_rsa|id_ed25519)(\.|$|\/)/i;
const sensitivePathPattern = /(^|\/)(auth|security|permission|permissions|payment|billing|checkout|session|oauth|login)(\/|\.|-|_)/i;
const dangerousCommandPattern = /\b(rm\s+-rf|curl\b.*\|\s*(sh|bash)|wget\b.*\|\s*(sh|bash)|chmod\s+777|sudo\b)/i;
const testCommandPattern = /\b(test|vitest|jest|mocha|pytest|go\s+test|cargo\s+test|mvn\s+test|gradle\s+test)\b/i;

export function analyzeRisks(changedFiles: string[], command: string[], diff: string): RiskFinding[] {
  const findings: RiskFinding[] = [];
  const commandText = command.join(" ");

  const secretFiles = changedFiles.filter((file) => secretPathPattern.test(file));
  if (secretFiles.length > 0) {
    findings.push({
      level: "high",
      title: "Secret-like file touched",
      detail: secretFiles.join(", ")
    });
  }

  const sensitiveFiles = changedFiles.filter((file) => sensitivePathPattern.test(file));
  if (sensitiveFiles.length > 0) {
    findings.push({
      level: "medium",
      title: "Sensitive application area touched",
      detail: sensitiveFiles.join(", ")
    });
  }

  if (dangerousCommandPattern.test(commandText)) {
    findings.push({
      level: "high",
      title: "Risky shell command",
      detail: commandText
    });
  }

  const deletedFiles = (diff.match(/^deleted file mode /gm) ?? []).length;
  if (deletedFiles >= 3) {
    findings.push({
      level: "medium",
      title: "Broad deletes detected",
      detail: `${deletedFiles} files deleted in the captured diff.`
    });
  }

  if (!testCommandPattern.test(commandText)) {
    findings.push({
      level: "low",
      title: "No obvious test command observed",
      detail: "Review whether validation was run outside the captured command."
    });
  }

  return findings;
}
