import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { JIGSAW_LEVELS, buildPuzzlePieces, canSnap, pieceEdges } from "./jigsawModel";
import type { JigsawLevel, JigsawPiece, JigsawPuzzle } from "./jigsawModel";

export { JIGSAW_LEVELS } from "./jigsawModel";
export type { JigsawLevel, JigsawPiece, JigsawPuzzle } from "./jigsawModel";

function loadPhoto(file: File) {
  return new Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }>(async (resolve, reject) => {
    try {
      if (typeof createImageBitmap !== "function") throw new Error("ImageBitmap unavailable");
      const bitmap = await createImageBitmap(file);
      resolve({ source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() });
    } catch {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => URL.revokeObjectURL(url) });
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Photo unavailable")); };
      image.src = url;
    }
  });
}

export async function photoToJigsaw(file: File, level: JigsawLevel): Promise<JigsawPuzzle> {
  const photo = await loadPhoto(file);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  const crop = Math.min(photo.width, photo.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 1024, 1024);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(photo.source, (photo.width - crop) / 2, (photo.height - crop) / 2, crop, crop, 0, 0, 1024, 1024);
  photo.release();
  return {
    rows: level.rows,
    cols: level.cols,
    image: canvas.toDataURL("image/jpeg", .9),
    hint: level.hint,
    pieces: buildPuzzlePieces(level.rows, level.cols),
  };
}

function piecePath(x: number, y: number, width: number, height: number, piece: Pick<JigsawPiece, "row" | "col">, rows: number, cols: number) {
  const path = new Path2D();
  const edges = pieceEdges(piece, rows, cols);
  const tab = Math.min(width, height) * .2;
  const edge = (transform: (along: number, outward: number) => readonly [number, number], sign: number) => {
    const point = (along: number, amount: number) => transform(along, sign * tab * amount);
    const line = (along: number, amount = 0) => path.lineTo(...point(along, amount));
    const curve = (firstAlong: number, firstAmount: number, secondAlong: number, secondAmount: number, endAlong: number, endAmount: number) => {
      path.bezierCurveTo(...point(firstAlong, firstAmount), ...point(secondAlong, secondAmount), ...point(endAlong, endAmount));
    };
    if (!sign) { line(1); return; }
    line(.35);
    // Narrow neck flowing into a round bulb gives a familiar, child-friendly
    // puzzle tab without the sharp peaks created by triangular joins.
    curve(.39, 0, .41, .12, .41, .34);
    curve(.41, .72, .45, 1, .5, 1);
    curve(.55, 1, .59, .72, .59, .34);
    curve(.59, .12, .61, 0, .65, 0);
    line(1);
  };
  path.moveTo(x, y);
  edge((along, outward) => [x + along * width, y - outward] as const, edges.top);
  edge((along, outward) => [x + width + outward, y + along * height] as const, edges.right);
  edge((along, outward) => [x + width - along * width, y + height + outward] as const, edges.bottom);
  edge((along, outward) => [x - outward, y + height - along * height] as const, edges.left);
  path.closePath();
  return path;
}

export async function jigsawFinishedImage(puzzle: JigsawPuzzle) {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Puzzle image unavailable"));
    image.src = puzzle.image;
  });
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) return puzzle.image;
  context.drawImage(image, 0, 0, 1024, 1024);
  const pieceWidth = 1024 / puzzle.cols;
  const pieceHeight = 1024 / puzzle.rows;
  context.strokeStyle = "rgba(20,25,58,.38)";
  context.lineWidth = Math.max(2, 7 - puzzle.cols * .45);
  puzzle.pieces.forEach((piece) => context.stroke(piecePath(piece.col * pieceWidth, piece.row * pieceHeight, pieceWidth, pieceHeight, piece, puzzle.rows, puzzle.cols)));
  return canvas.toDataURL("image/png");
}

type Layout = {
  width: number;
  height: number;
  boardX: number;
  boardY: number;
  boardSize: number;
  trayX: number;
  trayY: number;
  trayWidth: number;
  trayHeight: number;
  trayCols: number;
  trayRows: number;
};

type PieceRect = { x: number; y: number; width: number; height: number };
type DragPiece = { id: number; x: number; y: number };

function makeLayout(width: number, height: number, count: number): Layout {
  const landscape = width > height * 1.12;
  if (landscape) {
    const boardSize = Math.max(140, Math.min(height - 34, width * .72));
    const boardX = 16;
    const trayX = boardX + boardSize + 18;
    const trayWidth = Math.max(100, width - trayX - 16);
    const trayCols = count <= 16 ? 2 : count <= 36 ? 3 : 4;
    return { width, height, boardX, boardY: (height - boardSize) / 2, boardSize, trayX, trayY: 16, trayWidth, trayHeight: height - 32, trayCols, trayRows: Math.ceil(count / trayCols) };
  }
  const boardSize = Math.max(140, Math.min(width - 24, height * .69));
  const trayY = 12 + boardSize + 14;
  const trayCols = count <= 16 ? 4 : count <= 36 ? 6 : 8;
  return { width, height, boardX: (width - boardSize) / 2, boardY: 12, boardSize, trayX: 12, trayY, trayWidth: width - 24, trayHeight: Math.max(70, height - trayY - 12), trayCols, trayRows: Math.ceil(count / trayCols) };
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, Math.min(radius, width / 2, height / 2));
}

