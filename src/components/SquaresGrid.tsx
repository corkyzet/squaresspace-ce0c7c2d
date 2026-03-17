import React from "react";
import { SquareCell } from "./SquareCell";

const WIN_ORDER = [5, 8, 6, 1, 7, 2, 4, 0, 9, 3];
const LOSE_ORDER = [4, 3, 0, 6, 2, 9, 7, 1, 8, 5];

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
          {/* Top header: empty corner + win digits */}
          <div className="flex items-center justify-center">
            <span className="font-mono-display text-[10px] text-muted-foreground">↓L\W→</span>
          </div>
          {WIN_ORDER.map((digit) => (
            <div key={`h-${digit}`} className="text-center font-mono-display text-xs text-primary py-2 font-semibold">
              {digit}
            </div>
          ))}

          {/* Rows */}
          {LOSE_ORDER.map((row) => (
            <React.Fragment key={row}>
              <div className="flex items-center justify-center font-mono-display text-xs text-secondary w-8 font-semibold">
                {row}
              </div>
              {WIN_ORDER.map((col) => (
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