import { useState } from "react";
import { parseStandardizeMap, runCleanData } from "@/lib/ops/clean";
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
import { columnOptions, TablePicker, useTableSelection } from "../table-source";
import { useOperation } from "../use-operation";

export function CleanForm() {
  const { choices, choiceId, setChoiceId, table, columns } =
    useTableSelection();
  const { error, running, execute } = useOperation();

  const [selected, setSelected] = useState<string[]>([]);
  const [trim, setTrim] = useState(true);
  const [lowercase, setLowercase] = useState(false);
  const [uppercase, setUppercase] = useState(false);
  const [fillEmpty, setFillEmpty] = useState("");
  const [standardizeColumn, setStandardizeColumn] = useState("");
  const [mappingText, setMappingText] = useState("");

  const toggleColumn = (column: string) =>
    setSelected((prev) =>
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
        label="Table"
      />

      <div className="space-y-1.5">
        <SectionLabel>Columns to clean</SectionLabel>
        <ColumnPicker
          columns={columns}
          selected={selected}
          onToggle={toggleColumn}
          emptyLabel="All columns"
        />
      </div>

      <div className="space-y-1">
        <CheckRow checked={trim} onChange={setTrim} label="Trim spaces" />
        <CheckRow
          checked={lowercase}
          onChange={(checked) => {
            setLowercase(checked);
            if (checked) setUppercase(false);
          }}
          label="Lowercase"
        />
        <CheckRow
          checked={uppercase}
          onChange={(checked) => {
            setUppercase(checked);
            if (checked) setLowercase(false);
          }}
          label="Uppercase"
        />
      </div>

      <Field
        label="Fill empty cells with"
        hint="Leave blank to keep empties as they are."
      >
        <TextInput
          value={fillEmpty}
          onChange={setFillEmpty}
          placeholder="e.g. N/A"
        />
      </Field>

      <Field
        label="Standardize one column (optional)"
        hint="Useful for status values written in several ways."
      >
        <SelectInput
          value={standardizeColumn}
          onChange={setStandardizeColumn}
          options={columnOptions(columns)}
          placeholder="No column"
          ariaLabel="Standardize column"
        />
      </Field>

      {standardizeColumn && (
        <Field
          label="Mapping"
          hint="One per line, using => or a colon. Example: active => Active"
        >
          <textarea
            className="min-h-[84px] w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
            value={mappingText}
            onChange={(event) => setMappingText(event.target.value)}
            placeholder={"active => Active\ninactive => Inactive"}
          />
        </Field>
      )}

      {error && <FormNote tone="error">{error}</FormNote>}

      <RunButton
        running={running}
        onClick={() =>
          execute("Clean data", () => {
            const map = standardizeColumn
              ? parseStandardizeMap(mappingText)
              : {};
            return runCleanData(table, {
              columns: selected,
              trim,
              lowercase,
              uppercase,
              fillEmpty: fillEmpty.trim() || undefined,
              standardizeRules:
                standardizeColumn && Object.keys(map).length > 0
                  ? [{ column: standardizeColumn, map }]
                  : [],
            });
          })
        }
      >
        Run clean
      </RunButton>
    </div>
  );
}
