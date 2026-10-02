---
name: fableplan
description: Use when the user wants a task planned by a Fable 5.1 planning subagent. Spins up a Plan subagent running on Fable 5.1 to produce an implementation plan, checks it against the code, relays it to the main agent, and — if a GitHub issue is referenced — posts the plan as a comment on that issue, then stops. It never builds. Trigger on "/fableplan", "fableplan this", or "plan this with fable".
---

# fableplan

Delegate planning to a **Fable 5.1** Plan subagent. The main agent checks the plan, posts it, presents it, and stops. Neither one builds: no worktree, no code edits, no pull request.

## Input

The user provides a task description, and optionally a GitHub issue:
- A task in prose ("fableplan adding X to Y").
- A GitHub issue reference — full URL, `#<N>`, bare `<N>`, or `owner/repo#N`. When present, the plan is also posted as an issue comment.
- If neither is obvious, ask the user what to plan before dispatching.

## Steps

### 1. Resolve the GitHub issue (only if one is referenced)

If the user named an issue, fetch it so the subagent plans against the real requirements, not a paraphrase:

```
gh issue view <N> --json number,title,body,url
```

For the `owner/repo#N` form (or a full URL to another repo), add `-R owner/repo` — a bare `gh issue view <N>` only resolves against the current repo.

If the command fails (wrong number, no auth, no repo), stop and tell the user — never proceed by planning against your paraphrase of an issue you couldn't fetch.

Record the issue number and URL — you'll need them in step 4. If no issue is referenced, skip this and step 4's posting.

### 2. Dispatch the Fable 5.1 Plan subagent

Do not re-plan the task yourself first — the subagent owns the plan. Snapshot `git status --porcelain` before dispatching (the tree may already be dirty), then call the Agent tool with:

- `subagent_type`: `Plan`
- `model`: `fable` (this is the whole point of the skill — the plan must come from Fable 5.1)
- `run_in_background`: `false` — every later step depends on the plan, so wait for it synchronously instead of doing other work first
- `description`: `Plan <short task name>`
- `prompt`: Hand the subagent everything it needs to plan independently — the full task description, the issue title/body if one was fetched, the working directory, and any constraints the user stated. Tell it explicitly:
  - Produce a concrete, ordered implementation plan (files to create/modify, the approach, build sequence, risks/edge cases, and how to verify).
  - Before planning, read the repo's CLAUDE.md and AGENTS.md files (root and any in directories the plan touches) and follow their conventions. Name any convention the plan relies on.
  - Cite every load-bearing claim about the existing code with a `file:line` reference (files to modify, functions or symbols it calls, behavior it depends on), so each claim can be checked against the code. Never cite a location it has not read.
  - Include an `Open questions and assumptions` section. List every assumption it made where the task, issue, or code was unclear, and every decision the user must make. Write "None" if there are none. Never resolve an ambiguity silently.
  - Include an `Acceptance criteria` section of observable, checkable outcomes, and a `Verification` section with the exact commands to run (build, lint, type check, integration tests) and the result each must produce.
  - Plan the absolute-best solution the task calls for, evaluated as if cost, effort, time, token spend, and code volume were unlimited — they are not factors and must never narrow the option space. The only constraints that override "best" are correctness and safety.
  - Return the plan as its final message in clean Markdown suitable to (a) act on directly and (b) post verbatim as a GitHub issue comment.
  - It is planning only — it must NOT make code edits, including via Bash (no writing/modifying files, no commits). The subagent lacks Edit/Write, but still has Bash, so this must be stated explicitly.

The Plan subagent's final message is returned to you as the tool result; it is not shown to the user.

If the call returns null or errors (user skip, terminal API failure), retry once; if it fails again, report the failure to the user instead of planning yourself.

When the result arrives:
- Run `git status --porcelain` and compare against the pre-dispatch snapshot to confirm the subagent made no file changes despite the no-edit instruction. If it did, tell the user and ask whether to revert before continuing.
- Save the plan verbatim to a scratchpad file immediately, so it survives context summarization and step 4 can post it exactly as produced.
- Record the model that actually served the plan and the effort it ran at. If the harness substituted another model for Fable 5.1, record that model; if it does not report the effort, record the tier you requested (`high` when you requested none). Step 4 uses these values.

### 3. Sanity-check the plan against the code

Before posting or presenting it, verify the plan's load-bearing claims against the actual codebase: open each `file:line` citation and confirm it says what the plan claims, the files it says to modify exist, the functions/symbols it references are real, and it doesn't contradict repo conventions (CLAUDE.md, AGENTS.md). Treat a load-bearing claim with no citation as unverified until you check it. Fix small inaccuracies yourself and note them; if the plan is structurally wrong (built on a file or mechanism that doesn't exist), do NOT automatically re-dispatch the Plan subagent — stop and tell the user what's failing, and let them decide whether to re-plan with Fable 5.1, adjust the task, or proceed anyway. If you fixed small inaccuracies, update the scratchpad file from step 2 so it reflects the corrected plan before step 4 posts it.

### 4. Post the plan to the GitHub issue (only if one was resolved in step 1)

Now that the plan has passed the sanity-check, save it to the issue as a comment, so the vetted plan is preserved on the issue for whoever builds it. This comment is not updated after the build.

```
gh issue comment <N> --body-file <tmpfile>
```

Add `-R owner/repo` when the issue lives in another repo (as in step 1). Use the scratchpad file from step 2 (with any step-3 corrections) as the body-file base — it avoids shell-escaping problems with Markdown. Prefix the comment so its origin is clear with a heading line `## Implementation plan (<model that actually ran>)` above the plan body (`Fable 5.1` when Fable served), and end the body with the metadata footer:

```
---
Created with LLM: <model that actually ran> | <effort that actually ran> | Harness: <harness> | fableplan
```

Fill the model and effort from step 2's record, never a constant. `<harness>` is the agent harness that ran the skill (for example `Claude Code`, `Cursor`, or `Codex`).

After posting, give the user the comment URL `gh` returns. Follow the repo's CLAUDE.md conventions for comment formatting if any apply (e.g. avoid `#N` auto-links in list items). If no issue is referenced, skip this step.

### 5. Relay the plan to the user

Present the vetted plan to the user (the main agent). Say in one line if step 2 recorded a model other than Fable 5.1. Then stop. Keep the scratchpad file. Never ask whether to build, create a worktree, or edit code; the user builds from the plan when they choose to.

## Notes

- The Plan subagent runs on Fable 5.1 regardless of the main agent's model — `model: fable` on the Agent call forces it.
- If the user did not reference an issue, never invent one or post anywhere — just plan and present the plan.
