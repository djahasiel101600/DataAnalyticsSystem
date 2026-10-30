import { useState } from "react";
import { runAggregate, runPivot, type AggregateFn } from "@/lib/ops/aggregate";
import {
  AddRowButton,
  ColumnPicker,
  Field,
  FormNote,
  RunButton,
  SectionLabel,
  SelectInput,
} from "../controls";
import { columnOptions, TablePicker, useTableSelection } from "../table-source";
import { useOperation } from "../use-operation";

const FUNCTIONS: { value: AggregateFn; label: string }[] = [
  { value: "count", label: "Count" },
  { value: "sum", label: "Sum" },
  { value: "avg", label: "Average" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
];

type Mode = "aggregate" | "pivot";

interface Spec {
  column: string;
  fn: AggregateFn;
}

export function AggregateForm() {
  const { choices, choiceId, setChoiceId, table, columns } =
    useTableSelection();
  const { error, running, execute } = useOperation();

  const [mode, setMode] = useState<Mode>("aggregate");
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([{ column: "", fn: "count" }]);

  const [rowDimension, setRowDimension] = useState("");
  const [columnDimension, setColumnDimension] = useState("");
  const [valueColumn, setValueColumn] = useState("");
  const [pivotFn, setPivotFn] = useState<AggregateFn>("sum");

  const toggleGroup = (column: string) =>
    setGroupBy((prev) =>
      prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column],
    );

  const updateSpec = (index: number, patch: Partial<Spec>) =>
    setSpecs((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );

  return (
    <div className="space-y-3">
      <TablePicker
        choices={choices}
        value={choiceId}
        onChange={setChoiceId}
        label="Table"
      />

      <Field label="Mode">
        <SelectInput
          value={mode}
          onChange={(value) => setMode(value as Mode)}
          options={[
            { value: "aggregate", label: "Group and total" },
            { value: "pivot", label: "Pivot grid" },
          ]}
          ariaLabel="Aggregate mode"
        />
      </Field>

      {mode === "aggregate" ? (
        <>
          <div className="space-y-1.5">
            <SectionLabel>Group by</SectionLabel>
            <ColumnPicker
              columns={columns}
              selected={groupBy}
              onToggle={toggleGroup}
              emptyLabel="Pick the grouping columns"
            />
          </div>

          <div className="space-y-2">
            <SectionLabel>Calculate</SectionLabel>
            {specs.map((spec, index) => (
              <div key={index} className="flex gap-1.5">
                <SelectInput
                  value={spec.column}
                  onChange={(value) => updateSpec(index, { column: value })}
                  options={columnOptions(columns)}
                  placeholder="Column"
                  ariaLabel={`Aggregate ${index + 1} column`}
                />
                <SelectInput
                  value={spec.fn}
                  onChange={(value) =>
                    updateSpec(index, { fn: value as AggregateFn })
                  }
                  options={FUNCTIONS}
                  ariaLabel={`Aggregate ${index + 1} function`}
                />
                {specs.length > 1 && (
                  <button
                    type="button"
                    className="flex-none rounded-lg px-1.5 text-sm text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      setSpecs((prev) => prev.filter((_, i) => i !== index))
                    }
                    aria-label={`Remove aggregate ${index + 1}`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <AddRowButton
              label="Add aggregate"
              onClick={() =>
                setSpecs((prev) => [
                  ...prev,
                  { column: columns[0] ?? "", fn: "count" },
                ])
              }
            />
          </div>
        </>
      ) : (
        <>
          <Field label="Rows">
            <SelectInput
              value={rowDimension}
              onChange={setRowDimension}
              options={columnOptions(columns)}
              placeholder="Row dimension"
              ariaLabel="Row dimension"
            />
          </Field>
          <Field label="Columns">
            <SelectInput
              value={columnDimension}
              onChange={setColumnDimension}
              options={columnOptions(columns)}
              placeholder="Column dimension"
              ariaLabel="Column dimension"
            />
          </Field>
          <Field label="Values">
            <SelectInput
              value={valueColumn}
              onChange={setValueColumn}
              options={columnOptions(columns)}
              placeholder="Value column"
              ariaLabel="Value column"
            />
          </Field>
          <Field label="Calculation">
            <SelectInput
              value={pivotFn}
              onChange={(value) => setPivotFn(value as AggregateFn)}
              options={FUNCTIONS}
              ariaLabel="Pivot function"
            />
          </Field>
        </>
      )}

      {error && <FormNote tone="error">{error}</FormNote>}

      {mode === "aggregate" ? (
        <RunButton
          running={running}
          disabled={groupBy.length === 0 || specs.every((s) => !s.column)}
          onClick={() =>
            execute("Aggregate", () =>
              runAggregate(
                table,
                groupBy,
                specs.filter((s) => s.column),
              ),
            )
          }
        >
          Run aggregate
        </RunButton>
      ) : (
        <RunButton
          running={running}
          disabled={!rowDimension || !columnDimension || !valueColumn}
          onClick={() =>
            execute("Pivot", () =>
              runPivot(
                table,
                rowDimension,
                columnDimension,
                valueColumn,
                pivotFn,
              ),
            )
          }
        >
          Run pivot
        </RunButton>
      )}
    </div>
  );
}
