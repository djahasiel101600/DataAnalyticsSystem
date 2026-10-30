# Coding Agent Implementation Prompt: Advanced Lookup & Matching

## Role and objective

Act as a senior full-stack engineer and data-processing specialist working inside this existing application.

Your task is to **audit, stabilize, and safely integrate the Advanced Lookup & Matching feature**. A partial implementation already exists, but it is not yet sufficiently reliable or accurate.

This is an enhancement to an established application—not a greenfield project. Your first responsibility is to understand the current architecture and implementation. Do not immediately rewrite the feature or surrounding systems.

The goal is to deliver a deterministic, explainable, performant matching operation that preserves source-data integrity and does not regress existing functionality.

---

## 1. Feature definition

Implement **Advanced Lookup & Matching**, a data-enrichment operation that finds corresponding records in a Lookup Dataset for each record in a Source Dataset.

Unlike conventional single-column VLOOKUP, this feature must support:

- Single-column matching.
- Multi-column composite keys.
- Multiple ordered matching strategies.
- A required primary strategy and optional fallback strategies.
- Explicit normalization and per-key data-type conversion.
- Duplicate detection and ambiguity handling.
- Selection of Lookup Dataset columns to append to the Source Dataset.
- Per-record diagnostics and an execution summary.

The feature uses **exact matching after explicitly configured normalization/conversion**. Fuzzy matching is out of scope and must remain a separate feature or operation.

### Terminology

Use these terms consistently:

- **Source Dataset:** The dataset whose records are being processed and enriched.
- **Lookup Dataset:** The reference dataset searched for corresponding records.
- **Strategy:** One ordered set of source-to-lookup key-column mappings.
- **Primary Strategy:** The first and highest-priority strategy.
- **Fallback Strategy:** Any subsequent strategy attempted only when the current strategy returns zero candidates.
- **Candidate:** A Lookup Dataset row whose complete composite key matches the source record under a strategy.

---

## 2. Mandatory matching semantics

These rules are business requirements, not implementation suggestions.

### Composite keys

A strategy contains one or more key pairs. Each pair maps one Source Dataset column to one Lookup Dataset column.

All key pairs within a strategy must match using **AND** semantics.

For example:

`Source.Employee ID = Lookup.Employee ID AND Source.Department = Lookup.Department`

Do not treat key components as alternatives (OR semantics).

The system must support one-column strategies as a special case of composite matching.

### Ordered strategy execution

For each Source Dataset record, execute strategies in configured priority order:

1. Evaluate the Primary Strategy.
2. If it returns exactly one candidate, accept that match and stop processing strategies for this source record.
3. If it returns more than one candidate, mark the record `ambiguous` and stop processing strategies for this source record.
4. If it returns zero candidates, try the next fallback strategy.
5. Continue until a unique match, an ambiguous result, or exhaustion of all strategies.
6. If all strategies return zero candidates, mark the record `unmatched`.

**Fallbacks must execute only when the current strategy returns zero candidates.** An ambiguous result must never trigger a fallback. A weaker fallback must never override a unique or ambiguous result from a higher-priority strategy.

Each source record is evaluated independently. One record's result must not affect another record's matching outcome.

### Result statuses

Use stable, documented status values:

- `matched`: Exactly one candidate was found by a strategy.
- `ambiguous`: More than one candidate was found by the first strategy that did not return zero candidates.
- `unmatched`: Every configured strategy returned zero candidates, or no strategy was eligible for that record.

Do not silently select the first or last candidate. Do not arbitrarily resolve duplicates.

---

## 3. Output and data-integrity guarantees

This operation is **lookup-based enrichment**, not a row-expanding relational join.

For every successful execution:

- Output row count must equal Source Dataset row count exactly.
- Preserve Source Dataset row order.
- Preserve every original Source Dataset column and value.
- Append only the Lookup Dataset columns selected by the user.
- Retain all source records, including unmatched and ambiguous records.
- Never expand rows because the Lookup Dataset contains duplicate keys.
- Never discard duplicate source records.
- Never mutate either input dataset in place.
- For `unmatched` and `ambiguous` records, selected returned values must be null/missing according to the application's established data representation.
- For `matched` records, populate selected return columns from the single uniquely matched lookup row.

