import { useState } from "react";
import { Check, Database, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkbench } from "@/store/workbench";

export function DatasetList() {
  const { datasets, activeId, selectDataset, renameDataset, removeDataset } =
    useWorkbench();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  if (datasets.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-2.5 py-3 text-center text-[11px] leading-snug text-muted-foreground">
        Nothing loaded yet. Add a file above to begin.
      </p>
    );
  }

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setDraft(name);
  };

  const commit = () => {
    if (editingId) renameDataset(editingId, draft);
    setEditingId(null);
  };

  return (
    <ul className="-mx-1 space-y-0.5">
      {datasets.map((dataset) => {
        const active = dataset.id === activeId;
        return (
          <li key={dataset.id}>
            <div
              className={cn(
                "group flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors",
                active ? "bg-accent" : "hover:bg-muted/70",
              )}
            >
              <Database
                className={cn(
                  "h-3.5 w-3.5 flex-none",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              />
              {editingId === dataset.id ? (
                <>
                  <input
                    autoFocus
                    className="h-6 min-w-0 flex-1 rounded border border-input bg-background px-1.5 text-xs outline-none focus:border-ring"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") commit();
                      if (event.key === "Escape") setEditingId(null);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={commit}
                    aria-label="Save name"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setEditingId(null)}
                    aria-label="Cancel rename"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => selectDataset(dataset.id)}
                    onDoubleClick={() => startEdit(dataset.id, dataset.name)}
                    className="min-w-0 flex-1 truncate text-left text-xs text-foreground"
                    title={`${dataset.name} — double-click to rename`}
                  >
                    {dataset.name}
                  </button>
                  <span className="numeric flex-none text-[10px] text-muted-foreground">
                    {dataset.rows.length.toLocaleString()}
                  </span>
                  <span className="flex-none opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground"
                      onClick={() => startEdit(dataset.id, dataset.name)}
                      aria-label={`Rename ${dataset.name}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeDataset(dataset.id)}
                      aria-label={`Remove ${dataset.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </span>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
