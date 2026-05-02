# Agent Lens

Git blame tells you who changed code. Agent Lens tells you what changed during an AI coding session.

Agent Lens is a tiny local-first CLI for reviewing AI-authored git diffs. It wraps Codex or Claude Code, captures the git diff before and after the session, and writes a markdown provenance report you can inspect or paste into a PR.

```bash
al codex
```

That is the core workflow: run your agent normally, then get a review-ready report.

## Why

AI coding agents can rewrite a lot of code quickly. The final git diff shows the result, but it rarely answers the reviewer’s first questions:

- Which files changed during this session?
- How large was the diff?
- Did it touch auth, secrets, payments, config, or other risky areas?
- Was there an obvious test signal?
- Where should a human reviewer look first?

Agent Lens records local evidence from git and turns it into a small report.

## Status

Experimental MVP. Codex is the first polished path. Claude Code is supported as a thin wrapper. The base report is deterministic and logic-based. Optional LLM evaluation is disabled by default.

## Install

For local dogfooding from this repo:

```bash
git clone https://github.com/xinliy/agent-lens.git
cd agent-lens
corepack pnpm install
corepack pnpm build
npm link
```

Then run from any git repo:

```bash
al init
al codex
```

You can also use:

```bash
codex-lens
codex-lens --yolo
al codex --yolo
agent-lens codex
```

## Usage

Initialize once per repo:

```bash
al init
```

Wrap Codex:

```bash
al codex
al codex --yolo
```

Wrap Claude Code:

```bash
al claude
```

Wrap any command:

```bash
al start -- npm test
```

Review output:

```bash
al report
al timeline
al explain src/auth.ts
cat AGENT_LENS_REPORT.md
```

## What It Writes

Agent Lens stores everything locally in the target repository:

```text
.agent-lens/
  config.json
  sessions/
    <session-id>/
      metadata.json
      events.jsonl
      before.diff
      after.diff
      report.md
AGENT_LENS_REPORT.md
AGENT_LENS_INDEX.md
```

`AGENT_LENS_REPORT.md` is the latest report. Older reports remain under `.agent-lens/sessions/<session-id>/report.md`. `AGENT_LENS_INDEX.md` lists all captured sessions.

## Report

The base report includes:

- session id, agent, command, timestamps, and exit code
- changed files
- added and removed line counts
- deterministic risk hints
- review focus checklist

Risk hints currently flag:

- secret-like paths
- auth, security, permission, payment, billing, session, OAuth, and login paths
- risky shell command patterns
- broad deletes
- no obvious test command signal

The base report does not call an LLM and does not claim proof of correctness.

## Optional LLM Evaluation

The LLM evaluator is disabled by default. When enabled, it appends a short review-confidence score, summary, strengths, and concerns to the markdown report.

For 火山方舟 / Volcengine Ark, keep secrets in environment variables:

```bash
export ARK_API_KEY="your-api-key"
export ARK_MODEL="your-endpoint-or-model-id"
```

Do not paste API keys into `.agent-lens/config.json`. The config stores environment variable names, not secret values:

```json
{
  "eval": {
    "enabled": true,
    "provider": "volcengine",
    "baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
    "modelEnv": "ARK_MODEL",
    "apiKeyEnv": "ARK_API_KEY",
    "maxDiffChars": 12000
  }
}
```

Check setup:

```bash
al eval status
```

Evaluate the latest session:

```bash
al eval latest
```

When enabled and configured, new sessions run the evaluator after the deterministic report is written.

## Commands

```bash
agent-lens doctor
agent-lens init
agent-lens codex [...codex args]
agent-lens claude [...claude args]
agent-lens start -- codex [...codex args]
agent-lens start -- claude [...claude args]
agent-lens start -- <command>
agent-lens report
agent-lens timeline
agent-lens eval status
agent-lens eval latest
agent-lens explain <file>
```

Short aliases:

```bash
al codex
codex-lens
```

## Development

```bash
corepack pnpm install
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
```

## Roadmap

- Better report formatting with file grouping and branch metadata.
- `al eval setup` to avoid manual config editing.
- Sample report and demo GIF.
- Deeper Codex and Claude Code metadata if stable local hooks are available.
- GitHub Action for CI.

## License

MIT
