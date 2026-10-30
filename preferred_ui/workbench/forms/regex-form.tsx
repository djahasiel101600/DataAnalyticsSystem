import { useState } from "react";
import { REGEX_PRESETS, runRegexSearch } from "@/lib/ops/regex-search";
import {
  CheckRow,
  ColumnPicker,
  Field,
  FormNote,
  RunButton,
  SectionLabel,
  SelectInput,
  TextInput,
} from "../controls";
import { useOperation } from "../use-operation";
import { useWorkbench } from "@/store/workbench";

export function RegexForm() {
  const { datasets } = useWorkbench();
  const { error, running, execute } = useOperation();

  const [selected, setSelected] = useState<string[]>([]);
  const [perDataset, setPerDataset] = useState<Record<string, string[]>>({});
  const [pattern, setPattern] = useState("");
  const [searchAll, setSearchAll] = useState(true);
  const [caseSensitive, setCaseSensitive] = useState(false);

  const chosen = datasets.filter((d) => selected.includes(d.id));

  const toggleDataset = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );

  const toggleColumn = (datasetId: string, column: string) =>
    setPerDataset((prev) => {
      const current = prev[datasetId] ?? [];
      return {
        ...prev,
        [datasetId]: current.includes(column)
          ? current.filter((c) => c !== column)
          : [...current, column],
      };
    });

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <SectionLabel>Search in</SectionLabel>
        <div className="space-y-0.5">
          {datasets.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              Upload a file to search.
            </p>
          )}
          {datasets.map((dataset) => (
            <CheckRow
              key={dataset.id}
              checked={selected.includes(dataset.id)}
              onChange={() => toggleDataset(dataset.id)}
              label={dataset.name}
              description={`${dataset.rows.length.toLocaleString()} rows · ${dataset.columns.length} columns`}
            />
          ))}
        </div>
      </div>

      <Field
        label="Pattern"
        hint="Regular expression. Leave it simple to start — a plain word works too."
      >
        <TextInput
          value={pattern}
          onChange={setPattern}
          placeholder="e.g. logistics\.com$"
        />
      </Field>

      <Field label="Starter patterns">
        <SelectInput
          value=""
          onChange={(value) => {
            if (value !== "") setPattern(value);
          }}
          options={REGEX_PRESETS.map((preset) => ({
            value: preset.pattern,
            label: preset.pattern ? preset.label : preset.label,
          }))}
          placeholder="Choose a pattern…"
          ariaLabel="Starter patterns"
        />
      </Field>

      <CheckRow
        checked={searchAll}
        onChange={setSearchAll}
        label="Search every column"
        description="Turn off to pick specific columns per dataset."
      />
      <CheckRow
        checked={caseSensitive}
        onChange={setCaseSensitive}
        label="Match case"
      />

      {!searchAll &&
        chosen.map((dataset) => (
          <div key={dataset.id} className="space-y-1.5">
            <SectionLabel>{dataset.name} columns</SectionLabel>
            <ColumnPicker
              columns={dataset.columns}
              selected={perDataset[dataset.id] ?? []}
              onToggle={(column) => toggleColumn(dataset.id, column)}
              emptyLabel="All columns"
            />
          </div>
        ))}

      {error && <FormNote tone="error">{error}</FormNote>}

      <RunButton
        running={running}
        disabled={selected.length === 0 || !pattern}
        onClick={() =>
          execute("Regex search", () =>
            runRegexSearch({
              datasets: chosen,
              selectedColumns: perDataset,
              pattern,
              searchAllColumns: searchAll,
              caseSensitive,
            }),
          )
        }
      >
        Search
      </RunButton>
    </div>
  );
}
