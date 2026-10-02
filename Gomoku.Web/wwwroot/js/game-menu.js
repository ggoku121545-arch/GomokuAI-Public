const storageKey = "gomoku-ai-game-order-v1";
const cleanups = new WeakMap();

function migrateOrder(value, allowedIds) {
  if (!Array.isArray(value)) return [...allowedIds];
  const savedOrder = value.filter((id, index) =>
    typeof id === "string" && allowedIds.includes(id) && value.indexOf(id) === index);
  return [...savedOrder, ...allowedIds.filter((id) => !savedOrder.includes(id))];
}

export function loadOrder(defaultIds) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    return migrateOrder(saved, defaultIds);
  } catch {
    // Storage may be unavailable in private browsing; keep the default ordering.
    return [...defaultIds];
  }
}

export function enableReorder(list, dotNetReference, initialOrder) {
  disableReorder(list);
  const allowedIds = [...initialOrder];
  let order = [...initialOrder];
  let pointerId = null;
  let pressedId = null;
  let draggedId = null;
  let pressPoint = null;
  let pressTimer = 0;
  let suppressClick = false;

  const cardFor = (id) => list.querySelector(`[data-game-id="${CSS.escape(id)}"]`);

  function applyOrder() {
    order.forEach((id, index) => {
      const card = cardFor(id);
      if (card) card.style.setProperty("--game-order", String(index));
    });
  }

  function clearOrderStyles() {
    list.querySelectorAll("[data-game-id]").forEach((card) => card.style.removeProperty("--game-order"));
  }

  function clearPress() {
    window.clearTimeout(pressTimer);
    pressTimer = 0;
  }

  function activateDrag() {
    if (!pressedId || pointerId === null) return;
    draggedId = pressedId;
    cardFor(draggedId)?.classList.add("dragging");
    try { navigator.vibrate?.(15); } catch { /* Vibration is optional. */ }
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    const card = event.target.closest("[data-game-id]");
    if (!card || !list.contains(card)) return;
    pointerId = event.pointerId;
    pressedId = card.dataset.gameId;
    pressPoint = { x: event.clientX, y: event.clientY };
    clearPress();
    pressTimer = window.setTimeout(activateDrag, 360);
  }

  function onPointerMove(event) {
    if (event.pointerId !== pointerId || !pressedId) return;
    if (!draggedId) {
      if (Math.hypot(event.clientX - pressPoint.x, event.clientY - pressPoint.y) > 10) clearPress();
      return;
    }

    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-game-id]");
    if (!target || !list.contains(target)) return;
    const targetId = target.dataset.gameId;
    const from = order.indexOf(draggedId);
    const to = order.indexOf(targetId);
    if (from < 0 || to < 0 || from === to) return;

    order[from] = targetId;
    order[to] = draggedId;
    list.querySelectorAll("[data-game-id]").forEach((card) => card.classList.remove("drop-target"));
    cardFor(targetId)?.classList.add("drop-target");
    applyOrder();
  }

  async function finishPointer(event) {
    if (event.pointerId !== pointerId) return;
    clearPress();
    if (draggedId) {
      event.preventDefault();
      suppressClick = true;
      list.querySelectorAll("[data-game-id]").forEach((card) => card.classList.remove("dragging", "drop-target"));
      clearOrderStyles();
      try { localStorage.setItem(storageKey, JSON.stringify(order)); } catch { /* The order still applies for this visit. */ }
      await dotNetReference.invokeMethodAsync("OnGameOrderChanged", order);
      window.setTimeout(() => { suppressClick = false; }, 0);
    }
    pointerId = null;
    pressedId = null;
    draggedId = null;
    pressPoint = null;
  }

  function onClick(event) {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressClick = false;
  }

  list.addEventListener("pointerdown", onPointerDown);
  list.addEventListener("click", onClick, true);
  document.addEventListener("pointermove", onPointerMove, { passive: false });
  document.addEventListener("pointerup", finishPointer);
  document.addEventListener("pointercancel", finishPointer);
  applyOrder();

  cleanups.set(list, () => {
    clearPress();
    list.removeEventListener("pointerdown", onPointerDown);
    list.removeEventListener("click", onClick, true);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", finishPointer);
    document.removeEventListener("pointercancel", finishPointer);
    clearOrderStyles();
  });
}

export function disableReorder(list) {
  cleanups.get(list)?.();
  cleanups.delete(list);
  list?.querySelectorAll("[data-game-id]").forEach((card) => card.classList.remove("dragging", "drop-target"));
}
