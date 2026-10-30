import { useState } from "react";
import { runInactivityCheck } from "@/lib/ops/inactivity";
import {
  CheckRow,
  Field,
  FormNote,
  RunButton,
  SelectInput,
  TextInput,
} from "../controls";
import { columnOptions, TablePicker, useTableSelection } from "../table-source";
import { useOperation } from "../use-operation";

export function InactivityForm() {
  const { choices, choiceId, setChoiceId, table, columns } =
    useTableSelection();
  const { error, running, execute } = useOperation();

  const [dateColumn, setDateColumn] = useState("");
  const [days, setDays] = useState("3");
  const [referenceDate, setReferenceDate] = useState("");
  const [strict, setStrict] = useState(false);

  const column = columns.includes(dateColumn) ? dateColumn : "";

  return (
    <div className="space-y-3">
      <TablePicker
        choices={choices}
        value={choiceId}
        onChange={setChoiceId}
        label="Table"
      />

      <Field
        label="Last activity date column"
        hint="Rows whose date is older than the threshold get flagged."
      >
        <SelectInput
          value={column}
          onChange={setDateColumn}
          options={columnOptions(columns)}
          placeholder="Choose a date column"
          ariaLabel="Date column"
        />
      </Field>

      <Field label="Inactive after (days)">
        <TextInput
          value={days}
          onChange={setDays}
          type="number"
          placeholder="3"
        />
      </Field>

      <Field label="Compare against" hint="Leave blank to use today.">
        <TextInput
          value={referenceDate}
          onChange={setReferenceDate}
          placeholder="YYYY-MM-DD"
        />
      </Field>

      <CheckRow
        checked={strict}
        onChange={setStrict}
        label="Strict mode"
        description="Rows with a missing or unreadable date are not flagged as inactive."
      />

      {error && <FormNote tone="error">{error}</FormNote>}

      <RunButton
        running={running}
        disabled={!column}
        onClick={() =>
          execute("Inactivity check", () => {
            const threshold = Number(days);
            if (Number.isNaN(threshold) || threshold < 0) {
              throw new Error("Enter the number of days as 0 or more.");
            }
            return runInactivityCheck(table, {
              dateColumn: column,
              thresholdDays: threshold,
              referenceDate: referenceDate || undefined,
              strict,
            });
          })
        }
      >
        Run inactivity check
      </RunButton>
    </div>
  );
}
