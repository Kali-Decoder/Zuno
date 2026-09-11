/** Point in SVG user space. */
export type ChartPoint = { x: number; y: number };

/**
 * Catmull–Rom spline → cubic Bézier SVG path.
 * Produces a smooth line through every point (no sharp corners).
 * `tension` 0–1; ~0.5 is a good default (higher = tighter / less overshoot).
 */
export function smoothLinePath(points: ChartPoint[], tension = 0.5): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const t = Math.max(0, Math.min(1, tension));
  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * t * 2;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * t * 2;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * t * 2;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * t * 2;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}

/** Closed area under a smooth line (for gradient fills). */
export function smoothAreaPath(points: ChartPoint[], baselineY: number, tension = 0.5): string {
  if (points.length === 0) return "";
  const line = smoothLinePath(points, tension);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}
