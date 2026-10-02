export const OVERLAP_WIN = 0.30;
export const OVERLAP_PERFECT = 0.70;
export const NEAR_MISS = 0.14;

export function rectangleCorners(piece) {
  const c = Math.cos(piece.angle);
  const s = Math.sin(piece.angle);
  const hw = piece.width / 2;
  const hh = piece.height / 2;
  return [
    [-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]
  ].map(([x, y]) => ({ x: piece.x + x * c - y * s, y: piece.y + x * s + y * c }));
}

function signedArea(polygon) {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

function cross(ax, ay, bx, by) { return ax * by - ay * bx; }

function lineIntersection(start, end, edgeStart, edgeEnd) {
  const rx = end.x - start.x;
  const ry = end.y - start.y;
  const sx = edgeEnd.x - edgeStart.x;
  const sy = edgeEnd.y - edgeStart.y;
  const denominator = cross(rx, ry, sx, sy);
  if (Math.abs(denominator) < 1e-9) return { x: end.x, y: end.y };
  const t = cross(edgeStart.x - start.x, edgeStart.y - start.y, sx, sy) / denominator;
  return { x: start.x + t * rx, y: start.y + t * ry };
}

export function intersectionArea(first, second) {
  let output = rectangleCorners(first);
  const clip = rectangleCorners(second);
  const orientation = Math.sign(signedArea(clip)) || 1;

  for (let i = 0; i < clip.length && output.length; i++) {
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    const input = output;
    output = [];
    let start = input[input.length - 1];
    let startSide = orientation * cross(b.x - a.x, b.y - a.y, start.x - a.x, start.y - a.y);
    for (const end of input) {
      const endSide = orientation * cross(b.x - a.x, b.y - a.y, end.x - a.x, end.y - a.y);
      const startInside = startSide >= -1e-8;
      const endInside = endSide >= -1e-8;
      if (endInside) {
        if (!startInside) output.push(lineIntersection(start, end, a, b));
        output.push(end);
      } else if (startInside) {
        output.push(lineIntersection(start, end, a, b));
      }
      start = end;
      startSide = endSide;
    }
  }

  return output.length >= 3 ? Math.abs(signedArea(output)) : 0;
}

export function overlapRatio(first, second) {
  if (!first || !second) return 0;
  const smallerArea = Math.min(first.width * first.height, second.width * second.height);
  if (smallerArea <= 0) return 0;
  return Math.max(0, Math.min(1, intersectionArea(first, second) / smallerArea));
}

export function centerDistance(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

export function classifyOverlap(ratio) {
  if (ratio >= OVERLAP_PERFECT) return "perfect";
  if (ratio >= OVERLAP_WIN) return "partial";
  if (ratio >= NEAR_MISS) return "near";
  return "none";
}
