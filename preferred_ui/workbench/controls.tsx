import type { ReactNode } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-xs font-medium text-foreground">{label}</span>
      {children}
      {hint && (
        <span className="block text-[11px] leading-snug text-muted-foreground">
          {hint}
        </span>
      )}
    </label>
  );
}

const controlClass =
  "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60";

export function SelectInput({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <select
      className={controlClass}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      className={controlClass}
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function CheckRow({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-transparent px-1 py-1 transition-colors hover:border-border">
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded border transition-colors",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input bg-background",
        )}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="min-w-0">
        <span className="block text-xs font-medium text-foreground">
          {label}
        </span>
        {description && (
          <span className="block text-[11px] leading-snug text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

export function ColumnPicker({
  columns,
  selected,
  onToggle,
  emptyLabel = "All columns",
}: {
  columns: string[];
  selected: string[];
  onToggle: (column: string) => void;
  emptyLabel?: string;
}) {
  if (columns.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground">No columns available.</p>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {selected.length === 0 && (
        <span className="rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground">
          {emptyLabel}
        </span>
      )}
      {columns.map((column) => {
        const active = selected.includes(column);
        return (
          <button
            key={column}
            type="button"
            onClick={() => onToggle(column)}
            aria-pressed={active}
            className={cn(
              "max-w-full truncate rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
            title={column}
          >
            {column}
          </button>
        );
      })}
    </div>
  );
}

export function RunButton({
  onClick,
  running,
  disabled,
  children,
}: {
  onClick: () => void;
  running?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      className="w-full"
      onClick={onClick}
      disabled={disabled || running}
    >
      {running ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
      {running ? "Running…" : children}
    </Button>
  );
}

export function FormNote({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "error";
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "rounded-lg border px-2.5 py-2 text-[11px] leading-snug",
        tone === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      {children}
    </p>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </p>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

export function AddRowButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 w-full border-dashed text-xs"
      onClick={onClick}
    >
      + {label}
    </Button>
  );
}

export function RemoveRowButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
      onClick={onClick}
      aria-label={label}
    >
      Remove
    </Button>
  );
}
