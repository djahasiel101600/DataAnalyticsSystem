import { useMemo, useState } from "react";
import { ArrowRight, Check, Plus, Trash2, X } from "lucide-react";
import { useDatasets } from "@/app/store/DatasetsContext";
import { runLookup, type KeyPair } from "../lib/run-lookup";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

const emptyPair = (): KeyPair => ({ sourceColumn: "", lookupColumn: "" });

function StepHeading({
  n,
  title,
  hint,
}: {
  n: number;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
        {n}
      </span>
      <div>
        <h3 className="text-sm font-semibold leading-5 text-foreground">
          {title}
        </h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function ColumnSelect({
  value,
  onChange,
  columns,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  columns: string[];
  placeholder: string;
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full" aria-label={label}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {columns.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * True when a fallback set has been "started" but is not fully complete.
 *
 * - A set where every pair is empty is considered *empty* and is allowed —
 *   `runLookup` will silently drop it.
 * - A set where at least one pair has a value but not every pair is
 *   complete is considered *incomplete* and must be resolved by the user.
 */
function hasIncompleteFallback(sets: KeyPair[][]): boolean {
  return sets.some((set) => {
    const anyFilled = set.some((p) => p.sourceColumn || p.lookupColumn);
    const allComplete = set.every((p) => p.sourceColumn && p.lookupColumn);
    return anyFilled && !allComplete;
  });
}

export function LookupForm() {
  const { datasets, getDataset, setResult } = useDatasets();
  const [sourceId, setSourceId] = useState<string>("");
  const [lookupId, setLookupId] = useState<string>("");
  const [keyPairs, setKeyPairs] = useState<KeyPair[]>([emptyPair()]);
  const [fallbackKeySets, setFallbackKeySets] = useState<KeyPair[][]>([]);
  const [retrieveColumns, setRetrieveColumns] = useState<string[]>([]);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [trim, setTrim] = useState(false);
  const [excludeUnmatched, setExcludeUnmatched] = useState(false);
  const [running, setRunning] = useState(false);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);

  const source = sourceId ? getDataset(sourceId) : null;
  const lookup = lookupId ? getDataset(lookupId) : null;
  const lookupCols = lookup?.columns ?? [];

  // Changing a dataset invalidates column choices, diagnostics, and any
  // result that was derived from the previous configuration.
  const changeSource = (id: string) => {
    setSourceId(id);
    setKeyPairs([emptyPair()]);
    setFallbackKeySets([]);
    setDiagnostics([]);
    setResult(null);
  };
  const changeLookup = (id: string) => {
    setLookupId(id);
    setKeyPairs([emptyPair()]);
    setFallbackKeySets([]);
    setRetrieveColumns([]);
    setDiagnostics([]);
    setResult(null);
  };

  const addKeyPair = () => setKeyPairs((prev) => [...prev, emptyPair()]);
  const removeKeyPair = (index: number) =>
    setKeyPairs((prev) => prev.filter((_, i) => i !== index));
  const updateKeyPair = (index: number, patch: Partial<KeyPair>) =>
    setKeyPairs((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );

  const addFallbackSet = () =>
    setFallbackKeySets((prev) => [...prev, [emptyPair()]]);
  const removeFallbackSet = (index: number) =>
    setFallbackKeySets((prev) => prev.filter((_, i) => i !== index));
  const addFallbackPair = (setIndex: number) =>
    setFallbackKeySets((prev) =>
      prev.map((s, i) => (i === setIndex ? [...s, emptyPair()] : s)),
    );
  const removeFallbackPair = (setIndex: number, pairIndex: number) =>
    setFallbackKeySets((prev) =>
      prev
        .map((s, i) =>
          i === setIndex ? s.filter((_, j) => j !== pairIndex) : s,
        )
        .filter((s) => s.length > 0),
    );
  const updateFallbackSet = (
    setIndex: number,
    pairIndex: number,
    patch: Partial<KeyPair>,
  ) =>
    setFallbackKeySets((prev) =>
      prev.map((set, i) =>
        i === setIndex
          ? set.map((p, j) => (j === pairIndex ? { ...p, ...patch } : p))
          : set,
      ),
    );

  const toggleRetrieve = (col: string) =>
    setRetrieveColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    );

  // Derived state (memoized so `handleRun` and render agree on the same value).
  const keysIncomplete = useMemo(
    () => keyPairs.some((p) => !p.sourceColumn || !p.lookupColumn),
    [keyPairs],
  );
  const incompleteFallback = useMemo(
    () => hasIncompleteFallback(fallbackKeySets),
    [fallbackKeySets],
  );
  const noRetrieve = retrieveColumns.length === 0;

  const handleRun = () => {
    if (!source || !lookup) return;

    // Defensive: the button is disabled in these states, but check anyway so
    // that a race between render and click can't run with a broken config.
    if (incompleteFallback) {
      setDiagnostics([
        "Complete every key pair in each fallback set (or remove empty sets).",
      ]);
      return;
    }

    const validPairs = keyPairs.filter((p) => p.sourceColumn && p.lookupColumn);
    if (validPairs.length === 0) return;

    setRunning(true);
    try {
      // Pass `fallbackKeySets` verbatim — `runLookup` filters empty sets and
      // preserves original indices so `fallback_N` matches the UI's
      // "Fallback N" numbering. Pre-filtering here would renumber them.
      const { columns, rows, diagnostics } = runLookup(
        source,
        validPairs,
        lookup,
        retrieveColumns,
        fallbackKeySets,
        { ignoreCase, trim, excludeUnmatched },
      );
      setResult({ columns, rows });
      setDiagnostics(diagnostics);
      if (diagnostics.length > 0) {
        console.log(diagnostics.join(" ; "));
      }
    } catch (err) {
      console.error(err);
      setDiagnostics([err instanceof Error ? err.message : String(err)]);
    } finally {
      setRunning(false);
    }
  };

  if (datasets.length === 0) return null;

  const canRun =
    !!source &&
    !!lookup &&
    !keysIncomplete &&
    !incompleteFallback &&
    !noRetrieve &&
    !running;

  const blocker =
    !source || !lookup
      ? "Choose both datasets to begin."
      : keysIncomplete
        ? "Complete every key pair (or remove empty ones)."
        : incompleteFallback
          ? "Complete every key pair in each fallback set (or remove empty sets)."
          : noRetrieve
            ? "Select at least one column to retrieve."
            : null;

  const options = [
    {
      id: "excl",
      label: "Exclude unmatched rows",
      hint: "Drop source rows with no match",
      checked: excludeUnmatched,
      set: setExcludeUnmatched,
    },
    {
      id: "case",
      label: "Ignore case",
      hint: '"abc" matches "ABC"',
      checked: ignoreCase,
      set: setIgnoreCase,
    },
    {
      id: "trim",
      label: "Trim spaces",
      hint: "Ignore leading/trailing spaces",
      checked: trim,
      set: setTrim,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Lookup (cross-sheet)</CardTitle>
        <p className="text-xs text-muted-foreground">
          Pull columns from a lookup table into your source rows by matching key
          columns.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Step 1: datasets */}
        <section className="space-y-3">
          <StepHeading n={1} title="Choose datasets" />
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <div className="space-y-1.5">
              <Label>Source dataset</Label>
              <Select value={sourceId} onValueChange={changeSource}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {datasets.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Rows you want to enrich
              </p>
            </div>
            <ArrowRight
              className="hidden h-4 w-4 self-center text-muted-foreground sm:block"
              aria-hidden="true"
            />
            <div className="space-y-1.5">
              <Label>Lookup dataset</Label>
              <Select value={lookupId} onValueChange={changeLookup}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select lookup table" />
                </SelectTrigger>
                <SelectContent>
                  {datasets.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Table to read values from
              </p>
            </div>
          </div>
        </section>

        {source && lookup && (
          <>
            {/* Step 2: keys */}
            <section className="space-y-3 border-t border-border pt-4">
              <StepHeading
                n={2}
                title="Match on key columns"
                hint="Rows match when all key pairs are equal."
              />
              <div className="space-y-2">
                {keyPairs.map((pair, idx) => (
                  <div
                    key={idx}
                    className="flex items-end gap-2 rounded-md border border-border bg-muted/20 p-2"
                  >
                    <div className="grid flex-1 min-w-0 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                      <ColumnSelect
                        value={pair.sourceColumn}
                        onChange={(v) =>
                          updateKeyPair(idx, { sourceColumn: v })
                        }
                        columns={source.columns}
                        placeholder="Source column"
                        label={`Key pair ${idx + 1} source column`}
                      />
                      <span className="hidden text-center text-xs font-medium text-muted-foreground sm:block">
                        =
                      </span>
                      <ColumnSelect
                        value={pair.lookupColumn}
                        onChange={(v) =>
                          updateKeyPair(idx, { lookupColumn: v })
                        }
                        columns={lookup.columns}
                        placeholder="Lookup column"
                        label={`Key pair ${idx + 1} lookup column`}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 flex-shrink-0"
                      onClick={() => removeKeyPair(idx)}
                      disabled={keyPairs.length <= 1}
                      aria-label={`Remove key pair ${idx + 1}`}
                      title={
                        keyPairs.length <= 1
                          ? "At least one key pair is required"
                          : "Remove key pair"
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addKeyPair}
              >
                <Plus className="mr-1 h-4 w-4" /> Add key pair
              </Button>

              {/* Fallbacks */}
              <div className="space-y-2 pt-2">
                <div>
                  <Label>Fallback key sets (optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Tried only if the primary keys find no match. The first
                    match found wins.
                  </p>
                </div>
                {fallbackKeySets.map((set, si) => (
                  <div
                    key={si}
                    className="rounded-md border border-dashed border-border p-2.5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        Fallback {si + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => removeFallbackSet(si)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove set
                      </Button>
                    </div>
                    {set.map((pair, pi) => (
                      <div key={pi} className="flex items-center gap-2">
                        <div className="grid flex-1 min-w-0 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                          <ColumnSelect
                            value={pair.sourceColumn}
                            onChange={(v) =>
                              updateFallbackSet(si, pi, { sourceColumn: v })
                            }
                            columns={source.columns}
                            placeholder="Source column"
                            label={`Fallback ${si + 1} pair ${pi + 1} source column`}
                          />
                          <span className="hidden text-center text-xs font-medium text-muted-foreground sm:block">
                            =
                          </span>
                          <ColumnSelect
                            value={pair.lookupColumn}
                            onChange={(v) =>
                              updateFallbackSet(si, pi, { lookupColumn: v })
                            }
                            columns={lookup.columns}
                            placeholder="Lookup column"
                            label={`Fallback ${si + 1} pair ${pi + 1} lookup column`}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => removeFallbackPair(si, pi)}
                          aria-label={`Remove pair ${pi + 1} from fallback ${si + 1}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => addFallbackPair(si)}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add pair
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addFallbackSet}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add fallback set
                </Button>
              </div>
            </section>

            {/* Step 3: retrieve */}
            <section className="space-y-3 border-t border-border pt-4">
              <div className="flex items-start justify-between gap-2">
                <StepHeading
                  n={3}
                  title="Columns to retrieve from lookup"
                  hint="Click to select. These are added to your result."
                />
                <div className="flex flex-shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setRetrieveColumns([...lookupCols])}
                    disabled={retrieveColumns.length === lookupCols.length}
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setRetrieveColumns([])}
                    disabled={noRetrieve}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Columns to retrieve"
              >
                {lookupCols.map((col) => {
                  const on = retrieveColumns.includes(col);
                  return (
                    <Button
                      key={col}
                      type="button"
                      variant={on ? "default" : "outline"}
                      size="sm"
                      aria-pressed={on}
                      onClick={() => toggleRetrieve(col)}
                    >
                      {on && <Check className="mr-1 h-3.5 w-3.5" />}
                      {col}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {retrieveColumns.length} of {lookupCols.length} selected
              </p>
            </section>

            {/* Step 4: options */}
            <section className="space-y-3 border-t border-border pt-4">
              <StepHeading n={4} title="Matching options" />
              <div className="grid gap-2 sm:grid-cols-3">
                {options.map((o) => (
                  <label
                    key={o.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-md border p-2.5 transition-colors ${
                      o.checked
                        ? "border-primary/50 bg-primary/5"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={o.checked}
                      onChange={(e) => o.set(e.target.checked)}
                    />
                    <span>
                      <span className="block text-sm font-medium">
                        {o.label}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {o.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {/* Run */}
            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleRun} disabled={!canRun}>
                  {running ? "Running..." : "Run lookup"}
                </Button>
                {blocker && (
                  <p className="text-xs text-muted-foreground">{blocker}</p>
                )}
              </div>
              {diagnostics.length > 0 && (
                <div
                  role="status"
                  className="rounded-md border border-border bg-muted/30 p-2.5 text-xs text-muted-foreground"
                >
                  <p className="mb-1 font-medium text-foreground">
                    Notes from last run
                  </p>
                  <ul className="list-disc space-y-0.5 pl-4">
                    {diagnostics.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
