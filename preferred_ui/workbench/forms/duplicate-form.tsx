import { useState } from "react";
import {
  runDuplicateCheck,
  type DuplicateKeepStrategy,
  type DuplicateMode,
} from "@/lib/ops/duplicate";
import {
  CheckRow,
  ColumnPicker,
  Field,
  FormNote,
  RunButton,
  SectionLabel,
  SelectInput,
} from "../controls";
import { columnOptions, TablePicker, useTableSelection } from "../table-source";
import { useOperation } from "../use-operation";

const MODES: { value: DuplicateMode; label: string }[] = [
  { value: "mark", label: "Mark duplicates" },
  { value: "remove", label: "Remove duplicates" },
];

const KEEP: { value: DuplicateKeepStrategy; label: string }[] = [
  { value: "first", label: "Keep the first row" },
  { value: "last", label: "Keep the last row" },
  { value: "most_complete", label: "Keep the most complete row" },
  { value: "max", label: "Keep the highest value in a column" },
  { value: "min", label: "Keep the lowest value in a column" },
  { value: "priority", label: "Keep by priority order" },
];

export function DuplicateForm() {
  const { choices, choiceId, setChoiceId, table, columns } =
    useTableSelection();
  const { error, running, execute } = useOperation();

  const [keys, setKeys] = useState<string[]>([]);
  const [mode, setMode] = useState<DuplicateMode>("mark");
  const [keepStrategy, setKeepStrategy] =
    useState<DuplicateKeepStrategy>("first");
  const [keepByColumn, setKeepByColumn] = useState("");
  const [priorityValues, setPriorityValues] = useState("");
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [trim, setTrim] = useState(true);

  const needsColumn =
    keepStrategy === "max" ||
    keepStrategy === "min" ||
    keepStrategy === "priority";

  const toggleKey = (column: string) =>
    setKeys((prev) =>
      prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column],
    );

  return (
    <div className="space-y-3">
      <TablePicker choices={choices} value={choiceId} onChange={setChoiceId} />

      <Field label="Output">
        <SelectInput
          value={mode}
          onChange={(value) => setMode(value as DuplicateMode)}
          options={MODES}
          ariaLabel="Duplicate output mode"
        />
      </Field>

      <div className="space-y-1.5">
        <SectionLabel>Key columns</SectionLabel>
        <p className="text-[11px] leading-snug text-muted-foreground">
          The columns that together make two rows the same.
        </p>
        <ColumnPicker
          columns={columns}
          selected={keys}
          onToggle={toggleKey}
          emptyLabel="Pick at least one column"
        />
      </div>

      {mode === "remove" && (
        <>
          <Field label="Which row to keep">
            <SelectInput
              value={keepStrategy}
              onChange={(value) =>
                setKeepStrategy(value as DuplicateKeepStrategy)
              }
              options={KEEP}
              ariaLabel="Keep strategy"
            />
          </Field>
          {needsColumn && (
            <Field
              label={
                keepStrategy === "priority"
                  ? "Priority column"
                  : "Compare column"
              }
              hint={
                keepStrategy === "priority"
                  ? "Rows are ranked by the order you type below, top value first."
                  : "The row with the highest or lowest value here is kept."
              }
            >
              <SelectInput
                value={keepByColumn}
                onChange={setKeepByColumn}
                options={columnOptions(columns)}
                placeholder="Choose a column"
                ariaLabel="Keep by column"
              />
            </Field>
          )}
          {keepStrategy === "priority" && (
            <Field
              label="Priority order"
              hint="Comma separated, most important first. Example: Active, Inactive, Offboarded"
            >
              <input
                className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
                value={priorityValues}
                onChange={(event) => setPriorityValues(event.target.value)}
                placeholder="Active, Inactive"
              />
            </Field>
          )}
        </>
      )}

      <div className="space-y-1">
        <CheckRow
          checked={trim}
          onChange={setTrim}
          label="Trim spaces"
          description="Ignores leading and trailing spaces when matching."
        />
        <CheckRow
          checked={ignoreCase}
          onChange={setIgnoreCase}
          label="Ignore case"
          description="Treats Active and active as the same value."
        />
      </div>

      {error && <FormNote tone="error">{error}</FormNote>}

      <RunButton
        running={running}
        disabled={keys.length === 0}
        onClick={() =>
          execute("Duplicate check", () =>
            runDuplicateCheck(table, {
              keyColumns: keys,
              mode,
              keepStrategy,
              keepByColumn,
              priorityValues: priorityValues
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              ignoreCase,
              trim,
            }),
          )
        }
      >
        Run duplicate check
      </RunButton>
    </div>
  );
}
