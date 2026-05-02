# Agent Lens MVP Dev Plan

## Goal

Ship a tiny, useful CLI that helps developers review AI-authored code changes by wrapping an agent command, capturing the git diff before and after, and generating a local markdown provenance report.

The MVP should be good enough for a GitHub launch demo, not a complete observability platform.

## Product Principles

- Tiny surface area: one primary workflow, one useful report.
- Local-first: all state lives in the repository under `.agent-lens/`.
- Evidence over judgment: report observable facts and deterministic risk hints.
- Modular internals: keep git capture, session storage, agent adapters, risk analysis, and report rendering separate.
- Codex first: make the default demo `agent-lens start -- codex`.
- Claude Code second: add only after the Codex path is smooth.
- No dashboards, accounts, cloud sync, browser extension, or multi-agent matrix for the MVP.

## Stack

- TypeScript on Node.js 20+
- `pnpm` for package management
- `commander` or `cac` for CLI routing
- JSON/JSONL files for local session storage
- Shell out to `git` for repository state
- Markdown report generation
- Vitest for focused tests

Start with plain files instead of SQLite:

```text
.agent-lens/
  sessions/
    2026-05-02T10-30-00Z/
      metadata.json
      events.jsonl
      before.diff
      after.diff
      report.md
```

## MVP Commands

```bash
agent-lens init
agent-lens start -- codex
agent-lens start -- claude
agent-lens start -- <command>
agent-lens report
agent-lens explain <file>
agent-lens doctor
```

`agent-lens start -- <command>` remains the generic escape hatch, but the README and demo should focus on Codex first.

## Module Boundaries

Keep the implementation easy to understand by using small modules:

- `cli`: command parsing and terminal output
- `workspace`: git root detection and `.agent-lens/` paths
- `git`: status, diff, changed file capture
- `sessions`: metadata and JSONL event writing
- `agents`: thin adapters for Codex, Claude Code, and generic commands
- `risk`: deterministic file and command checks
- `reports`: markdown rendering

Agent adapters should stay thin. They should normalize command names and capture known local metadata when available, but they should not own storage, git logic, or report formatting.

## Milestone 1: CLI Skeleton

- Add package scaffolding and TypeScript build.
- Add executable `agent-lens` binary.
- Implement `agent-lens doctor`.
- Implement `agent-lens init` to create `.agent-lens/`.
- Add basic tests for command parsing and workspace detection.

Done when a fresh clone can run:

```bash
pnpm install
pnpm build
pnpm agent-lens doctor
```

## Milestone 2: Session Capture

- Implement `agent-lens start -- <command>`.
- Add a Codex adapter so `agent-lens start -- codex` is the first polished path.
- Require the current directory to be inside a git repo.
- Capture git status and diff before the command.
- Run the wrapped command and preserve its exit code.
- Capture git status and diff after the command.
- Store session metadata and events in `.agent-lens/sessions/<session-id>/`.

Minimum recorded fields:

- session id
- start and end time
- workspace root
- command and args
- exit code
- changed files
- before and after diff paths

## Milestone 3: Report Generation

- Implement `agent-lens report`.
- Generate `AGENT_LENS_REPORT.md` from the latest session.
- Include command, exit code, changed files, diff summary, and test hints.
- Add deterministic risk flags:
  - secret-like files touched
  - auth, payment, permission, or security files touched
  - install scripts or network shell commands run
  - broad deletes
  - no obvious test command observed

Report tone should be factual. Avoid claiming exact causality until deeper agent hooks exist.

## Milestone 4: File Explanation

- Implement `agent-lens explain <file>`.
- Show which latest session changed the file.
- Show the wrapped command, relevant diff hunk summary, and risk hints.
- Keep output terminal-friendly and short.

## Milestone 5: Claude Code Adapter

- Add `agent-lens start -- claude`.
- Reuse the same session, git, risk, and report modules.
- Capture only stable local metadata.
- Do not add Claude-specific complexity to the core data model unless Codex also benefits from it.

## Milestone 6: GitHub Launch Polish

- Rewrite README around a 30-second demo.
- Add an install command.
- Add realistic terminal output.
- Add a sample `AGENT_LENS_REPORT.md`.
- Add a short comparison section:
  - not a cloud dashboard
  - not telemetry
  - not LLM judgment
  - just local evidence for reviewing agent diffs
- Record a GIF or asciinema demo.
- Add topics to the repo:
  - `ai-agents`
  - `codex`
  - `claude-code`
  - `developer-tools`
  - `git`
  - `provenance`

## Launch Criteria

The repo is ready to push publicly when:

- `pnpm install && pnpm test && pnpm build` passes.
- A user can run `agent-lens start -- <command>` in a real git repo.
- A useful markdown report is generated without manual editing.
- The README shows the exact output users should expect.
- The project makes one clear promise:

> Wrap an AI coding session and generate a review-ready provenance report for the resulting git diff.

## Post-MVP

- Add first-class Claude Code or Codex hooks if their local event surfaces are stable.
- Add secret redaction rules.
- Add richer diff-to-file provenance.
- Add `agent-lens timeline`.
- Consider SQLite only when session querying becomes painful with JSONL.
- Consider Rust only after the TypeScript MVP proves the workflow and message.
