export type JigsawLevel = {
  name: string;
  sub: string;
  rows: number;
  cols: number;
  icon: string;
  hint: boolean;
};

export type JigsawPiece = {
  id: number;
  row: number;
  col: number;
  slot: number;
  placed: boolean;
};

export type JigsawPuzzle = {
  rows: number;
  cols: number;
  image: string;
  pieces: JigsawPiece[];
  hint: boolean;
};

export const JIGSAW_LEVELS: JigsawLevel[] = [
  { name: "Starter", sub: "3 × 3 · Nice and easy", rows: 3, cols: 3, icon: "●", hint: true },
  { name: "Fun", sub: "4 × 4 · A little challenge", rows: 4, cols: 4, icon: "◆", hint: true },
  { name: "Tricky", sub: "6 × 6 · Puzzle pro", rows: 6, cols: 6, icon: "✦", hint: false },
  { name: "Expert", sub: "8 × 8 · Maximum pieces", rows: 8, cols: 8, icon: "✺", hint: false },
];

export function shuffledSlots(count: number, random = Math.random) {
  const slots = Array.from({ length: count }, (_, index) => index);
  for (let index = slots.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [slots[index], slots[swap]] = [slots[swap], slots[index]];
  }
  return slots;
}

export function buildPuzzlePieces(rows: number, cols: number, random = Math.random): JigsawPiece[] {
  const slots = shuffledSlots(rows * cols, random);
  return Array.from({ length: rows * cols }, (_, id) => ({
    id,
    row: Math.floor(id / cols),
    col: id % cols,
    slot: slots[id],
    placed: false,
  }));
}

function edgeSign(row: number, col: number, salt: number) {
  return ((row * 31 + col * 17 + salt * 13) & 1) ? 1 : -1;
}

export function pieceEdges(piece: Pick<JigsawPiece, "row" | "col">, rows: number, cols: number) {
  return {
    top: piece.row === 0 ? 0 : -edgeSign(piece.row - 1, piece.col, 1),
    right: piece.col === cols - 1 ? 0 : edgeSign(piece.row, piece.col, 2),
    bottom: piece.row === rows - 1 ? 0 : edgeSign(piece.row, piece.col, 1),
    left: piece.col === 0 ? 0 : -edgeSign(piece.row, piece.col - 1, 2),
  };
}

export function canSnap(pieceX: number, pieceY: number, targetX: number, targetY: number, pieceWidth: number, pieceHeight: number) {
  const distance = Math.hypot(pieceX - targetX, pieceY - targetY);
  const snapDistance = Math.max(22, Math.min(pieceWidth, pieceHeight) * .48);
  return distance <= snapDistance;
}
