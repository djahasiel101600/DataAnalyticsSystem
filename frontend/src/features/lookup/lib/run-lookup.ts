import type { Dataset, DataRow } from "@/entities/dataset";

export interface KeyPair {
  /** Column from the source dataset. */
  sourceColumn: string;
  /** Matching column from the lookup dataset. */
  lookupColumn: string;
}

export interface LookupOptions {
  /** Case-insensitive string-key matching. Defaults to true. */
  ignoreCase?: boolean;
  /** Trim leading/trailing whitespace from string keys. Defaults to true. */
  trim?: boolean;
  /**
   * @deprecated Lookup enrichment always preserves every source row.
   * Passing true is rejected.
   */
  excludeUnmatched?: boolean;
}

export type LookupStatus = "matched" | "ambiguous" | "unmatched";

export interface LookupStrategyAttempt {
  strategyId: string;
  strategyName: string;
  priority: number;
  candidateCount: number;
  candidateRowIndices: number[];
  candidateReferencesTruncated: boolean;
  reason: string;
  keyIssue?: string;
}

export interface LookupRecordDiagnostic {
  sourceRowIndex: number;
  status: LookupStatus;
  strategyId: string | null;
  strategyName: string | null;
  priority: number | null;
  candidateCount: number;
  matchedLookupRowIndex: number | null;
  candidateRowIndices: number[];
  candidateReferencesTruncated: boolean;
  reason: string;
  attempts: LookupStrategyAttempt[];
}

export interface LookupStrategySummary {
  strategyId: string;
  strategyName: string;
  priority: number;
  attemptedSourceRows: number;
  zeroCandidateCount: number;
  matchedCount: number;
  ambiguousCount: number;
  duplicateLookupKeyCount: number;
  lookupRowsSkippedForInvalidKeys: number;
}

export interface LookupSummary {
  totalSourceRows: number;
  matchedCount: number;
  ambiguousCount: number;
  unmatchedCount: number;
  outputRowCount: number;
  rowCountPreserved: boolean;
  strategies: LookupStrategySummary[];
}

interface Strategy {
  id: string;
  name: string;
  priority: number;
  pairs: KeyPair[];
}

interface LookupIndex {
  rowsByKey: Map<string, number | number[]>;
  duplicateKeyCount: number;
  skippedInvalidRows: number;
}

type KeyPart = ["string", string] | ["number", number] | ["boolean", boolean];

const CANDIDATE_PREVIEW_LIMIT = 20;

function assertDataset(dataset: Dataset, name: string): void {
  if (!dataset || !Array.isArray(dataset.columns) || !Array.isArray(dataset.rows)) {
    throw new Error(`Lookup: ${name} dataset is missing valid columns or rows.`);
  }
  if (typeof dataset.id !== "string" || dataset.id.length === 0) {
    throw new Error(`Lookup: ${name} dataset has no valid identifier.`);
  }
  if (
    dataset.columns.some(
      (column) => typeof column !== "string" || column.trim().length === 0,
    )
  ) {
    throw new Error(`Lookup: ${name} dataset contains an empty or invalid column name.`);
  }
  if (new Set(dataset.columns).size !== dataset.columns.length) {
    throw new Error(`Lookup: ${name} dataset contains duplicate column names.`);
  }
  if (
    dataset.rows.some(
      (row) => row === null || typeof row !== "object" || Array.isArray(row),
    )
  ) {
    throw new Error(`Lookup: ${name} dataset contains an invalid row.`);
  }
}

function assertColumns(
  columns: string[],
  required: string[],
  context: string,
): void {
  const missing = required.filter((column) => !columns.includes(column));
  if (missing.length > 0) {
    throw new Error(
      `${context}: column(s) do not exist on the dataset: ${missing.join(", ")}`,
    );
  }
}

function validatePairs(pairs: KeyPair[], label: string): void {
  if (!Array.isArray(pairs) || pairs.length === 0) {
    throw new Error(`Lookup: ${label} must contain at least one key-column pair.`);
  }
  pairs.forEach((pair, index) => {
    if (
      !pair ||
      typeof pair.sourceColumn !== "string" ||
      typeof pair.lookupColumn !== "string" ||
      pair.sourceColumn.trim() === "" ||
      pair.lookupColumn.trim() === ""
    ) {
      throw new Error(
        `Lookup: ${label} key pair ${index + 1} must select both a source and lookup column.`,
      );
    }
  });
}