Do not use a relational merge/join implementation in a way that can multiply source rows. If existing merge utilities are reused, prove that the lookup operation still enforces one output row per source row.

### Output column name collisions

Detect collisions between selected Lookup Dataset return columns and existing Source Dataset columns.

Do not silently overwrite source columns or create ambiguous duplicate names. Follow the application's existing naming conventions if they are safe; otherwise provide a clear alias/prefix mechanism. Validate collisions before execution and show the final output column names in the preview.

### Diagnostics

Keep technical diagnostics separate from the enriched dataset by default. If the application supports optional status/metadata columns, users may explicitly choose to include them.

For each source record, retain enough execution information to explain the outcome:

- Stable source-row reference or original row index.
- Result status.
- Strategy identifier/name and priority that determined the result, when applicable.
- Candidate count for the decisive strategy.
- Matched lookup-row reference for a unique match.
- Relevant normalization/conversion warnings or errors.
- A useful reason for unmatched or ambiguous outcomes.

Do not expose sensitive data unnecessarily in logs or diagnostics. Prefer row references and concise explanations; show key values only where appropriate and safe.

---

## 4. Normalization and data-type policy

Matching must be exact after applying the explicitly configured rules. Never introduce fuzzy or approximate matching into this operation.

Recommended defaults:

| Setting | Default |
|---|---|
| Trim leading/trailing whitespace | Enabled |
| Case-insensitive comparison | Enabled |
| Collapse repeated internal whitespace | Disabled |
| Ignore punctuation | Disabled |
| Treat empty strings as null | Enabled |
| Null-to-null matching | Disabled |
| Remove leading zeros | Disabled |
| Automatic numeric conversion | Disabled |
| Automatic date conversion | Disabled |
| Fuzzy matching | Disabled |

Make settings configurable where appropriate, but keep the normal user experience understandable. Do not add options that the current architecture cannot support safely.

### Per-key conversion

Where source and lookup column types differ, support explicit, deterministic conversion policies where practical. Examples include converting an identifier to text or parsing a date using a specified format.

Requirements:

- Never silently coerce identifiers in ways that can change identity.
- Preserve leading zeros unless the user explicitly configures a conversion that removes them.
- Do not rely on machine locale or implicit parsing defaults.
- Date parsing must use an explicit format/locale when needed.
- Numeric parsing must define decimal and thousands separators where relevant.
- Failed conversions must not silently become valid-looking values.
- A failed or invalid key component makes that strategy ineligible for that source record; a later fallback may be attempted if configured.
- Report conversion issues in diagnostics.
- Keep null, empty string, zero, false, and missing values distinct unless an explicit policy says otherwise.

### Null and incomplete composite keys

By default, a strategy must not match a record when any required key component is null, missing, or an empty value normalized to null.

Do not allow two null components to match each other by accident. If the application later supports null matching, it must be an explicit, documented setting and tested independently.

### Safe composite key representation

Do not construct composite keys by naïvely concatenating values with a delimiter. This can cause collisions (for example, `["AB", "C"]` versus `["A", "BC"]`) and can confuse nulls, types, and boundaries.

Use an unambiguous representation, such as typed structured tuples or a canonical, length-prefixed encoding. Ensure that:

- Component boundaries are preserved.
- Data types are represented consistently.
- Null/missing values cannot collide with ordinary text.
- Delimiters inside values cannot create collisions.
- Leading zeros remain significant when values are text.
- Hashing, if used, is backed by equality checks or a collision-safe structure.

Document the chosen representation and test collision-prone examples.

---

## 5. Duplicate detection and matching index

The engine must distinguish zero, one, and multiple candidates for every strategy.

Build reusable indexes for the Lookup Dataset, preferably one index per configured strategy. Each composite key must map to a collection of lookup row references—not just one row—so duplicate candidates can be detected.

Performance requirements:

