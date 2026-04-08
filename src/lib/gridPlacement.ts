export interface EntrantSlot {
  name: string;
  email: string;
  count: number;
}

export interface PlacedSquare {
  win_digit: number;
  lose_digit: number;
  owner_name: string | null;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Places entrants into a 10x10 grid with the constraint that
 * no person appears more than once in the same row or column.
 * Returns null if placement is impossible (should retry with a fresh shuffle).
 */
function tryPlace(entrants: EntrantSlot[]): PlacedSquare[] | null {
  const grid: (string | null)[][] = Array.from({ length: 10 }, () => Array(10).fill(null));
  const personRows = new Map<string, Set<number>>();
  const personCols = new Map<string, Set<number>>();

  // Build flat list of names to place, then shuffle
  const names: string[] = [];
  for (const e of entrants) {
    for (let i = 0; i < e.count; i++) {
      names.push(e.name);
    }
  }
  const shuffled = shuffle(names);

  for (const name of shuffled) {
    if (!personRows.has(name)) personRows.set(name, new Set());
    if (!personCols.has(name)) personCols.set(name, new Set());

    const usedRows = personRows.get(name)!;
    const usedCols = personCols.get(name)!;

    // Collect all empty cells where this person isn't already in the row or column
    const candidates: [number, number][] = [];
    for (let r = 0; r < 10; r++) {
      if (usedRows.has(r)) continue;
      for (let c = 0; c < 10; c++) {
        if (usedCols.has(c)) continue;
        if (grid[r][c] === null) {
          candidates.push([r, c]);
        }
      }
    }

    if (candidates.length === 0) return null;

    const [row, col] = candidates[Math.floor(Math.random() * candidates.length)];
    grid[row][col] = name;
    usedRows.add(row);
    usedCols.add(col);
  }

  // Flatten grid to square records
  const result: PlacedSquare[] = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      result.push({ win_digit: c, lose_digit: r, owner_name: grid[r][c] });
    }
  }
  return result;
}

/**
 * Randomize a 10x10 grid placing entrants with constraints.
 * Retries up to `maxAttempts` times if a shuffle produces an unsolvable order.
 */
export function randomizeGrid(entrants: EntrantSlot[], maxAttempts = 100): PlacedSquare[] {
  const totalBoxes = entrants.reduce((sum, e) => sum + e.count, 0);
  if (totalBoxes > 100) {
    throw new Error(`Too many boxes requested (${totalBoxes}). Max is 100.`);
  }

  for (let i = 0; i < maxAttempts; i++) {
    const result = tryPlace(entrants);
    if (result) return result;
  }

  throw new Error("Could not place all entrants after many attempts. Try reducing box counts.");
}

/** Shuffle digits 0-9 into a random order for row/column headers. */
export function randomizeDigitOrder(): number[] {
  return shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
}
