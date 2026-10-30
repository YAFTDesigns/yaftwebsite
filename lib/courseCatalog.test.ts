import { describe, it, expect } from 'vitest';
import { resolveSelection, advanceFor, type CatalogItem } from './courseCatalog';

const cat: CatalogItem[] = [
  { key: 'bundle:rh-gh', kind: 'bundle', title: 'Rhino + Grasshopper', feeInr: 55000, courseSlugs: ['rhino-architecture', 'grasshopper-architecture'], description: '' },
  { key: 'course:rhino-architecture', kind: 'course', title: 'Rhino3D for Architecture', feeInr: 30000, courseSlugs: ['rhino-architecture'], description: '' },
  { key: 'course:grasshopper-architecture', kind: 'course', title: 'Grasshopper for Architecture', feeInr: 35000, courseSlugs: ['grasshopper-architecture'], description: '' },
  { key: 'course:revit', kind: 'course', title: 'Revit', feeInr: 20000, courseSlugs: ['revit'], description: '' },
];

describe('resolveSelection', () => {
  it('prices a single course from the catalog', () => {
    const r = resolveSelection(cat, ['course:rhino-architecture']);
    expect(r.ok && r.baseTotal).toBe(30000);
  });
  it('the combo is cheaper than the two courses and uses its own fee', () => {
    const r = resolveSelection(cat, ['bundle:rh-gh']);
    expect(r.ok && r.baseTotal).toBe(55000);
    expect(r.ok && r.courseSlugs).toEqual(['rhino-architecture', 'grasshopper-architecture']);
  });
  it('a combo plus a separate course adds up', () => {
    const r = resolveSelection(cat, ['bundle:rh-gh', 'course:revit']);
    expect(r.ok && r.baseTotal).toBe(75000);
  });
  it('rejects a course chosen twice, e.g. alone and inside the combo', () => {
    expect(resolveSelection(cat, ['bundle:rh-gh', 'course:rhino-architecture']).ok).toBe(false);
  });
  it('ignores duplicates of the same key, rejects unknown keys and bad input', () => {
    const r = resolveSelection(cat, ['course:revit', 'course:revit']);
    expect(r.ok && r.baseTotal).toBe(20000);
    expect(resolveSelection(cat, ['course:nope']).ok).toBe(false);
    expect(resolveSelection(cat, []).ok).toBe(false);
    expect(resolveSelection(cat, 'course:revit').ok).toBe(false);
  });
});

describe('advanceFor', () => {
  it('is half, rounded down, balance gets the remainder', () => {
    expect(advanceFor(55000)).toBe(27500);
    expect(advanceFor(55001)).toBe(27500);
    expect(advanceFor(2)).toBe(1);
  });
});
