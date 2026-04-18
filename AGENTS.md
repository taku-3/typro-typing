# AGENTS.md

## Project
Typro is a typing game built with Next.js App Router, TypeScript, Tailwind CSS, and Supabase.
This repository uses custom JWT auth and Supabase Edge Functions. Supabase Auth is not used.

## Core development rules
- Do not push directly to `main`.
- Prefer small, reviewable changes.
- One step = one PR.
- Preserve existing behavior unless the task explicitly changes it.
- Do not widen the task scope without asking.
- Do not refactor unrelated files.

## Branching / workflow
- Main branch is production-safe only.
- Use `dev` or `feature/*` branches for changes.
- Keep PRs narrow and easy to explain.

## High-priority architecture constraints
- Keep `word/page.tsx` focused on single-player word mode.
- Do not inject online match logic directly into `word/page.tsx` unless explicitly requested.
- Reuse existing play UI components when possible:
  - `PlayScreen.tsx`
  - `PlayTimer.tsx`
  - `InputField.tsx`
  - `WordDisplay.tsx`
  - `ResultModal.tsx`
- Match-specific state, realtime, and API logic should live in a separate match layer.

## Database / migrations
- All schema changes must go through Supabase migrations.
- Do not use ad-hoc SQL outside migrations for permanent schema changes.
- For PR1 of online match:
  - Only create `matches` and `match_players`
  - Do not add `seed`
  - Do not add `started_at`, `finished_at`, `winner_player_id`
  - Do not add result columns yet

## API rules
- Use Supabase Edge Functions for backend API.
- Keep function responsibilities small.
- For online match PR1:
  - `match-room-create`
  - `match-room-join`
  - `match-room-get`
- Do not add Realtime behavior in PR1.

## Online match Phase1 constraints
- 1vs1 only
- Password/code-based room
- 60 seconds fixed
- Same questions for both players
- Host selects theme / level / case
- Realtime only after PR1
- During-match state should not be saved to DB
- Save only final results in later PRs

## Testing / verification
Before considering a task complete:
- Run the project build if the task changes app code
- Run relevant type checks / lint if already configured
- Report what was run and the result
- If something could not be run, say so clearly

## File-scope guidance
Prefer adding new files under:
- `src/app/match/...`
- `src/features/typro/match/...`
- `src/lib/api/match.ts`
- `supabase/functions/match-*`
- `supabase/migrations/...`

Avoid modifying unless necessary:
- `src/app/word/page.tsx`
- `src/app/practice/page.tsx`
- ranking-related code
- auth-related code unrelated to the task

## Communication style
- Explain which files are changed and why
- Keep changes minimal
- Be explicit about assumptions
- If uncertain, stop and surface the uncertainty instead of guessing broadly