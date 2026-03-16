import { motion } from "framer-motion";

interface SquareCellProps {
  winDigit: number;
  loseDigit: number;
  owner: string | null;
  winCount: number;
  isAdmin: boolean;
  onCellClick: (w: number, l: number) => void;
  highlightOwner: string | null;
}

export function SquareCell({ winDigit, loseDigit, owner, winCount, isAdmin, onCellClick, highlightOwner }: SquareCellProps) {
  const isWinner = winCount > 0;
  const isEmpty = !owner;
  const isHighlighted = highlightOwner && owner === highlightOwner;

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
        aspect-square flex flex-col items-center justify-center rounded-sm
        ring-1 ring-inset transition-all duration-200 relative overflow-hidden p-0.5
        ${isWinner
          ? "bg-primary/20 ring-primary/50 winner-glow"
          : isEmpty
          ? "bg-foreground/5 ring-foreground/10 hover:bg-foreground/10"
          : "bg-foreground/5 ring-foreground/10"
        }
        ${isHighlighted ? "ring-accent/80 gold-glow bg-accent/10" : ""}
        ${isAdmin && isEmpty ? "cursor-pointer border-dashed" : isAdmin ? "cursor-pointer" : "cursor-default"}
      `}
    >
      {owner && (
        <span className="text-[7px] sm:text-[8px] leading-[1.15] text-foreground/80 text-center w-full overflow-hidden line-clamp-3">
          {owner}
        </span>
      )}
      {isWinner && (
        <span className="text-[7px] sm:text-[8px] font-mono-display font-bold text-primary mt-auto shrink-0">
          🏆{winCount}
        </span>
      )}
    </motion.button>
  );
}
