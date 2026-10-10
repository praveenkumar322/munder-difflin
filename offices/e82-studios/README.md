# E82 Studios office

A Munder Difflin floor for E82 Studios: Michael coordinates and four agents work under him. Week 1's
work is already on the board. Approved by the owner on 10 Oct 2026 and designed to E82's
agent-team standard (`.claude/skills/agent-team-design/SKILL.md` in both E82 repos). Hires only
pre-fill the Add Agent form, and you click spawn. Nothing leaves E82 without you.

| Agent | Job | Playbook step | Model | Turns | Token cap* |
|---|---|---|---|---|---|
| **Michael** (built in) | Routes work, keeps the board, asks you only what he must | All | Sonnet 5.5 (set in the orchestrator picker) | app | app |
| **Phyllis** | Prospect research and four-line openers | 3-4 | Haiku 5.5 | 25 | 400k |
| **Jim** | Discovery-call prep, audit synthesis, SOW drafts | 2, 4, 7 | Sonnet 5.5 | 30 | 600k |
| **Dwight** | Reviews every draft and build; code checks first | Harness | Haiku 5.5 | 15 | 200k |
| **Ryan** | Approved YES-list builds on his own branch | 5 (back office) | Sonnet 5.5 | 50 | 1.2M |

\*Work tokens per session (cache reads not counted). The floor's circuit breaker pauses an agent that
goes over its cap.

Ready for later (`hires/later/`, import only when Michael says the trigger has happened):
**Kelly** (content posts, after the first audit) and **Angela** (monthly client reports, after the
first retainer).

## What's in here

| Path | What it is |
|---|---|
| `setup.mjs` | Creates or updates the floor folder (`~/E82`). Safe to re-run: it never overwrites the office's work |
| `hires/` | The four hire files to import. `hires/later/` holds the two future hires |
| `floor/CLAUDE.md` | House rules and token rules, loaded once by every agent on the floor |
| `floor/bin/build-brief.mjs` | Builds `BRIEF.md`, a one-page summary of the operating files, so agents don't read five long files |
| `floor/bin/check-draft.mjs` | Banned words, opener length and numbers with no source, checked in code |
| `floor/bin/dashboard.mjs` | The office dashboard: agents, tokens, the board and the drafts waiting for you |
| `floor/hive/` | Week 1's board and tasks, and Michael's standing brief (his `memory.md`) |
| `michael-brief.md` | Only needed if you opened the floor before running setup |

`test/e82-office.test.cjs` (repo root) runs every hire through the app's own import validator,
checks the token limits, the seeded board and the scripts.

## Set it up (10 minutes)

Before you start, read "Is it safe?" below.

1. **Make the floor.** From this repo:
   ```bash
   node offices/e82-studios/setup.mjs          # or: node offices/e82-studios/setup.mjs D:\E82
   ```
   It clones both E82 repos into `~/E82` (skipping any already there), copies the floor files and
   writes `BRIEF.md`.
2. **Settings first** (Munder Difflin → Settings):
   - Autonomy: leave **auto mode off**, so every agent asks before running commands.
   - Leave "Michael may spawn agents" **off**, which is the default.
   - Schedules: turn **Auto-compact on** (smaller context, fewer tokens). Leave **Floor heartbeat
     off**: it wakes Michael every 2 minutes.
   - MCP: switch off the default servers no desk needs (Sequential Thinking, Context7, Time,
     Filesystem, Git). Claude Code has its own file and git tools, and every server's tool list
     rides along on every turn. Keep Fetch for Phyllis.
   - General: switch off anonymous usage stats if you like. A build from source sends none.
3. **Open the floor.** File → New Floor → `~/E82`. In the orchestrator picker, set Michael to
   **Sonnet 5.5**. Set the ticket key to `E82` in Settings, Autonomy.
4. **Hire the team.** Add agent → import hire… for each file in `hires/`. Desk folder: `~/E82` for
   Phyllis, Jim and Dwight; `~/E82/n8n-e82Agents` for Ryan (switch it to
   `~/E82/AI-Studio---E82-Studios` in Edit agent for a website job). Click spawn.
5. **Add three schedules** (Schedules tab, to Michael):
   - Mon 09:00: "Monday: run node bin/build-brief.mjs, then draft the weekly brief."
   - Mon–Fri 08:30: "Morning batch: next outbound task for Phyllis, then Dwight."
   - Fri 17:00: "Friday close: run the Weekly close prompt and propose decisions-log lines."
