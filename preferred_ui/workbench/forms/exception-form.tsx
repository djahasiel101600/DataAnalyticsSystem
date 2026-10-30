import { useState } from "react";
import { runExceptionReport } from "@/lib/ops/exception-report";
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
import { useWorkbench } from "@/store/workbench";

export function ExceptionForm() {
  const { datasets } = useWorkbench();
  const { choices, choiceId, setChoiceId, table, columns } =
    useTableSelection();
  const { error, running, execute } = useOperation();

  const [keys, setKeys] = useState<string[]>([]);
  const [useDates, setUseDates] = useState(false);
  const [dateColumn, setDateColumn] = useState("");
  const [days, setDays] = useState("3");
  const [useMaster, setUseMaster] = useState(false);
  const [masterId, setMasterId] = useState("");
  const [masterKeys, setMasterKeys] = useState<string[]>([]);
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [trim, setTrim] = useState(true);

  const master = datasets.find((d) => d.id === masterId) ?? null;
  const effectiveDateColumn = columns.includes(dateColumn) ? dateColumn : "";

  const toggle = (
    list: string[],
    value: string,
    setter: (next: string[]) => void,
  ) =>
    setter(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
    );

  return (
    <div className="space-y-3">
      <TablePicker
        choices={choices}
        value={choiceId}
        onChange={setChoiceId}
        label="Primary table"
        hint="One report combining duplicates, inactivity and coverage."
      />

      <div className="space-y-1.5">
        <SectionLabel>Key columns</SectionLabel>
        <ColumnPicker
          columns={columns}
          selected={keys}
          onToggle={(column) => toggle(keys, column, setKeys)}
          emptyLabel="Pick the columns that identify a row"
        />
      </div>

      <CheckRow
        checked={useDates}
        onChange={setUseDates}
        label="Include inactivity check"
      />
      {useDates && (
        <>
          <Field label="Date column">
            <SelectInput
              value={effectiveDateColumn}
              onChange={setDateColumn}
              options={columnOptions(columns)}
              placeholder="Choose a date column"
              ariaLabel="Date column"
            />
          </Field>
          <Field label="Inactive after (days)">
            <TextInput value={days} onChange={setDays} type="number" />
          </Field>
        </>
      )}

      <CheckRow
        checked={useMaster}
        onChange={setUseMaster}
        label="Flag rows missing from a master list"
      />
      {useMaster && (
        <>
          <Field label="Master dataset">
            <SelectInput
              value={master?.id ?? ""}
              onChange={setMasterId}
              options={datasets.map((d) => ({ value: d.id, label: d.name }))}
              placeholder="Choose a dataset"
              ariaLabel="Master dataset"
            />
          </Field>
          {master && (
            <div className="space-y-1.5">
              <SectionLabel>Master key columns</SectionLabel>
              <ColumnPicker
                columns={master.columns}
                selected={masterKeys}
                onToggle={(column) => toggle(masterKeys, column, setMasterKeys)}
                emptyLabel="Pick the matching column"
              />
            </div>
          )}
        </>
      )}

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
        disabled={keys.length === 0}
        onClick={() =>
          execute("Exception report", () =>
            runExceptionReport({
              primary: table,
              keyColumns: keys,
              dateColumn: useDates ? effectiveDateColumn : undefined,
              thresholdDays: Number(days) || 3,
              master:
                useMaster && master
                  ? {
                      name: master.name,
                      keyColumns: masterKeys,
                      data: { columns: master.columns, rows: master.rows },
                    }
                  : undefined,
              ignoreCase,
              trim,
            }),
          )
        }
      >
        Run exception report
      </RunButton>
    </div>
  );
}
