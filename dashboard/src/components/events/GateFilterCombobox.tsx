"use client";

import { useMemo, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type GateFilterOption = { id: string; name: string };

export function GateFilterCombobox({
  gates,
  value,
  onChange,
  className,
}: {
  gates: GateFilterOption[];
  value: string;
  onChange: (gateId: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const options = useMemo(
    () => [
      { value: "", label: "All gates" },
      ...gates.map((g) => ({ value: g.id.toLowerCase(), label: g.name })),
    ],
    [gates],
  );

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "All gates";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Filter by gate"
          className={cn(
            "h-8 min-w-[9rem] max-w-[12rem] justify-between gap-2 border-gv-border bg-gv-bg px-2.5 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-gray-200",
            className,
          )}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDownIcon className="size-3.5 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56 border-gv-border bg-gv-panel p-0 text-gray-200"
      >
        <div className="border-b border-gv-border-subtle p-2">
          <Input
            placeholder="Search gates…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            className="h-8 border-gv-border bg-gv-bg text-xs"
          />
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-gv-muted">No gates found</p>
          ) : (
            filtered.map((opt) => {
              const selected = value === opt.value;
              return (
                <DropdownMenuItem
                  key={opt.value || "all"}
                  onSelect={() => onChange(opt.value)}
                  className={cn(
                    "gap-2 text-xs focus:bg-white/5 focus:text-gray-100",
                    selected && "bg-sky-500/10 text-sky-300",
                  )}
                >
                  <CheckIcon className={cn("size-3.5 shrink-0", selected ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{opt.label}</span>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
