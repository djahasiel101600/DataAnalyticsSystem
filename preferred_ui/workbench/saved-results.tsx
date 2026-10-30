import { useState } from "react";
import { Bookmark, FolderOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWorkbench } from "@/store/workbench";

const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function SavedResults() {
  const { result, saved, saveResult, loadSaved, removeSaved } = useWorkbench();
  const [name, setName] = useState("");

  const save = () => {
    const outcome = saveResult(name);
    if (!outcome.ok) {
      toast.error(outcome.error ?? "Could not save.");
      return;
    }
    toast.success(`Saved "${name.trim()}".`);
    setName("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <input
          className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
          value={name}
          placeholder="Name this result"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && save()}
          disabled={!result}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          onClick={save}
          disabled={!result || !name.trim()}
          aria-label="Save result"
        >
          <Bookmark className="h-3.5 w-3.5" />
        </Button>
      </div>

      {saved.length === 0 ? (
        <p className="text-[11px] leading-snug text-muted-foreground">
          {result
            ? "Save a result to reuse it after a refresh."
            : "Run an operation, then save the result here."}
        </p>
      ) : (
        <ul className="space-y-0.5">
          {saved.map((item) => (
            <li
              key={item.id}
              className="group flex items-center gap-1.5 rounded-lg px-1 py-1 hover:bg-muted/70"
            >
              <button
                type="button"
                onClick={() => {
                  loadSaved(item.id);
                  toast.success(`Loaded "${item.name}".`);
                }}
                className="min-w-0 flex-1 text-left"
                title={`Load ${item.name}`}
              >
                <span className="block truncate text-xs text-foreground">
                  {item.name}
                </span>
                <span className="numeric block text-[10px] text-muted-foreground">
                  {item.rowCount.toLocaleString()} rows ·{" "}
                  {dateFormat.format(new Date(item.createdAt))}
                </span>
              </button>
              <FolderOpen className="h-3 w-3 flex-none text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 flex-none p-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeSaved(item.id)}
                aria-label={`Delete ${item.name}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
