import test from "node:test";
import assert from "node:assert/strict";
import { classifyOverlap, overlapRatio } from "../wwwroot/js/eraser/eraser-judgement.js";
import { resolveCollisionForTest, stepPhysics } from "../wwwroot/js/eraser/eraser-physics.js";
import { createGameState } from "../wwwroot/js/eraser/eraser-state.js";

function box(x, y, angle = 0, width = 100, height = 50) {
  return { x, y, angle, width, height };
}

test("non-overlapping erasers do not win; contact below 30% is not a win", () => {
  assert.equal(overlapRatio(box(0, 0), box(101, 0)), 0);
  assert.ok(overlapRatio(box(0, 0), box(71, 0)) < 0.30);
  assert.equal(classifyOverlap(overlapRatio(box(0, 0), box(71, 0))), "near");
});

test("30% overlap is a partial win and 70% overlap is a perfect stack", () => {
  const partial = overlapRatio(box(0, 0), box(70, 0));
  const nearPerfect = overlapRatio(box(0, 0), box(30, 0));
  assert.ok(Math.abs(partial - 0.30) < 1e-8);
  assert.equal(classifyOverlap(partial), "partial");
  assert.ok(Math.abs(nearPerfect - 0.70) < 1e-8);
  assert.equal(classifyOverlap(nearPerfect), "perfect");
});

test("rotated rectangles use their actual shared area", () => {
  const ratio = overlapRatio(box(0, 0, Math.PI / 4), box(0, 0, Math.PI / 4));
  assert.ok(Math.abs(ratio - 1) < 1e-8);
  assert.equal(classifyOverlap(ratio), "perfect");
});

test("weak side contact does not trigger the climb or an immediate winner", () => {
  const state = createGameState(400, 300);
  const [mover, target] = state.pieces;
  mover.x = 130; mover.y = 150; mover.vx = 130; mover.vy = 0;
  target.x = 210; target.y = 150;
  state.turn = 0;
  assert.equal(resolveCollisionForTest(state), true);
  assert.equal(mover.ridingId, null);
  assert.equal(state.gameOver, false);
  assert.equal(state.winner, null);
});

test("strong centered impact starts a climb but defers the result until both pieces rest", () => {
  const state = createGameState(400, 300);
  const [mover, target] = state.pieces;
  mover.x = 130; mover.y = 150; mover.vx = 360; mover.vy = 0;
  target.x = 210; target.y = 150;
  state.turn = 0;
  assert.equal(resolveCollisionForTest(state), true);
  assert.equal(mover.ridingId, target.id);
  assert.equal(state.gameOver, false);
  assert.equal(state.pendingResolution, false);
});

test("motion ends before the game layer resolves overlap", () => {
  const state = createGameState(400, 300);
  state.turn = 0;
  state.moving = true;
  state.pieces[0].vx = 100;
  let completed = false;
  for (let frame = 0; frame < 700 && !completed; frame++) completed = stepPhysics(state, 1 / 60);
  assert.equal(completed, true);
  assert.equal(state.moving, false);
  assert.equal(state.pendingResolution, true);
  assert.equal(state.gameOver, false);
});
