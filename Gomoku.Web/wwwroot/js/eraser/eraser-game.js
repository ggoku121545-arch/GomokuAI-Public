import { attachInput } from "./eraser-input.js";
import { classifyOverlap, overlapRatio } from "./eraser-judgement.js";
import { renderFrame } from "./eraser-renderer.js";
import { createGameState, MAX_TURNS, resetPieces, resizeGameState, startTurn } from "./eraser-state.js";
import { stepPhysics } from "./eraser-physics.js";

let activeGame = null;

function setToast(game, text, kind = "", duration = 900) {
  game.state.toast = text;
  game.state.toastKind = kind;
  game.toastUntil = performance.now() + duration;
}

function syncHud(game) {
  const { state, root } = game;
  const activeName = state.pieces[state.turn].name;
  const label = state.gameOver ? (state.draw ? "무승부" : `${state.winner?.name} 승리`) : `${activeName} 차례`;
  const status = state.status;
  const round = `${state.round} 라운드 · ${state.turnsTaken}/${MAX_TURNS}번`;

  const turnNode = root.querySelector("[data-turn-label]");
  if (turnNode && turnNode.textContent !== label) turnNode.textContent = label;
  const statusNode = root.querySelector("[data-status]");
  if (statusNode && statusNode.textContent !== status) statusNode.textContent = status;
  const roundNode = root.querySelector("[data-round]");
  if (roundNode && roundNode.textContent !== round) roundNode.textContent = round;

  root.querySelectorAll("[data-player-card]").forEach((card, index) => {
    card.classList.toggle("active", !state.gameOver && state.turn === index);
  });

  const toast = root.querySelector("[data-toast]");
  if (toast) {
    const visible = Boolean(state.toast) && performance.now() < game.toastUntil;
    toast.textContent = visible ? state.toast : "";
    toast.classList.toggle("visible", visible);
    toast.classList.toggle("near", visible && state.toastKind === "near");
    toast.classList.toggle("success", visible && state.toastKind === "success");
    toast.classList.toggle("perfect", visible && state.toastKind === "perfect");
  }
}

function endGame(game, winner, kind, draw = false) {
  const { state, root } = game;
  state.gameOver = true;
  state.moving = false;
  state.pendingResolution = false;
  state.winner = winner;
  state.winKind = kind;
  state.draw = draw;
  state.status = draw ? "20번 동안 승부가 나지 않았어요" : `${winner.name}의 승리!`;
  const overlay = root.querySelector("[data-end]");
  const kicker = root.querySelector("[data-end-kicker]");
  const title = root.querySelector("[data-end-title]");
  const copy = root.querySelector("[data-end-copy]");

  if (draw) {
    kicker.textContent = "DRAW";
    title.textContent = "무승부";
    copy.textContent = "20번 동안 서로 팽팽했어요. 다시 한 판 해볼까요?";
    setToast(game, "무승부", "", 1800);
  } else if (kind === "perfect") {
    kicker.textContent = `${winner.name}의 한방 승리`;
    title.textContent = "완전 포개기!";
    copy.textContent = "지우개가 상대 지우개 위에 거의 전부 올라갔어요.";
    setToast(game, "완전 포개기!", "perfect", 2400);
  } else {
    kicker.textContent = `${winner.name} 승리`;
    title.textContent = "걸쳤다!";
    copy.textContent = "상대 지우개 위에 제대로 걸쳐졌어요.";
    setToast(game, "걸쳤다!", "success", 1800);
  }
  overlay.hidden = false;
  syncHud(game);
}

function resolveAtRest(game) {
  const { state } = game;
  if (!state.pendingResolution || state.gameOver) return;
  state.pendingResolution = false;
  const ratio = overlapRatio(state.pieces[0], state.pieces[1]);
  state.lastOverlap = ratio;
  const result = classifyOverlap(ratio);
  if (result === "perfect" || result === "partial") {
    const rider = state.pieces.find(piece => piece.ridingId === state.pieces.find(other => other !== piece)?.id);
    const winner = rider || state.pieces[state.turn];
    endGame(game, winner, result);
    return;
  }

  state.status = result === "near" ? "조금만 더 겹쳤으면 성공이었어요" : "멈췄어요. 다음 차례예요";
  if (result === "near") {
    setToast(game, "아깝다! 조금만 더", "near", 950);
    state.pauseBeforeTurn = 0.88;
  } else {
    state.pauseBeforeTurn = 0.18;
  }
  state.pendingResolution = true;
}

