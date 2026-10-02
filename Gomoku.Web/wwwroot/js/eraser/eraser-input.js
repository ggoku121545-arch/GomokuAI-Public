const MAX_PULL_DISTANCE = 150;
const LAUNCH_SCALE = 3.55;
const MAX_SPEED = 970;

function pointInEraser(x, y, piece) {
  const dx = x - piece.x;
  const dy = y - piece.y;
  const cosine = Math.cos(piece.angle);
  const sine = Math.sin(piece.angle);
  const localX = dx * cosine + dy * sine;
  const localY = -dx * sine + dy * cosine;
  return Math.abs(localX) <= piece.width * 0.62 && Math.abs(localY) <= piece.height * 0.76;
}

export function attachInput(canvas, state, onLaunch) {
  let pointerId = null;

  const localPoint = event => {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  function onPointerDown(event) {
    if (state.moving || state.gameOver || state.pendingResolution || pointerId !== null) return;
    if (event.button !== undefined && event.button !== 0) return;
    const point = localPoint(event);
    const piece = state.pieces[state.turn];
    if (!pointInEraser(point.x, point.y, piece)) return;

    pointerId = event.pointerId;
    canvas.setPointerCapture?.(pointerId);
    state.activePull = { startX: point.x, startY: point.y, x: point.x, y: point.y };
    state.status = "뒤로 당겨 방향과 힘을 정하세요";
    canvas.style.cursor = "grabbing";
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (event.pointerId !== pointerId || !state.activePull) return;
    const point = localPoint(event);
    state.activePull.x = point.x;
    state.activePull.y = point.y;
    event.preventDefault();
  }

  function onPointerUp(event) {
    if (event.pointerId !== pointerId || !state.activePull) return;
    const point = localPoint(event);
    const dragX = point.x - state.activePull.startX;
    const dragY = point.y - state.activePull.startY;
    const pull = Math.min(MAX_PULL_DISTANCE, Math.hypot(dragX, dragY));
    const piece = state.pieces[state.turn];
    const pullOriginX = state.activePull.startX;
    const pullOriginY = state.activePull.startY;
    state.activePull = null;
    pointerId = null;
    canvas.style.cursor = "crosshair";

    if (pull < 9) {
      state.status = "조금 더 뒤로 당겨 튕겨보세요";
      event.preventDefault();
      return;
    }

    const unitX = -dragX / Math.hypot(dragX, dragY);
    const unitY = -dragY / Math.hypot(dragX, dragY);
    const speed = Math.min(MAX_SPEED, 105 + pull * LAUNCH_SCALE);
    piece.vx = unitX * speed;
    piece.vy = unitY * speed;
    // A small off-centre pull adds spin without changing the chosen launch direction.
    const hitX = pullOriginX - piece.x;
    const hitY = pullOriginY - piece.y;
    const lever = (hitX * unitY - hitY * unitX) / Math.max(1, piece.width * 0.5);
    piece.spin = Math.max(-1.6, Math.min(1.6, lever * (0.25 + pull / 130)));
    piece.ridingId = null;
    piece.lift = 0;
    state.turnsTaken++;
    state.moving = true;
    state.pendingResolution = false;
    state.restedFrames = 0;
    state.lastShot = { power: pull / MAX_PULL_DISTANCE, at: performance.now() };
    state.status = "움직이는 중…";
    onLaunch?.(state.lastShot);
    event.preventDefault();
  }

  function onPointerCancel(event) {
    if (event.pointerId !== pointerId) return;
    state.activePull = null;
    pointerId = null;
    canvas.style.cursor = "crosshair";
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.addEventListener("lostpointercapture", onPointerCancel);

  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerCancel);
    canvas.removeEventListener("lostpointercapture", onPointerCancel);
  };
}
