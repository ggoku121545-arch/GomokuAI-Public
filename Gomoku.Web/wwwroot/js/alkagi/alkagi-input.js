import { BOARD, beginAim, releaseAim, updateAim, livingPieces } from "./alkagi-state.js";

export function attachInput(canvas, game, onShot) {
  const toBoardPoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * BOARD.width, y: ((event.clientY - rect.top) / rect.height) * BOARD.height };
  };

  const onPointerDown = (event) => {
    if (game.isMoving || game.result) return;
    const point = toBoardPoint(event);
    const piece = livingPieces(game, game.currentPlayer)
      .slice().reverse()
      .find((item) => Math.hypot(item.x - point.x, item.y - point.y) <= BOARD.radius + 8);
    if (!piece || !beginAim(game, piece, point)) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!game.isAiming) return;
    updateAim(game, toBoardPoint(event));
  };

  const onPointerUp = (event) => {
    if (!game.isAiming) return;
    updateAim(game, toBoardPoint(event));
    if (releaseAim(game)) onShot();
  };

  const onPointerCancel = () => {
    if (!game.isAiming) return;
    game.isAiming = false;
    game.aim = null;
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
