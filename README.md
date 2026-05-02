# Agent Lens

Git blame tells you who changed code. Agent Lens tells you why an AI coding agent changed it.

Agent Lens is an early-stage local-first provenance layer for AI-generated code. It is intended to connect code changes back to the agent session that produced them: the prompt, files read, commands run, tool calls made, tests executed, and approval state.

## Status

This repository is in stage 01 planning and scaffolding. The first public goal is a small CLI that records local Claude Code and Codex activity where hooks are available, snapshots git diffs, and generates a markdown provenance report for changed files.

## Intended CLI

```bash
agent-lens init
agent-lens start -- codex
agent-lens start -- claude
agent-lens timeline
agent-lens explain src/auth.ts
agent-lens report --format markdown
```

## Core Idea

AI coding agents can read files, execute shell commands, call MCP tools, and rewrite large parts of a repository in a short session. The final git diff rarely explains the path that produced it.

Agent Lens aims to make that path reviewable:

- What user intent started the session?
- Which files did the agent inspect before editing?
- Which commands and tools did it run?
- Which tests did it run or skip?
- Which final code changes came from which session?
- What risk should a human reviewer check first?

## License

MIT