function normalizeValue(value: unknown, options: Required<Pick<LookupOptions, "ignoreCase" | "trim">>): KeyPart | null {
  if (typeof value === "string") {
    const trimmed = options.trim ? value.trim() : value;
    if (trimmed.length === 0) return null;
    return ["string", options.ignoreCase ? trimmed.toLowerCase() : trimmed];
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return ["number", value];
  }
  if (typeof value === "boolean") {
    return ["boolean", value];
  }
  return null;
}

/**
 * JSON encodes an array of typed primitives, preserving component boundaries,
 * data types, and values containing delimiter characters.
 */
function compositeKey(
  row: DataRow,
  pairs: KeyPair[],
  side: "source" | "lookup",
  options: Required<Pick<LookupOptions, "ignoreCase" | "trim">>,
): { key: string | null; issue?: string } {
  const parts: KeyPart[] = [];
  for (const pair of pairs) {
    const column = side === "source" ? pair.sourceColumn : pair.lookupColumn;
    const part = normalizeValue(row[column], options);
    if (part === null) {
      return {
        key: null,
        issue: `Key component "${column}" is null, missing, empty, or not a finite scalar value.`,
      };
    }
    parts.push(part);
  }
  return { key: JSON.stringify(parts) };
}

function createStrategies(
  primaryPairs: KeyPair[],
  fallbackKeySets: KeyPair[][],
): Strategy[] {
  validatePairs(primaryPairs, "Primary strategy");
  if (!Array.isArray(fallbackKeySets)) {
    throw new Error("Lookup: fallback strategies must be an ordered list.");
  }

  const pairsByStrategy = [primaryPairs, ...fallbackKeySets];
  return pairsByStrategy.map((pairs, index) => {
    const name = index === 0 ? "Primary" : `Fallback ${index}`;
    validatePairs(pairs, name);
    return {
      id: index === 0 ? "primary" : `fallback_${index}`,
      name,
      priority: index + 1,
      pairs,
    };
  });
}

function buildIndex(
  lookup: Dataset,
  strategy: Strategy,
  options: Required<Pick<LookupOptions, "ignoreCase" | "trim">>,
): LookupIndex {
  const rowsByKey = new Map<string, number | number[]>();
  let skippedInvalidRows = 0;
  let duplicateKeyCount = 0;
  for (let rowIndex = 0; rowIndex < lookup.rows.length; rowIndex++) {
    const result = compositeKey(
      lookup.rows[rowIndex],
      strategy.pairs,
      "lookup",
      options,
    );
    if (result.key === null) {
      skippedInvalidRows++;
      continue;
    }
    const candidates = rowsByKey.get(result.key);
    if (candidates === undefined) {
      rowsByKey.set(result.key, rowIndex);
    } else if (typeof candidates === "number") {
      duplicateKeyCount++;
      rowsByKey.set(result.key, [candidates, rowIndex]);
    } else {
      candidates.push(rowIndex);
    }
  }
  return { rowsByKey, duplicateKeyCount, skippedInvalidRows };
}

function emptyStrategySummary(strategy: Strategy): LookupStrategySummary {
  return {
    strategyId: strategy.id,
    strategyName: strategy.name,
    priority: strategy.priority,
    attemptedSourceRows: 0,
    zeroCandidateCount: 0,
    matchedCount: 0,
    ambiguousCount: 0,
    duplicateLookupKeyCount: 0,
    lookupRowsSkippedForInvalidKeys: 0,
  };
}

/**
 * Enriches each Source Dataset row with selected Lookup Dataset values.
 * Matching is exact after optional trim/case normalization; each strategy uses
 * AND semantics across its key pairs. Fallbacks run only after zero candidates.
 * Empty/invalid key components never match. Output blanks use the application's
 * established empty-string representation. Diagnostics remain separate.
 */
