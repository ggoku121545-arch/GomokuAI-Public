export const MAX_TURNS = 20;
export const STOP_SPEED = 13;
export const STOP_SPIN = 0.045;
export const REST_FRAMES = 10;

export function createGameState(width, height, playerNames = ["플레이어 1", "플레이어 2"]) {
  const w = Math.max(240, width || 360);
  const h = Math.max(180, height || 340);
  const pieceWidth = Math.min(100, Math.max(70, w * 0.23));
  const pieceHeight = pieceWidth * 0.57;
  const y = h * 0.5;
  return {
    width: w,
    height: h,
    pieces: [
      makePiece("blue", playerNames[0] || "플레이어 1", w * 0.33, y, pieceWidth, pieceHeight, -0.04),
      makePiece("red", "플레이어 2", w * 0.67, y, pieceWidth, pieceHeight, 0.035)
    ],
    turn: 0,
    round: 1,
    turnsTaken: 0,
    moving: false,
    pendingResolution: false,
    restedFrames: 0,
    pauseBeforeTurn: 0,
    gameOver: false,
    winner: null,
    winKind: null,
    draw: false,
    status: "뒤로 당겨 조준하세요",
    toast: "",
    toastKind: "",
    toastTime: 0,
    activePull: null,
    collisionFlash: 0,
    shake: 0,
    nearSlow: false,
    lastOverlap: 0,
    lastShot: null
  };
}

function makePiece(id, name, x, y, width, height, angle) {
  return {
    id,
    name,
    x,
    y,
    width,
    height,
    angle,
    vx: 0,
    vy: 0,
    spin: 0,
    lift: 0,
    ridingId: null
  };
}

export function resizeGameState(state, width, height) {
  const oldWidth = state.width;
  const oldHeight = state.height;
  const newWidth = Math.max(240, width || oldWidth);
  const newHeight = Math.max(180, height || oldHeight);
  const scaleX = newWidth / oldWidth;
  const scaleY = newHeight / oldHeight;

  for (const piece of state.pieces) {
    piece.x *= scaleX;
    piece.y *= scaleY;
    piece.width = Math.min(100, Math.max(70, newWidth * 0.23));
    piece.height = piece.width * 0.57;
    piece.vx *= scaleX;
    piece.vy *= scaleY;
  }
  state.width = newWidth;
  state.height = newHeight;
  return state;
}

export function startTurn(state) {
  state.moving = false;
  state.pendingResolution = false;
  state.restedFrames = 0;
  state.pauseBeforeTurn = 0;
  state.activePull = null;
  state.turn = (state.turn + 1) % 2;
  state.round = Math.floor(state.turnsTaken / 2) + 1;
  state.status = `${state.pieces[state.turn].name} 차례`;
}

export function resetPieces(state, playerNames) {
  const fresh = createGameState(state.width, state.height, playerNames);
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, fresh);
  return state;
}
