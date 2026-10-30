# Task: Harden the Lookup (cross-sheet) feature

You are fixing reliability and accuracy bugs in an existing lookup/join feature. Two files are involved:

- `src/features/lookup/lib/run-lookup.ts` — pure join logic exporting `runLookup`, `KeyPair`, `LookupOptions`.
- `src/features/lookup/components/LookupForm.tsx` — the React form (path may be `LookupForm.tsx` under your features dir; match the existing import paths `@/entities/dataset`, `@/app/store/DatasetsContext`, `@/shared/ui/*`).

Read both files fully before editing. Preserve the existing public API shape of `runLookup` (`{ columns, rows, diagnostics }`) and all existing exported types. Do not rename existing props or break imports. Keep the existing UI library components (`Button`, `Select`, `Label`, `Card`, etc.) and the existing `StepHeading` / `ColumnSelect` helpers. Match the existing code style (no semicolon changes, same formatting conventions).

Implement **all** of the following fixes. For each, keep behavior backward compatible for the happy path.

---

## 1. Validate and filter every key set (primary AND fallbacks) — CRITICAL

In `runLookup`:

- Build `allKeySets = [keyPairs, ...fallbackKeySets]`.
- For **each** key set, first drop pairs where `sourceColumn` or `lookupColumn` is falsy, then drop sets that become empty.
- Run `assertColumns` against the source and lookup datasets for **every** cleaned key set (not just the primary). Use context strings like `Lookup key set 1 source`, `Lookup key set 2 lookup`, etc.
- If the primary set (index 0) ends up empty after cleaning, throw a clear error: `Lookup: primary key set requires at least one complete source→lookup column pair.`
- If a fallback set is empty after cleaning, skip it silently (it just won't be tried) — do **not** treat it as matching everything.
- Preserve the `_match_level` labels: `primary` for set 0, `fallback_N` for set N (1-based, matching the original `fallback_${i}` where `i` is the 1-based index). Ensure this remains accurate after filtering — i.e. label by the _original_ set index, not the filtered array index, so users can map `fallback_2` back to their UI's "Fallback 2". If you renumber, update the doc comment to say so. Prefer preserving original indices.

## 2. Detect retrieved-column name collisions — CRITICAL

Before writing retrieved values into output rows:

- Compute `collisions = columnsToRetrieve.filter(c => source.columns.includes(c))`.
- If `collisions.length > 0`, throw: `Lookup: retrieved column(s) collide with existing source columns: ${collisions.join(', ')}. Rename the lookup column(s) or choose different columns to retrieve.`
- Do **not** silently overwrite source data.

## 3. Skip all-empty composite keys — HIGH

- After `buildKey`, if the normalized key is all empty segments (every segment is `''`), skip that lookup row when building the map (do not insert it).
- When matching a source row, if its composite key is all-empty, treat it as **unmatched** (never match to anything), regardless of fallback sets.
- Add a diagnostic count: `Skipped N lookup row(s) with empty key(s).` and `Skipped M source row(s) with empty key(s).` Only include those lines if the counts are > 0.

## 4. Report duplicate keys per key set — HIGH

While building each lookup map, count how many times a key already exists (i.e. the row was ignored because first-wins). For each key set with duplicates, add a diagnostic: `Key set ${label} has D duplicate key(s); first occurrence used.` where `${label}` is `primary` or `fallback_N`. Skip the line if `D === 0`.

## 5. Surface errors in the UI

In `LookupForm.tsx`'s `handleRun`:

- Wrap the `runLookup` call in `try / catch / finally`.
- On error, set `diagnostics` to `[err instanceof Error ? err.message : String(err)]` and **do not** call `setResult`.
- Keep `setRunning(false)` in `finally`.
- Optionally `console.error(err)` as well.

Also, when `runLookup` throws due to collisions or invalid keys, the UI must show the message via the existing diagnostics panel (`role="status"` block) — no new UI components needed.

## 6. Include fallback validity in run gating

In `LookupForm.tsx`:

- Add a helper that determines whether **every non-empty fallback set** has all pairs complete (both `sourceColumn` and `lookupColumn` set). A fallback set that is entirely empty (all pairs empty) may be allowed to exist in the UI but should be excluded from `runLookup` — either filter it out before calling `runLookup`, or leave it and rely on fix #1. Prefer filtering it out in `handleRun` **and** reflecting the state in the blocker text.
- Extend `blocker` so that if any fallback set has at least one pair and at least one incomplete pair, the text reads: `Complete every key pair in each fallback set (or remove empty ones).`
- Ensure `canRun` is `false` when that blocker condition is present.
- Also filter fallback sets before passing them to `runLookup`: drop sets that are entirely empty; if a set has some complete and some incomplete pairs, that's a blocker and `handleRun` should not execute (return early).
- Do not change the existing primary `keyPairs` filtering behavior (still `filter(p => p.sourceColumn && p.lookupColumn)` and require `validPairs.length > 0`).

## 7. Improve the diagnostics summary

Update the final diagnostic line to account for `excludeUnmatched`:

- If `excludeUnmatched` is `true`: `Matched X of Y source row(s). Z unmatched (excluded).`
- Else: `Matched X of Y source row(s). Z unmatched.`
- Keep the existing format otherwise.

## 8. Update the doc comment on `runLookup`

Update the JSDoc to reflect:

- Each key set (primary + fallbacks) is validated and filtered.
- Empty composite keys never match.
- Duplicate keys: first occurrence wins, and duplicates are reported in `diagnostics`.
- Retrieved-column collisions throw.

---

## Constraints

- Do not introduce new npm dependencies.
- Do not change `Dataset`, `DataRow`, `KeyPair`, or `LookupOptions` type shapes.
- Keep the return type of `runLookup` unchanged.
- Do not reorder or rename existing UI step headings, labels, or buttons beyond what's needed for blocker text.
- Keep all existing `aria-label` / `aria-pressed` / `title` attributes.
- All new strings should follow the existing message style (sentence case, no trailing period on counts, period on errors).

## Acceptance checks

After implementing, verify by reasoning through these cases and add a short comment block at the top of `runLookup.ts` listing them (or a `// Regression cases:` comment):

1. Primary key set with matching data → `_match_level === 'primary'`.
2. Primary misses, fallback 1 hits → `_match_level === 'fallback_1'`.
3. A fallback set with an empty pair is filtered out and never matches everything.
4. A fallback referencing a non-existent lookup column throws a clear error.
5. A retrieved column colliding with a source column throws a clear error with the column name.
6. A lookup row with an all-empty key is skipped and reported in diagnostics.
7. A source row with an all-empty key is reported unmatched even if a fallback would otherwise match.
8. Duplicate lookup keys produce a diagnostic line naming the set and count.
9. `excludeUnmatched: true` drops unmatched rows and the diagnostic says "(excluded)".
10. UI `handleRun` surfaces thrown errors in the diagnostics panel and leaves the previous result intact.

Provide the full updated contents of both files (no diffs), and briefly summarize what changed under each numbered fix above so I can review.

---