function beginNextTurn(game) {
  const { state } = game;
  state.pendingResolution = false;
  if (state.turnsTaken >= MAX_TURNS) {
    endGame(game, null, null, true);
    return;
  }
  startTurn(state);
  syncHud(game);
}

function restart(game) {
  resetPieces(game.state, game.playerNames);
  game.root.querySelector("[data-end]").hidden = true;
  game.toastUntil = 0;
  syncHud(game);
}

function onAction(game, event) {
  const button = event.target.closest("[data-action]");
  if (!button || !game.root.contains(button)) return;
  switch (button.dataset.action) {
    case "restart": restart(game); break;
    case "exit": window.location.assign(new URL("games", document.baseURI)); break;
    case "help": game.root.querySelector("[data-help]")?.showModal(); break;
    case "close-help": game.root.querySelector("[data-help]")?.close(); break;
  }
}

export function start(root, savedPlayerName) {
  stop();
  const canvas = root.querySelector("canvas.eraser-canvas");
  if (!canvas) return;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return;

  const playerNames = [savedPlayerName?.trim() || "플레이어 1", "플레이어 2"];
  root.querySelectorAll("[data-player-name]").forEach((node, index) => node.textContent = playerNames[index]);
  const rect = canvas.getBoundingClientRect();
  const state = createGameState(rect.width, rect.height, playerNames);
  const game = { root, canvas, context, state, playerNames, animationFrame: 0, lastTime: 0, toastUntil: 0, inputCleanup: null, resizeObserver: null, actionHandler: null };
  game.inputCleanup = attachInput(canvas, state, () => {
    game.toastUntil = 0;
    state.toast = "";
    state.status = "지우개가 미끄러져요";
    syncHud(game);
  });
  game.actionHandler = event => onAction(game, event);
  root.addEventListener("click", game.actionHandler);

  const updateSize = () => {
    const bounds = canvas.getBoundingClientRect();
    if (Math.abs(bounds.width - state.width) > 1 || Math.abs(bounds.height - state.height) > 1) {
      resizeGameState(state, bounds.width, bounds.height);
    }
  };
  if ("ResizeObserver" in window) {
    game.resizeObserver = new ResizeObserver(updateSize);
    game.resizeObserver.observe(canvas);
  } else {
    window.addEventListener("resize", updateSize);
    game.resizeCleanup = () => window.removeEventListener("resize", updateSize);
  }

  game.frame = now => {
    const elapsed = game.lastTime ? (now - game.lastTime) / 1000 : 1 / 60;
    game.lastTime = now;
    if (state.moving) {
      const stopped = stepPhysics(state, elapsed);
      if (stopped) resolveAtRest(game);
    } else if (state.pendingResolution) {
      state.pauseBeforeTurn -= Math.min(0.05, elapsed);
      if (state.pauseBeforeTurn <= 0) beginNextTurn(game);
    }
    if (!state.moving && state.toastTime > 0) state.toastTime = Math.max(0, state.toastTime - elapsed);
    renderFrame(canvas, context, state, now);
    syncHud(game);
    game.animationFrame = requestAnimationFrame(game.frame);
  };
  activeGame = game;
  syncHud(game);
  game.animationFrame = requestAnimationFrame(game.frame);
}

export function stop() {
  if (!activeGame) return;
  const game = activeGame;
  cancelAnimationFrame(game.animationFrame);
  game.inputCleanup?.();
  game.resizeObserver?.disconnect();
  game.resizeCleanup?.();
  if (game.actionHandler) game.root.removeEventListener("click", game.actionHandler);
  game.root.querySelector("[data-help]")?.close?.();
  activeGame = null;
}
