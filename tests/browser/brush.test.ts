import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openApp, type App } from './harness';

let app: App;
beforeEach(async () => {
  app = await openApp('/index.html');
  await app.frames();
});
afterEach(() => app.close());

const ring = () => app.q('#brush');
const box = () => ring().getBoundingClientRect();
const centre = () => {
  const r = box();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

describe('brush ring', () => {
  it('is hidden until the pointer enters the canvas', () => {
    expect(ring().hidden).toBe(true);
  });

  it('replaces the system cursor', () => {
    expect(app.win.getComputedStyle(app.view).cursor).toBe('none');
  });

  it('follows a hovering mouse at the width the pen will paint', () => {
    app.setValue('#size', '20');
    app.fire('pointermove', 100, 80);
    const v = app.view.getBoundingClientRect();
    expect(ring().hidden).toBe(false);
    expect(box().width).toBe(20);
    expect(centre().x).toBeCloseTo(v.left + 100, 1);
    expect(centre().y).toBeCloseTo(v.top + 80, 1);
    expect(ring().classList.contains('erase')).toBe(false);
  });

  it('shows the dashed, 2.5× wider ring for the eraser', () => {
    app.click('#tErase');
    app.setValue('#size', '20');
    app.fire('pointermove', 100, 80);
    expect(ring().classList.contains('erase')).toBe(true);
    expect(box().width).toBe(50);
    expect(app.win.getComputedStyle(ring()).borderTopStyle).toBe('dashed');
  });

  it('keeps thin brushes visible', () => {
    app.setValue('#size', '2');
    app.fire('pointermove', 100, 80);
    expect(box().width).toBe(6);
  });

  it('hides when the pointer leaves the canvas', () => {
    app.fire('pointermove', 100, 80);
    app.fire('pointerleave', 100, 80);
    expect(ring().hidden).toBe(true);
  });

  it('stays while a mouse button is released over the canvas', () => {
    app.fire('pointerdown', 100, 80);
    app.fire('pointerup', 100, 80);
    expect(ring().hidden).toBe(false);
  });

  it('shows for a finger only while it is down', () => {
    const touch = { pointerType: 'touch' };
    app.fire('pointerdown', 100, 80, touch);
    expect(ring().hidden).toBe(false);
    app.fire('pointermove', 120, 90, touch);
    expect(centre().x).toBeCloseTo(app.view.getBoundingClientRect().left + 120, 1);
    app.fire('pointerup', 120, 90, touch);
    expect(ring().hidden).toBe(true);
  });

  it('hides when the gesture is cancelled', () => {
    app.fire('pointerdown', 100, 80, { pointerType: 'touch' });
    app.fire('pointercancel', 100, 80, { pointerType: 'touch' });
    expect(ring().hidden).toBe(true);
  });

  it('previews the width at the stage centre while the slider moves, then fades away', async () => {
    app.setValue('#size', '30');
    const s = app.q('#stage').getBoundingClientRect();
    expect(ring().hidden).toBe(false);
    expect(box().width).toBe(30);
    expect(centre().x).toBeCloseTo(s.left + s.width / 2, 0);
    expect(centre().y).toBeCloseTo(s.top + s.height / 2, 0);
    await app.sleep(1300);
    expect(ring().hidden).toBe(true);
  });

  it('does not repaint the canvas', async () => {
    const before = app.view.toDataURL();
    app.fire('pointermove', 100, 80);
    app.fire('pointermove', 140, 90);
    await app.frames();
    expect(app.view.toDataURL()).toBe(before);
  });
});
