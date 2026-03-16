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

export function SquareCell({ winDigit, loseDigit, owner, winCount, isAdmin, onCellClick, highlightOwners }: SquareCellProps) {
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
        aspect-square flex flex-col items-center justify-center rounded-sm
        ring-1 ring-inset transition-all duration-200 relative overflow-hidden p-0.5
        ${isHighlighted
          ? "bg-accent/25 ring-2 ring-accent shadow-[0_0_8px_hsl(var(--accent)/0.4)] scale-105 z-10"
          : isWinner
          ? "bg-primary/20 ring-primary/50 winner-glow"
          : isEmpty
          ? "bg-foreground/5 ring-foreground/10 hover:bg-foreground/10"
          : "bg-foreground/5 ring-foreground/10"
        }
        ${isDimmed ? "opacity-25" : ""}
        ${isAdmin && isEmpty ? "cursor-pointer border-dashed" : isAdmin ? "cursor-pointer" : "cursor-default"}
      `}
    >
      {owner && (
        <span className={`text-[7px] sm:text-[10px] leading-[1.2] text-center w-full overflow-hidden flex flex-wrap justify-center gap-x-[3px] ${
          isHighlighted ? "text-accent font-semibold" : "text-foreground/80"
        }`}>
          {owner.split(' ').map((word, i) => (
            <span key={i} className="whitespace-nowrap">
              {word}
            </span>
          ))}
        </span>
      )}
      {isWinner && (
        <span className={`text-[6px] sm:text-[8px] font-mono-display font-bold mt-auto shrink-0 ${
          isHighlighted ? "text-accent" : "text-primary"
        }`}>
          🏆{winCount}
        </span>
      )}
    </motion.button>
  );
}