- Do not scan the full Lookup Dataset for every Source Dataset row when an index-based approach is appropriate.
- Normalize/convert lookup key values once per execution where possible.
- Reuse strategy indexes across source records.
- Avoid unnecessary full-dataset copies.
- Avoid rebuilding indexes for each source record.
- Preserve deterministic behavior regardless of internal hash-map ordering.
- Consider memory usage for large datasets.
- Support cancellation and progress reporting if the application already has those patterns.
- Do not introduce premature complexity or a new dependency without justification.

If a lookup key has multiple candidates, retain enough candidate references for diagnostics and user inspection. Do not expand the output.

---

## 6. User-interface and configuration requirements

Inspect the existing UI and reuse its established design system, components, terminology, validation patterns, and interaction conventions.

The configuration should allow users to:

1. Select the Source Dataset.
2. Select the Lookup Dataset.
3. Configure one required Primary Strategy.
4. Add zero or more fallback strategies.
5. Add one or more source/lookup key-column pairs per strategy.
6. Add, remove, and reorder strategies.
7. Add and remove key pairs.
8. Select Lookup Dataset return columns.
9. Configure supported normalization and conversion behavior.
10. Preview the selected configuration and resulting output column names.
11. Run the operation and inspect its summary and diagnostics.

The UI must make strategy priority and fallback behavior clear. A user should understand that all key pairs in one strategy must match and that fallback is attempted only after zero candidates.

Do not redesign unrelated screens. Do not create decorative or nonfunctional controls. Every displayed setting must be connected to real backend behavior, or clearly identified as unavailable rather than pretending to work.

Validate configuration before execution. Provide actionable errors that identify the relevant strategy, key mapping, or column.

---

## 7. Validation and error handling

Before processing, validate at least:

- Both datasets are available and valid.
- The Primary Strategy exists.
- Every strategy has at least one key pair.
- All referenced columns exist in the correct dataset.
- Key mappings are structurally valid.
- Return columns exist in the Lookup Dataset.
- Strategy ordering is valid and unambiguous.
- Conversion and normalization settings are supported.
- Output column names do not conflict.
- The configuration contains no invalid or unsupported definitions.

Invalid configuration must fail clearly before producing a misleading partial output.

Distinguish configuration/execution errors from per-record outcomes:

- Invalid configuration: operation-level error; do not produce a successful result.
- Dataset/system failure: operation-level error with safe diagnostics.
- Conversion issue: record/strategy diagnostic; follow the defined ineligible-strategy behavior.
- No candidates: normal `unmatched` outcome, not an exception.
- Multiple candidates: normal `ambiguous` outcome, not an exception.

Use the application's established error model and avoid swallowing exceptions or returning success-shaped responses after failures.

---

## 8. Execution summary and diagnostics UI

After execution, provide a summary that includes:

- Total Source Dataset records.
- Matched count.
- Ambiguous count.
- Unmatched count.
- Counts attributed to each strategy.
- Relevant conversion/validation warnings.
- Confirmation that output row count equals source row count.

The counts must reconcile:

`matched + ambiguous + unmatched = total source records`

Provide ways to inspect or filter:

- Matched records, including the strategy used.
- Ambiguous records and their candidate references.
- Unmatched records and the reason no strategy matched.
- Conversion issues.

If the application supports exporting operation reports, make diagnostics exportable using existing export conventions. Do not add an unrelated export framework solely for this feature.

---

## 9. Required engineering workflow

Follow this sequence. Do not skip the audit and planning stages.

### Phase 1 — Repository and architecture audit

Before changing code:

1. Inspect the repository structure and identify frontend, backend, data-processing, and test areas.
2. Find the current VLOOKUP/lookup implementation and all its callers.
3. Find the existing partial Advanced Lookup & Matching implementation.
4. Inspect the Merge operation and determine which utilities or data structures are shared.
5. Trace the complete flow: UI configuration → API/request schema → backend processing → result storage/serialization → frontend rendering/export.
6. Inspect dataset representations, type inference, null handling, row identity, and column naming conventions.
7. Review existing tests, linting, type checking, and project conventions.
8. Identify the likely causes of current unreliability and inaccuracies, supported by code evidence.

