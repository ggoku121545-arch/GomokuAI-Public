import { BOARD, livingPieces } from "./alkagi-state.js";

const FRICTION = 4.6;
const RESTITUTION = 0.82;
const STOP_SPEED = 11;

export function stepPhysics(game, elapsedSeconds) {
  const steps = Math.max(1, Math.ceil(elapsedSeconds / (1 / 120)));
  const dt = Math.min(elapsedSeconds, 0.05) / steps;

  for (let step = 0; step < steps; step += 1) {
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

  game.isMoving = livingPieces(game).some((piece) => piece.vx !== 0 || piece.vy !== 0);
  return !game.isMoving;
}

function resolveCollisions(game) {
  const pieces = livingPieces(game);
  const diameter = BOARD.radius * 2;
  for (let index = 0; index < pieces.length; index += 1) {
    const first = pieces[index];
    for (let otherIndex = index + 1; otherIndex < pieces.length; otherIndex += 1) {
      const second = pieces[otherIndex];
      let dx = second.x - first.x;
      let dy = second.y - first.y;
      let distance = Math.hypot(dx, dy);
      if (distance >= diameter) continue;

      if (distance < 0.001) {
        dx = first.id < second.id ? 1 : -1;
        dy = 0;
        distance = 1;
      }
      const nx = dx / distance;
      const ny = dy / distance;
      const overlap = diameter - distance;
      first.x -= nx * overlap * 0.5;
      first.y -= ny * overlap * 0.5;
      second.x += nx * overlap * 0.5;
      second.y += ny * overlap * 0.5;

      const relativeNormalSpeed = (second.vx - first.vx) * nx + (second.vy - first.vy) * ny;
      if (relativeNormalSpeed >= 0) continue;
      const impulse = -(1 + RESTITUTION) * relativeNormalSpeed * 0.5;
      first.vx -= impulse * nx;
      first.vy -= impulse * ny;
      second.vx += impulse * nx;
      second.vy += impulse * ny;
    }
  }
}

function removePiecesOutsideBoard(game) {
  const radius = BOARD.radius;
  for (const piece of game.pieces) {
    if (!piece.alive) continue;
    if (piece.x < BOARD.left + radius || piece.x > BOARD.right - radius || piece.y < BOARD.top + radius || piece.y > BOARD.bottom - radius) {
      piece.alive = false;
      piece.vx = piece.vy = 0;
    }
  }
}
