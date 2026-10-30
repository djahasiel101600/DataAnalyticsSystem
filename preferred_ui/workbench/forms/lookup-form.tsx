import { useState } from "react";
import { runLookup } from "@/lib/ops/lookup";
import {
  AddRowButton,
  CheckRow,
  ColumnPicker,
  Field,
  FormNote,
  RemoveRowButton,
  RunButton,
  SectionLabel,
  SelectInput,
} from "../controls";
import { columnOptions, TablePicker, useTableSelection } from "../table-source";
import { useOperation } from "../use-operation";
import { useWorkbench } from "@/store/workbench";

interface KeyPair {
  sourceColumn: string;
  lookupColumn: string;
}

export function LookupForm() {
  const { datasets } = useWorkbench();
  const { choices, choiceId, setChoiceId, table, columns } =
    useTableSelection();
  const { error, running, execute } = useOperation();

  const [lookupId, setLookupId] = useState("");
  const [pairs, setPairs] = useState<KeyPair[]>([
    { sourceColumn: "", lookupColumn: "" },
  ]);
  const [retrieve, setRetrieve] = useState<string[]>([]);
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [trim, setTrim] = useState(true);
  const [excludeUnmatched, setExcludeUnmatched] = useState(false);

  const lookup = datasets.find((d) => d.id === lookupId) ?? datasets[0] ?? null;
  const lookupColumns = lookup?.columns ?? [];

  const update = (index: number, patch: Partial<KeyPair>) =>
    setPairs((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );

  const toggleRetrieve = (column: string) =>
    setRetrieve((prev) =>
      prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column],
    );

  return (
    <div className="space-y-3">
      <TablePicker
        choices={choices}
        value={choiceId}
        onChange={setChoiceId}
        label="Table to enrich"
        hint="Rows that should receive values from the other table."
      />

      <Field label="Lookup table">
        <SelectInput
          value={lookup?.id ?? ""}
          onChange={setLookupId}
          options={datasets.map((d) => ({ value: d.id, label: d.name }))}
          placeholder={
            datasets.length < 2
              ? "Upload another file first"
              : "Choose a dataset"
          }
          disabled={datasets.length < 2}
          ariaLabel="Lookup table"
        />
      </Field>

      <div className="space-y-2">
        <SectionLabel>Match rows on</SectionLabel>
        {pairs.map((pair, index) => (
          <div
            key={index}
            className="space-y-1.5 rounded-lg border border-border bg-muted/25 p-2"
          >
            <SelectInput
              value={pair.sourceColumn}
              onChange={(value) => update(index, { sourceColumn: value })}
              options={columnOptions(columns)}
              placeholder="Column in this table"
              ariaLabel={`Source key ${index + 1}`}
            />
            <SelectInput
              value={pair.lookupColumn}
              onChange={(value) => update(index, { lookupColumn: value })}
              options={columnOptions(lookupColumns)}
              placeholder="Column in lookup table"
              ariaLabel={`Lookup key ${index + 1}`}
            />
            {pairs.length > 1 && (
              <div className="flex justify-end">
                <RemoveRowButton
                  label={`Remove key pair ${index + 1}`}
                  onClick={() =>
                    setPairs((prev) => prev.filter((_, i) => i !== index))
                  }
                />
              </div>
            )}
          </div>
        ))}
        <AddRowButton
          label="Add key column"
          onClick={() =>
            setPairs((prev) => [
              ...prev,
              { sourceColumn: "", lookupColumn: "" },
            ])
          }
        />
      </div>

      <div className="space-y-1.5">
        <SectionLabel>Columns to bring back</SectionLabel>
        <ColumnPicker
          columns={lookupColumns}
          selected={retrieve}
          onToggle={toggleRetrieve}
          emptyLabel="Pick the columns to copy over"
        />
      </div>

      <div className="space-y-1">
        <CheckRow
          checked={trim}
          onChange={setTrim}
          label="Trim spaces before matching"
        />
        <CheckRow
          checked={ignoreCase}
          onChange={setIgnoreCase}
          label="Ignore case"
        />
        <CheckRow
          checked={excludeUnmatched}
          onChange={setExcludeUnmatched}
          label="Drop rows with no match"
          description="Otherwise unmatched rows stay with blank lookup values."
        />
      </div>

      {error && <FormNote tone="error">{error}</FormNote>}

      <RunButton
        running={running}
        disabled={
          !lookup ||
          retrieve.length === 0 ||
          pairs.every((p) => !p.sourceColumn || !p.lookupColumn)
        }
        onClick={() =>
          execute("Lookup", () =>
            runLookup({
              source: table,
              keyPairs: pairs.filter((p) => p.sourceColumn && p.lookupColumn),
              lookup: lookup
                ? { columns: lookup.columns, rows: lookup.rows }
                : { columns: [], rows: [] },
              retrieveColumns: retrieve,
              ignoreCase,
              trim,
              excludeUnmatched,
            }),
          )
        }
      >
        Run lookup
      </RunButton>
    </div>
  );
}
