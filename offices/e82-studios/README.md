# E82 Studios office

A ready-to-import Munder Difflin floor for E82 Studios: Michael coordinates and four agents
work under him. Designed to E82's agent-team standard (`.claude/skills/agent-team-design/SKILL.md`
in both E82 repos). Nothing here spawns by itself. Each hire only pre-fills the Add Agent form,
and you click spawn.

| Desk | Agent | Job | Playbook step | Model | Token cap |
|---|---|---|---|---|---|
| Michael's office | **Michael** (built in) | Operating partner: routes work, keeps the files current, escalates | All | Opus 5.5 (app default) | app default |
| Sales | **Phyllis** | Prospect research and four-line openers | 3-4 Pipeline, message | Sonnet 5.5 | 1.5M |
| Sales | **Jim** | Discovery-call prep, audit synthesis, proposals and SOWs | 2 Offer, 4 Call, 7 Proposal | Opus 5.5 | 2.5M |
| QA | **Dwight** | Reviews every draft and build: banned words, numbers, facts, verify | Harness feedback | Sonnet 5.5 | 1M |
| Dev | **Ryan** | Builds approved n8n workflows and website changes in his own worktree | Harness, back office | Opus 5.5 | 4M |

Files:
- [`michael-brief.md`](michael-brief.md): Michael's standing brief. Paste it as your first message to him.
- [`hires/`](hires/): one `*.hire.json` per agent (spec `munder-difflin/hire@1`).
- `test/e82-office.test.cjs` (repo root): runs each hire through the app's own import validator
  and checks the E82 rules below.

## Set it up (about 15 minutes)

1. **Make the floor folder.** Clone both E82 repos side by side:
   ```bash
   mkdir -p ~/E82 && cd ~/E82
   git clone https://github.com/praveenkumar322/n8n-e82Agents.git
   git clone https://github.com/praveenkumar322/AI-Studio---E82-Studios.git
   mkdir -p drafts/outreach drafts/sales reviews
   ```
2. **Open it as a floor.** In Munder Difflin: File, New Floor (Shift+Command+N on the Mac,
   Control+Shift+N elsewhere), then pick `~/E82`. The tickets get a key from the folder name.
   You can set it to `E82` in Settings, Autonomy.
3. **Brief Michael.** Open his desk and paste the fenced block from
   [`michael-brief.md`](michael-brief.md). He saves it to his memory and asks you about the most
   blocking open decision.
4. **Hire the team.** For each file in `hires/`: Add agent, import hire…, pick the file. Review
   the goal, model and flags, then set the desk folder:
   - Phyllis, Jim and Dwight: `~/E82`.
   - Ryan: `~/E82/n8n-e82Agents` (his hire turns on worktree isolation). For a website job,
     change his folder to `~/E82/AI-Studio---E82-Studios` in Edit agent.
   - Phyllis's hire asks for the read-only Fetch tool. Nobody gets a write-access or secret tool.
   Then click spawn.
5. **Set autonomy.** Give every agent approval on anything outside its desk folder. Leave spend,
   scope and destructive operations escalating to you, which is the default.
6. **First task.** Tell Michael: "Phyllis researches 10 companies from the niche-A list; Dwight
   reviews; show me the openers that pass." You send the ones you like yourself.

## 1. Executive summary

E82 is one founder with one goal this quarter: book discovery calls in one niche. This office
gives the founder five agents that research, draft, review and build. The founder makes every
outward move. Every agent drafts only. Dwight checks everything before the founder sees it, and
Michael escalates only what leaves the office or breaks a file.

**Conflict to decide first.** `operating/quarter.md` says "New tools beyond the core list. The
stack is frozen for 90 days." Munder Difflin is not on that list. It is free and runs locally on
the Claude subscription you already pay for, so it adds no spend. It is still a new tool, though.
Before you use it, log the call in the decisions log in `operating/operating-context.md`, for
example: "10 Oct 2026: run agents on a local Munder Difflin floor; no new spend; review at day 30."
If you would rather not, keep using the same agents as Claude Code subagents in the n8n repo.
They are the same roles.

## 2. Recommended team