export function runLookup(
  source: Dataset,
  keyPairs: KeyPair[],
  lookup: Dataset,
  columnsToRetrieve: string[],
  fallbackKeySets: KeyPair[][] = [],
  options: LookupOptions = {},
): {
  columns: string[];
  rows: DataRow[];
  diagnostics: string[];
  recordDiagnostics: LookupRecordDiagnostic[];
  summary: LookupSummary;
} {
  assertDataset(source, "Source");
  assertDataset(lookup, "Lookup");
  if (source.id === lookup.id) {
    throw new Error("Lookup: Source Dataset and Lookup Dataset must be different datasets.");
  }

  if (options.excludeUnmatched) {
    throw new Error(
      "Lookup: unmatched rows are always retained so source row count and order remain unchanged.",
    );
  }
  const normalizedOptions = {
    ignoreCase: options.ignoreCase ?? true,
    trim: options.trim ?? true,
  };
  if (
    typeof normalizedOptions.ignoreCase !== "boolean" ||
    typeof normalizedOptions.trim !== "boolean"
  ) {
    throw new Error("Lookup: trim and ignore-case settings must be boolean values.");
  }
  const strategies = createStrategies(keyPairs, fallbackKeySets);

  if (!Array.isArray(columnsToRetrieve) || columnsToRetrieve.length === 0) {
    throw new Error("Lookup: select at least one Lookup Dataset return column.");
  }
  if (new Set(columnsToRetrieve).size !== columnsToRetrieve.length) {
    throw new Error("Lookup: return columns must not contain duplicates.");
  }
  assertColumns(
    source.columns,
    strategies.flatMap((strategy) =>
      strategy.pairs.map((pair) => pair.sourceColumn),
    ),
    "Lookup source key",
  );
  assertColumns(
    lookup.columns,
    strategies.flatMap((strategy) =>
      strategy.pairs.map((pair) => pair.lookupColumn),
    ),
    "Lookup key",
  );
  assertColumns(lookup.columns, columnsToRetrieve, "Lookup return");

  const collisions = columnsToRetrieve.filter((column) =>
    source.columns.includes(column),
  );
  if (collisions.length > 0) {
    throw new Error(
      `Lookup: return column(s) conflict with Source Dataset columns: ${collisions.join(", ")}. Choose different return columns.`,
    );
  }

  const indexes = strategies.map((strategy) =>
    buildIndex(lookup, strategy, normalizedOptions),
  );
  const strategySummaries = strategies.map((strategy, index) => ({
    ...emptyStrategySummary(strategy),
    duplicateLookupKeyCount: indexes[index].duplicateKeyCount,
    lookupRowsSkippedForInvalidKeys: indexes[index].skippedInvalidRows,
  }));
  const rows: DataRow[] = [];
  const recordDiagnostics: LookupRecordDiagnostic[] = [];
  let matchedCount = 0;
  let ambiguousCount = 0;
  let unmatchedCount = 0;

  for (let sourceIndex = 0; sourceIndex < source.rows.length; sourceIndex++) {
    const sourceRow = source.rows[sourceIndex];
    const attempts: LookupStrategyAttempt[] = [];
    let status: LookupStatus = "unmatched";
    let decisiveStrategy: Strategy | null = null;
    let decisiveCandidates: number[] = [];
    let decisiveKeyIssue: string | undefined;

    for (let strategyIndex = 0; strategyIndex < strategies.length; strategyIndex++) {
      const strategy = strategies[strategyIndex];
      const strategySummary = strategySummaries[strategyIndex];
      strategySummary.attemptedSourceRows++;

      const result = compositeKey(
        sourceRow,
        strategy.pairs,
        "source",
        normalizedOptions,
      );
      const indexedCandidates =
        result.key === null
          ? undefined
          : indexes[strategyIndex].rowsByKey.get(result.key);
      const candidates =
        indexedCandidates === undefined
          ? []
          : typeof indexedCandidates === "number"
            ? [indexedCandidates]
            : indexedCandidates;

      if (candidates.length === 0) {
        strategySummary.zeroCandidateCount++;
        decisiveKeyIssue ??= result.issue;
        attempts.push({
          strategyId: strategy.id,
          strategyName: strategy.name,
          priority: strategy.priority,
          candidateCount: 0,
          candidateRowIndices: [],
          candidateReferencesTruncated: false,
          reason: result.issue
            ? "Strategy was ineligible because a source key component is invalid."
            : "No Lookup Dataset rows matched this strategy.",
          ...(result.issue ? { keyIssue: result.issue } : {}),
        });
        continue;
      }

      decisiveStrategy = strategy;
      decisiveCandidates = candidates;
      const preview = candidates
        .slice(0, CANDIDATE_PREVIEW_LIMIT)
        .map((index) => index + 1);
      attempts.push({
        strategyId: strategy.id,
        strategyName: strategy.name,
        priority: strategy.priority,
        candidateCount: candidates.length,
        candidateRowIndices: preview,
        candidateReferencesTruncated: candidates.length > preview.length,
        reason:
          candidates.length === 1
            ? "Exactly one Lookup Dataset row matched."
            : "Multiple Lookup Dataset rows matched; no candidate was selected.",
      });

      if (candidates.length === 1) {
        status = "matched";
        strategySummary.matchedCount++;
      } else {
        status = "ambiguous";
        strategySummary.ambiguousCount++;
      }
      break;
    }

    let reason: string;
    if (status === "matched") {
      matchedCount++;
      reason = "A single candidate matched the highest-priority strategy with candidates.";
    } else if (status === "ambiguous") {
      ambiguousCount++;
      reason = `${decisiveCandidates.length} lookup candidates matched; no row was selected.`;
    } else {
      unmatchedCount++;
      reason = decisiveKeyIssue
        ? "No strategy matched; one or more key components were missing, empty, or invalid."
        : "No configured strategy produced a candidate.";
    }

    const matchedRow =
      status === "matched" && decisiveCandidates.length === 1
        ? lookup.rows[decisiveCandidates[0]]
        : undefined;
    const candidatePreview = decisiveCandidates
      .slice(0, CANDIDATE_PREVIEW_LIMIT)
      .map((index) => index + 1);

    recordDiagnostics.push({
      sourceRowIndex: sourceIndex + 1,
      status,
      strategyId: decisiveStrategy?.id ?? null,
      strategyName: decisiveStrategy?.name ?? null,
      priority: decisiveStrategy?.priority ?? null,
      candidateCount: decisiveCandidates.length,
      matchedLookupRowIndex:
        matchedRow === undefined ? null : decisiveCandidates[0] + 1,
      candidateRowIndices: candidatePreview,
      candidateReferencesTruncated:
        decisiveCandidates.length > candidatePreview.length,
      reason,
      attempts,
    });

    const outputRow: DataRow = { ...sourceRow };
    for (const column of columnsToRetrieve) {
      outputRow[column] = matchedRow?.[column] ?? "";
    }
    rows.push(outputRow);
  }

  const summary: LookupSummary = {
    totalSourceRows: source.rows.length,
    matchedCount,
    ambiguousCount,
    unmatchedCount,
    outputRowCount: rows.length,
    rowCountPreserved: rows.length === source.rows.length,
    strategies: strategySummaries,
  };
  const diagnostics = [
    `Matched ${matchedCount}, ambiguous ${ambiguousCount}, and unmatched ${unmatchedCount} of ${source.rows.length} source rows.`,
    ...strategySummaries.map(
      (strategy) =>
        `${strategy.strategyName} (priority ${strategy.priority}): ${strategy.matchedCount} matched, ${strategy.ambiguousCount} ambiguous, ${strategy.zeroCandidateCount} zero-candidate attempts.`,
    ),
    ...strategySummaries
      .filter(
        (strategy) =>
          strategy.duplicateLookupKeyCount > 0 ||
          strategy.lookupRowsSkippedForInvalidKeys > 0,
      )
      .map(
        (strategy) =>
          `${strategy.strategyName}: ${strategy.duplicateLookupKeyCount} duplicate lookup key(s); ${strategy.lookupRowsSkippedForInvalidKeys} lookup row(s) skipped due to invalid key components.`,
      ),
    `Output contains ${rows.length} rows; source contains ${source.rows.length} rows.`,
  ];

  return {
    columns: [...source.columns, ...columnsToRetrieve],
    rows,
    diagnostics,
    recordDiagnostics,
    summary,
  };
}
