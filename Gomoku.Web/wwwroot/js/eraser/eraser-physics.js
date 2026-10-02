import { overlapRatio } from "./eraser-judgement.js";
import { REST_FRAMES, STOP_SPEED, STOP_SPIN } from "./eraser-state.js";

const FIXED_STEP = 1 / 120;
const RESTITUTION = 0.28;
const FRICTION = 2.05;
const RIDING_FRICTION = 5.4;
const MIN_STACK_SPEED = 218;

function dot(ax, ay, bx, by) { return ax * bx + ay * by; }

function projectionRadius(piece, axisX, axisY) {
  const cosine = Math.cos(piece.angle);
  const sine = Math.sin(piece.angle);
  return Math.abs(dot(axisX, axisY, cosine, sine)) * piece.width / 2 +
    Math.abs(dot(axisX, axisY, -sine, cosine)) * piece.height / 2;
}

function satCollision(first, second) {
  const axes = [];
  for (const piece of [first, second]) {
    const cosine = Math.cos(piece.angle);
    const sine = Math.sin(piece.angle);
    axes.push([cosine, sine], [-sine, cosine]);
  }

  let leastOverlap = Infinity;
  let normalX = 0;
  let normalY = 0;
  const centerX = second.x - first.x;
  const centerY = second.y - first.y;
  for (const [axisX, axisY] of axes) {
    const overlap = projectionRadius(first, axisX, axisY) + projectionRadius(second, axisX, axisY) - Math.abs(dot(centerX, centerY, axisX, axisY));
    if (overlap <= 0) return null;
    if (overlap < leastOverlap) {
      leastOverlap = overlap;
      const direction = dot(centerX, centerY, axisX, axisY) < 0 ? -1 : 1;
      normalX = axisX * direction;
      normalY = axisY * direction;
    }
  }
  return { depth: leastOverlap, normalX, normalY };
}

function bounceAtWalls(piece, state) {
  const cosine = Math.cos(piece.angle);
  const sine = Math.sin(piece.angle);
  const extentX = Math.abs(cosine) * piece.width / 2 + Math.abs(sine) * piece.height / 2;
  const extentY = Math.abs(sine) * piece.width / 2 + Math.abs(cosine) * piece.height / 2;
  const margin = 8;
  if (piece.x - extentX < margin) {
    piece.x = margin + extentX;
    piece.vx = Math.abs(piece.vx) * 0.32;
    piece.spin += piece.vy * 0.0004;
    state.collisionFlash = Math.max(state.collisionFlash, 0.14);
  } else if (piece.x + extentX > state.width - margin) {
    piece.x = state.width - margin - extentX;
    piece.vx = -Math.abs(piece.vx) * 0.32;
    piece.spin -= piece.vy * 0.0004;
    state.collisionFlash = Math.max(state.collisionFlash, 0.14);
  }
  if (piece.y - extentY < margin) {
    piece.y = margin + extentY;
    piece.vy = Math.abs(piece.vy) * 0.32;
    piece.spin -= piece.vx * 0.0004;
    state.collisionFlash = Math.max(state.collisionFlash, 0.14);
  } else if (piece.y + extentY > state.height - margin) {
    piece.y = state.height - margin - extentY;
    piece.vy = -Math.abs(piece.vy) * 0.32;
    piece.spin += piece.vx * 0.0004;
    state.collisionFlash = Math.max(state.collisionFlash, 0.14);
  }
}

function setRider(state, mover, target, impactSpeed, tangentOffset) {
  mover.ridingId = target.id;
  mover.lift = 0.48;
  mover.vx *= 0.83;
  mover.vy *= 0.83;
  target.vx += mover.vx * 0.11;
  target.vy += mover.vy * 0.11;
  target.vx *= 0.76;
  target.vy *= 0.76;
  mover.spin += Math.sign(tangentOffset || 1) * Math.min(1.3, impactSpeed / 700);
  state.lastOverlap = overlapRatio(mover, target);
  state.collisionFlash = 0.34;
  state.shake = Math.min(5.5, Math.max(state.shake, impactSpeed / 95));
  state.toast = "살짝 올라탔어…";
  state.toastKind = "near";
  state.toastTime = 0.5;
}