Do not assume the technology stack or invent files, services, or APIs. Discover the actual implementation.

### Phase 2 — Findings and implementation plan

Before broad modifications, report:

- Current architecture and execution flow.
- Existing implementation behavior.
- Confirmed defects and risks.
- Existing functionality that must remain compatible.
- Proposed minimal changes.
- Files/modules likely to change.
- Test plan and regression risks.

Prefer a focused refactor or replacement of the matching core over a broad rewrite. If a larger architectural change appears necessary, explain why and identify its impact before proceeding.

### Phase 3 — Baseline and regression tests

Add or identify tests that capture existing supported behavior before modifying it.

Protect at minimum:

- Existing single-column lookup behavior and configuration compatibility.
- Existing VLOOKUP callers.
- Existing Merge behavior.
- Dataset ordering and column behavior.
- API/request/response compatibility where applicable.

Do not weaken or delete existing tests merely to make the new implementation pass.

### Phase 4 — Matching engine implementation

Implement or refactor the backend/core logic first, using clear separation of responsibilities where appropriate:

- Configuration parsing/validation.
- Key normalization and conversion.
- Safe composite-key construction.
- Lookup index construction.
- Ordered strategy execution.
- Candidate counting and ambiguity handling.
- Output enrichment and diagnostics.

Keep the engine testable independently of UI components. Reuse existing application abstractions where suitable; avoid duplicating matching logic across frontend and backend.

### Phase 5 — UI and API integration

Integrate the configuration and diagnostics into the existing application.

Preserve existing API contracts where possible. If a contract must change:

- Identify every consumer.
- Update them consistently.
- Provide backward compatibility or a migration path where appropriate.
- Add contract/integration tests.

Do not trust client-provided dataset metadata or column names without backend validation.

### Phase 6 — Verification

Run the relevant automated tests, regression tests, linting, formatting, and type checks available in the repository.

Inspect actual output datasets in tests and verify row count, row order, original values, appended columns, and diagnostics.

Do not claim success for checks that were not run. Report any unavailable checks and why they could not be run.

---

## 10. Minimum automated test matrix

Create comprehensive unit, integration, and regression tests using the project's existing test framework.

At minimum, cover:

### Matching behavior

- Single-column exact match.
- Two-column composite match.
- Composite keys with three or more components.
- All components match (AND semantics).
- One component differs, so the strategy returns zero candidates.
- Primary unique match; fallbacks are not executed.
- Primary zero matches; first fallback uniquely matches.
- Multiple fallbacks; correct priority is respected.
- All strategies return zero; record is unmatched.
- Primary returns multiple candidates; record is ambiguous and fallbacks are not executed.
- Fallback returns multiple candidates; record is ambiguous and later fallbacks are not executed.
- Duplicate source records are processed independently.

### Key safety and normalization

- Leading/trailing whitespace.
- Case differences under configured case-insensitive behavior.
- Internal whitespace preservation.
- Punctuation preservation.
- Empty string versus null.
- Null components do not match by default.
- Zero and false are not confused with null.
- Leading zeros are preserved.
- Text versus numeric values under strict/default and explicit conversion rules.
- Explicit date parsing and invalid date values.
- Failed conversion makes that strategy ineligible and is diagnosed.
- Composite-key boundary collision examples, including `["AB", "C"]` versus `["A", "BC"]`.
- Values containing delimiters or unusual Unicode characters.
- Different data types with similar string representations.

### Output integrity

- Output row count always equals source row count.
- Source row order is unchanged.
- Original source values and columns are unchanged.
- Only selected lookup columns are appended.
- Unmatched rows remain.
- Ambiguous rows remain.
- Unmatched and ambiguous return values are null/missing as specified.
- Duplicate lookup candidates never expand output rows.
- Column name collisions are rejected or resolved explicitly.
- Empty Source Dataset and empty Lookup Dataset are handled safely.

### Reliability and integration

