import { BOARD, beginAim, beginPlacement, endPlacement, pieceRadius, releaseAim, updateAim, updatePlacement, livingPieces } from "./alkagi-state.js";

export function attachInput(canvas, game, onShot) {
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
  };

  const onPointerMove = (event) => {
    const point = toBoardPoint(event);
    if (game.isPlacing) updatePlacement(game, point);
    else if (game.isAiming) updateAim(game, point);
  };

  const onPointerUp = (event) => {
    if (game.isPlacing) {
      endPlacement(game);
      onShot();
    } else if (game.isAiming) {
      updateAim(game, toBoardPoint(event));
      if (releaseAim(game)) onShot();
    }
  };

  const onPointerCancel = () => {
    if (game.isPlacing) {
      endPlacement(game);
      onShot();
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
