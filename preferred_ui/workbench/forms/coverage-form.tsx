import { useState } from "react";
import {
  runCoverageCheck,
  type CoverageOutputMode,
  type CoverageRule,
} from "@/lib/ops/coverage";
import {
  CheckRow,
  ColumnPicker,
  Field,
  FormNote,
  RunButton,
  SectionLabel,
  SelectInput,
} from "../controls";
import { TablePicker, useTableSelection } from "../table-source";
import { useOperation } from "../use-operation";
import { useWorkbench } from "@/store/workbench";

export function CoverageForm() {
  const { datasets } = useWorkbench();
  const { choices, choiceId, setChoiceId, table, columns } =
    useTableSelection();
  const { error, running, execute } = useOperation();

  const [primaryKeys, setPrimaryKeys] = useState<string[]>([]);
  const [selectedRefs, setSelectedRefs] = useState<string[]>([]);
  const [refKeys, setRefKeys] = useState<Record<string, string[]>>({});
  const [rule, setRule] = useState<CoverageRule>("all");
  const [outputMode, setOutputMode] = useState<CoverageOutputMode>("annotate");
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [trim, setTrim] = useState(true);

  const toggleKey = (column: string) =>
    setPrimaryKeys((prev) =>
      prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column],
    );

  const toggleRef = (id: string) =>
    setSelectedRefs((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );

  const toggleRefKey = (datasetId: string, column: string) =>
    setRefKeys((prev) => {
      const current = prev[datasetId] ?? [];
      return {
        ...prev,
        [datasetId]: current.includes(column)
          ? current.filter((c) => c !== column)
          : [...current, column],
      };
    });

  const references = datasets
    .filter((dataset) => selectedRefs.includes(dataset.id))
    .map((dataset) => ({
      id: dataset.id,
      name: dataset.name,
      data: { columns: dataset.columns, rows: dataset.rows },
      keyColumns: refKeys[dataset.id] ?? [],
    }));

  return (
    <div className="space-y-3">
      <TablePicker
        choices={choices}
        value={choiceId}
        onChange={setChoiceId}
        label="List to check"
        hint="The rows you want to verify against your master lists."
      />

      <div className="space-y-1.5">
        <SectionLabel>Key columns in this list</SectionLabel>
        <ColumnPicker
          columns={columns}
          selected={primaryKeys}
          onToggle={toggleKey}
          emptyLabel="Pick a key column"
        />
      </div>

      <div className="space-y-1.5">
        <SectionLabel>Check against</SectionLabel>
        <div className="space-y-0.5">
          {datasets.map((dataset) => (
            <CheckRow
              key={dataset.id}
              checked={selectedRefs.includes(dataset.id)}
              onChange={() => toggleRef(dataset.id)}
              label={dataset.name}
              description={`${dataset.rows.length.toLocaleString()} rows`}
            />
          ))}
        </div>
      </div>

      {references.map((reference) => (
        <div key={reference.id} className="space-y-1.5">
          <SectionLabel>{reference.name} key columns</SectionLabel>
          <ColumnPicker
            columns={reference.data.columns}
            selected={reference.keyColumns}
            onToggle={(column) => toggleRefKey(reference.id, column)}
            emptyLabel="Pick the matching column"
          />
        </div>
      ))}

      <Field label="A row counts as covered when">
        <SelectInput
          value={rule}
          onChange={(value) => setRule(value as CoverageRule)}
          options={[
            { value: "all", label: "It appears in every reference list" },
            {
              value: "any",
              label: "It appears in at least one reference list",
            },
          ]}
          ariaLabel="Coverage rule"
        />
      </Field>

      <Field label="Show">
        <SelectInput
          value={outputMode}
          onChange={(value) => setOutputMode(value as CoverageOutputMode)}
          options={[
            { value: "annotate", label: "All rows, annotated" },
            { value: "only_missing", label: "Only rows that are missing" },
            { value: "only_complete", label: "Only rows that are covered" },
          ]}
          ariaLabel="Coverage output"
        />
      </Field>

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
      </div>

      {error && <FormNote tone="error">{error}</FormNote>}

      <RunButton
        running={running}
        disabled={primaryKeys.length === 0 || references.length === 0}
        onClick={() =>
          execute("Coverage check", () =>
            runCoverageCheck({
              primary: table,
              primaryKeys,
              references,
              rule,
              outputMode,
              ignoreCase,
              trim,
            }),
          )
        }
      >
        Run coverage check
      </RunButton>
    </div>
  );
}
