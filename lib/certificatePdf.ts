import path from 'path';

// The template image is 3508x2480px (A4 landscape @ 300dpi). Rather than
// work in pixels, the PDF page is set to actual A4 landscape point
// dimensions and every coordinate below is scaled from the pixel
// positions we measured via OCR against the real template -- see the
// coordinate-finding work in chat: 'has completed' row at px(1524),
// 'CERTIFICATE ID:' ending at px(1378), etc. If the template image is
// ever redesigned, these constants need re-measuring against the new
// file, not guessed.

const TEMPLATE_PATH = path.join(process.cwd(), 'public', 'assets', 'certificates', 'template-base.jpg');

const IMG_W = 3508;
const IMG_H = 2480;
const PAGE_W = 841.89; // A4 landscape, points
const PAGE_H = 595.28;
const SX = PAGE_W / IMG_W;
const SY = PAGE_H / IMG_H;

function px(x: number) { return x * SX; }
function py(y: number) { return y * SY; }
function psize(s: number) { return s * SX; } // font sizes scale with X (uniform scale, SX≈SY)

// Colors sampled directly from the real logos in the template (see chat).
export const COURSE_ACCENTS: Record<string, { label: string; color: string }> = {
  rhino:       { label: 'RHINOCEROS 3D', color: '#8d142c' }, // sampled from Rhinoceros logo
  grasshopper: { label: 'GRASSHOPPER',   color: '#51c715' }, // sampled from Grasshopper icon
  default:     { label: '',              color: '#1e1e1e' },
};

export type CertificateData = {
  studentName: string;
  courseKey: keyof typeof COURSE_ACCENTS; // 'rhino' | 'grasshopper' | ...
  courseSuffix: string;    // e.g. "FOR ARCHITECTURE"
  durationHours: string;   // e.g. "30"
  certificateId: string;   // e.g. "YAFT202607-05" (full string, no separate prefix)
};

export async function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [PAGE_W, PAGE_H], margin: 0 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.image(TEMPLATE_PATH, 0, 0, { width: PAGE_W, height: PAGE_H });

    const ink = '#1e1e1e';

    // Student name -- sits on the dotted line above "has participated..."
    doc.font('Helvetica-Bold').fontSize(psize(56)).fillColor(ink)
       .text(data.studentName.toUpperCase(), px(271), py(1090), { lineBreak: false });

    // Course line -- accent-colored product name + dark suffix, single row
    const accent = COURSE_ACCENTS[data.courseKey] ?? COURSE_ACCENTS.default;
    const courseY = py(1524);
    doc.font('Helvetica-Bold').fontSize(psize(50)).fillColor(accent.color)
       .text(accent.label + ' ', px(271), courseY, { lineBreak: false, continued: true });
    doc.fillColor(ink).text(data.courseSuffix, { lineBreak: false });

    // Duration -- narrow gap between "completed," and "hour"
    doc.font('Helvetica-Bold').fontSize(psize(50)).fillColor(ink)
       .text(data.durationHours, px(2260), py(1524), { lineBreak: false });

    // Certificate ID -- right after "ID:"
    doc.font('Helvetica').fontSize(psize(46)).fillColor(ink)
       .text(data.certificateId, px(1400), py(1752), { lineBreak: false });

    doc.end();
  });
}
