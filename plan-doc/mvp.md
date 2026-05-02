# Agent Lens MVP Plan

## Positioning

Agent Lens should not be another generic agent observability dashboard. The sharper wedge is code provenance:

> Git blame tells you who changed code. Agent Lens tells you why the agent changed it.

The first audience is developers using Claude Code, Codex, OpenCode, Cursor, or similar local coding agents who need to review AI-authored diffs with confidence.

## MVP Goal

Build a local-first CLI that records one agent session, links the session to the resulting git diff, and emits a concise markdown report.

The report should answer:

- What was the user trying to do?
- Which files did the agent read before editing?
- Which files changed?
- Which shell commands ran?
- Which tests ran?
- Were there risky actions such as secret file access, install scripts, network commands, or broad deletes?
- What should the human reviewer inspect first?

## Stage 01 Scope

Stage 01 should be intentionally narrow:

- Create a CLI skeleton.
- Support a local workspace database, probably SQLite.
- Record session boundaries.
- Capture git state before and after a run.
- Support one agent first, likely Codex if hooks are straightforward in this environment, otherwise Claude Code.
- Generate `AGENT_LENS_REPORT.md`.
- Avoid building a desktop UI.
- Avoid cloud sync.
- Avoid LLM-based judgment until deterministic event capture is solid.

## Candidate Commands

```bash
agent-lens init
agent-lens start -- codex
agent-lens start -- claude
agent-lens timeline
agent-lens explain path/to/file
agent-lens report
agent-lens doctor
```

## Event Model

Useful event types:

- `session.start`
- `session.stop`
- `user.prompt`
- `tool.pre`
- `tool.post`
- `file.read`
- `file.write`
- `shell.exec`
- `mcp.call`
- `git.diff.before`
- `git.diff.after`
- `test.run`
- `approval.request`
- `approval.response`

Minimum fields:

- event id
- session id
- timestamp
- agent name
- workspace root
- event type
- target path or command
- sanitized input
- sanitized output summary
- exit code when applicable
- parent event id when available

## Differentiation

Existing tools can show what the agent did. Agent Lens should focus on explaining the final code change:

- File-level provenance, not just chronological logs.
- Review report, not just dashboard.
- Local-first, no telemetry.
- Works with normal git workflow.
- Markdown output suitable for PRs and portfolios.

## Technical Choices

Good default stack:

- Rust for a single binary if we want strong infra credibility.
- TypeScript/Node if we want faster vibe coding and easier agent hooks.

My current preference is Rust for the core CLI and SQLite storage, with a simple markdown report generator. A web UI can come later.

## README Demo Target

The launch demo should be concrete:

```text
$ agent-lens explain src/auth.ts

Change: src/auth.ts
Session: claude-code 2026-05-02 14:31
Intent: fix login timeout bug

Evidence read:
  - src/auth.ts
  - tests/auth.test.ts
  - docs/session.md

Commands run:
  - npm test -- auth

Risk:
  MEDIUM - token refresh behavior changed

Missing validation:
  - no integration test for expired refresh token
```

## Star Strategy

The repo needs a high-signal README and a GIF before broader launch. The message should be about trust in AI-generated code, not tracing for tracing's sake.

Launch channels:

- GitHub trending/devtools communities
- Claude Code, Codex, OpenCode communities
- Hacker News
- Reddit: r/ClaudeCode, r/codex, r/vibecoding, r/mcp
- Chinese channels: V2EX, Juejin, Zhihu, Xiaohongshu technical posts

## Risks

- Existing observability tools may already capture similar events.
- Agent hook APIs can change quickly.
- Capturing enough data without leaking secrets requires careful defaults.
- Mapping a final diff back to exact agent intent is hard; the MVP should report evidence rather than overclaim causality.

## Near-Term Definition of Done

- Fresh repo installs locally.
- `agent-lens init` creates local state.
- `agent-lens start -- <command>` captures git before/after and session metadata.
- Report shows changed files, commands observed, and risk hints.
- README includes one realistic output sample.