type JigsawGameProps = {
  puzzle: JigsawPuzzle;
  version: string;
  onChange: (puzzle: JigsawPuzzle) => void;
  onBack: () => void;
  onSave: () => void;
  onNewPhoto: () => void;
  onComplete: () => void;
};

export default function JigsawGame({ puzzle, version, onChange, onBack, onSave, onNewPhoto, onComplete }: JigsawGameProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement | null>(null);
  const layout = useRef<Layout | null>(null);
  const slots = useRef(new Map<number, PieceRect>());
  const drag = useRef<DragPiece | null>(null);
  const drawFrame = useRef<number | null>(null);
  const [hint, setHint] = useState(puzzle.hint);
  const placed = puzzle.pieces.filter((piece) => piece.placed).length;

  const queueDraw = () => {
    if (drawFrame.current !== null) return;
    drawFrame.current = window.requestAnimationFrame(() => {
      drawFrame.current = null;
      draw();
    });
  };

  function drawPiece(context: CanvasRenderingContext2D, piece: JigsawPiece, x: number, y: number, width: number, height: number, shadow: boolean) {
    if (!image.current) return;
    const path = piecePath(x, y, width, height, piece, puzzle.rows, puzzle.cols);
    context.save();
    if (shadow) {
      context.shadowColor = "rgba(13,18,57,.34)";
      context.shadowBlur = Math.max(5, width * .12);
      context.shadowOffsetY = Math.max(3, height * .06);
      context.fillStyle = "white";
      context.fill(path);
      context.shadowColor = "transparent";
    }
    context.clip(path);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image.current, x - piece.col * width, y - piece.row * height, width * puzzle.cols, height * puzzle.rows);
    context.restore();
    context.strokeStyle = shadow ? "rgba(255,255,255,.9)" : "rgba(29,33,68,.42)";
    context.lineWidth = Math.max(.75, Math.min(2.2, width * .025));
    context.stroke(path);
  }

  function draw() {
    const element = canvas.current;
    const box = stage.current;
    if (!element || !box) return;
    const width = Math.max(1, box.clientWidth);
    const height = Math.max(1, box.clientHeight);
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    if (element.width !== Math.round(width * ratio) || element.height !== Math.round(height * ratio)) {
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
    }
    const context = element.getContext("2d", { alpha: false });
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const nextLayout = makeLayout(width, height, puzzle.pieces.length);
    layout.current = nextLayout;
    const { boardX, boardY, boardSize, trayX, trayY, trayWidth, trayHeight, trayCols, trayRows } = nextLayout;
    context.fillStyle = "#eef1ff";
    context.fillRect(0, 0, width, height);

    roundRect(context, boardX - 5, boardY - 5, boardSize + 10, boardSize + 10, 18);
    context.fillStyle = "#171b45";
    context.fill();
    context.save();
    context.globalAlpha = hint ? .23 : .055;
    if (image.current) context.drawImage(image.current, boardX, boardY, boardSize, boardSize);
    context.restore();

    const pieceWidth = boardSize / puzzle.cols;
    const pieceHeight = boardSize / puzzle.rows;
    puzzle.pieces.filter((piece) => piece.placed).forEach((piece) => {
      drawPiece(context, piece, boardX + piece.col * pieceWidth, boardY + piece.row * pieceHeight, pieceWidth, pieceHeight, false);
    });

    roundRect(context, trayX, trayY, trayWidth, trayHeight, 18);
    context.fillStyle = "rgba(255,255,255,.78)";
    context.fill();
    context.strokeStyle = "rgba(75,62,160,.13)";
    context.lineWidth = 1;
    context.stroke();
    const slotWidth = trayWidth / trayCols;
    const slotHeight = trayHeight / trayRows;
    slots.current.clear();
    puzzle.pieces.filter((piece) => !piece.placed && drag.current?.id !== piece.id).forEach((piece) => {
      const slotCol = piece.slot % trayCols;
      const slotRow = Math.floor(piece.slot / trayCols);
      const scale = Math.min(.92, slotWidth / pieceWidth * .72, slotHeight / pieceHeight * .72);
      const displayWidth = pieceWidth * scale;
      const displayHeight = pieceHeight * scale;
      const x = trayX + slotCol * slotWidth + (slotWidth - displayWidth) / 2;
      const y = trayY + slotRow * slotHeight + (slotHeight - displayHeight) / 2;
      slots.current.set(piece.id, { x: x - displayWidth * .16, y: y - displayHeight * .16, width: displayWidth * 1.32, height: displayHeight * 1.32 });
      drawPiece(context, piece, x, y, displayWidth, displayHeight, true);
    });

    const moving = drag.current;
    if (moving) {
      const piece = puzzle.pieces.find((item) => item.id === moving.id);
      if (piece) drawPiece(context, piece, moving.x, moving.y, pieceWidth, pieceHeight, true);
    }
  }

  useEffect(() => {
    const nextImage = new Image();
    nextImage.onload = () => { image.current = nextImage; queueDraw(); };
    nextImage.src = puzzle.image;
    return () => { image.current = null; };
  }, [puzzle.image]);

  useEffect(() => {
    queueDraw();
  }, [puzzle, hint]);

  useEffect(() => {
    if (!stage.current) return;
    const observer = new ResizeObserver(queueDraw);
    observer.observe(stage.current);
    queueDraw();
    return () => {
      observer.disconnect();
      if (drawFrame.current !== null) window.cancelAnimationFrame(drawFrame.current);
    };
  }, []);

  function pointerPosition(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function pointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const point = pointerPosition(event);
    const piece = [...puzzle.pieces].reverse().find((item) => {
      if (item.placed) return false;
      const rect = slots.current.get(item.id);
      return rect && point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
    });
    const currentLayout = layout.current;
    if (!piece || !currentLayout) return;
    const pieceWidth = currentLayout.boardSize / puzzle.cols;
    const pieceHeight = currentLayout.boardSize / puzzle.rows;
    drag.current = { id: piece.id, x: point.x - pieceWidth / 2, y: point.y - pieceHeight / 2 };
    event.currentTarget.setPointerCapture(event.pointerId);
    queueDraw();
  }

  function pointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const moving = drag.current;
    const currentLayout = layout.current;
    if (!moving || !currentLayout) return;
    const point = pointerPosition(event);
    moving.x = point.x - currentLayout.boardSize / puzzle.cols / 2;
    moving.y = point.y - currentLayout.boardSize / puzzle.rows / 2;
    queueDraw();
  }

  function pointerEnd(event: ReactPointerEvent<HTMLCanvasElement>) {
    const moving = drag.current;
    const currentLayout = layout.current;
    if (!moving || !currentLayout) return;
    const piece = puzzle.pieces.find((item) => item.id === moving.id);
    drag.current = null;
    if (!piece) { queueDraw(); return; }
    const pieceWidth = currentLayout.boardSize / puzzle.cols;
    const pieceHeight = currentLayout.boardSize / puzzle.rows;
    const targetX = currentLayout.boardX + piece.col * pieceWidth;
    const targetY = currentLayout.boardY + piece.row * pieceHeight;
    if (canSnap(moving.x, moving.y, targetX, targetY, pieceWidth, pieceHeight)) {
      // Do not let a queued drag frame repaint the old, unplaced puzzle after
      // React accepts the drop. The puzzle-change effect schedules the fresh frame.
      if (drawFrame.current !== null) {
        window.cancelAnimationFrame(drawFrame.current);
        drawFrame.current = null;
      }
      const pieces = puzzle.pieces.map((item) => item.id === piece.id ? { ...item, placed: true } : item);
      onChange({ ...puzzle, pieces, hint });
      if (pieces.every((item) => item.placed)) window.setTimeout(onComplete, 220);
    } else queueDraw();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function toggleHint() {
    const next = !hint;
    setHint(next);
    onChange({ ...puzzle, hint: next });
  }

  return <div className="game jigsaw-game">
    <header className="game-head jigsaw-head">
      <button className="back" onClick={onBack} aria-label="Back">‹</button>
      <div className="mini-brand"><span className="logo" aria-hidden="true"><img src="./comet-icon-192.png" alt="" /></span><span className="mini-copy"><strong>Shay &amp; Zay <span>PlayLab</span></strong><small>Jigsaw studio</small></span></div>
      <div className="jigsaw-progress"><span><b>{placed}</b> / {puzzle.pieces.length} pieces</span><i><b style={{ width: `${placed / puzzle.pieces.length * 100}%` }}/></i></div>
      <button className="save-game" onClick={onSave}><b>↓</b><span>Save progress</span></button>
      <button className="new" onClick={onNewPhoto}>📷 <span>New photo</span></button>
      <span className="app-version game-version">{version}</span>
    </header>
    <section className="jigsaw-play">
      <div className="jigsaw-toolbar">
        <div><span className="mission-label">Your mission</span><strong>Build the picture</strong><small>Drag each piece from the tray and snap it into place.</small></div>
        <button className={hint ? "active" : ""} onClick={toggleHint}><span>👁️</span><b>Picture hint</b><small>{hint ? "On" : "Off"}</small></button>
      </div>
      <div ref={stage} className="jigsaw-stage">
        <canvas ref={canvas} className="jigsaw-canvas" role="img" aria-label={`Jigsaw puzzle with ${puzzle.pieces.length} pieces, ${placed} placed`}
          onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}/>
      </div>
    </section>
  </div>;
}
