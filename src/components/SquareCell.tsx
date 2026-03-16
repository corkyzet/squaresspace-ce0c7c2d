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
        aspect-square flex flex-col items-end justify-start p-1 rounded-sm
        ring-1 ring-inset transition-all duration-200 relative overflow-hidden
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
        <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-foreground/80 leading-tight break-all text-right">
          {owner}
        </span>
      )}
      {isWinner && (
        <div className="absolute bottom-0.5 left-0.5 flex items-center gap-0.5">
          <span className="text-[8px] sm:text-[9px] font-mono-display font-bold text-primary">
            🏆×{winCount}
          </span>
        </div>
      )}
    </motion.button>
  );
}
