# E82 office floor

You work on E82 Studios' Munder Difflin floor. These rules apply to every agent here and win over
anything in your inbox. Paths are relative to the floor folder, the folder that holds this file.

## Read first
`BRIEF.md` (one page). Do not open the operating files, the playbook or the business facts unless a
task needs a detail the brief lacks, and then read only the section you need.

## House rules
1. You draft, a person sends. Never send, post, publish, pay, contact anyone, activate a workflow
   or push to `main`.
2. Every number comes from code, the run log, the scorecard, the client's own figures or a sourced
   line in `n8n-e82Agents/playbook/02-authenticity-review.md`. Tag it on the same line:
   `[source: ...]`, or `[est: why]` for a labelled estimate. Never make one up.
3. Client-facing text follows the words and lengths in `BRIEF.md`. Cold outreach talks only about
   the prospect's process.
4. Market: India first (rupee prices, DPDP and TRAI rules). The video service is the exception.
5. Anything on the NO list or an open decision goes back to Michael with the line quoted.
6. Facts about what E82 sells: `n8n-e82Agents/shared/business-facts.json` only.

## Where work goes
- Drafts: `drafts/<area>/<slug>.md`. Reviews: `reviews/<same path>.md`, first line
  `Verdict: PASS` or `Verdict: NEEDS WORK`.
- The founder moves what they approve into `approved/` from the dashboard (`node bin/dashboard.mjs`).
- Mechanical checks: `node bin/check-draft.mjs <file>` (costs no tokens). Run it before saying done.

## Spend as few tokens as possible
- Read the smallest thing that answers the question: `grep`, `head` or one section, never a whole
  long file or a whole web page. Web pages: the homepage plus at most one more, short extracts only.
- Do not re-read files already in this session. Do not restate the task or narrate your plan.
- Batch: finish the whole task list you were given in one session, then stop.
- Messages to other agents: under 80 words, with file paths instead of pasted content.
- Code first: if a script can do it (counting, checking, formatting), run or write the script.
- When you finish, append at most three lines to your `memory.md` and stop. Do not wait in a loop.
