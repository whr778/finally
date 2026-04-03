# Code Review: Changes Since Last Commit (`HEAD`)

## Scope Reviewed
- Modified tracked files: `.claude/settings.json`, `planning/PLAN.md`
- New untracked files: `.claude/agents/change-reviewer.md`, `.claude/agents/codex-reviewer.md`, `.claude/agents/reviewer.md`, `.claude/bullshit.json`, `.claude/commands/doc-review.md`, `planning/REVIEW.md`

## Findings (Ordered by Severity)

### High

1. **Stop hook is configured to self-invoke Codex review, which can recurse indefinitely**
- Evidence: `.claude/settings.json:8-16`
- Why this matters: On every `Stop` event, it runs `codex exec "Please reviews all changes..."`. That spawned run can hit `Stop` again and trigger the same hook repeatedly, causing review loops and background task churn.
- Recommendation: Remove this hook or gate it behind a non-recursive condition (for example, only in a dedicated script or with an env flag check).

2. **Watchlist behavior is internally contradictory with default simulator mode**
- Evidence: `planning/PLAN.md:137-140`, `planning/PLAN.md:268`
- Why this matters: The plan says simulator mode is used when `MASSIVE_API_KEY` is missing and that watchlist functionality works normally when OpenRouter is missing. But `POST /api/watchlist` now always requires `MASSIVE_API_KEY`, so default simulator users cannot add tickers.
- Recommendation: Define simulator-mode ticker validation (or allow add without Massive), or explicitly change the product behavior and remove conflicting statements.

3. **New “daily change % from previous close” requirement lacks a defined data source/contract**
- Evidence: `planning/PLAN.md:356`, `planning/PLAN.md:170-172`, `planning/PLAN.md:180`
- Why this matters: Current cache/SSE contract includes current and previous tick price, not previous day close. The new UI requirement is not implementable deterministically from the specified backend payload.
- Recommendation: Add `previous_close` to the market data contract (both simulator and Massive modes), or relax UI copy to use intraday change from stream start.

### Medium

4. **Agent definitions encourage recursive delegation instead of direct execution**
- Evidence: `.claude/agents/change-reviewer.md:8-12`, `.claude/agents/codex-reviewer.md:6-10`
- Why this matters: Both agents instruct the model to call `codex exec` for the same review task instead of performing the review directly, which increases loop risk and makes behavior non-deterministic.
- Recommendation: Replace with explicit review steps (collect diff, analyze findings, write target file) rather than shelling out to the same high-level command.

5. **Additional hook config file appears malformed/experimental and is likely accidental**
- Evidence: `.claude/bullshit.json:1-12`
- Why this matters: It duplicates hook intent with a different schema shape and non-production filename. If committed, it introduces confusion and potential tooling side effects.
- Recommendation: Remove it or rename and validate against the expected config schema before keeping it.

### Low

6. **Prompt text quality issues in automation docs can reduce reliability**
- Evidence: `.claude/commands/doc-review.md:1`, `.claude/agents/reviewer.md:6`, `.claude/agents/codex-reviewer.md:6`
- Why this matters: Typos/grammar (`"Please reviews"`, `"Your review"`, `"call $ARGUMENTS"`, `"oportunities"`) degrade prompt clarity and make command behavior less predictable.
- Recommendation: Normalize wording to concise imperative instructions and run a quick spell/grammar pass.

## Open Questions

1. Should adding watchlist symbols be supported in simulator mode without `MASSIVE_API_KEY`?
2. Is the `Stop` hook intended to run automated reviews on every assistant completion, or only on demand?
3. Is `planning/REVIEW.md` intended to coexist with `planning/CODE_REVIEW.md`, or should one be the canonical review artifact?
