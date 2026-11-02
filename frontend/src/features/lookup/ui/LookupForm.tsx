import { useState } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { useDatasets } from "@/app/store/DatasetsContext";
import {
  runLookup,
  type KeyPair,
  type LookupOptions,
  type LookupRecordDiagnostic,
  type LookupSummary,
} from "../lib/run-lookup";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { StatusPill } from "@/shared/ui/status-pill";
import { useOperationConfigState } from "@/app/store/OperationConfigContext";

const emptyPair = (): KeyPair => ({ sourceColumn: "", lookupColumn: "" });

const toggleIn = (list: string[], item: string) =>
  list.includes(item) ? list.filter((c) => c !== item) : [...list, item];

const isComplete = (p: KeyPair) => Boolean(p.sourceColumn && p.lookupColumn);

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </p>
  );
}

function OptionSelect({
  value,
  onChange,
  options,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ColumnPicker({
  columns,
  selected,
  onToggle,
  disabledColumns = [],
  emptyLabel = "No columns available.",
}: {
  columns: string[];
  selected: string[];
  onToggle: (column: string) => void;
  /** Columns that cannot be picked (e.g. they would collide with a source column). */
  disabledColumns?: string[];
  emptyLabel?: string;
}) {
  if (columns.length === 0) {
    return <p className="text-[11px] text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {columns.map((column) => {
        const active = selected.includes(column);
        const disabled = disabledColumns.includes(column);
        return (
          <button
            key={column}
            type="button"
            onClick={() => onToggle(column)}
            aria-pressed={active}
            disabled={disabled}
            className={
              "max-w-full truncate rounded-md border px-2 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40" +
              (active
                ? " border-primary bg-primary/10 text-primary"
                : " border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground")
            }
            title={
              disabled ? `${column} already exists in the source table` : column
            }
          >
            {column}
          </button>
        );
      })}
    </div>
  );
}

