import { overlapRatio, rectangleCorners } from "./eraser-judgement.js";

const ink = "#45433f";
const palette = {
  blue: { top: "#b8d3f3", side: "#7397c8", mark: "#2769bb", shade: "#344f72" },
  red: { top: "#f0c1b9", side: "#c98278", mark: "#b74742", shade: "#713b3a" }
};

function roughLine(ctx, x1, y1, x2, y2, color = ink, width = 1, alpha = 0.75) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  const dx = x2 - x1;
  const dy = y2 - y1;
  ctx.quadraticCurveTo(x1 + dx * 0.48 + Math.sin(y1 + x2) * 1.1, y1 + dy * 0.52 + Math.cos(x1 + y2) * 1.1, x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawBackground(ctx, width, height, state) {
  ctx.fillStyle = "#f3f0e7";
  ctx.fillRect(0, 0, width, height);

  // Faint notebook ruling and desk-pencil grain.
  ctx.save();
  ctx.globalAlpha = 0.20;
  for (let y = 25; y < height; y += 27) roughLine(ctx, 8, y, width - 8, y + Math.sin(y * 0.07) * 1.4, "#71869c", 0.65, 0.32);
  for (let i = 0; i < 16; i++) {
    const x = ((i * 83) % Math.max(1, width - 16)) + 8;
    const y = ((i * 137) % Math.max(1, height - 16)) + 8;
    roughLine(ctx, x, y, x + 12 + i % 9, y - 2, "#8d806d", 0.55, 0.27);
  }
  ctx.restore();

  // The playable table edge is intentionally sketchy, like a notebook doodle.
  const inset = 13;
  const wobble = (n) => Math.sin(n * 2.31) * 2.1;
  ctx.beginPath();
  ctx.moveTo(inset + wobble(1), inset + wobble(2));
  ctx.lineTo(width - inset + wobble(3), inset + wobble(4));
  ctx.lineTo(width - inset + wobble(5), height - inset + wobble(6));
  ctx.lineTo(inset + wobble(7), height - inset + wobble(8));
  ctx.closePath();
  ctx.fillStyle = "#f7f4eb55";
  ctx.fill();
  ctx.strokeStyle = "#524f493f";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  roughLine(ctx, 17, 19, width - 18, 17, "#534f49", 0.9, 0.45);

  // Eraser crumbs around the desk margin.
  ctx.save();
  ctx.fillStyle = "#b8786d55";
  for (let i = 0; i < 9; i++) {
    const x = 27 + ((i * 59) % Math.max(1, width - 54));
    const y = i % 2 === 0 ? 29 + i * 2 : height - 25 - i * 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 1.1 + (i % 3) * 0.4, 0.8 + (i % 2) * 0.5, i, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const overlap = overlapRatio(state.pieces[0], state.pieces[1]);
  if (overlap > 0.08 && overlap < 0.32) {
    ctx.save();
    ctx.globalAlpha = 0.6 + Math.sin(performance.now() / 120) * 0.14;
    ctx.fillStyle = "#b8792f";
    ctx.font = "bold 13px 'Gaegu Local', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("걸칠까?", width / 2, 37);
    ctx.restore();
  }
}

function drawAim(ctx, state) {
  const pull = state.activePull;
  if (!pull) return;
  const piece = state.pieces[state.turn];
  const dragX = pull.x - pull.startX;
  const dragY = pull.y - pull.startY;
  const pullDistance = Math.min(150, Math.hypot(dragX, dragY));
  if (pullDistance < 3) return;
  const dirX = -dragX / Math.hypot(dragX, dragY);
  const dirY = -dragY / Math.hypot(dragX, dragY);
  const length = 32 + pullDistance * 0.76;
  const endX = piece.x + dirX * length;
  const endY = piece.y + dirY * length;
  const force = pullDistance / 150;
  ctx.save();
  ctx.lineWidth = 1.5 + force * 2;
  ctx.strokeStyle = force > 0.78 ? "#2769bb" : "#4c4a45";
  ctx.globalAlpha = 0.45 + force * 0.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(piece.x, piece.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);
  const angle = Math.atan2(dirY, dirX);
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - 10 * Math.cos(angle - 0.5), endY - 10 * Math.sin(angle - 0.5));
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - 10 * Math.cos(angle + 0.5), endY - 10 * Math.sin(angle + 0.5));
  ctx.stroke();

  const gaugeX = piece.x - 33;
  const gaugeY = piece.y + piece.height * 0.82;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#68655e66";
  ctx.beginPath();
  ctx.moveTo(gaugeX, gaugeY);
  ctx.lineTo(gaugeX + 66, gaugeY);
  ctx.stroke();
  ctx.strokeStyle = force > 0.78 ? "#2769bb" : "#5a5751";
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(gaugeX, gaugeY);
  ctx.lineTo(gaugeX + 66 * force, gaugeY);
  ctx.stroke();
  ctx.restore();
}

