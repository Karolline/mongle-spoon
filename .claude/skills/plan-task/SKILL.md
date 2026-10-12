---
name: plan-task
description: Plan a feature or fix with the user, write a task brief, and hand it to the developer agent to build in the background on its own branch; then review it with the reviewer agent and merge it into main. Use when the user asks to plan a task, says /plan-task, 기획해줘, 작업 맡길게, or wants a feature built in the background.
argument-hint: <what to build>
---

# Plan a task

The developer agent can't ask the user anything while it works, so every question gets answered here first. The output is a task brief complete enough that the developer never has to guess about anything a user would notice.

## 1. Understand the request

- Always read `docs/future-features.md` (the user's Korean wishlist) first, whatever the request is.
- The request comes from the arguments. If it's empty, offer the wishlist items as choices (with their difficulty) and ask what to build.
- If the request matches a wishlist item, even loosely worded, say which one and plan from it: its backend/frontend/DB notes are the starting point, and its "시작 전에 정할 것" points are questions for step 2. The wishlist says an item moves into `product-spec.md` when work starts, so the brief includes adding it to the spec. Ask the user whether the brief should also remove it from the wishlist.
- If the request isn't on the wishlist but touches an item (for example it would make a planned item harder, or overlaps with one), point that out.
- Read `product-spec.md`, `AGENTS.md`, and the code the task touches (screens, services, store, models, `openapi.yaml`), so the questions are about real gaps, not things the code already answers.

## 2. Ask

Ask the user (in Korean, plainly; the user is not a backend expert) about everything that changes what users see or what gets stored, for example:

- what the screen shows and where, the exact Korean labels and messages;
- what happens in edge cases (nothing entered, nothing found, very long text);
- whether it needs a write password;
- whether existing recipes need a value for a new field;
- anything that conflicts with `product-spec.md` (the spec wins unless the user decides to change it; if so, the brief includes updating the spec).

Use AskUserQuestion when the choices are clear, with your recommendation first. Don't ask about things you can decide from the code and `AGENTS.md`. Keep asking until nothing user-visible is left open.

## 3. Show the screen (when the frontend changes)

Skip this step when nothing the user sees changes. Otherwise show a picture of the planned screen before writing the brief, so the user agrees on what it looks like, not just a description.

- **Choosing between layouts**: when there are two or three ways to lay something out, first ask with AskUserQuestion and put a rough ASCII mockup of each in the option's `preview`.
- **The mockup**: then make one HTML file in the scratchpad directory, `mockup-<short-name>.html`, that looks like the real app:
  - Tailwind from `https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.1.11`, with the `@theme` palette, fonts and utilities copied from `frontend/src/styles.css` into a `<style type="text/tailwindcss">` block.
  - Markup and `className`s copied from the real screen components (`frontend/src/components/*Screen.tsx`), with realistic Korean sample recipes, so unchanged parts look exactly like the app.
  - Phone-width frames (390px) side by side: **지금** (current screen) and **바뀐 뒤** (planned), stacking on narrow screens. Mark what's new with a small clay-colored label or outline. Add more frames for states that matter (empty, long text, password dialog).
  - Static: no app logic, just enough to show the states.
- Load the `artifact-design` skill, then publish the file with the Artifact tool (private, `icon: "design"`), so the user can open it on a phone too. Send the link with one Korean line on what to look at.
- Change and republish (same file path, same URL) until the user is happy. The agreed mockup is part of the brief.

## 4. Write the brief

Save it to the scratchpad directory as `task-<short-name>.md` and show it to the user. Write it in English (the developer works in English), with UI text quoted in Korean exactly as it should appear.

```markdown
# Task: <name>

## Goal
<one or two sentences: what the user gets>

## Behavior
- <each thing a user can see or do, with exact Korean labels/messages>
- <edge cases and what happens>

## Data and API
- <new or changed fields, endpoints, migration; "none" if nothing>

## Done when
- <checkable outcomes, including the tests that must exist>

## Screens
- <absolute mockup file path and artifact link, or "no UI change">. Match it; where it differs from the real components' style, the real components win.

## Out of scope
- <what not to do, so the developer doesn't overreach>

## Decided with the user
- <each answer from step 2>
```

Summarize the brief for the user in Korean and ask for an explicit OK. Change it until they agree.

## 5. Hand off

On OK, launch the developer agent with the Agent tool: `subagent_type: "developer"`, `isolation: "worktree"`, `run_in_background: true`, and the full brief as the prompt. Tell the user in one line that it's running and that they can keep talking about other things.

## 6. When the developer finishes

1. Relay its report to the user in short Korean: what was done, decisions it made, questions if it stopped.
2. If it stopped with questions, ask the user, then send the answers to the same agent with SendMessage so it continues in its worktree.
3. Run the reviewer agent (`subagent_type: "reviewer"`) on the branch, giving it the branch name, the worktree path, and the brief. Relay its findings.
4. If there are must-fix findings, send them to the developer (SendMessage) and review again after it's done.
5. Merging into `main` changes the user's main branch, so ask before doing it. On OK:
   - from the repo root on `main`, `git merge --ff-only <branch>`; if `main` moved meanwhile, `git rebase main` in the worktree first, fixing conflicts (ask the user about any that change behavior), and rerun the tests;
   - run all tests on `main`;
   - remove the worktree and delete the branch (`git worktree remove <path>`, `git branch -d <branch>`).
   Don't push.
