import { BOARD, livingPieces, pieceMass, pieceRadius } from "./alkagi-state.js";

const FRICTION = 3.45;
const RESTITUTION = 0.91;
const STOP_SPEED = 7;

export function stepPhysics(game, elapsedSeconds) {
  const steps = Math.max(1, Math.ceil(elapsedSeconds / (1 / 120)));
  const dt = Math.min(elapsedSeconds, 0.05) / steps;

  for (let step = 0; step < steps; step += 1) {
    advanceEffects(game, dt);
    for (const piece of livingPieces(game)) {
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      const friction = Math.exp(-FRICTION * dt);
      piece.vx *= friction;
      piece.vy *= friction;
      if (Math.hypot(piece.vx, piece.vy) < STOP_SPEED) piece.vx = piece.vy = 0;
    }

    resolveCollisions(game);
    removePiecesOutsideBoard(game);
  }

  game.isMoving = livingPieces(game).some((piece) => piece.vx !== 0 || piece.vy !== 0) || game.fallingPieces.length > 0;
  return !game.isMoving;
}

function advanceEffects(game, dt) {
  for (const effect of game.impactEffects) effect.elapsed += dt;
  game.impactEffects = game.impactEffects.filter((effect) => effect.elapsed < effect.duration);
  if (game.screenShake) {
    game.screenShake.elapsed += dt;
    if (game.screenShake.elapsed >= game.screenShake.duration) game.screenShake = null;
  }
  for (const [key, remaining] of game.impactCooldowns) {
    if (remaining <= dt) game.impactCooldowns.delete(key);
    else game.impactCooldowns.set(key, remaining - dt);
  }
  for (const falling of game.fallingPieces) falling.elapsed += dt;
  game.fallingPieces = game.fallingPieces.filter((falling) => falling.elapsed < falling.duration);
}

function resolveCollisions(game) {
  const pieces = livingPieces(game);
  for (let index = 0; index < pieces.length; index += 1) {
    const first = pieces[index];
    for (let otherIndex = index + 1; otherIndex < pieces.length; otherIndex += 1) {
      const second = pieces[otherIndex];
      let dx = second.x - first.x;
      let dy = second.y - first.y;
      let distance = Math.hypot(dx, dy);
      const firstRadius = pieceRadius(first);
      const secondRadius = pieceRadius(second);
      const diameter = firstRadius + secondRadius;
      if (distance >= diameter) continue;

      if (distance < 0.001) {
        dx = first.id < second.id ? 1 : -1;
        dy = 0;
        distance = 1;
      }
      const nx = dx / distance;
      const ny = dy / distance;
      const overlap = diameter - distance;
      const firstInverseMass = 1 / pieceMass(first);
      const secondInverseMass = 1 / pieceMass(second);
      const inverseMassSum = firstInverseMass + secondInverseMass;
      const correction = Math.max(0, overlap - 0.01) / inverseMassSum;
      first.x -= nx * correction * firstInverseMass;
      first.y -= ny * correction * firstInverseMass;
      second.x += nx * correction * secondInverseMass;
      second.y += ny * correction * secondInverseMass;

      const relativeNormalSpeed = (second.vx - first.vx) * nx + (second.vy - first.vy) * ny;
      if (relativeNormalSpeed >= 0) continue;
      const impulse = -(1 + RESTITUTION) * relativeNormalSpeed / inverseMassSum;
      first.vx -= impulse * firstInverseMass * nx;
      first.vy -= impulse * firstInverseMass * ny;
      second.vx += impulse * secondInverseMass * nx;
      second.vy += impulse * secondInverseMass * ny;
      registerImpact(game, first, second, impulse, (first.x + second.x) / 2, (first.y + second.y) / 2);
    }
  }
}

function removePiecesOutsideBoard(game) {
  for (const piece of game.pieces) {
    if (!piece.alive) continue;
    const pieceEdge = pieceRadius(piece);
    if (piece.x < BOARD.left + pieceEdge || piece.x > BOARD.right - pieceEdge || piece.y < BOARD.top + pieceEdge || piece.y > BOARD.bottom - pieceEdge) {
      piece.alive = false;
      const dx = piece.x < BOARD.left + pieceEdge ? -1 : piece.x > BOARD.right - pieceEdge ? 1 : 0;
      const dy = piece.y < BOARD.top + pieceEdge ? -1 : piece.y > BOARD.bottom - pieceEdge ? 1 : 0;
      game.fallingPieces.push({ piece, radius: pieceEdge, dx, dy, elapsed: 0, duration: 0.2 });
      piece.vx = piece.vy = 0;
    }
  }
}

function registerImpact(game, first, second, impulse, x, y) {
  if (impulse < 190) return;
  const pair = [first.id, second.id].sort().join(":");
  if (game.impactCooldowns.has(pair)) return;
  game.impactCooldowns.set(pair, 0.1);
  const strength = Math.max(0, Math.min(1, (impulse - 160) / 850));
  game.impactEffects.push({ x, y, strength, elapsed: 0, duration: 0.18 });
  if (strength > 0.22) game.screenShake = { elapsed: 0, duration: 0.13, intensity: 1.4 + strength * 5.2 };
}
