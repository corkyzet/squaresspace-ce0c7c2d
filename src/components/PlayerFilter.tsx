import { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Users } from "lucide-react";

interface PlayerFilterProps {
  players: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function PlayerFilter({ players, selected, onChange }: PlayerFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (name: string) => {
    onChange(
      selected.includes(name)
        ? selected.filter((n) => n !== name)
        : [...selected, name]
    );
  };

  return (
    <div ref={ref} className="relative px-4 py-2 border-b border-foreground/10 bg-background/80">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full sm:w-auto px-3 py-1.5 rounded-sm text-xs font-mono-display uppercase tracking-wider bg-foreground/5 hover:bg-foreground/10 transition-all ring-1 ring-inset ring-foreground/10"
      >
        <Users className="w-3 h-3 text-muted-foreground" />
        <span className="text-foreground/80">
          {selected.length === 0
            ? "Filter by player"
            : `${selected.length} selected`}
        </span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

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
          {players.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No players found</p>
          )}
          {players.map((name) => (
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
