import React from "react";
import { SquareCell } from "./SquareCell";

interface SquaresGridProps {
  findOwner: (w: number, l: number) => string | null;
  getWinCount: (w: number, l: number) => number;
  isAdmin: boolean;
  onCellClick: (w: number, l: number) => void;
  highlightOwners: string[];
}

export function SquaresGrid({ findOwner, getWinCount, isAdmin, onCellClick, highlightOwners }: SquaresGridProps) {
  return (
    <div className="overflow-auto scrollbar-hide">
      <div className="min-w-[500px] p-4">
        {/* Title row */}
        <div className="text-center mb-2">
          <span className="font-mono-display text-xs text-primary uppercase tracking-widest">
            Winner Digit →
          </span>
        </div>

        <div className="grid grid-cols-11 gap-1">
          {/* Top header: empty corner + 0-9 */}
          <div className="flex items-center justify-center">
            <span className="font-mono-display text-[10px] text-muted-foreground">↓L\W→</span>
          </div>
          {[...Array(10)].map((_, i) => (
            <div key={`h-${i}`} className="text-center font-mono-display text-xs text-primary py-2 font-semibold">
              {i}
            </div>
          ))}

          {/* Rows */}
          {[...Array(10)].map((_, row) => (
            <React.Fragment key={row}>
              <div className="flex items-center justify-center font-mono-display text-xs text-secondary w-8 font-semibold">
                {row}
              </div>
              {[...Array(10)].map((_, col) => (
                <SquareCell
                  key={`${col}-${row}`}
                  winDigit={col}
                  loseDigit={row}
                  owner={findOwner(col, row)}
                  winCount={getWinCount(col, row)}
                  isAdmin={isAdmin}
                  onCellClick={onCellClick}
                  highlightOwners={highlightOwners}
                />
              ))}
            </React.Fragment>
          ))}
        </div>

        {/* Left label */}
        <div className="text-center mt-2">
          <span className="font-mono-display text-xs text-secondary uppercase tracking-widest">
            ← Loser Digit
          </span>
        </div>
      </div>
    </div>
  );
}
