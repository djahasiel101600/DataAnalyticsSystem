import { describe, expect, it } from "vitest";
import type { DataRow } from "@/entities/dataset";
import { runLookup, type KeyPair } from "./run-lookup";

const source = {
  id: "ds-source",
  name: "source",
  columns: ["employee_id", "name", "email"],
  rows: [
    { employee_id: "E001", name: "Alice", email: "alice@test.com" },
    { employee_id: "E002", name: "Bob", email: "bob@test.com" },
    { employee_id: "E003", name: "Carol", email: "carol@test.com" },
  ],
};

const lookup = {
  id: "ds-lookup",
  name: "lookup",
  columns: ["id", "department", "role", "email"],
  rows: [
    { id: "E001", department: "Fleet", role: "Driver", email: "alice@test.com" },
    { id: "E002", department: "Warehouse", role: "Picker", email: "bob@test.com" },
    { id: "E004", department: "HR", role: "Manager", email: "nobody@test.com" },
  ],
};

const pair = (sourceColumn: string, lookupColumn = sourceColumn): KeyPair => ({
  sourceColumn,
  lookupColumn,
});

describe("runLookup", () => {
  it("supports a single-column lookup with different source and lookup column names", () => {
    const result = runLookup(source, [pair("employee_id", "id")], lookup, [
      "department",
    ]);

    expect(result.rows.map((row) => row.department)).toEqual([
      "Fleet",
      "Warehouse",
      "",
    ]);
    expect(result.columns).toEqual([
      ...source.columns,
      "department",
    ]);
    expect(result.recordDiagnostics.map((record) => record.status)).toEqual([
      "matched",
      "matched",
      "unmatched",
    ]);
  });

  it("requires every component in a composite key to match", () => {
    const sourceData = {
      ...source,
      columns: ["employee_id", "department"],
      rows: [
        { employee_id: "E001", department: "Fleet" },
        { employee_id: "E001", department: "HR" },
      ],
    };
    const lookupData = {
      ...lookup,
      columns: ["id", "team", "role"],
      rows: [
        { id: "E001", team: "Fleet", role: "Driver" },
        { id: "E001", team: "HR", role: "Manager" },
      ],
    };
    const result = runLookup(
      sourceData,
      [pair("employee_id", "id"), pair("department", "team")],
      lookupData,
      ["role"],
    );

    expect(result.rows.map((row) => row.role)).toEqual(["Driver", "Manager"]);
    expect(result.summary.matchedCount).toBe(2);
  });

  it("supports composite keys with three or more components", () => {
    const sourceData = {
      ...source,
      columns: ["region", "date", "code"],
      rows: [{ region: "North", date: "2025-01-01", code: "A" }],
    };
    const lookupData = {
      ...lookup,
      columns: ["area", "date_key", "item", "role"],
      rows: [{ area: "North", date_key: "2025-01-01", item: "A", role: "Found" }],
    };
    const result = runLookup(
      sourceData,
      [
        pair("region", "area"),
        pair("date", "date_key"),
        pair("code", "item"),
      ],
      lookupData,
      ["role"],
    );

    expect(result.rows[0].role).toBe("Found");
  });

  it("tries fallbacks in priority order only after zero candidates", () => {
    const sourceData = {
      ...source,
      rows: [
        { employee_id: "E001", name: "Alice", email: "bob@test.com" },
        { employee_id: "missing", name: "Bob", email: "bob@test.com" },
      ],
    };
    const result = runLookup(
      sourceData,
      [pair("employee_id", "id")],
      lookup,
      ["department"],
      [[pair("email")], [pair("name", "role")]],
    );

    expect(result.recordDiagnostics[0].strategyId).toBe("primary");
    expect(result.recordDiagnostics[0].attempts).toHaveLength(1);
    expect(result.recordDiagnostics[1].strategyId).toBe("fallback_1");
    expect(result.recordDiagnostics[1].attempts.map((attempt) => attempt.strategyId)).toEqual([
      "primary",
      "fallback_1",
    ]);
    expect(result.rows[1].department).toBe("Warehouse");
    expect(result.summary.strategies.map((strategy) => strategy.matchedCount)).toEqual([
      1,
      1,
      0,
    ]);
  });

  it("uses a later fallback only after every earlier strategy has zero candidates", () => {
    const sourceData = {
      ...source,
      rows: [{ employee_id: "missing", name: "No match", email: "carol@test.com" }],
    };
    const lookupData = {
      ...lookup,
      rows: lookup.rows.map((row) =>
        row.id === "E004" ? { ...row, email: "carol@test.com" } : row,
      ),
    };
    const result = runLookup(
      sourceData,
      [pair("employee_id", "id")],
      lookupData,
      ["department"],
      [[pair("name", "role")], [pair("email")]],
    );

    expect(result.recordDiagnostics[0].strategyId).toBe("fallback_2");
    expect(result.recordDiagnostics[0].attempts.map((attempt) => attempt.strategyId)).toEqual([
      "primary",
      "fallback_1",
      "fallback_2",
    ]);
    expect(result.rows[0].department).toBe("HR");
  });

  it("stops at an ambiguous primary result and never runs a fallback", () => {
    const duplicateLookup = {
      ...lookup,
      rows: [
        ...lookup.rows,
        { id: "E001", department: "Second", role: "Other", email: "other@test.com" },
      ],
    };
    const result = runLookup(
      { ...source, rows: [source.rows[0]] },
      [pair("employee_id", "id")],
      duplicateLookup,
      ["department"],
      [[pair("email")]],
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].department).toBe("");
    expect(result.recordDiagnostics[0]).toMatchObject({
      status: "ambiguous",
      strategyId: "primary",
      candidateCount: 2,
      candidateRowIndices: [1, 4],
    });
    expect(result.recordDiagnostics[0].attempts).toHaveLength(1);
  });

  it("stops at an ambiguous fallback and does not try later fallbacks", () => {
    const duplicateLookup = {
      ...lookup,
      rows: [
        ...lookup.rows,
        { id: "E010", department: "Second", role: "Other", email: "shared@test.com" },
        { id: "E011", department: "Third", role: "Other", email: "shared@test.com" },
      ],
    };
    const sourceData = {
      ...source,
      rows: [{ employee_id: "missing", name: "Alice", email: "shared@test.com" }],
    };
    const result = runLookup(
      sourceData,
      [pair("employee_id", "id")],
      duplicateLookup,
      ["department"],
      [[pair("email")], [pair("name", "role")]],
    );

    expect(result.recordDiagnostics[0].status).toBe("ambiguous");
    expect(result.recordDiagnostics[0].strategyId).toBe("fallback_1");
    expect(result.recordDiagnostics[0].attempts.map((attempt) => attempt.strategyId)).toEqual([
      "primary",
      "fallback_1",
    ]);
    expect(result.rows[0].department).toBe("");
  });

  it("processes duplicate source records independently and preserves their order", () => {
    const repeatedSource = {
      ...source,
      rows: [source.rows[1], source.rows[0], source.rows[1]],
    };
    const result = runLookup(
      repeatedSource,
      [pair("employee_id", "id")],
      lookup,
      ["role"],
    );

    expect(result.rows.map((row) => row.employee_id)).toEqual([
      "E002",
      "E001",
      "E002",
    ]);
    expect(result.rows.map((row) => row.role)).toEqual([
      "Picker",
      "Driver",
      "Picker",
    ]);
    expect(result.recordDiagnostics.map((record) => record.sourceRowIndex)).toEqual([
      1,
      2,
      3,
    ]);
  });

  it("uses trim and case-insensitive normalization by default", () => {
    const sourceData = {
      ...source,
      rows: [{ employee_id: "  e001 ", name: "Alice", email: "" }],
    };
    const result = runLookup(
      sourceData,
      [pair("employee_id", "id")],
      lookup,
      ["department"],
    );

    expect(result.rows[0].department).toBe("Fleet");
  });

  it("allows explicit case-sensitive and whitespace-sensitive matching", () => {
    const sourceData = {
      ...source,
      rows: [{ employee_id: " e001 ", name: "Alice", email: "" }],
    };
    const result = runLookup(
      sourceData,
      [pair("employee_id", "id")],
      lookup,
      ["department"],
      [],
      { trim: false, ignoreCase: false },
    );

    expect(result.recordDiagnostics[0].status).toBe("unmatched");
  });

  it("preserves internal whitespace and punctuation", () => {
    const sourceData = {
      ...source,
      columns: ["key"],
      rows: [{ key: "a  b!" }],
    };
    const lookupData = {
      ...lookup,
      columns: ["key", "department"],
      rows: [{ key: "a b!", department: "Space differs" }],
    };
    const result = runLookup(sourceData, [pair("key")], lookupData, [
      "department",
    ]);

    expect(result.recordDiagnostics[0].status).toBe("unmatched");
  });

  it("does not match null, missing, or empty composite-key components", () => {
    const sourceData = {
      ...source,
      columns: ["first", "last"],
      rows: [
        { first: "", last: "Smith" },
        { first: "Jane" },
        { first: null, last: "Smith" },
      ] as DataRow[],
    };
    const lookupData = {
      ...lookup,
      columns: ["given", "family", "department"],
      rows: [{ given: "", family: "Smith", department: "Should not match" }],
    };
    const result = runLookup(
      sourceData,
      [pair("first", "given"), pair("last", "family")],
      lookupData,
      ["department"],
    );

    expect(result.rows.map((row) => row.department)).toEqual(["", "", ""]);
    expect(result.recordDiagnostics.every((record) => record.status === "unmatched")).toBe(
      true,
    );
    expect(result.recordDiagnostics[0].attempts[0].keyIssue).toMatch(/empty/i);
  });

  it("distinguishes numbers, strings, booleans, and zero from missing keys", () => {
    const sourceData = {
      ...source,
      columns: ["key"],
      rows: [{ key: 0 }, { key: "0" }, { key: false }, { key: "" }],
    };
    const lookupData = {
      ...lookup,
      columns: ["key", "department"],
      rows: [
        { key: 0, department: "Number zero" },
        { key: "0", department: "Text zero" },
        { key: false, department: "False" },
        { key: "", department: "Empty" },
      ],
    };
    const result = runLookup(sourceData, [pair("key")], lookupData, [
      "department",
    ]);

    expect(result.rows.map((row) => row.department)).toEqual([
      "Number zero",
      "Text zero",
      "False",
      "",
    ]);
    expect(result.recordDiagnostics.map((record) => record.status)).toEqual([
      "matched",
      "matched",
      "matched",
      "unmatched",
    ]);
  });

  it("does not collide composite keys with boundary or delimiter characters", () => {
    const sourceData = {
      ...source,
      columns: ["left", "right"],
      rows: [
        { left: "AB", right: "C" },
        { left: "A", right: "BC" },
        { left: "a\tb", right: "c" },
        { left: "a", right: "b\tc" },
        { left: "💠", right: "x" },
      ],
    };
    const lookupData = {
      ...lookup,
      columns: ["first", "second", "department"],
      rows: [
        { first: "AB", second: "C", department: "First" },
        { first: "A", second: "BC", department: "Second" },
        { first: "a\tb", second: "c", department: "Third" },
        { first: "a", second: "b\tc", department: "Fourth" },
        { first: "💠", second: "x", department: "Unicode" },
      ],
    };
    const result = runLookup(
      sourceData,
      [pair("left", "first"), pair("right", "second")],
      lookupData,
      ["department"],
    );

    expect(result.rows.map((row) => row.department)).toEqual([
      "First",
      "Second",
      "Third",
      "Fourth",
      "Unicode",
    ]);
  });

  it("retains duplicate candidates and reports candidate row references", () => {
    const duplicateLookup = {
      ...lookup,
      rows: [
        ...lookup.rows,
        { id: "E001", department: "Second", role: "Other", email: "other@test.com" },
      ],
    };
    const result = runLookup(
      source,
      [pair("employee_id", "id")],
      duplicateLookup,
      ["department"],
    );

    expect(result.summary.strategies[0].duplicateLookupKeyCount).toBe(1);
    expect(result.recordDiagnostics[0]).toMatchObject({
      status: "ambiguous",
      candidateCount: 2,
      candidateRowIndices: [1, 4],
      matchedLookupRowIndex: null,
    });
    expect(result.rows[0].department).toBe("");
  });

  it("caps candidate-reference previews without losing the exact candidate count", () => {
    const manyDuplicates = {
      ...lookup,
      rows: Array.from({ length: 25 }, (_, index) => ({
        id: "E001",
        department: `Department ${index}`,
        role: "Driver",
        email: `duplicate-${index}@test.com`,
      })),
    };
    const result = runLookup(
      { ...source, rows: [source.rows[0]] },
      [pair("employee_id", "id")],
      manyDuplicates,
      ["department"],
    );

    expect(result.recordDiagnostics[0].candidateCount).toBe(25);
    expect(result.recordDiagnostics[0].candidateRowIndices).toHaveLength(20);
    expect(result.recordDiagnostics[0].candidateReferencesTruncated).toBe(true);
  });

  it("preserves source rows, order, original values, and only selected return columns", () => {
    const originalRows = structuredClone(source.rows);
    const result = runLookup(
      source,
      [pair("employee_id", "id")],
      lookup,
      ["department"],
    );

    expect(result.rows).toHaveLength(source.rows.length);
    expect(result.rows.map((row) => row.employee_id)).toEqual(
      source.rows.map((row) => row.employee_id),
    );
    expect(result.rows.map((row) => row.name)).toEqual(
      source.rows.map((row) => row.name),
    );
    expect(source.rows).toEqual(originalRows);
    expect(result.columns).toEqual([...source.columns, "department"]);
    expect(result.summary).toMatchObject({
      totalSourceRows: 3,
      matchedCount: 2,
      ambiguousCount: 0,
      unmatchedCount: 1,
      outputRowCount: 3,
      rowCountPreserved: true,
    });
  });

  it("returns reconciled strategy counts for matched, ambiguous, and unmatched rows", () => {
    const duplicateLookup = {
      ...lookup,
      rows: [
        ...lookup.rows,
        { id: "E001", department: "Second", role: "Other", email: "other@test.com" },
      ],
    };
    const result = runLookup(
      source,
      [pair("employee_id", "id")],
      duplicateLookup,
      ["department"],
    );
    const summary = result.summary;

    expect(summary.matchedCount + summary.ambiguousCount + summary.unmatchedCount).toBe(
      summary.totalSourceRows,
    );
    expect(summary.strategies[0]).toMatchObject({
      attemptedSourceRows: 3,
      matchedCount: 1,
      ambiguousCount: 1,
    });
    expect(summary.outputRowCount).toBe(summary.totalSourceRows);
  });

  it("supports empty source and lookup datasets without changing row counts", () => {
    const emptySource = { ...source, rows: [] };
    expect(
      runLookup(emptySource, [pair("employee_id", "id")], lookup, ["department"])
        .rows,
    ).toEqual([]);
    const emptyLookup = { ...lookup, rows: [] };
    const result = runLookup(
      source,
      [pair("employee_id", "id")],
      emptyLookup,
      ["department"],
    );
    expect(result.rows).toHaveLength(source.rows.length);
    expect(result.rows.every((row) => row.department === "")).toBe(true);
    expect(result.summary.unmatchedCount).toBe(source.rows.length);
  });

  it("handles a 20,000-row lookup with one reusable index per strategy", () => {
    const size = 20_000;
    const largeSource = {
      id: "large-source",
      name: "large source",
      columns: ["key"],
      rows: Array.from({ length: size }, (_, index) => ({ key: `key-${index}` })),
    };
    const largeLookup = {
      id: "large-lookup",
      name: "large lookup",
      columns: ["lookup_key", "value"],
      rows: Array.from({ length: size }, (_, index) => ({
        lookup_key: `key-${index}`,
        value: index,
      })),
    };
    const result = runLookup(
      largeSource,
      [pair("key", "lookup_key")],
      largeLookup,
      ["value"],
    );

    expect(result.rows).toHaveLength(size);
    expect(result.rows[0].value).toBe(0);
    expect(result.rows[size - 1].value).toBe(size - 1);
    expect(result.summary.matchedCount).toBe(size);
  });

  it("rejects missing columns, incomplete strategies, invalid return columns, and collisions", () => {
    expect(() =>
      runLookup(source, [pair("missing", "id")], lookup, ["department"]),
    ).toThrow(/source key.*missing/i);
    expect(() =>
      runLookup(source, [pair("employee_id", "missing")], lookup, ["department"]),
    ).toThrow(/lookup key.*missing/i);
    expect(() =>
      runLookup(source, [{ sourceColumn: "", lookupColumn: "" }], lookup, [
        "department",
      ]),
    ).toThrow(/Primary strategy.*key pair/i);
    expect(() =>
      runLookup(source, [pair("employee_id", "id")], lookup, [
        "missing",
      ]),
    ).toThrow(/Lookup return.*missing/i);
    const lookupWithName = {
      ...lookup,
      columns: [...lookup.columns, "name"],
      rows: lookup.rows.map((row) => ({ ...row, name: "Lookup name" })),
    };
    expect(() =>
      runLookup(source, [pair("employee_id", "id")], lookupWithName, ["name"]),
    ).toThrow(/conflict with Source Dataset columns/i);
    expect(() =>
      runLookup(source, [pair("employee_id", "id")], lookup, []),
    ).toThrow(/select at least one/i);
  });

  it("rejects partial fallback strategies rather than silently skipping them", () => {
    expect(() =>
      runLookup(
        source,
        [pair("employee_id", "id")],
        lookup,
        ["department"],
        [[pair("", "email")]],
      ),
    ).toThrow(/Fallback 1 key pair 1/i);
  });

  it("rejects duplicate return columns and attempts to exclude unmatched records", () => {
    expect(() =>
      runLookup(source, [pair("employee_id", "id")], lookup, [
        "department",
        "department",
      ]),
    ).toThrow(/return columns must not contain duplicates/i);
    expect(() =>
      runLookup(
        source,
        [pair("employee_id", "id")],
        lookup,
        ["department"],
        [],
        { excludeUnmatched: true },
      ),
    ).toThrow(/always retained/i);
  });
});
