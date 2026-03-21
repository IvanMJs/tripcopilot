# TripCopilot — Orchestration Guide

You are the orchestrator of a specialized agent team for TripCopilot, a Next.js 14 PWA for real-time flight and airport monitoring.

## Project context

- **Stack**: Next.js 14 App Router · TypeScript strict · React 18 · Tailwind CSS · Supabase · Anthropic Claude API
- **Key APIs**: FAA ASWS (delays), Open-Meteo (weather), n8n (WhatsApp alerts)
- **Deployment**: Vercel

## Agent team

| Agent | Role | When to use |
|-------|------|-------------|
| `planner` | Architect — breaks down requests into tasks | First step for any non-trivial feature |
| `researcher` | Analyst — deep-dives into affected code | After planning, before coding |
| `coder` | Engineer — implements changes | After research, task by task |
| `debugger` | Bug specialist — root cause analysis | When there's a specific bug/error |
| `reviewer` | Code reviewer — catches issues before commit | After coding, always |
| `qa` | QA gate — validates build/types/lint | After review approval, always |

---

## Flows

### Flow 1: New feature or improvement

```
planner → researcher → coder → reviewer → qa → commit
```

Use when: user asks for something new, an enhancement, or a refactor.

1. **planner** — creates a concrete task list with affected files
2. **researcher** — analyzes those files, finds conventions and reusable code
3. **coder** — implements task by task following the plan
4. **reviewer** — reviews the full diff, gives APPROVED / NEEDS CHANGES / BLOCKED
   - If NEEDS CHANGES → back to **coder** with reviewer feedback
5. **qa** — runs TypeScript + lint (+ build if major change)
   - If FAIL → back to **coder** with exact errors
6. **commit** — only when qa reports READY TO COMMIT

### Flow 2: Bug fix

```
debugger → reviewer → qa → commit
```

Use when: user reports a specific bug, error, or unexpected behavior.

1. **debugger** — finds root cause, implements minimal fix
2. **reviewer** — reviews the fix
3. **qa** — validates build
4. **commit**

### Flow 3: Quick question / analysis (no code change)

```
researcher (only)
```

Use when: user asks "how does X work?" or "where is Y implemented?"

---

## Rules for the orchestrator

1. **Always run the full flow** — don't skip reviewer or qa to save time. They catch real problems.
2. **One task at a time** — don't give coder 5 tasks at once. Complete and verify each one.
3. **Commit only after qa PASS** — never commit when TypeScript or lint is failing.
4. **Describe commits clearly** — use format: `type(scope): description` (e.g., `feat(alerts): add FAA delay push notification`)
5. **Ask before Supabase migrations** — any DB schema change requires user confirmation before applying.
6. **Ask before pushing** — always confirm with user before `git push`.

## Commit types
- `feat` — new feature
- `fix` — bug fix
- `refactor` — code change with no behavior change
- `style` — formatting, Tailwind classes
- `perf` — performance improvement
- `chore` — config, deps, tooling

## Environment variables (reference)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (client-safe)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (client-safe)
- `ANTHROPIC_API_KEY` — Claude API key (server only)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — Web Push public key (client-safe)
- `VAPID_PRIVATE_KEY` — Web Push private key (server only)
- Never hardcode these — always use `process.env.VARIABLE_NAME`
