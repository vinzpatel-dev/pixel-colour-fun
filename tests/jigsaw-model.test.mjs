import assert from "node:assert/strict";
import test from "node:test";
import { JIGSAW_LEVELS, buildPuzzlePieces, canSnap, pieceEdges } from "../src/jigsawModel.ts";

test("jigsaw levels contain the requested piece counts", () => {
  assert.deepEqual(JIGSAW_LEVELS.map((level) => level.rows * level.cols), [9, 16, 36, 64]);
});

test("every puzzle gets one unique shuffled tray slot per piece", () => {
  for (const level of JIGSAW_LEVELS) {
    let seed = 7;
    const random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
    const pieces = buildPuzzlePieces(level.rows, level.cols, random);
    assert.equal(pieces.length, level.rows * level.cols);
    assert.deepEqual([...pieces.map((piece) => piece.slot)].sort((a, b) => a - b), Array.from({ length: pieces.length }, (_, index) => index));
    assert.ok(pieces.every((piece) => !piece.placed));
  }
});

test("neighbouring jigsaw edges are complementary and outside edges are flat", () => {
  const rows = 8;
  const cols = 8;
  const pieces = buildPuzzlePieces(rows, cols, () => .5);
  for (const piece of pieces) {
    const edges = pieceEdges(piece, rows, cols);
    if (piece.col === 0) assert.equal(edges.left, 0);
    if (piece.row === 0) assert.equal(edges.top, 0);
    if (piece.col === cols - 1) assert.equal(edges.right, 0);
    else assert.equal(edges.right, -pieceEdges(pieces[piece.id + 1], rows, cols).left);
    if (piece.row === rows - 1) assert.equal(edges.bottom, 0);
    else assert.equal(edges.bottom, -pieceEdges(pieces[piece.id + cols], rows, cols).top);
  }
});

test("magnetic snap accepts a nearby piece and rejects a distant drop", () => {
  assert.equal(canSnap(108, 112, 100, 100, 80, 80), true);
  assert.equal(canSnap(155, 155, 100, 100, 80, 80), false);
});

test("placed-piece progress survives offline JSON serialization", () => {
  const puzzle = { rows: 4, cols: 4, image: "data:image/jpeg;base64,test", hint: true, pieces: buildPuzzlePieces(4, 4, () => .4) };
  puzzle.pieces[2].placed = true;
  puzzle.pieces[9].placed = true;
  const restored = JSON.parse(JSON.stringify(puzzle));
  assert.equal(restored.pieces.filter((piece) => piece.placed).length, 2);
  assert.equal(restored.pieces.length, 16);
});
