import { useState } from "react";
import {
  runFilterSort,
  type FilterCombine,
  type FilterCondition,
  type FilterOperator,
  type FilterValueType,
  type SortDirection,
  type SortSpec,
} from "@/lib/ops/filter-sort";
import {
  AddRowButton,
  CheckRow,
  Field,
  FormNote,
  RemoveRowButton,
  Row,
  RunButton,
  SectionLabel,
  SelectInput,
  TextInput,
} from "../controls";
import { columnOptions, TablePicker, useTableSelection } from "../table-source";
import { useOperation } from "../use-operation";

const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "equals", label: "is exactly" },
  { value: "contains", label: "contains" },
  { value: "gt", label: "is greater than" },
  { value: "gte", label: "is at least" },
  { value: "lt", label: "is less than" },
  { value: "lte", label: "is at most" },
  { value: "empty", label: "is empty" },
  { value: "not_empty", label: "is not empty" },
];

const TYPES: { value: FilterValueType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
];

const newCondition = (column = ""): FilterCondition => ({
  column,
  operator: "contains",
  value: "",
  valueType: "text",
});

export function FilterSortForm() {
  const { choices, choiceId, setChoiceId, table, columns } =
    useTableSelection();
  const { error, running, execute } = useOperation();

  const [conditions, setConditions] = useState<FilterCondition[]>([
    newCondition(),
  ]);
  const [combine, setCombine] = useState<FilterCombine>("and");
  const [sorts, setSorts] = useState<SortSpec[]>([]);
  const [asDate, setAsDate] = useState(false);

  const updateCondition = (index: number, patch: Partial<FilterCondition>) =>
    setConditions((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );

  const updateSort = (index: number, patch: Partial<SortSpec>) =>
    setSorts((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );

  return (
    <div className="space-y-3">
      <TablePicker choices={choices} value={choiceId} onChange={setChoiceId} />

      <div className="space-y-2">
        <SectionLabel>Conditions</SectionLabel>
        {conditions.map((condition, index) => (
          <div
            key={index}
            className="space-y-1.5 rounded-lg border border-border bg-muted/25 p-2"
          >
            <SelectInput
              value={condition.column}
              onChange={(value) => updateCondition(index, { column: value })}
              options={columnOptions(columns)}
              placeholder="Choose a column"
              ariaLabel={`Condition ${index + 1} column`}
            />
            <Row>
              <SelectInput
                value={condition.operator}
                onChange={(value) =>
                  updateCondition(index, { operator: value as FilterOperator })
                }
                options={OPERATORS}
                ariaLabel={`Condition ${index + 1} operator`}
              />
              <SelectInput
                value={condition.valueType ?? "text"}
                onChange={(value) =>
                  updateCondition(index, {
                    valueType: value as FilterValueType,
                  })
                }
                options={TYPES}
                ariaLabel={`Condition ${index + 1} value type`}
              />
            </Row>
            {condition.operator !== "empty" &&
              condition.operator !== "not_empty" && (
                <TextInput
                  value={condition.value}
                  onChange={(value) => updateCondition(index, { value })}
                  placeholder={
                    condition.valueType === "date" ? "2025-03-18" : "Value"
                  }
                />
              )}
            {conditions.length > 1 && (
              <div className="flex justify-end">
                <RemoveRowButton
                  label={`Remove condition ${index + 1}`}
                  onClick={() =>
                    setConditions((prev) => prev.filter((_, i) => i !== index))
                  }
                />
              </div>
            )}
          </div>
        ))}
        <AddRowButton
          label="Add condition"
          onClick={() =>
            setConditions((prev) => [...prev, newCondition(columns[0])])
          }
        />
        {conditions.length > 1 && (
          <Field label="Match">
            <SelectInput
              value={combine}
              onChange={(value) => setCombine(value as FilterCombine)}
              options={[
                { value: "and", label: "All conditions must be true (AND)" },
                { value: "or", label: "Any condition can be true (OR)" },
              ]}
              ariaLabel="Combine conditions"
            />
          </Field>
        )}
      </div>

      <div className="space-y-2">
        <SectionLabel>Sort</SectionLabel>
        {sorts.map((sort, index) => (
          <Row key={index}>
            <SelectInput
              value={sort.column}
              onChange={(value) => updateSort(index, { column: value })}
              options={columnOptions(columns)}
              placeholder="Column"
              ariaLabel={`Sort ${index + 1} column`}
            />
            <div className="flex gap-1">
              <SelectInput
                value={sort.direction}
                onChange={(value) =>
                  updateSort(index, { direction: value as SortDirection })
                }
                options={[
                  { value: "asc", label: "A → Z" },
                  { value: "desc", label: "Z → A" },
                ]}
                ariaLabel={`Sort ${index + 1} direction`}
              />
              <button
                type="button"
                className="flex-none rounded-lg px-1.5 text-xs text-muted-foreground hover:text-destructive"
                onClick={() =>
                  setSorts((prev) => prev.filter((_, i) => i !== index))
                }
                aria-label={`Remove sort ${index + 1}`}
              >
                ×
              </button>
            </div>
          </Row>
        ))}
        <AddRowButton
          label="Add sort"
          onClick={() =>
            setSorts((prev) => [
              ...prev,
              { column: columns[0] ?? "", direction: "asc", asDate },
            ])
          }
        />
        {sorts.length > 0 && (
          <CheckRow
            checked={asDate}
            onChange={(checked) => {
              setAsDate(checked);
              setSorts((prev) => prev.map((s) => ({ ...s, asDate: checked })));
            }}
            label="Sort values as dates"
          />
        )}
      </div>

      {error && <FormNote tone="error">{error}</FormNote>}

      <RunButton
        running={running}
        onClick={() =>
          execute("Filter & sort", () =>
            runFilterSort(table, conditions, combine, sorts),
          )
        }
      >
        Apply filter & sort
      </RunButton>
    </div>
  );
}