/** Edits one set of source→lookup key pairs (used for primary and each fallback). */
function KeyPairEditor({
  pairs,
  onChange,
  sourceColumns,
  lookupColumns,
  minPairs,
  name,
}: {
  pairs: KeyPair[];
  onChange: (pairs: KeyPair[]) => void;
  sourceColumns: string[];
  lookupColumns: string[];
  minPairs: number;
  name: string;
}) {
  const sourceOptions = sourceColumns.map((c) => ({ value: c, label: c }));
  const lookupOptions = lookupColumns.map((c) => ({ value: c, label: c }));

  const update = (index: number, patch: Partial<KeyPair>) =>
    onChange(pairs.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  return (
    <div className="space-y-2">
      {pairs.map((pair, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-muted/25 p-2"
        >
          <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <OptionSelect
              value={pair.sourceColumn}
              onChange={(v) => update(i, { sourceColumn: v })}
              options={sourceOptions}
              placeholder="Column in source table"
              label={`${name} source key ${i + 1}`}
            />
            <span className="hidden text-center text-xs font-medium text-muted-foreground sm:block">
              =
            </span>
            <OptionSelect
              value={pair.lookupColumn}
              onChange={(v) => update(i, { lookupColumn: v })}
              options={lookupOptions}
              placeholder="Column in lookup table"
              label={`${name} lookup key ${i + 1}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => onChange(pairs.filter((_, j) => j !== i))}
              disabled={pairs.length <= minPairs}
              aria-label={`Remove ${name} key pair ${i + 1}`}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...pairs, emptyPair()])}
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Add key pair
      </Button>
    </div>
  );
}

function OptionCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <input
        type="checkbox"
        className="h-4 w-4 accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export function LookupForm() {
  const { datasets, getDataset, setResult } = useDatasets();

  const [sourceId, setSourceId] = useOperationConfigState("lookup", "sourceId", "");
  const [lookupId, setLookupId] = useOperationConfigState("lookup", "lookupId", "");
  const [primaryPairs, setPrimaryPairs] = useOperationConfigState<KeyPair[]>("lookup", "primaryPairs", [emptyPair()]);
  const [fallbackSets, setFallbackSets] = useOperationConfigState<KeyPair[][]>("lookup", "fallbackSets", []);
  const [retrieve, setRetrieve] = useOperationConfigState<string[]>("lookup", "retrieve", []);
  const [options, setOptions] = useOperationConfigState<
    Required<Pick<LookupOptions, "ignoreCase" | "trim">>
  >("lookup", "options", {
    ignoreCase: true,
    trim: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<string[] | null>(null);
  const [recordDiagnostics, setRecordDiagnostics] = useState<
    LookupRecordDiagnostic[] | null
  >(null);
  const [summary, setSummary] = useState<LookupSummary | null>(null);
  const [diagnosticFilter, setDiagnosticFilter] = useState("all");
  const [diagnosticLimit, setDiagnosticLimit] = useState(100);

  const source = sourceId ? getDataset(sourceId) : undefined;
  const lookup = lookupId ? getDataset(lookupId) : undefined;
  const sourceColumns = source?.columns ?? [];
  const lookupColumns = lookup?.columns ?? [];
  // runLookup throws if a retrieved column already exists on the source.
  const collidingColumns = lookupColumns.filter((c) =>
    sourceColumns.includes(c),
  );

  const completeStrategies =
    primaryPairs.length > 0 &&
    primaryPairs.every(isComplete) &&
    fallbackSets.every(
      (pairs) => pairs.length > 0 && pairs.every(isComplete),
    );
  const canRun =
    Boolean(source && lookup) &&
    completeStrategies &&
    retrieve.length > 0;

  const clearStatus = () => {
    setError(null);
    setDiagnostics(null);
    setRecordDiagnostics(null);
    setSummary(null);
  };

  const resetConfig = () => {
    setPrimaryPairs([emptyPair()]);
    setFallbackSets([]);
    setRetrieve([]);
    clearStatus();
  };

  const handleRun = () => {
    if (!source || !lookup) return;
    clearStatus();
    try {
      const { columns, rows, diagnostics, recordDiagnostics, summary } = runLookup(
        source,
        primaryPairs,
        lookup,
        retrieve,
        fallbackSets,
        options,
      );
      setResult(
        { columns, rows },
        null,
        { name: "Lookup", configKey: "lookup" },
      );
      setDiagnostics(diagnostics);
      setRecordDiagnostics(recordDiagnostics);
      setSummary(summary);
      setDiagnosticLimit(100);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Unknown lookup error");
    }
  };

  if (datasets.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lookup Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Import at least two datasets (a source and a lookup table) to run a
            lookup.
          </p>
        </CardContent>
      </Card>
    );
  }

  const datasetOptions = datasets.map((d) => ({ value: d.id, label: d.name }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lookup Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <StatusPill
          label="Lookup status"
          value={diagnostics ? "Lookup complete" : "Configure lookup"}
          tone={diagnostics ? "primary" : "muted"}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <SectionLabel>Source Dataset</SectionLabel>
            <OptionSelect
              value={sourceId}
              onChange={(v) => {
                setSourceId(v);
                resetConfig();
              }}
              options={datasetOptions.filter((o) => o.value !== lookupId)}
              placeholder="Choose source dataset"
              label="Source dataset"
            />
          </div>
          <div>
            <SectionLabel>Lookup Dataset</SectionLabel>
            <OptionSelect
              value={lookupId}
              onChange={(v) => {
                setLookupId(v);
                resetConfig();
              }}
              options={datasetOptions.filter((o) => o.value !== sourceId)}
              placeholder="Choose lookup dataset"
              label="Lookup dataset"
            />
          </div>
        </div>

        {source && lookup && (
          <>
            <div>
              <SectionLabel>Primary Strategy · Priority 1</SectionLabel>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Every key pair in a strategy must match. Fallback strategies
                run only when the current strategy has zero candidates.
              </p>
              <KeyPairEditor
                name="Primary"
                pairs={primaryPairs}
                onChange={(p) => {
                  clearStatus();
                  setPrimaryPairs(p);
                }}
                sourceColumns={sourceColumns}
                lookupColumns={lookupColumns}
                minPairs={1}
              />
              {primaryPairs.some((pair) => !isComplete(pair)) && (
                <p className="mt-1.5 text-[11px] text-destructive">
                  Select both columns for every primary key pair.
                </p>
              )}
            </div>

            <div>
              <SectionLabel>Fallback Strategies</SectionLabel>
              <p className="mb-2 text-xs text-muted-foreground">
                Tried in order only when the previous strategy finds zero
                candidates. An ambiguous strategy stops the lookup.
              </p>
              <div className="space-y-3">
                {fallbackSets.map((set, i) => (
                  <div
                    key={i}
                    className="space-y-2 rounded-lg border border-dashed border-border p-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Fallback {i + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={i === 0}
                          onClick={() => {
                            clearStatus();
                            setFallbackSets((prev) => {
                              const next = [...prev];
                              [next[i - 1], next[i]] = [next[i], next[i - 1]];
                              return next;
                            });
                          }}
                          aria-label={`Move fallback ${i + 1} up`}
                          title="Increase strategy priority"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={i === fallbackSets.length - 1}
                          onClick={() => {
                            clearStatus();
                            setFallbackSets((prev) => {
                              const next = [...prev];
                              [next[i], next[i + 1]] = [next[i + 1], next[i]];
                              return next;
                            });
                          }}
                          aria-label={`Move fallback ${i + 1} down`}
                          title="Decrease strategy priority"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            clearStatus();
                            setFallbackSets((prev) =>
                              prev.filter((_, j) => j !== i),
                            );
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    <KeyPairEditor
                      name={`Fallback ${i + 1}`}
                      pairs={set}
                      onChange={(p) => {
                        clearStatus();
                        setFallbackSets((prev) =>
                          prev.map((s, j) => (j === i ? p : s)),
                        );
                      }}
                      sourceColumns={sourceColumns}
                      lookupColumns={lookupColumns}
                      minPairs={1}
                    />
                    {set.some((pair) => !isComplete(pair)) && (
                      <p className="text-[11px] text-destructive">
                        Select both columns for every key pair in this fallback.
                      </p>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearStatus();
                    setFallbackSets((prev) => [...prev, [emptyPair()]]);
                  }}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add fallback strategy
                </Button>
              </div>
            </div>

            <div>
              <SectionLabel>Columns to Retrieve</SectionLabel>
              <ColumnPicker
                columns={lookupColumns}
                selected={retrieve}
                disabledColumns={collidingColumns}
                onToggle={(col) => {
                  clearStatus();
                  setRetrieve((prev) => toggleIn(prev, col));
                }}
              />
              {collidingColumns.length > 0 && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Greyed-out columns already exist in the source table.
                </p>
              )}
            </div>

            <div>
              <SectionLabel>Matching Options</SectionLabel>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Keys use exact matching after the selected trim and case
                normalization. Empty or missing key parts never match.
                Text/number conversion and fuzzy matching are not supported.
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <OptionCheckbox
                  label="Ignore case"
                  checked={options.ignoreCase}
                  onChange={(v) => {
                    clearStatus();
                    setOptions((o) => ({ ...o, ignoreCase: v }));
                  }}
                />
                <OptionCheckbox
                  label="Trim whitespace"
                  checked={options.trim}
                  onChange={(v) => {
                    clearStatus();
                    setOptions((o) => ({ ...o, trim: v }));
                  }}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Unmatched and ambiguous source rows are always retained.
              </p>
            </div>

            <div>
              <SectionLabel>Output columns</SectionLabel>
              <p className="mb-1.5 text-[11px] text-muted-foreground">
                Original source columns followed by selected lookup columns:
              </p>
              <div className="flex flex-wrap gap-1">
                {[...sourceColumns, ...retrieve].map((column, index) => (
                  <span
                    key={`${column}-${index}`}
                    className="max-w-full truncate rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    title={column}
                  >
                    {column}
                  </span>
                ))}
                {retrieve.length === 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    Select at least one lookup column to preview the output.
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        <Button
          type="button"
          onClick={handleRun}
          disabled={!canRun}
          className="w-full"
        >
          Run Lookup
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {diagnostics && (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {diagnostics.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}
        {summary && recordDiagnostics && (
          <div className="space-y-2 border-t border-border pt-3">
            <div>
              <SectionLabel>Execution summary</SectionLabel>
              <p className="text-[11px] text-muted-foreground">
                {summary.totalSourceRows} source rows · {summary.matchedCount}{" "}
                matched · {summary.ambiguousCount} ambiguous ·{" "}
                {summary.unmatchedCount} unmatched
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Output: {summary.outputRowCount} rows
                {summary.rowCountPreserved
                  ? " (source row count preserved)"
                  : " (row count mismatch)"}
              </p>
            </div>
            <ul className="space-y-1">
              {summary.strategies.map((strategy) => (
                <li
                  key={strategy.strategyId}
                  className="text-[10px] text-muted-foreground"
                >
                  {strategy.strategyName}: {strategy.matchedCount} matched,{" "}
                  {strategy.ambiguousCount} ambiguous,{" "}
                  {strategy.zeroCandidateCount} zero candidates
                  {strategy.duplicateLookupKeyCount > 0 &&
                    ` · ${strategy.duplicateLookupKeyCount} duplicate lookup keys`}
                  {strategy.lookupRowsSkippedForInvalidKeys > 0 &&
                    ` · ${strategy.lookupRowsSkippedForInvalidKeys} invalid lookup keys`}
                </li>
              ))}
            </ul>
            <details className="rounded-md border border-border p-2">
              <summary className="cursor-pointer text-xs font-medium">
                Inspect row diagnostics ({recordDiagnostics.length})
              </summary>
              <div className="mt-2 space-y-2">
                <label className="block text-[10px] font-medium text-muted-foreground">
                  Show
                  <select
                    className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
                    value={diagnosticFilter}
                    onChange={(event) => {
                      setDiagnosticFilter(event.target.value);
                      setDiagnosticLimit(100);
                    }}
                  >
                    <option value="all">All records</option>
                    <option value="matched">Matched</option>
                    <option value="ambiguous">Ambiguous</option>
                    <option value="unmatched">Unmatched</option>
                    <option value="key-issues">Invalid or missing key parts</option>
                  </select>
                </label>
                {(() => {
                  const filtered = recordDiagnostics.filter((record) => {
                    if (diagnosticFilter === "key-issues") {
                      return record.attempts.some((attempt) => attempt.keyIssue);
                    }
                    return diagnosticFilter === "all" || record.status === diagnosticFilter;
                  });
                  const visible = filtered.slice(0, diagnosticLimit);
                  return (
                    <>
                      <ul className="space-y-1.5">
                        {visible.map((record) => (
                          <li
                            key={record.sourceRowIndex}
                            className="rounded border border-border bg-muted/20 p-1.5 text-[10px]"
                          >
                            <p className="font-medium text-foreground">
                              Source row {record.sourceRowIndex} · {record.status}
                              {record.strategyName
                                ? ` · ${record.strategyName} (priority ${record.priority})`
                                : ""}
                            </p>
                            <p className="text-muted-foreground">{record.reason}</p>
                            {record.candidateCount > 0 && (
                              <p className="text-muted-foreground">
                                {record.candidateCount} candidate(s), lookup row
                                references: {record.candidateRowIndices.join(", ")}
                                {record.candidateReferencesTruncated
                                  ? " (preview truncated)"
                                  : ""}
                              </p>
                            )}
                            {record.matchedLookupRowIndex !== null && (
                              <p className="text-muted-foreground">
                                Matched lookup row: {record.matchedLookupRowIndex}
                              </p>
                            )}
                            {record.attempts.length > 1 && (
                              <ul className="mt-1 border-l border-border pl-2 text-muted-foreground">
                                {record.attempts.map((attempt) => (
                                  <li key={attempt.strategyId}>
                                    {attempt.strategyName}: {attempt.candidateCount}{" "}
                                    candidate(s) — {attempt.reason}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {record.attempts.some((attempt) => attempt.keyIssue) && (
                              <p className="text-destructive">
                                {record.attempts
                                  .filter((attempt) => attempt.keyIssue)
                                  .map(
                                    (attempt) =>
                                      `${attempt.strategyName}: ${attempt.keyIssue}`,
                                  )
                                  .join(" ")}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                      <p className="text-[10px] text-muted-foreground">
                        Showing {visible.length} of {filtered.length} records.
                      </p>
                      {visible.length < filtered.length && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 w-full text-xs"
                          onClick={() =>
                            setDiagnosticLimit((limit) => limit + 100)
                          }
                        >
                          Show next 100
                        </Button>
                      )}
                    </>
                  );
                })()}
              </div>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
