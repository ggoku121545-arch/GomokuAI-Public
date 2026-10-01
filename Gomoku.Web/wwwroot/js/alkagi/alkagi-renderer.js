import { BOARD, livingPieces, pieceRadius } from "./alkagi-state.js";

const ink = "#47443f";
const colors = {
  1: { light: "#62615e", mid: "#181817", dark: "#040404", mark: "#f4f0e7", edge: "#050505" },
  2: { light: "#fff", mid: "#f4f1e9", dark: "#cbc5ba", mark: "#746e64", edge: "#4c4943" },
};

export function renderGame(context, game) {
  context.clearRect(0, 0, BOARD.width, BOARD.height);
  context.fillStyle = "#ead7ad";
  context.fillRect(0, 0, BOARD.width, BOARD.height);
  context.save();
  if (game.screenShake) {
    const progress = Math.max(0, 1 - game.screenShake.elapsed / game.screenShake.duration);
    const intensity = game.screenShake.intensity * progress;
    context.translate((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity);
  }
  drawPaperMarks(context);
  drawGoGrid(context);
  drawSketchBorder(context);
  drawSetupGuide(context, game);
  drawAim(context, game);
  for (const piece of livingPieces(game)) {
    drawPiece(context, piece, pieceRadius(piece), (game.isAiming && game.aim?.pieceId === piece.id) || (game.isPlacing && game.placementPieceId === piece.id));
  }
  for (const falling of game.fallingPieces) drawFallingPiece(context, falling);
  drawImpactEffects(context, game);
  drawPowerMeter(context, game);
  context.restore();
}

function drawFallingPiece(context, falling) {
  const progress = Math.min(1, falling.elapsed / falling.duration);
  const { piece, radius, dx, dy } = falling;
  context.save();
  context.globalAlpha = 1 - progress;
  context.translate(piece.x + dx * progress * 34, piece.y + dy * progress * 34);
  context.rotate(progress * (dx === 0 ? 0.35 : 0.55) * (piece.player === 1 ? 1 : -1));
  context.scale(1 + Math.sin(progress * Math.PI) * 0.14, Math.max(0.08, 1 - progress * 0.72));
  drawPiece(context, piece, radius, false, 0, 0);
  context.restore();
}

function drawImpactEffects(context, game) {
  for (const effect of game.impactEffects) {
    const progress = Math.min(1, effect.elapsed / effect.duration);
    const radius = 10 + progress * (12 + effect.strength * 20);
    context.save();
    context.globalAlpha = (1 - progress) * (0.28 + effect.strength * 0.48);
    context.strokeStyle = effect.strength > 0.55 ? "#bd7540" : ink;
    context.lineWidth = 1.2 + effect.strength * 2;
    context.beginPath();
    context.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
}

function drawSetupGuide(context, game) {
  if (game.phase !== "setup") return;
  const top = game.setupPlayer === 1;
  context.save();
  context.fillStyle = top ? "#232220" : "#dedbd3";
  context.globalAlpha = 0.055;
  context.fillRect(BOARD.left + 3, top ? BOARD.top + 3 : BOARD.setupDivider, BOARD.right - BOARD.left - 6, BOARD.setupDivider - BOARD.top - 3);
  context.globalAlpha = 0.28;
  context.setLineDash([10, 9]);
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(BOARD.left + 8, BOARD.setupDivider);
  context.lineTo(BOARD.right - 8, BOARD.setupDivider);
  context.strokeStyle = ink;
  context.stroke();
  context.setLineDash([]);
  context.globalAlpha = 0.62;
  context.textAlign = "center";
  context.font = "bold 19px 'Gaegu Local', sans-serif";
  context.fillStyle = ink;
  context.fillText(top ? "플레이어 1 배치" : "플레이어 2 배치", BOARD.width / 2, top ? BOARD.top + 30 : BOARD.bottom - 18);
  context.restore();
}

function drawPaperMarks(context) {
  context.save();
  context.strokeStyle = "#ad8956";
  context.globalAlpha = 0.18;
  context.lineWidth = 1;
  for (let i = 0; i < 15; i += 1) {
    const x = BOARD.left + 18 + i * 61;
    const y = BOARD.top + 15 + (i % 5) * 5;
    context.beginPath();
    context.moveTo(x, y);
    context.quadraticCurveTo(x + 24, y - 3, x + 49, y + 1);
    context.stroke();
  }
  context.restore();
}

function drawGoGrid(context) {
  const intervals = 18;
  const spacing = (BOARD.right - BOARD.left) / intervals;
  context.save();
  context.strokeStyle = "#443a2d";
  context.globalAlpha = 0.82;
  context.lineWidth = 1.6;

  for (let index = 0; index <= intervals; index += 1) {
    const coordinate = BOARD.left + index * spacing;
    const wobble = ((index % 3) - 1) * 0.45;

    context.beginPath();
    context.moveTo(coordinate + wobble, BOARD.top);
    context.lineTo(coordinate - wobble, BOARD.bottom);
    context.stroke();

    context.beginPath();
    context.moveTo(BOARD.left, coordinate - wobble);
    context.lineTo(BOARD.right, coordinate + wobble);
    context.stroke();
  }

  context.globalAlpha = 0.88;
  context.fillStyle = "#40372b";
  for (const column of [3, 9, 15]) {
    for (const row of [3, 9, 15]) {
      context.beginPath();
      context.arc(BOARD.left + column * spacing, BOARD.top + row * spacing, 4, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}

function drawSketchBorder(context) {
  const bounds = [BOARD.left, BOARD.top, BOARD.right - BOARD.left, BOARD.bottom - BOARD.top];
  for (let pass = 0; pass < 3; pass += 1) {
    context.beginPath();
    context.lineWidth = pass === 0 ? 3 : 1.2;
    context.strokeStyle = ink;
    context.globalAlpha = pass === 0 ? 0.8 : 0.42;
    const [left, top, width, height] = bounds;
    const offset = (pass - 1) * 3;
    context.moveTo(left + 10 + offset, top + 4 + offset);
    context.quadraticCurveTo(left + width * 0.25, top - 1 + offset, left + width * 0.53, top + 3 - offset);
    context.quadraticCurveTo(left + width * 0.82, top + 8 + offset, left + width - 9 - offset, top + 2 + offset);
    context.quadraticCurveTo(left + width + 5 - offset, top + height * 0.26, left + width - 2 + offset, top + height * 0.55);
    context.quadraticCurveTo(left + width - 7 + offset, top + height * 0.82, left + width - 1 - offset, top + height - 8 - offset);
    context.quadraticCurveTo(left + width * 0.71, top + height + 6 - offset, left + width * 0.47, top + height - 2 + offset);
    context.quadraticCurveTo(left + width * 0.2, top + height - 6 - offset, left + 8 + offset, top + height + 1 - offset);
    context.quadraticCurveTo(left - 5 + offset, top + height * 0.7, left + 2 - offset, top + height * 0.43);
    context.quadraticCurveTo(left + 7 + offset, top + height * 0.14, left + 10 + offset, top + 4 + offset);
    context.stroke();
  }
  context.globalAlpha = 1;
}

function drawPiece(context, piece, radius, selected, x = piece.x, y = piece.y) {
  const color = colors[piece.player];
  context.save();
  context.shadowColor = "#26231f3d";
  context.shadowBlur = 5;
  context.shadowOffsetX = 2;
  context.shadowOffsetY = 3;
  const gradient = context.createRadialGradient(x - 8, y - 9, 3, x, y, radius);
  gradient.addColorStop(0, color.light);
  gradient.addColorStop(0.67, color.mid);
  gradient.addColorStop(1, color.dark);
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = gradient;
  context.fill();
  context.shadowColor = "transparent";
  context.lineWidth = Math.max(1.5, radius * 0.055);
  context.strokeStyle = color.edge;
  context.stroke();
  context.restore();

  for (let line = 0; line < 2; line += 1) {
    context.beginPath();
    context.ellipse(x + (line ? 1 : -1), y, radius - line * 2, radius - line * 2 + (line ? 1 : -1), (line ? -1 : 1) * 0.06, 0.15, Math.PI * 1.85);
    context.strokeStyle = line ? "#fff9" : color.mark;
    context.lineWidth = line ? 1 : 1.3;
    context.globalAlpha = line ? 0.72 : 0.48;
    context.stroke();
  }
  context.globalAlpha = 1;

  if (selected) {
    context.beginPath();
    context.arc(x, y, radius + 5, 0, Math.PI * 2);
    context.setLineDash([3, 4]);
    context.strokeStyle = color.dark;
    context.lineWidth = 2;
    context.stroke();
    context.setLineDash([]);
  }
  if (piece.captain) drawCaptainMark(context, piece, radius, x, y);
  context.restore();
}

function drawCaptainMark(context, piece, radius, pieceX = piece.x, pieceY = piece.y) {
  const x = pieceX;
  const y = pieceY - radius * 0.08;
  const scale = radius / 33;
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.beginPath();
  context.moveTo(-12, 2);
  context.lineTo(-10, -8);
  context.lineTo(-4, -2);
  context.lineTo(0, -12);
  context.lineTo(5, -2);
  context.lineTo(10, -8);
  context.lineTo(12, 2);
  context.closePath();
  context.fillStyle = piece.player === 1 ? "#f2eee4" : "#292723";
  context.strokeStyle = piece.player === 1 ? "#292723" : "#f2eee4";
  context.lineWidth = 1.8;
  context.fill();
  context.stroke();
  context.restore();
}

function drawAim(context, game) {
  if (!game.isAiming || !game.aim) return;
  const aim = game.aim;
  const pull = Math.hypot(aim.pullX, aim.pullY);
  if (pull < 2) return;
  const nx = -aim.pullX / pull;
  const ny = -aim.pullY / pull;
  const lineLength = 82 + aim.power * 88;
  const endX = aim.originX + nx * lineLength;
  const endY = aim.originY + ny * lineLength;
  const color = colors[game.currentPlayer].dark;

  context.save();
  context.globalAlpha = 0.56 + aim.power * 0.4;
  context.strokeStyle = color;
  context.lineWidth = 2 + aim.power * 2.4;
  if (aim.power > 0.72) {
    context.shadowColor = color;
    context.shadowBlur = 3 + aim.power * 5;
  }
  context.setLineDash([8, 6]);
  context.beginPath();
  context.moveTo(aim.originX, aim.originY);
  context.lineTo(endX, endY);
  context.stroke();
  context.setLineDash([]);
  context.beginPath();
  context.moveTo(endX - nx * 14 - ny * 7, endY - ny * 14 + nx * 7);
  context.lineTo(endX, endY);
  context.lineTo(endX - nx * 14 + ny * 7, endY - ny * 14 - nx * 7);
  context.stroke();
  context.restore();
}

function drawPowerMeter(context, game) {
  if (!game.isAiming || !game.aim) return;
  const width = 190;
  const x = (BOARD.width - width) / 2;
  const y = 982;
  context.save();
  context.font = "bold 18px 'Gaegu Local', sans-serif";
  context.fillStyle = ink;
  context.fillText("힘", x - 27, y + 7);
  context.strokeStyle = ink;
  context.lineWidth = 2 + game.aim.power * 1.3;
  context.beginPath();
  context.roundRect(x, y - 10, width, 16, 8);
  context.stroke();
  context.fillStyle = colors[game.currentPlayer].mid;
  context.globalAlpha = 0.66 + game.aim.power * 0.34;
  context.beginPath();
  context.roundRect(x + 3, y - 7, Math.max(0, (width - 6) * game.aim.power), 10, 5);
  context.fill();
  context.restore();
}