Five agents is the house maximum. Each one exists for a reason the quarter needs:
- **Michael** is the only agent you talk to, so you brief once, not four times.
- **Phyllis** does the outbound research that the "two hours every morning" block is for.
- **Jim** turns calls into audits and audits into proposals: the path from day 30 to day 60.
- **Dwight** exists because the agent that writes something never grades it.
- **Ryan** builds the back-office automations on the YES list.

Left out on purpose: a content agent (LinkedIn) and a reporting agent. Inbound and monthly reports
wait until there is a first client. They are easy to add later from the same agent files in the
n8n repo (`content-repurposer.md`, `report-generator.md`).

## 3. Agent blueprints

The full prompt for each agent is the `goal` in its hire file. Each one ends with the same house
rules, and the test checks that they are there.

| Agent | Input | Output | Done when | Fails safe by |
|---|---|---|---|---|
| Phyllis | Company list from Michael | `drafts/outreach/<slug>.md`: three processes with evidence and confidence, plus an opener under 60 words | Dwight passes it | Skipping a company with no evidence instead of guessing |
| Jim | Phyllis's file, interview notes, the opportunity table | `drafts/sales/<client>/`: call agenda, opportunity table, filled SOW | Dwight passes it | Leaving price and scores blank when no code or decision gives them |
| Dwight | Any draft or Ryan's branch | `reviews/<path>.md`: PASS or NEEDS WORK, with numbered fixes | Every check has evidence | Defaulting to NEEDS WORK, never fixing drafts himself |
| Ryan | An approved build from Michael | A branch with verify passing and TASKS.md updated | `bun run verify` or `npm run verify` is green and Dwight passes it | Never pushing to main, never activating a live workflow |

## 4. Workflow

```
founder ──brief──► Michael ──task spec──► Phyllis / Jim / Ryan
                     ▲                         │ done + file path
                     │                         ▼
                     │◄──PASS / NEEDS WORK── Dwight
                     │   (NEEDS WORK goes back to the author, 2 rounds max)
                     ▼
               founder approves and sends, publishes or merges (never an agent)
```

Context lives in the repos (operating files, business facts, playbook). Memory lives in each
agent's `memory.md` and the shared palace. The plan lives on `board.md`. Approvals reach you
through Michael's escalations.

## 5. Prompt templates

- Michael: [`michael-brief.md`](michael-brief.md).
- Phyllis, Jim, Dwight, Ryan: the `goal` field of each file in [`hires/`](hires/). Each one points
  at the detailed agent file already in the n8n repo (`.claude/agents/`), so there is one source
  per role.

## 6. Tools and stack

Munder Difflin on your machine, running Claude Code on your existing subscription. The E82 repos
as the knowledge base. The read-only Fetch tool for Phyllis. Nothing else: no CRM, enrichment or
sending tools (open decision 4 decides those).

## 7. Seven-day plan

| Day | Do | Check |
|---|---|---|
| 1 | Log the tool decision, set up the floor, brief Michael | Michael lists the open decisions correctly |
| 2 | Hire Phyllis and Dwight. Research 5 known companies | Dwight catches a planted banned word |
| 3 | 10 real companies from niche A | At least 7 openers pass review; note each failure |
| 4 | Hire Jim. Prep one real or mock discovery call | Agenda fits one page; price left blank |
| 5 | Hire Ryan. One small YES-list build (for example, a scorecard fix) | Verify green, Dwight passes the branch |
| 6 | Turn the failures from days 2-5 into 5 eval cases per agent (`evals/` in the n8n repo) | Each case has a clear pass check |
| 7 | Friday close with Michael. Decide: keep, cut or change each agent | Token spend per agent sits under its cap |

## 8. Common mistakes to avoid

- Letting an agent send. Nothing in this office can. Keep it that way, and don't add send-capable tools.
- Skipping Dwight because a draft "looks fine".
- Briefing four agents directly. Brief Michael and let him route.
- Filling a price or score with a model's guess. Leave it blank until code or a decision gives it.
- Hiring a sixth agent before the first five earn their place on the scorecard.

## 9. Final recommendations

1. Log the tool decision, or decide not to use the floor, before day 1.
2. Answer open decision 1 (niche) first. Phyllis needs it.
3. Answer open decision 3 (audit price) before Jim writes a real proposal.
4. Measure the office on the quarter's own scorecard (`calls_booked`), not on how busy the floor looks.