- Invalid/missing columns.
- Empty or invalid strategy.
- Invalid return-column selection.
- Malformed configuration.
- Existing VLOOKUP regression tests.
- Existing Merge regression tests.
- API and serialization behavior.
- Large-dataset performance and memory behavior using realistic test sizes.
- Cancellation/error paths if supported by the application.

Use tests that assert exact results and diagnostics, not merely that the operation completes without throwing.

---

## 11. Acceptance criteria

The feature is not complete until all applicable criteria below are demonstrated:

- [ ] Users can configure one or more key pairs in a strategy.
- [ ] Composite key components use AND semantics.
- [ ] A required Primary Strategy and optional fallbacks are supported.
- [ ] Strategy order is deterministic and user-controlled.
- [ ] Fallbacks run only after zero candidates.
- [ ] Ambiguous results stop strategy execution.
- [ ] No arbitrary candidate is selected.
- [ ] Matching is exact after explicit normalization/conversion.
- [ ] Fuzzy matching remains separate and is not introduced here.
- [ ] Null and empty key components are safely handled.
- [ ] Composite keys cannot collide because of naïve concatenation.
- [ ] Duplicate lookup records are detected and diagnosed.
- [ ] Only selected lookup columns are appended.
- [ ] Source row count and order are preserved exactly.
- [ ] All original Source Dataset values remain unchanged.
- [ ] Unmatched and ambiguous records are retained.
- [ ] Output column collisions are handled explicitly.
- [ ] Diagnostics explain the strategy and outcome.
- [ ] Summary counts reconcile with total source records.
- [ ] Indexing avoids repeated full Lookup Dataset scans where appropriate.
- [ ] Large datasets are handled within reasonable resource limits.
- [ ] Existing VLOOKUP behavior remains compatible.
- [ ] Existing Merge and unrelated operations do not regress.
- [ ] Automated tests, regression tests, and relevant quality checks pass.

---

## 12. Constraints and prohibited shortcuts

Do not:

- Rewrite the entire application or data-processing architecture without a demonstrated need.
- Assume the current implementation is correct because the UI appears to work.
- Implement matching only in the frontend if the backend is responsible for authoritative data processing.
- Use naïve string concatenation for composite keys.
- Use a dictionary structure that silently overwrites duplicate lookup candidates.
- Select the first candidate without an explicit user policy (there is no such policy in this specification).
- Continue to fallback after an ambiguous result.
- Use fuzzy matching or approximate similarity.
- Drop unmatched or ambiguous source records.
- Expand rows in this lookup operation.
- Mutate input datasets.
- Silently overwrite source columns.
- Silently coerce identifiers or dates.
- Swallow errors or report a successful operation after a failure.
- Remove or weaken existing tests to accommodate a regression.
- Add nonfunctional UI controls or unsupported configuration options.
- Claim tests, performance checks, or compatibility checks passed unless they were actually executed.

Make focused, maintainable changes consistent with the repository's conventions.

---

## 13. Final report required from the agent

When implementation and verification are complete, provide a concise but substantive report containing:

1. **Audit findings:** What was unreliable in the previous implementation and why.
2. **Architecture:** How the updated matching flow works and which existing components it reuses.
3. **Changes made:** Files/modules changed and the purpose of each significant change.
4. **Behavior:** How composite keys, fallback order, ambiguity, normalization, and output preservation work.
5. **Tests:** Tests added and exact commands/checks executed, with pass/fail results.
6. **Regression verification:** Evidence that existing VLOOKUP, Merge, and unrelated operations remain functional.
7. **Performance:** Indexing approach and any measured performance observations; do not invent benchmarks.
8. **Known limitations:** Any incomplete requirements, unsupported cases, or remaining risks.
9. **Manual verification:** Steps a user can follow to validate the feature in the application.

If a requirement cannot be implemented safely within the current architecture, explain the limitation and propose the smallest safe next step. Do not conceal incomplete work.

**Definition of done:** The UI is not enough. The feature must demonstrate correct matching semantics, deterministic outcomes, explainable diagnostics, preserved source row count/order/values, and passing regression tests.
