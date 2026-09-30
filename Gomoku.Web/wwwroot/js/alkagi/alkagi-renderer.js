import { BOARD, livingPieces } from "./alkagi-state.js";

const ink = "#47443f";
const colors = {
  1: { light: "#ffd4c7", mid: "#cf554b", dark: "#8e302d", mark: "#a6423c" },
  2: { light: "#d9efff", mid: "#5a91c7", dark: "#31577f", mark: "#4678a8" },
};

export function renderGame(context, game) {
  context.clearRect(0, 0, BOARD.width, BOARD.height);
  context.fillStyle = "#fffdf7";
  context.fillRect(0, 0, BOARD.width, BOARD.height);
  drawPaperMarks(context);
  drawSketchBorder(context);
  drawAim(context, game);
  for (const piece of livingPieces(game)) drawPiece(context, piece, game.isAiming && game.aim?.pieceId === piece.id);
  drawPowerMeter(context, game);
}

function drawPaperMarks(context) {
  context.save();
  context.strokeStyle = "#c8c2b8";
  context.globalAlpha = 0.22;
  context.lineWidth = 1;
  for (let i = 0; i < 11; i += 1) {
    const x = 74 + i * 83;
    context.beginPath();
    context.moveTo(x, 58 + (i % 3) * 5);
    context.lineTo(x - 8, 68 + (i % 3) * 5);
    context.stroke();
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

function drawPiece(context, piece, selected) {
  const radius = BOARD.radius;
  const color = colors[piece.player];
  context.save();
  context.shadowColor = "#26231f3d";
  context.shadowBlur = 5;
  context.shadowOffsetX = 2;
  context.shadowOffsetY = 3;
  const gradient = context.createRadialGradient(piece.x - 8, piece.y - 9, 3, piece.x, piece.y, radius);
  gradient.addColorStop(0, color.light);
  gradient.addColorStop(0.67, color.mid);
  gradient.addColorStop(1, color.dark);
  context.beginPath();
  context.arc(piece.x, piece.y, radius, 0, Math.PI * 2);
  context.fillStyle = gradient;
  context.fill();
  context.restore();

  for (let line = 0; line < 2; line += 1) {
    context.beginPath();
    context.ellipse(piece.x + (line ? 1 : -1), piece.y, radius - line * 2, radius - line * 2 + (line ? 1 : -1), (line ? -1 : 1) * 0.06, 0.15, Math.PI * 1.85);
    context.strokeStyle = line ? "#fff9" : color.mark;
    context.lineWidth = line ? 1 : 1.3;
    context.globalAlpha = line ? 0.72 : 0.48;
    context.stroke();
  }
  context.globalAlpha = 1;

  if (selected) {
    context.beginPath();
    context.arc(piece.x, piece.y, radius + 5, 0, Math.PI * 2);
    context.setLineDash([3, 4]);
    context.strokeStyle = color.dark;
    context.lineWidth = 2;
    context.stroke();
    context.setLineDash([]);
  }
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
  context.globalAlpha = 0.82;
  context.strokeStyle = color;
  context.lineWidth = 3;
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
  const y = 575;
  context.save();
  context.font = "bold 18px 'Gaegu Local', sans-serif";
  context.fillStyle = ink;
  context.fillText("힘", x - 27, y + 7);
  context.strokeStyle = ink;
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(x, y - 10, width, 16, 8);
  context.stroke();
  context.fillStyle = colors[game.currentPlayer].mid;
  context.globalAlpha = 0.8;
  context.beginPath();
  context.roundRect(x + 3, y - 7, Math.max(0, (width - 6) * game.aim.power), 10, 5);
  context.fill();
  context.restore();
}
