import { describe, it, expect } from 'vitest';
import { Membrane, defaultAnchors, DEFAULT_PARAMS, REST_SPEED, type Anchor, type SolverParams } from './tensileSolver';

function relax(m: Membrane, params: SolverParams, maxFrames = 3000) {
  for (let f = 0; f < maxFrames; f++) {
    m.advance(1 / 60, params);
    if (m.maxSpeed < REST_SPEED) return f;
  }
  return -1;
}
const centreY = (m: Membrane) => m.pos[((m.n >> 1) * m.n + (m.n >> 1)) * 3 + 1];

describe('Membrane dynamic relaxation', () => {
  it('converges to rest for the default configuration', () => {
    const m = new Membrane(24, defaultAnchors());
    expect(relax(m, DEFAULT_PARAMS)).toBeGreaterThan(0);
  });

  it('never moves anchor nodes', () => {
    const anchors = defaultAnchors();
    const m = new Membrane(20, anchors);
    relax(m, DEFAULT_PARAMS, 300);
    for (const a of anchors) {
      const node = Math.round(a.v * 19) * 20 + Math.round(a.u * 19);
      expect(m.pos[node * 3 + 1]).toBeCloseTo(a.pos[1], 5);
    }
  });

  it('stays finite at maximum density and stiffness', () => {
    const m = new Membrane(48, defaultAnchors());
    const p = { stiffness: 8, prestress: 0.95, gravity: true };
    for (let f = 0; f < 200; f++) m.advance(1 / 60, p);
    expect(Number.isFinite(m.maxSpeed)).toBe(true);
    expect(Array.from(m.pos).every(Number.isFinite)).toBe(true);
  });

  it('keeps a flat boundary flat (minimal surface is a plane) without gravity', () => {
    const anchors: Anchor[] = defaultAnchors(0.6);
    const m = new Membrane(16, anchors);
    relax(m, { stiffness: 3, prestress: 0.9, gravity: false });
    for (let i = 0; i < m.count; i++) expect(m.pos[i * 3 + 1]).toBeCloseTo(0.6, 2);
  });

  it('saddle boundary: interior stays within boundary heights and centre sits near the mean (max principle)', () => {
    const s = 4;
    const at = (u: number, v: number, y: number): [number, number, number] => [(u - 0.5) * 8, y, (v - 0.5) * 8];
    const anchors: Anchor[] = [
      { id: 'a', kind: 'corner', u: 0, v: 0, pos: at(0, 0, 0) },
      { id: 'b', kind: 'corner', u: 1, v: 0, pos: at(1, 0, s) },
      { id: 'c', kind: 'corner', u: 0, v: 1, pos: at(0, 1, s) },
      { id: 'd', kind: 'corner', u: 1, v: 1, pos: at(1, 1, 0) },
    ];
    const m = new Membrane(17, anchors);
    relax(m, { stiffness: 3, prestress: 0.95, gravity: false });
    for (let i = 0; i < m.count; i++) {
      const y = m.pos[i * 3 + 1];
      expect(y).toBeGreaterThan(-0.2);
      expect(y).toBeLessThan(s + 0.2);
    }
    expect(centreY(m)).toBeGreaterThan(1.4);
    expect(centreY(m)).toBeLessThan(2.6);
  });

  it('gravity sags a flat-boundary surface and higher prestress sags it less', () => {
    const run = (prestress: number, gravity: boolean) => {
      const m = new Membrane(20, defaultAnchors(0.6));
      relax(m, { stiffness: 3, prestress, gravity });
      return centreY(m);
    };
    const noG = run(0.7, false);
    const slack = run(0.2, true);
    const taut = run(0.9, true);
    expect(noG).toBeCloseTo(0.6, 2);
    expect(slack).toBeLessThan(noG - 0.1);
    expect(taut).toBeGreaterThan(slack);
  });

  it('never passes through the ground plane', () => {
    const m = new Membrane(20, defaultAnchors(0.6));
    relax(m, { stiffness: 1, prestress: 0.1, gravity: true });
    for (let i = 0; i < m.count; i++) expect(m.pos[i * 3 + 1]).toBeGreaterThanOrEqual(0.0199);
  });

  it('keeps form when density changes (resample) and reconverges', () => {
    const m1 = new Membrane(16, defaultAnchors());
    relax(m1, DEFAULT_PARAMS);
    const before = centreY(m1);
    const m2 = new Membrane(28, m1.anchors, m1);
    expect(Math.abs(centreY(m2) - before)).toBeLessThan(0.35);
    expect(relax(m2, DEFAULT_PARAMS)).toBeGreaterThan(0);
  });

  it('follows a moved mast', () => {
    const anchors = defaultAnchors();
    const m = new Membrane(20, anchors);
    relax(m, DEFAULT_PARAMS);
    const low = centreY(m);
    anchors.find((a) => a.id === 'mastA')!.pos[1] = 5.5;
    anchors.find((a) => a.id === 'mastB')!.pos[1] = 5.5;
    m.anchorsMoved();
    relax(m, DEFAULT_PARAMS);
    expect(centreY(m)).toBeGreaterThan(low + 0.5);
  });
});
