import React from "react";
import { motion } from "framer-motion";

interface SquareCellProps {
  winDigit: number;
  loseDigit: number;
  owner: string | null;
  winCount: number;
  isAdmin: boolean;
  onCellClick: (w: number, l: number) => void;
  highlightOwners: string[];
}

export const SquareCell = React.memo(function SquareCell({ winDigit, loseDigit, owner, winCount, isAdmin, onCellClick, highlightOwners }: SquareCellProps) {
  const isWinner = winCount > 0;
  const isEmpty = !owner;
  const hasFilter = highlightOwners.length > 0;
  const isHighlighted = hasFilter && owner != null && highlightOwners.includes(owner);
  const isDimmed = hasFilter && !isHighlighted;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: (winDigit * 10 + loseDigit) * 0.005,
        duration: 0.3,
        ease: [0.2, 0.8, 0.2, 1],
      }}
      whileTap={{ scale: 0.98 }}
      onClick={() => isAdmin && onCellClick(winDigit, loseDigit)}
      className={`
        aspect-square flex flex-col items-center justify-center rounded-md
        border transition-all duration-200 relative overflow-hidden p-0.5
        ${isHighlighted
          ? "bg-primary/20 border-primary shadow-[0_0_10px_hsl(var(--primary)/0.3)] scale-105 z-10"
          : isWinner
          ? "bg-accent/15 border-accent/40 winner-glow"
          : isEmpty
          ? "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]"
          : "bg-white/[0.03] border-white/[0.06]"
        }
        ${isDimmed ? "opacity-20" : ""}
        ${isAdmin && isEmpty ? "cursor-pointer border-dashed" : isAdmin ? "cursor-pointer" : "cursor-default"}
      `}
    >
      {owner && (
        <span className={`text-[5px] sm:text-[10px] leading-[1.1] text-center w-full overflow-hidden flex flex-wrap justify-center gap-x-[2px] sm:gap-x-[3px] ${
          isHighlighted ? "text-primary font-semibold" : "text-foreground/80"
        }`}>
          {owner.split(' ').map((word, i) => (
            <span key={i} className="whitespace-nowrap">
              {word}
            </span>
          ))}
        </span>
      )}
      {isWinner && (
        <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 text-[6px] sm:text-[8px] font-mono-display font-bold ${
          isHighlighted ? "text-primary" : "text-accent"
        }`}>
          🏆{winCount}
        </span>
      )}
    </motion.button>
  );
});
