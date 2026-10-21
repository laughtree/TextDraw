export interface Point {
  x: number;
  y: number;
}

export type ShapeKind = 'line' | 'circle' | 'rect';

export interface ShapeStyle {
  color: string;
  width: number;
}

/** The rectangle spanned by two corners, whichever way it was dragged. */
export function normalizeBox(a: Point, b: Point): { x: number; y: number; w: number; h: number } {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
  };
}

/**
 * Outline a shape dragged from `a` to `b`: a line, a rectangle with those corners, or the
 * ellipse inscribed in that rectangle (a square gives a circle). The stroke is centred on the path.
 */
export function drawShape(
  ctx: CanvasRenderingContext2D,
  kind: ShapeKind,
  a: Point,
  b: Point,
  style: ShapeStyle,
): void {
  const { x, y, w, h } = normalizeBox(a, b);
  ctx.save();
  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = kind === 'rect' ? 'miter' : 'round';
  ctx.beginPath();
  if (kind === 'line') {
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  } else if (kind === 'rect') {
    ctx.rect(x, y, w, h);
  } else {
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  }
  ctx.stroke();
  ctx.restore();
}
