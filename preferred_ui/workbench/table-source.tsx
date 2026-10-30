import { useMemo, useState } from "react";
import { useWorkbench } from "@/store/workbench";
import type { TableData } from "@/lib/data/types";
import { Field, SelectInput } from "./controls";

export interface TableChoice {
  id: string;
  label: string;
  table: TableData;
}

export const RESULT_ID = "__result__";

export function useTableChoices(): TableChoice[] {
  const { datasets, result } = useWorkbench();
  return useMemo(() => {
    const choices: TableChoice[] = [];
    if (result) {
      choices.push({ id: RESULT_ID, label: "Current result", table: result });
    }
    for (const dataset of datasets) {
      choices.push({
        id: dataset.id,
        label: dataset.name,
        table: { columns: dataset.columns, rows: dataset.rows },
      });
    }
    return choices;
  }, [datasets, result]);
}

export function useTableSelection() {
  const choices = useTableChoices();
  const [choiceId, setChoiceId] = useState<string>("");
  const choice = choices.find((c) => c.id === choiceId) ?? choices[0] ?? null;
  return {
    choices,
    choiceId: choice?.id ?? "",
    setChoiceId,
    choice,
    table: choice?.table ?? { columns: [], rows: [] },
    columns: choice?.table.columns ?? [],
  };
}

export function TablePicker({
  choices,
  value,
  onChange,
  label = "Table",
  hint,
}: {
  choices: TableChoice[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <SelectInput
        value={value}
        onChange={onChange}
        options={choices.map((c) => ({ value: c.id, label: c.label }))}
        placeholder={choices.length === 0 ? "No data yet" : undefined}
        disabled={choices.length === 0}
        ariaLabel={label}
      />
    </Field>
  );
}

export function columnOptions(columns: string[]) {
  return columns.map((column) => ({ value: column, label: column }));
}
