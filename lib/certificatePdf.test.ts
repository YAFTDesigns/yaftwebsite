import { describe, it, expect } from 'vitest';
import { generateCertificatePDF, COURSE_ACCENTS } from './certificatePdf';

describe('COURSE_ACCENTS', () => {
  it('has the two currently-supported courses with real sampled colors', () => {
    expect(COURSE_ACCENTS.rhino.color).toBe('#8d142c');
    expect(COURSE_ACCENTS.grasshopper.color).toBe('#51c715');
  });

  it('has a default fallback for unknown course keys', () => {
    expect(COURSE_ACCENTS.default).toBeDefined();
  });
});

describe('generateCertificatePDF', () => {
  it('produces a non-empty PDF buffer for a valid rhino certificate', async () => {
    const buf = await generateCertificatePDF({
      studentName: 'Test Student',
      courseKey: 'rhino',
      courseSuffix: 'FOR ARCHITECTURE',
      durationHours: '30',
      certificateId: 'YAFT202607-99',
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(10000);
    // PDF files start with the %PDF magic bytes
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('produces a valid PDF for a grasshopper certificate too', async () => {
    const buf = await generateCertificatePDF({
      studentName: 'Another Student',
      courseKey: 'grasshopper',
      courseSuffix: 'FOR ARCHITECTURE',
      durationHours: '40',
      certificateId: 'YAFT202607-100',
    });
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('falls back gracefully for an unrecognized course key rather than throwing', async () => {
    const buf = await generateCertificatePDF({
      courseKey: 'revit',
      studentName: 'Edge Case',
      courseSuffix: 'FOR BIM',
      durationHours: '20',
      certificateId: 'YAFT202607-101',
    });
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
  });
});
