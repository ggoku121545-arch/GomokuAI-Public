import { BOARD, createGame, resetGame, finishTurn, snapshot } from "./alkagi-state.js";
import { stepPhysics } from "./alkagi-physics.js";
import { renderGame } from "./alkagi-renderer.js";
import { attachInput } from "./alkagi-input.js";

let canvas;
let context;
let game;
let dotNet;
let animationFrame = 0;
let lastTime = 0;
let disposeInput;
let resizeObserver;
let sentFinalResult = false;

export function start(boardCanvas, dotNetReference, player1Name, player2Name) {
  stop();
  canvas = boardCanvas;
  context = canvas.getContext("2d", { alpha: false });
  dotNet = dotNetReference;
  game = createGame(player1Name, player2Name);
  sentFinalResult = false;
  resizeCanvas();
  disposeInput = attachInput(canvas, game, announceShot);
  resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(canvas);
  lastTime = performance.now();
  animationFrame = requestAnimationFrame(tick);
  notifyState();
}

export function restart() {
  if (!game) return;
  resetGame(game);
  sentFinalResult = false;
  notifyState();
}

export function stop() {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  disposeInput?.();
  disposeInput = null;
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
  canvas = null;
  context = null;
  game = null;
  dotNet = null;
}

function resizeCanvas() {
  if (!canvas || !context) return;
  const scale = Math.max(1, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(canvas.clientWidth * scale));
  const height = Math.max(1, Math.round(canvas.clientHeight * scale));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  context.setTransform(canvas.width / BOARD.width, 0, 0, canvas.height / BOARD.height, 0, 0);
  if (game) renderGame(context, game);
}

function tick(now) {
  if (!game || !context) return;
  const elapsed = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (game.isMoving && stepPhysics(game, elapsed)) {
    const result = finishTurn(game);
    notifyState();
    if (result && !sentFinalResult) {
      sentFinalResult = true;
      dotNet?.invokeMethodAsync("OnGameFinished", result);
    }
  }
  renderGame(context, game);
  animationFrame = requestAnimationFrame(tick);
}

function announceShot() {
  notifyState();
}

function notifyState() {
  if (game && dotNet) dotNet.invokeMethodAsync("OnGameStateChanged", snapshot(game));
}
