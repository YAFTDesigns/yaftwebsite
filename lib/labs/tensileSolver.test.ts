import { describe, it, expect } from 'vitest';
import { Membrane, defaultAnchors, DEFAULT_PARAMS, REST_SPEED, PLAN_RADIUS, type Anchor, type SolverParams } from './tensileSolver';

function relax(m: Membrane, params: SolverParams, maxFrames = 4000) {
  for (let f = 0; f < maxFrames; f++) {
    m.advance(1 / 60, params);
    if (m.maxSpeed < REST_SPEED) return f;
  }
  return -1;
}
const centreY = (m: Membrane) => m.pos[1];
const nodeAt = (m: Membrane, x: number, z: number) => {
  let best = 0, bd = Infinity;
  for (let i = 0; i < m.count; i++) {
    const d = (m.plan[i * 2] - x) ** 2 + (m.plan[i * 2 + 1] - z) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
};
const ringAnchors = (heights: number[]): Anchor[] =>
  heights.map((y, j) => {
    const a = (j / heights.length) * Math.PI * 2;
    const x = PLAN_RADIUS * Math.cos(a), z = PLAN_RADIUS * Math.sin(a);
    return { id: `e${j}`, kind: 'edge', x, z, pos: [x, y, z] };
  });

describe('Membrane dynamic relaxation (ring boundary)', () => {
  it('converges to rest for the default configuration', () => {
    const m = new Membrane(24, defaultAnchors());
    expect(relax(m, DEFAULT_PARAMS)).toBeGreaterThan(0);
  });

  it('never moves anchor nodes', () => {
    const anchors = defaultAnchors();
    const m = new Membrane(20, anchors);
    relax(m, DEFAULT_PARAMS, 300);
    for (const a of anchors) {
      const node = nodeAt(m, a.x, a.z);
      expect(m.pos[node * 3 + 1]).toBeCloseTo(a.pos[1], 5);
    }
  });

  it('stays finite at maximum density, stiffness and prestress', () => {
    const m = new Membrane(48, defaultAnchors());
    const p = { stiffness: 8, prestress: 0.95, gravity: true };
    for (let f = 0; f < 200; f++) m.advance(1 / 60, p);
    expect(Number.isFinite(m.maxSpeed)).toBe(true);
    expect(Array.from(m.pos).every(Number.isFinite)).toBe(true);
  });

  it('keeps a flat boundary flat (minimal surface is a plane) without gravity', () => {
    const m = new Membrane(16, defaultAnchors(0.6));
    relax(m, { stiffness: 3, prestress: 0.9, gravity: false });
    for (let i = 0; i < m.count; i++) expect(m.pos[i * 3 + 1]).toBeCloseTo(0.6, 2);
  });

  it('alternating boundary: interior stays within boundary heights (maximum principle)', () => {
    const m = new Membrane(20, ringAnchors([0.5, 4, 0.5, 4, 0.5, 4]));
    relax(m, { stiffness: 3, prestress: 0.95, gravity: false });
    for (let i = 0; i < m.count; i++) {
      const y = m.pos[i * 3 + 1];
      expect(y).toBeGreaterThan(0.3);
      expect(y).toBeLessThan(4.2);
    }
    expect(centreY(m)).toBeGreaterThan(1.5);
    expect(centreY(m)).toBeLessThan(3.0);
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
    relax(m, { stiffness: 1.5, prestress: 0.1, gravity: true });
    for (let i = 0; i < m.count; i++) expect(m.pos[i * 3 + 1]).toBeGreaterThanOrEqual(0.0199);
  });

  it('keeps form when density changes (resample) and reconverges', () => {
    const m1 = new Membrane(16, defaultAnchors());
    relax(m1, DEFAULT_PARAMS);
    const before = m1.surfaceArea();
    const m2 = new Membrane(28, m1.anchors, m1);
    expect(Math.abs(m2.surfaceArea() - before) / before).toBeLessThan(0.15);
    expect(relax(m2, DEFAULT_PARAMS)).toBeGreaterThan(0);
  });

  it('follows moved masts', () => {
    const anchors = defaultAnchors();
    const m = new Membrane(20, anchors);
    relax(m, DEFAULT_PARAMS);
    const area = m.surfaceArea();
    for (const a of anchors) if (a.kind === 'mast') a.pos[1] = 6;
    m.anchorsMoved();
    relax(m, DEFAULT_PARAMS);
    expect(m.surfaceArea()).toBeGreaterThan(area * 1.05);
  });

  it('can be pulled by hand, follows the pull, then relaxes back after release', () => {
    const m = new Membrane(20, defaultAnchors());
    relax(m, DEFAULT_PARAMS);
    const node = nodeAt(m, 0.3, 0.2);
    const rest = m.pos[node * 3 + 1];
    m.startGrab(node);
    m.moveGrab([0, 1.5, 0]);
    for (let f = 0; f < 150; f++) m.advance(1 / 60, DEFAULT_PARAMS);
    expect(m.pos[node * 3 + 1]).toBeGreaterThan(rest + 0.4);
    m.endGrab();
    expect(relax(m, DEFAULT_PARAMS)).toBeGreaterThan(0);
    expect(Math.abs(m.pos[node * 3 + 1] - rest)).toBeLessThan(0.05);
  });
});
