import { BOARD, beginAim, beginPlacement, endPlacement, pieceRadius, releaseAim, updateAim, updatePlacement, livingPieces } from "./alkagi-state.js";
import { playAlkagiLaunch } from "../game-audio.js";

export function attachInput(canvas, game, requestFrame, onStateChange) {
  const toBoardPoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * BOARD.width, y: ((event.clientY - rect.top) / rect.height) * BOARD.height };
  };

  const onPointerDown = (event) => {
    if (game.isMoving || game.result) return;
    const point = toBoardPoint(event);
    const activePlayer = game.phase === "setup" ? game.setupPlayer : game.currentPlayer;
    const piece = livingPieces(game, activePlayer)
      .slice().reverse()
      .find((item) => Math.hypot(item.x - point.x, item.y - point.y) <= pieceRadius(item) + 10);
    if (!piece) return;
    const started = game.phase === "setup" ? beginPlacement(game, piece) : beginAim(game, piece, point);
    if (!started) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    requestFrame();
  };

  const onPointerMove = (event) => {
    if (!game.isPlacing && !game.isAiming) return;
    const point = toBoardPoint(event);
    if (game.isPlacing) updatePlacement(game, point);
    else if (game.isAiming) updateAim(game, point);
    requestFrame();
  };

  const onPointerUp = (event) => {
    if (game.isPlacing) {
      endPlacement(game);
      requestFrame();
      onStateChange();
    } else if (game.isAiming) {
      updateAim(game, toBoardPoint(event));
      const launchPower = game.aim?.power ?? 0;
      if (releaseAim(game)) playAlkagiLaunch(launchPower);
      requestFrame();
      onStateChange();
    }
  };

  const onPointerCancel = () => {
    if (game.isPlacing) {
      endPlacement(game);
      requestFrame();
      onStateChange();
    }
    if (game.isAiming) {
      game.isAiming = false;
      game.aim = null;
    }
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerCancel);
  };
}