function drawEraser(ctx, piece, isActive, frame) {
  const style = palette[piece.id];
  const lift = piece.lift || 0;
  const w = piece.width;
  const h = piece.height;
  const bounce = isActive && piece.ridingId ? Math.sin(frame / 80) * 1.6 : 0;
  const raisedY = piece.y - lift * 10 - bounce;
  ctx.save();
  ctx.translate(piece.x, raisedY);
  ctx.rotate(piece.angle);

  // Soft contact shadow lifts and spreads when the eraser climbs.
  ctx.save();
  ctx.globalAlpha = 0.2 + lift * 0.16;
  ctx.fillStyle = "#28231c";
  ctx.beginPath();
  ctx.ellipse(lift * 6, lift * 8 + h * 0.23, w * (0.48 + lift * 0.1), h * (0.22 + lift * 0.08), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const depth = 6 + lift * 2;
  const radius = 7;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2 + depth, w, h, radius);
  ctx.fillStyle = style.side;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, radius);
  ctx.fillStyle = style.top;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = isActive ? 2.2 : 1.7;
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, Math.max(4, radius - 3));
  ctx.clip();
  ctx.globalAlpha = 0.32;
  for (let x = -w / 2; x < w / 2 + h; x += 8) {
    roughLine(ctx, x, -h / 2, x - h * 0.5, h / 2, style.shade, 0.65, 0.42);
  }
  ctx.restore();

  // Coloured end-cap, player stamp, and imperfect pencil contours.
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = style.mark;
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 5, -h / 2 + 6, 7, h - 12, 3);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#363430";
  ctx.font = `bold ${Math.max(10, h * 0.28)}px 'Gaegu Local', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(piece.id === "blue" ? "1P" : "2P", 7, 1);
  ctx.globalAlpha = 0.46;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 1.2, -h / 2 + 1.8, w - 2.6, h - 2.7, 8);
  ctx.stroke();
  ctx.restore();
}

export function renderFrame(canvas, ctx, state, frame = performance.now()) {
  const rect = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
  const pixelWidth = Math.max(1, Math.round(rect.width * pixelRatio));
  const pixelHeight = Math.max(1, Math.round(rect.height * pixelRatio));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.save();
  if (state.shake > 0.05) {
    const strength = Math.min(4, state.shake);
    ctx.translate(Math.sin(frame * 0.07) * strength, Math.cos(frame * 0.09) * strength * 0.6);
  }
  drawBackground(ctx, rect.width, rect.height, state);
  drawAim(ctx, state);
  let order = state.pieces;
  const rider = state.pieces.find(piece => piece.ridingId);
  if (rider) order = state.pieces.filter(piece => piece !== rider).concat(rider);
  for (const piece of order) drawEraser(ctx, piece, state.pieces[state.turn] === piece && !state.moving, frame);

  const overlap = overlapRatio(state.pieces[0], state.pieces[1]);
  if (overlap >= 0.16 && overlap < 0.3) {
    ctx.save();
    ctx.strokeStyle = "#c4873d99";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.ellipse(state.pieces[0].x * 0.5 + state.pieces[1].x * 0.5, state.pieces[0].y * 0.5 + state.pieces[1].y * 0.5 - 24, 17 + Math.sin(frame / 90) * 2, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
