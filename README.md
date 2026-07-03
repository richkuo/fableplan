# fableplan

A [Claude Code](https://claude.com/claude-code) skill that delegates implementation planning to a **Fable 5** planning subagent, then builds from that plan in your main session — and, when a GitHub issue is referenced, posts the vetted plan to the issue as a comment.

The idea: let a dedicated planning model (Fable 5) produce a concrete, ordered implementation plan before any code is written, review it against the real codebase, preserve it on the tracker, and only then build — in an isolated git worktree so your working tree is never touched.

## What it does

Trigger it with `/fableplan`, "fableplan this", or "plan this with fable", plus a task description and optionally a GitHub issue (`#N`, a full URL, or `owner/repo#N`).

The skill then runs a 7-step flow:

1. **Resolve the GitHub issue** (only if one is referenced) so the planner works from the real requirements, not a paraphrase.
2. **Dispatch the Fable 5 Plan subagent**, confirm it made no edits, and save the plan verbatim to a scratch file.
3. **Sanity-check the plan** against the actual codebase (files, symbols, conventions). It stops and asks you if the plan is structurally wrong rather than silently re-planning.
4. **Post the vetted plan** to the GitHub issue as a comment (only if one was referenced).
5. **Present the plan** to you.
6. **Set up an isolated git worktree** so the build never touches your current workspace.
7. **Build** the task from the plan, inside that worktree.

## Install

### As a plugin (recommended)

This repo is a Claude Code plugin marketplace. Inside any Claude Code session:

```
/plugin marketplace add richkuo/fableplan
/plugin install fableplan@fableplan
```

The skill is picked up automatically from the plugin's `skills/` directory, and updates flow through the plugin system.

### Ask Claude Code to install it

Paste this straight into a Claude Code prompt:

```
Install the fableplan skill from https://github.com/richkuo/fableplan into ~/.claude/skills — fetch skills/fableplan/SKILL.md and place it at ~/.claude/skills/fableplan/SKILL.md
```

### With `npx skills`

If you use [Vercel Labs' `skills` CLI](https://github.com/vercel-labs/skills), it discovers the `skills/fableplan/SKILL.md` layout automatically:

```sh
npx skills add richkuo/fableplan
```

This installs into `.claude/skills/` (and any other agents it detects). It's a third-party tool, separate from the official plugin marketplace above.

### Manual (single file)

A Claude Code skill is just a directory containing a `SKILL.md`, so you can also install it with one command — no clone needed:

```sh
mkdir -p ~/.claude/skills/fableplan && curl -fsSL https://raw.githubusercontent.com/richkuo/fableplan/master/skills/fableplan/SKILL.md -o ~/.claude/skills/fableplan/SKILL.md
```

This puts it in your personal skills directory (`~/.claude/skills/`), available in every project. To scope it to a single project instead, put the file at `<repo>/.claude/skills/fableplan/SKILL.md`.

### Verify

Start a new Claude Code session (or restart the current one), then run:

```
/fableplan <task to plan>
```

## Requirements

- Claude Code with access to the `fable` model for the planning subagent.
- `gh` (GitHub CLI), authenticated, if you want the issue-comment step.
- A git repository for the build step (the skill stops and asks if the working directory isn't one).

## Notes

- The planning subagent always runs on Fable 5 regardless of your main session's model.
- The skill adapts to the target repo's conventions (e.g. its `CLAUDE.md`); behavior isn't hardcoded to any one project.

## License

MIT — see [LICENSE](./LICENSE).
