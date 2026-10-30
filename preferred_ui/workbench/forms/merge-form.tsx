import { useState } from "react";
import { runMergeJoin, type JoinType } from "@/lib/ops/merge-join";
import {
  AddRowButton,
  CheckRow,
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

const JOIN_TYPES: { value: JoinType; label: string }[] = [
  { value: "left", label: "Left — keep every row from the first table" },
  { value: "inner", label: "Inner — keep only rows present in both" },
  { value: "right", label: "Right — keep every row from the second table" },
  { value: "full", label: "Full — keep rows from both sides" },
];

interface KeyPair {
  left: string;
  right: string;
}

export function MergeForm() {
  const { datasets } = useWorkbench();
  const { choices, choiceId, setChoiceId, table, columns } =
    useTableSelection();
  const { error, running, execute } = useOperation();

  const [rightId, setRightId] = useState("");
  const [joinType, setJoinType] = useState<JoinType>("left");
  const [pairs, setPairs] = useState<KeyPair[]>([{ left: "", right: "" }]);
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [trim, setTrim] = useState(true);

  const right = datasets.find((d) => d.id === rightId) ?? datasets[0] ?? null;
  const rightColumns = right?.columns ?? [];

  const update = (index: number, patch: Partial<KeyPair>) =>
    setPairs((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );

  return (
    <div className="space-y-3">
      <TablePicker
        choices={choices}
        value={choiceId}
        onChange={setChoiceId}
        label="First table"
        hint="Usually your main list."
      />

      <Field label="Second table">
        <SelectInput
          value={right?.id ?? ""}
          onChange={setRightId}
          options={datasets.map((d) => ({ value: d.id, label: d.name }))}
          placeholder={
            datasets.length < 2
              ? "Upload another file first"
              : "Choose a dataset"
          }
          disabled={datasets.length < 2}
          ariaLabel="Second table"
        />
      </Field>

      <Field label="Join type">
        <SelectInput
          value={joinType}
          onChange={(value) => setJoinType(value as JoinType)}
          options={JOIN_TYPES}
          ariaLabel="Join type"
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
              value={pair.left}
              onChange={(value) => update(index, { left: value })}
              options={columnOptions(columns)}
              placeholder="First table column"
              ariaLabel={`Left key ${index + 1}`}
            />
            <SelectInput
              value={pair.right}
              onChange={(value) => update(index, { right: value })}
              options={columnOptions(rightColumns)}
              placeholder="Second table column"
              ariaLabel={`Right key ${index + 1}`}
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
          onClick={() => setPairs((prev) => [...prev, { left: "", right: "" }])}
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
      </div>

      {error && <FormNote tone="error">{error}</FormNote>}

      <RunButton
        running={running}
        disabled={!right || pairs.every((p) => !p.left || !p.right)}
        onClick={() =>
          execute("Merge / join", () =>
            runMergeJoin({
              left: table,
              right: right
                ? { columns: right.columns, rows: right.rows }
                : { columns: [], rows: [] },
              leftKeys: pairs
                .filter((p) => p.left && p.right)
                .map((p) => p.left),
              rightKeys: pairs
                .filter((p) => p.left && p.right)
                .map((p) => p.right),
              joinType,
              ignoreCase,
              trim,
            }),
          )
        }
      >
        Run join
      </RunButton>
    </div>
  );
}