6. **Start.** Tell Michael: **"Start the week: work the board."**
7. **Watch.** `node ~/E82/bin/dashboard.mjs`, then open http://127.0.0.1:4782. Open, read the
   review, Approve. Approved drafts move to `approved/`, and you send them yourself.

To update the floor's scripts after pulling this repo, re-run step 1.

## Week 1, already on the board

| Key | Task | Who |
|---|---|---|
| E82-1 | Research 10 prospects (5 D2C e-commerce, 5 multi-location clinics, India) | Phyllis |
| E82-2 | Review them | Dwight |
| E82-3 | **You:** pick the niche (open decision #1), from E82-1 and E82-2 | You |
| E82-4 | Discovery-call agendas for both niches | Jim |
| E82-5 | Review them | Dwight |
| E82-6 | **You:** choose Ryan's first build (scorecard, error alerts or the research workflow) | You |
| E82-7 | This week's brief | Michael |
| E82-8 | **You:** set the audit price (open decision #3) | You |

Your three questions show on the floor's Ask me board and on the dashboard.

## How the office keeps token use low

1. **Short goals, shared rules.** A desk's goal stays in context for its whole session, so each one
   is under 1,000 characters, down from about 2,000. The house rules sit once in `CLAUDE.md`.
2. **One page instead of five files.** `BRIEF.md` is built by code from the operating files (about
   600 words). Agents open a full file only for a detail the brief lacks.
3. **Code before models.** `check-draft.mjs` does Dwight's mechanical checks for free, so Dwight
   runs on Haiku and judges only claims and voice.
4. **The cheapest model that does the job.** Haiku for research and review, Sonnet for writing,
   building and routing, no Opus by default. For a long build across both repos, switch Ryan to
   Opus 5.5 for that job only (the owner's model rule, 9 Oct 2026).
5. **Hard ceilings.** A turn limit and a token cap on every desk. Heartbeat off, auto-compact on,
   unused MCP servers off.
6. **Batches and short messages.** One dispatch per agent per batch, messages under 80 words with
   file paths, and agents stop when done instead of waiting in a loop.
7. **A free dashboard.** Watching the office reads files; it never asks an agent anything.

## Is it safe?

- **The pack** is plain JSON, Markdown and three small Node scripts with no dependencies. Hires
  can't start an agent or name a program. The app allows only four harmless flags, and no hire asks
  for a tool that can write files or needs a secret.
- **The dashboard** listens only on 127.0.0.1. Its one write moves a draft that Dwight passed into
  `approved/`, and it needs a token that's new each run.
- **Never turn on auto mode for these desks.** For Claude, it means `--permission-mode
  bypassPermissions`: any command, with no approval prompt.
- **Keep secrets off the floor.** No `.env` files in `~/E82`. Agents can read their desk folder,
  and the hive keeps a local git history of messages.
- **Ryan never pushes to main.** The website syncs to Lovable. He works in a worktree, and you
  approve every push.

## Design summary (agent-team standard)

1. **Executive summary.** One goal this quarter: book discovery calls in one niche. The office
   researches, drafts, reviews and builds; you make every outward move. The frozen-stack rule in
   `operating/quarter.md` names "new tools"; Munder Difflin adds no spend. Log it in the decisions
   log: "10 Oct 2026: run agents on a local Munder Difflin floor; no new spend; review at day 30."
2. **Team.** Five desks, the house maximum. Content and reporting wait in `hires/later/`.
3. **Blueprints.** Each desk's goal in `hires/`, plus the house rules in `floor/CLAUDE.md`.
4. **Workflow.**
   ```
   you ──► Michael ──task──► Phyllis / Jim / Ryan ──done──► Dwight ──PASS──► dashboard ──► you send
                                  ▲                                    │
                                  └────────── NEEDS WORK (2 rounds) ───┘
   ```
5. **Prompts.** `hires/*.hire.json` (goal), `floor/CLAUDE.md`, `floor/hive/agents/god/memory.md`.
6. **Stack.** Munder Difflin and Claude Code on your subscription, the two E82 repos, Fetch for Phyllis.
7. **Seven days.** Day 1 setup and E82-1; day 2 reviews and the niche call; day 3 Jim's agendas;
   day 4 Ryan's first build; day 5 Friday close; days 6-7 turn every NEEDS WORK into eval cases
   (5 per desk, `evals/` in the n8n repo) and adjust caps from the dashboard's token numbers.
8. **Mistakes to avoid.** Letting an agent send; skipping Dwight; briefing desks directly instead of
   Michael; letting a model fill a price; hiring past five desks before the scorecard says so.
9. **Measure it** on the quarter's scorecard (`calls_booked`), not on how busy the floor looks.
