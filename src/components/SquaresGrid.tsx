import React from "react";
import { SquareCell } from "./SquareCell";

interface SquaresGridProps {
  findOwner: (w: number, l: number) => string | null;
  getWinCount: (w: number, l: number) => number;
  highlightOwners: string[];
  winOrder: number[];
  loseOrder: number[];
}

export const SquaresGrid = React.memo(function SquaresGrid({ findOwner, getWinCount, highlightOwners, winOrder, loseOrder }: SquaresGridProps) {
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
          {winOrder.map((digit) => (
            <div key={`h-${digit}`} className="text-center font-mono-display text-xs text-primary py-2 font-semibold">
              {digit}
            </div>
          ))}

          {/* Rows */}
          {loseOrder.map((row) => (
            <React.Fragment key={row}>
              <div className="flex items-center justify-center font-mono-display text-xs text-secondary w-8 font-semibold">
                {row}
              </div>
              {winOrder.map((col) => (
                <SquareCell
                  key={`${col}-${row}`}
                  winDigit={col}
                  loseDigit={row}
                  owner={findOwner(col, row)}
                  winCount={getWinCount(col, row)}
                  isAdmin={false}
                  onCellClick={() => {}}
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
});