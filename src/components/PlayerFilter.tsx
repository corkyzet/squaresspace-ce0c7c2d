import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, X, Users, Search } from "lucide-react";

interface PlayerFilterProps {
  players: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function PlayerFilter({ players, selected, onChange }: PlayerFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const filtered = useMemo(
    () => players.filter((name) => name.toLowerCase().includes(search.toLowerCase())),
    [players, search]
  );

  const toggle = (name: string) => {
    onChange(
      selected.includes(name)
        ? selected.filter((n) => n !== name)
        : [...selected, name]
    );
  };

  return (
    <div ref={ref} className="relative px-4 py-2 border-b border-foreground/10 bg-background/80">
      <div
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full sm:w-auto px-3 py-1.5 rounded-sm text-xs font-mono-display bg-foreground/5 hover:bg-foreground/10 transition-all ring-1 ring-inset ring-foreground/10 cursor-text"
      >
        <Users className="w-3 h-3 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? "Filter by contestant..." : `${selected.length} selected — type to filter`}
          className="bg-transparent outline-none text-foreground/80 placeholder:text-muted-foreground flex-1 min-w-0 uppercase tracking-wider"
        />
        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map((name) => (
            <button
              key={name}
              onClick={() => toggle(name)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-mono-display bg-accent/15 text-accent ring-1 ring-accent/30 hover:bg-accent/25 transition-all"
            >
              {name}
              <X className="w-2.5 h-2.5" />
            </button>
          ))}
          <button
            onClick={() => onChange([])}
            className="px-2 py-0.5 rounded-sm text-[10px] font-mono-display text-muted-foreground hover:text-foreground transition-all"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 left-4 top-full mt-1 w-56 max-h-60 overflow-auto rounded-sm bg-background ring-1 ring-foreground/10 shadow-lg">
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No players found</p>
          )}
          {filtered.map((name) => (
            <button
              key={name}
              onClick={() => toggle(name)}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-foreground/5 transition-all flex items-center gap-2 ${
                selected.includes(name) ? "bg-accent/10 text-accent" : "text-foreground/80"
              }`}
            >
              <span className={`w-3 h-3 rounded-sm border flex items-center justify-center text-[8px] ${
                selected.includes(name)
                  ? "border-accent bg-accent text-background"
                  : "border-foreground/20"
              }`}>
                {selected.includes(name) && "✓"}
              </span>
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