function handleContact(state, first, second, hit) {
  const pairsAlreadyStacking = first.ridingId === second.id || second.ridingId === first.id;
  const overlapPercent = overlapRatio(first, second);
  if (pairsAlreadyStacking && overlapPercent > 0.008) {
    first.lift = Math.min(1, 0.42 + overlapPercent * 0.58);
    second.lift = second.ridingId === first.id ? Math.min(1, 0.42 + overlapPercent * 0.58) : second.lift;
    return;
  }

  const active = state.pieces[state.turn];
  const isActiveFirst = active === first;
  const mover = isActiveFirst ? first : active === second ? second : null;
  const target = mover === first ? second : mover === second ? first : null;
  const normalX = mover === first ? hit.normalX : -hit.normalX;
  const normalY = mover === first ? hit.normalY : -hit.normalY;
  const tangentX = -normalY;
  const tangentY = normalX;

  if (mover && target) {
    const relativeX = mover.vx - target.vx;
    const relativeY = mover.vy - target.vy;
    const closingSpeed = dot(relativeX, relativeY, normalX, normalY);
    const speed = Math.hypot(mover.vx, mover.vy);
    const approachQuality = speed > 0 ? closingSpeed / speed : 0;
    const tangentOffset = dot(target.x - mover.x, target.y - mover.y, tangentX, tangentY);
    const laneRadius = projectionRadius(target, tangentX, tangentY);
    if (closingSpeed >= MIN_STACK_SPEED && approachQuality > 0.72 && Math.abs(tangentOffset) <= laneRadius * 0.52) {
      setRider(state, mover, target, closingSpeed, tangentOffset);
      return;
    }
  }

  const relativeAlongNormal = dot(first.vx - second.vx, first.vy - second.vy, hit.normalX, hit.normalY);
  if (relativeAlongNormal > 0) {
    const impulse = relativeAlongNormal * (1 + RESTITUTION) * 0.5;
    first.vx -= impulse * hit.normalX;
    first.vy -= impulse * hit.normalY;
    second.vx += impulse * hit.normalX;
    second.vy += impulse * hit.normalY;
    const spinKick = Math.min(1.1, relativeAlongNormal / 500) * Math.sign(dot(first.vx - second.vx, first.vy - second.vy, -hit.normalY, hit.normalX) || 1);
    first.spin += spinKick;
    second.spin -= spinKick;
    state.collisionFlash = Math.min(0.4, 0.12 + relativeAlongNormal / 900);
    state.shake = Math.min(4.2, Math.max(state.shake, relativeAlongNormal / 115));
    state.toast = "툭!";
    state.toastKind = "";
    state.toastTime = 0.22;
  }

  const correction = Math.max(0, hit.depth - 0.25) * 0.52;
  first.x -= hit.normalX * correction;
  first.y -= hit.normalY * correction;
  second.x += hit.normalX * correction;
  second.y += hit.normalY * correction;
}

function updateRiderState(state) {
  for (const piece of state.pieces) {
    if (!piece.ridingId) continue;
    const target = state.pieces.find(candidate => candidate.id === piece.ridingId);
    if (!target) {
      piece.ridingId = null;
      piece.lift = 0;
      continue;
    }
    const overlap = overlapRatio(piece, target);
    if (overlap < 0.006) {
      piece.ridingId = null;
      piece.lift = 0;
      piece.vx *= 0.64;
      piece.vy *= 0.64;
    } else {
      piece.lift = Math.min(1, 0.46 + overlap * 0.54);
      state.lastOverlap = overlap;
    }
  }
}

function simulateStep(state, dt) {
  updateRiderState(state);
  for (const piece of state.pieces) {
    const slidingOnTop = piece.ridingId !== null;
    const drag = Math.exp(-(slidingOnTop ? RIDING_FRICTION : FRICTION) * dt);
    piece.vx *= drag;
    piece.vy *= drag;
    piece.spin *= Math.exp(-4.2 * dt);
    piece.x += piece.vx * dt;
    piece.y += piece.vy * dt;
    piece.angle += piece.spin * dt;
    if (Math.abs(piece.vx) < STOP_SPEED) piece.vx = 0;
    if (Math.abs(piece.vy) < STOP_SPEED) piece.vy = 0;
    if (Math.abs(piece.spin) < STOP_SPIN) piece.spin = 0;
    bounceAtWalls(piece, state);
  }

  const [first, second] = state.pieces;
  if (!(first.ridingId === second.id || second.ridingId === first.id)) {
    const collision = satCollision(first, second);
    if (collision) handleContact(state, first, second, collision);
  }
}

export function stepPhysics(state, elapsedSeconds) {
  if (!state.moving || state.gameOver) return false;
  const overlap = overlapRatio(state.pieces[0], state.pieces[1]);
  state.nearSlow = overlap >= 0.10 && overlap < 0.36;
  const frame = Math.min(0.045, Math.max(0, elapsedSeconds)) * (state.nearSlow ? 0.58 : 1);
  const steps = Math.max(1, Math.ceil(frame / FIXED_STEP));
  const dt = frame / steps;
  for (let i = 0; i < steps; i++) simulateStep(state, dt);

  state.collisionFlash = Math.max(0, state.collisionFlash - elapsedSeconds);
  state.shake = Math.max(0, state.shake - elapsedSeconds * 8);
  state.toastTime = Math.max(0, state.toastTime - elapsedSeconds);

  const stable = state.pieces.every(piece => Math.hypot(piece.vx, piece.vy) < STOP_SPEED && Math.abs(piece.spin) < STOP_SPIN);
  state.restedFrames = stable ? state.restedFrames + 1 : 0;
  if (state.restedFrames >= REST_FRAMES) {
    for (const piece of state.pieces) {
      piece.vx = 0;
      piece.vy = 0;
      piece.spin = 0;
    }
    state.moving = false;
    state.pendingResolution = true;
    state.nearSlow = false;
    return true;
  }
  return false;
}

export function projectionRadiusForTest(piece, axisX, axisY) {
  return projectionRadius(piece, axisX, axisY);
}

export function resolveCollisionForTest(state) {
  const [first, second] = state.pieces;
  const collision = satCollision(first, second);
  if (!collision) return false;
  handleContact(state, first, second, collision);
  return true;
}
