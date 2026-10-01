export const BOARD = Object.freeze({
  width: 1000,
  height: 1000,
  left: 50,
  right: 950,
  top: 50,
  bottom: 950,
  radius: 25,
  maxPull: 180,
  setupDivider: 500,
  hinge: Object.freeze({ x: 500, y: 500, halfLength: 42, radius: 11 }),
});

export function pieceRadius(piece) {
  return piece.captain ? 33 : BOARD.radius;
}

export function pieceMass(piece) {
  return piece.captain ? 2.8 : 1;
}

export function createGame(player1Name, player2Name) {
  const game = {
    players: [player1Name || "플레이어 1", player2Name || "플레이어 2"],
    currentPlayer: 1,
    phase: "setup",
    setupPlayer: 1,
    pieces: [],
    aim: null,
    isAiming: false,
    isMoving: false,
    shotInProgress: false,
    turnsPlayed: 0,
    startedAt: new Date(),
    result: null,
    fallingPieces: [],
    impactEffects: [],
    impactCooldowns: new Map(),
    screenShake: null,
  };
  resetGame(game);
  return game;
}

export function resetGame(game) {
  game.currentPlayer = 1;
  game.phase = "setup";
  game.setupPlayer = 1;
  game.pieces = [];
  game.aim = null;
  game.isAiming = false;
  game.isPlacing = false;
  game.placementPieceId = null;
  game.isMoving = false;
  game.shotInProgress = false;
  game.turnsPlayed = 0;
  game.startedAt = new Date();
  game.result = null;
  game.fallingPieces = [];
  game.impactEffects = [];
  game.impactCooldowns = new Map();
  game.screenShake = null;

  const columns = [350, 500, 650];
  const rows = {
    1: [200, 300],
    2: [700, 800],
  };
  for (const player of [1, 2]) {
    let captainAssigned = false;
    for (const y of rows[player]) {
      for (const x of columns) {
        game.pieces.push({
          id: `${player}-${game.pieces.length}`,
          player,
          captain: !captainAssigned,
          x,
          y,
          vx: 0,
          vy: 0,
          alive: true,
        });
        captainAssigned = true;
      }
    }
  }
}

export function completeSetup(game) {
  if (game.phase !== "setup" || game.isMoving || game.isPlacing) return false;
  if (game.setupPlayer === 1) {
    game.setupPlayer = 2;
  } else {
    game.phase = "playing";
    game.currentPlayer = 1;
  }
  return true;
}

export function beginPlacement(game, piece) {
  if (game.phase !== "setup" || game.isPlacing || !piece?.alive || piece.player !== game.setupPlayer) return false;
  game.isPlacing = true;
  game.placementPieceId = piece.id;
  return true;
}

export function updatePlacement(game, point) {
  if (game.phase !== "setup" || !game.isPlacing) return false;
  const piece = game.pieces.find((item) => item.id === game.placementPieceId && item.alive);
  if (!piece) return false;

  const radius = pieceRadius(piece);
  const minY = piece.player === 1 ? BOARD.top + radius : BOARD.setupDivider + radius;
  const maxY = piece.player === 1 ? BOARD.setupDivider - radius : BOARD.bottom - radius;
  const next = {
    x: Math.max(BOARD.left + radius, Math.min(BOARD.right - radius, point.x)),
    y: Math.max(minY, Math.min(maxY, point.y)),
  };

  const wouldOverlap = game.pieces.some((other) => {
    if (other.id === piece.id || !other.alive) return false;
    return Math.hypot(other.x - next.x, other.y - next.y) < radius + pieceRadius(other) + 2;
  });
  const hinge = BOARD.hinge;
  const hingeNearestX = Math.max(hinge.x - hinge.halfLength, Math.min(hinge.x + hinge.halfLength, next.x));
  const overlapsHinge = Math.hypot(next.x - hingeNearestX, next.y - hinge.y) < radius + hinge.radius + 2;
  if (wouldOverlap || overlapsHinge) return false;

  piece.x = next.x;
  piece.y = next.y;
  return true;
}

export function endPlacement(game) {
  if (!game.isPlacing) return;
  game.isPlacing = false;
  game.placementPieceId = null;
}

export function beginAim(game, piece, point) {
  if (game.phase !== "playing" || game.result || game.isMoving || game.isAiming || !piece?.alive || piece.player !== game.currentPlayer) return false;
  game.isAiming = true;
  game.aim = { pieceId: piece.id, originX: piece.x, originY: piece.y, pointerX: point.x, pointerY: point.y, pullX: 0, pullY: 0, power: 0 };
  updateAim(game, point);
  return true;
}

export function updateAim(game, point) {
  if (!game.isAiming || !game.aim) return;
  const aim = game.aim;
  let pullX = point.x - aim.originX;
  let pullY = point.y - aim.originY;
  const distance = Math.hypot(pullX, pullY);
  if (distance > BOARD.maxPull) {
    const ratio = BOARD.maxPull / distance;
    pullX *= ratio;
    pullY *= ratio;
  }
  aim.pointerX = point.x;
  aim.pointerY = point.y;
  aim.pullX = pullX;
  aim.pullY = pullY;
  aim.power = Math.min(1, Math.hypot(pullX, pullY) / BOARD.maxPull);
}

export function releaseAim(game) {
  if (!game.isAiming || !game.aim) return false;
  const aim = game.aim;
  const piece = game.pieces.find((item) => item.id === aim.pieceId && item.alive);
  const pull = Math.hypot(aim.pullX, aim.pullY);
  game.isAiming = false;
  game.aim = null;
  if (!piece || pull < 7) return false;

  const force = Math.min(pull, BOARD.maxPull) * 7.8;
  piece.vx = (-aim.pullX / pull) * force;
  piece.vy = (-aim.pullY / pull) * force;
  game.isMoving = true;
  game.shotInProgress = true;
  game.turnsPlayed += 1;
  return true;
}

export function livingPieces(game, player = null) {
  return game.pieces.filter((piece) => piece.alive && (player === null || piece.player === player));
}

export function finishTurn(game) {
  game.isMoving = false;
  game.shotInProgress = false;
  const player1Remaining = livingPieces(game, 1).length;
  const player2Remaining = livingPieces(game, 2).length;

  if (player1Remaining === 0 || player2Remaining === 0) {
    const winner = player1Remaining === 0 ? 2 : 1;
    game.result = {
      mode: "alkagi",
      winner,
      winnerName: game.players[winner - 1],
      player1Remaining,
      player2Remaining,
      turnsPlayed: game.turnsPlayed,
      finishedAtUtc: new Date().toISOString(),
    };
    return game.result;
  }

  game.currentPlayer = game.currentPlayer === 1 ? 2 : 1;
  return null;
}

export function snapshot(game) {
  return {
    currentPlayer: game.currentPlayer,
    phase: game.phase,
    setupPlayer: game.setupPlayer,
    player1Remaining: livingPieces(game, 1).length,
    player2Remaining: livingPieces(game, 2).length,
    isMoving: game.isMoving,
  };
}
