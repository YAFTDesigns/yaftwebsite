import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import path from 'path';

const ART_BADGE_PATH = path.join(process.cwd(), 'public', 'assets', 'logos', 'art-badge.png');
const PAID_STAMP_PATH = path.join(process.cwd(), 'public', 'assets', 'images', 'paid-in-full.png');

const YAFT_EMAIL = 'yaftdesigns@gmail.com';

async function getGmailClient() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth });
}

function amountInWords(n: number): string {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function belowThousand(num: number): string {
    if (num === 0) return '';
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num/10)] + (num%10 ? ' ' + ones[num%10] : '');
    return ones[Math.floor(num/100)] + ' Hundred' + (num%100 ? ' ' + belowThousand(num%100) : '');
  }
  n = Math.floor(n);
  if (n === 0) return 'Zero Rupees Only';
  const parts: string[] = [];
  const crore = Math.floor(n/10000000); n %= 10000000;
  const lakh  = Math.floor(n/100000);   n %= 100000;
  const thous = Math.floor(n/1000);     n %= 1000;
  if (crore) parts.push(belowThousand(crore) + ' Crore');
  if (lakh)  parts.push(belowThousand(lakh)  + ' Lakh');
  if (thous) parts.push(belowThousand(thous) + ' Thousand');
  if (n)     parts.push(belowThousand(n));
  return parts.join(' ') + ' Rupees Only';
}

async function generatePDF(data: any): Promise<Buffer> {
  const { default: PDFDocument } = await import('pdfkit');
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const H = doc.page.height;
    const M = 57; // 20mm in points
    console.log('[invoice-pdf] checkpoint: page setup', { W, H, M });

    // YAFT logo text
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#000000')
       .text('YAFT', M, 30);
    doc.font('Helvetica').fontSize(10)
       .text('DESIGNS', M, 52);

    // ART badge
    try {
      doc.image(ART_BADGE_PATH,
        W - 160, 18, { width: 120, height: 90 });
    } catch (e) {
      console.error('[invoice-pdf] ART badge image failed:', e);
    }
    console.log('[invoice-pdf] checkpoint: header done');

    // Dotted divider
    doc.save().dash(2, { space: 3 }).moveTo(M, 115).lineTo(W - M, 115)
       .strokeColor('#aaaaaa').lineWidth(0.5).stroke().restore();

    // Title
    const invoiceType = data.invoice_type || 'training';
    const isTest = invoiceType === 'test';
    const showHrs = invoiceType === 'training';
    const titleMap: Record<string, string> = {
      training:    'TRAINING INVOICE',
      consultancy: 'INVOICE',
      test:        'TEST INVOICE',
    };
    const invoiceTitle = titleMap[invoiceType] ?? 'INVOICE';

    doc.font('Helvetica-Bold').fontSize(16).fillColor(isTest ? '#aaaaaa' : '#555555')
       .text(invoiceTitle, 0, 128, { align: 'center' });

    // From block
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#000000')
       .text('YAFT DESIGNS', M, 162);
    doc.font('Helvetica').fontSize(9).fillColor('#333333');
    const fromLines = [
      '43,WD-10,ST-5, (Thalakaraipudhur),',
      'Perundurai,Erode Dt, Tamilnadu. - 638052.',
      'Phone: +(91) 97893 03375',
      '',
      'Email: yaftdesigns@gmail.com',
    ];
    let fy = 178;
    fromLines.forEach(line => { doc.text(line, M, fy); fy += 14; });

    // Date / No boxes
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
    doc.text('DATE', 369, 162).text('No #', 369, 176);
    doc.rect(420, 159, 119, 17).stroke();
    doc.rect(420, 173, 119, 17).stroke();
    doc.font('Helvetica').fontSize(9);
    doc.text(data.date, 425, 162).text(data.invoice_no, 425, 176);

    // Bill To
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#E63946')
       .text('BILL TO :', M, 280);
    doc.font('Helvetica').fontSize(9).fillColor('#000000');
    let by = 296;
    doc.text(data.client_name, M, by); by += 16;
    if (data.client_type === 'company' && data.client_company) {
      doc.text(data.client_company, M, by); by += 16;
    }
    doc.text(`Email : ${data.client_email}`, M, by); by += 16;
    if (data.client_type === 'company') {
      doc.text(`GST No : ${data.client_gst}`, M, by);
    } else {
      doc.text(`PAN ID : ${data.client_pan}`, M, by);
    }
    console.log('[invoice-pdf] checkpoint: bill-to done');

    // Line items table
    const tableTop = 390;
    // Table columns — hide hrs for consultancy/test
    const cols   = showHrs ? [M, M+43, M+284, M+327, M+398] : [M, M+43, M+327, M+398];
    const colW   = showHrs ? [43, 241, 43, 71, 76]           : [43, 284, 71, 76];
    const headers = showHrs
      ? ['S Nos','Description','hr(s)','Quantity','Total Price (Rs)']
      : ['S Nos','Description','Quantity','Total Price (Rs)'];

    // Header row
    doc.rect(M, tableTop, W - 2*M, 18).fill('#f0f0f0').stroke('#000000');
    doc.font('Helvetica-BoldOblique').fontSize(8).fillColor('#000000');
    headers.forEach((h, i) => {
      doc.text(h, cols[i]+3, tableTop+5, { width: colW[i]-6, align: 'center' });
    });

    // Data rows
    let subtotal = 0;
    let ry = tableTop + 18;
    data.items.forEach((item: any, idx: number) => {
      const total = item.rate * item.qty; subtotal += total;
      doc.rect(M, ry, W-2*M, 18).stroke('#aaaaaa');
      doc.font('Helvetica').fontSize(8).fillColor('#000000');
      doc.text(String(idx+1), cols[0]+3, ry+5, { width: colW[0]-6, align: 'center' });
      doc.text(item.desc, cols[1]+3, ry+5, { width: colW[1]-6 });
      if (showHrs) {
        doc.text(String(item.hrs), cols[2]+3, ry+5, { width: colW[2]-6, align: 'center' });
        doc.text(item.qty.toFixed(2), cols[3]+3, ry+5, { width: colW[3]-6, align: 'center' });
        doc.text(total.toLocaleString('en-IN', { minimumFractionDigits: 2 }), cols[4]+3, ry+5, { width: colW[4]-6, align: 'right' });
      } else {
        doc.text(item.qty.toFixed(2), cols[2]+3, ry+5, { width: colW[2]-6, align: 'center' });
        doc.text(total.toLocaleString('en-IN', { minimumFractionDigits: 2 }), cols[3]+3, ry+5, { width: colW[3]-6, align: 'right' });
      }
      ry += 18;
    });
    // Empty rows
    for (let e = 0; e < 4 - data.items.length; e++) {
      doc.rect(M, ry, W-2*M, 18).stroke('#aaaaaa');
      doc.font('Helvetica').fontSize(8).fillColor('#000000');
      const lastCol = showHrs ? 4 : 3;
      doc.text('-', cols[lastCol]+3, ry+5, { width: colW[lastCol]-6, align: 'right' });
      ry += 18;
    }

    // GST calc
    const intra = data.client_state.toLowerCase().includes('tamil');
    const cgst  = intra ? subtotal * 0.09 : 0;
    const sgst  = intra ? subtotal * 0.09 : 0;
    const igst  = !intra ? subtotal * 0.18 : 0;
    const grandTotal = subtotal + cgst + sgst + igst;

    // Tax summary
    const tx = 369; let ty2 = ry + 10;
    const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const taxRows = [
      ['SUBTOTAL', fmt(subtotal)],
      ...(intra ? [['CGST 9%', fmt(cgst)], ['SGST 9%', fmt(sgst)]]
                : [['IGST 18%', fmt(igst)]]),
      ['SHIPPING', '-'], ['OTHER', '-'],
    ];
    doc.font('Helvetica').fontSize(8).fillColor('#000000');
    taxRows.forEach(([label, val]) => {
      doc.text(label, tx, ty2);
      doc.text(val, 0, ty2, { align: 'right', width: W - M });
      ty2 += 17;
    });
    ty2 += 5;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('TOTAL (INR)', tx, ty2);
    doc.text(`INR ${fmt(grandTotal)}`, 0, ty2, { align: 'right', width: W - M });
    doc.rect(tx - 5, ty2 - 3, W - tx - M + 5, 17).stroke();
    ty2 += 24;

    doc.font('Helvetica').fontSize(8).fillColor('#000000');
    doc.text('ADVANCE PAID', tx, ty2);
    doc.rect(tx + 79, ty2 - 2, 119, 14).fill('#cce0f5').stroke('#000000');
    ty2 += 22;
    doc.text('BALANCE AMOUNT', tx, ty2);
    doc.rect(tx + 79, ty2 - 2, 119, 14).fill('#cce0f5').stroke('#000000');
    ty2 += 18;

    // Amount in words
    doc.font('Helvetica-Oblique').fontSize(8).fillColor('#555555')
       .text(`In Words: ${amountInWords(grandTotal)}`, tx, ty2, { width: W - tx - M });

    // Note + bank — left side
    const ny0 = ry + 10;
    doc.rect(M, ny0, 255, 17).fill('#e8e8e8').stroke('transparent');
    doc.font('Helvetica-BoldOblique').fontSize(8).fillColor('#888888')
       .text('Note', M + 5, ny0 + 4);
    let ny = ny0 + 24;
    doc.font('Helvetica').fontSize(8).fillColor('#000000');
    doc.text('1 . The cheques shall be issued in the name of " YAFT DESIGNS " (or)', M, ny);
    ny += 19;
    doc.font('Helvetica-Bold').fontSize(8).text('2. Bank Transfer', M, ny); ny += 14;
    doc.font('Helvetica').fontSize(8);
    ['Account Name: YAFT DESIGNS',
     'Bank: Axis Bank , NASIYANUR , ERODE',
     'Acc no. : 923020024949657   IFSC CODE: UTIB0001293'].forEach(line => {
      doc.text(line, M, ny); ny += 14;
    });
    doc.font('Helvetica-Bold').fontSize(8).text('GSTIN : 33ANCPY7046B1Z3', M, ny);
    ny += 24;
    doc.font('Helvetica').fontSize(8).text('Terms and Conditions :', M, ny); ny += 14;
    doc.text('1. YAFT DESIGNS invoices are due and payable within 7 days of invoice data.', M, ny);

    // Signature
    const sy = ny + 50;
    doc.font('Helvetica-Oblique').fontSize(10).fillColor('#000000')
       .text('Yokes Marapa', tx, sy - 10);
    doc.moveTo(tx - 5, sy).lineTo(W - M, sy).stroke();
    doc.font('Helvetica').fontSize(8).text('for YAFT DESIGN', tx + 10, sy + 5);

    // Footer dotted line
    doc.save().dash(2, { space: 3 })
       .moveTo(M, H - 62).lineTo(W - M, H - 62)
       .strokeColor('#aaaaaa').lineWidth(0.5).stroke().restore();
    doc.font('Helvetica').fontSize(8).fillColor('#555555')
       .text('If you have any questions about this invoice, please contact', 0, H - 52, { align: 'center' });
    doc.fillColor('#E63946')
       .text('yaftdesigns@gmail.com', 0, H - 38, { align: 'center' });

    // PAID IN FULL stamp — only when balance is 0 and advance > 0
    const advance = data.advance || 0;
    const balance = data.balance ?? (grandTotal - advance);
    if (balance <= 0 && advance > 0) {
      try {
        doc.save();
        doc.rotate(-30, { origin: [W / 2, H / 2] });
        doc.opacity(0.35);
        doc.image(PAID_STAMP_PATH, W / 2 - 140, H / 2 - 80, { width: 280 });
        doc.restore();
      } catch (stampErr) {
        console.error('Paid-in-full stamp failed to render:', stampErr);
      }
    }

    // TEST watermark — text-align:'center' combined with a large font size
    // while a rotation transform is active can make pdfkit produce NaN
    // internally. Centering is done with a fixed width approximation
    // instead of widthOfString(), since widthOfString() depends on
    // pdfkit's AFM font-metric files being loaded from disk at runtime
    // (via fs.readFileSync relative to the package's own directory) —
    // a pattern that can silently fail to bundle correctly in Vercel's
    // serverless function tracing, since it isn't a standard
    // require()/import() the bundler can statically detect.
    if (isTest) {
      try {
        doc.save();
        doc.rotate(-45, { origin: [W / 2, H / 2] });
        doc.opacity(0.07);
        doc.font('Helvetica-Bold').fontSize(120).fillColor('#ff0000');
        // 'TEST' at 120pt Helvetica-Bold is roughly 290pt wide —
        // measured empirically rather than computed at runtime.
        const approxTextWidth = 290;
        doc.text('TEST', W / 2 - approxTextWidth / 2, H / 2 - 60);
        doc.restore();
      } catch (watermarkErr) {
        console.error('Test watermark failed to render:', watermarkErr);
      }
    }

    doc.end();
  });
}

export async function POST(request: NextRequest) {
  const data = await request.json().catch(() => null);
  if (!data) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

  try {
    const pdfBuffer = await generatePDF(data);
    const pdfBase64 = pdfBuffer.toString('base64');

    // Save to Supabase
    const supabase = getSupabaseAdmin();
    const { data: inv, error } = await supabase.from('invoices').insert({
      invoice_no:     data.invoice_no,
      date:           data.date,
      client_name:    data.client_name,
      client_email:   data.client_email,
      client_type:    data.client_type,
      client_pan:     data.client_pan || null,
      client_gst:     data.client_gst || null,
      client_state:   data.client_state,
      items:          data.items,
      total:          data.grand_total,
      advance:        data.advance || 0,
      balance:        data.balance || 0,
      status:         'sent',
    }).select('id').single();

    if (error) {
      console.error('Invoice save error:', error);
      return NextResponse.json(
        { error: `Invoice was generated but could not be saved: ${error.message}. It was NOT recorded or emailed — please try again.` },
        { status: 500 }
      );
    }

    // Send via Gmail with PDF attachment
    if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_REFRESH_TOKEN) {
      const gmail = await getGmailClient();
      const boundary = 'yaft_invoice_boundary';
      const altBound = 'yaft_alt_boundary';
      const subject  = `Invoice ${data.invoice_no} - YAFT Designs Training`;
      const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2 });
      const advance = data.advance || 0;
      const balance = data.balance || 0;

      const htmlBody = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;">
  <p style="font-size:14px;line-height:1.8;margin:0 0 12px;">Hi ${data.client_name},</p>
  <p style="font-size:14px;line-height:1.8;margin:0 0 20px;">Please find attached your invoice for YAFT Designs training. Thank you for training with us.</p>
  <table style="font-size:13px;border-collapse:collapse;width:100%;margin-bottom:24px;">
    <tr style="background:#f8f8f8;"><td style="padding:8px 12px;color:#888;">Invoice No</td><td style="padding:8px 12px;font-weight:600;">${data.invoice_no}</td></tr>
    <tr><td style="padding:8px 12px;color:#888;">Date</td><td style="padding:8px 12px;">${data.date}</td></tr>
    <tr style="background:#f8f8f8;"><td style="padding:8px 12px;color:#888;">Total Amount</td><td style="padding:8px 12px;font-weight:600;">INR ${fmt(data.grand_total)}</td></tr>
    ${advance > 0 ? `<tr><td style="padding:8px 12px;color:#888;">Advance Paid</td><td style="padding:8px 12px;">INR ${fmt(advance)}</td></tr>` : ''}
    ${balance > 0 ? `<tr style="background:#fff3f3;"><td style="padding:8px 12px;color:#888;">Balance Due</td><td style="padding:8px 12px;font-weight:600;color:#E63946;">INR ${fmt(balance)}</td></tr>` : ''}
  </table>
  <img src="https://yaftdesigns.com/assets/images/rhino-banner.png" alt="Rhinoceros — design, model, present, analyze, realize" style="width:100%;display:block;margin:0 0 24px;" />
  <hr style="border:none;border-top:1px solid #eee;margin:0 0 20px;">
  <p style="font-size:13px;font-weight:600;color:#111;margin:0 0 8px;">Share your experience</p>
  <p style="font-size:13px;color:#555;line-height:1.7;margin:0 0 12px;">If the training has been useful, we'd love a quick testimonial. It helps other students and professionals find us.</p>
  <a href="https://yaftdesigns.com/#contact" style="display:inline-block;background:#E63946;color:#fff;font-size:12px;padding:9px 18px;border-radius:6px;text-decoration:none;margin-bottom:20px;">Leave a testimonial →</a>
  <hr style="border:none;border-top:1px solid #eee;margin:0 0 20px;">
  <p style="font-size:13px;font-weight:600;color:#111;margin:0 0 8px;">Feature your work on yaftdesigns.com</p>
  <p style="font-size:13px;color:#555;line-height:1.7;margin:0 0 12px;">Once your project is done, submit it to our <strong>YAFT Community Works</strong> wall — a public portfolio space where students and collaborators showcase what they've built. Your card includes your project, tools used, and a link to your portfolio or LinkedIn.</p>
  <a href="https://yaftdesigns.com/projects/community" style="display:inline-block;border:1px solid #E63946;color:#E63946;font-size:12px;padding:9px 18px;border-radius:6px;text-decoration:none;margin-bottom:24px;">Submit your project →</a>
  <hr style="border:none;border-top:1px solid #eee;margin:0 0 16px;">
  <p style="font-size:12px;color:#888;margin:0;line-height:1.7;">YAFT Designs · Authorized Rhino Training Center · Coimbatore, India<br><a href="https://yaftdesigns.com" style="color:#E63946;text-decoration:none;">yaftdesigns.com</a></p>
</div>`;

      const raw = [
        `From: YAFT Designs <${YAFT_EMAIL}>`,
        `To: ${data.client_name} <${data.client_email}>`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        ``,
        `--${boundary}`,
        `Content-Type: text/html; charset=utf-8`,
        ``,
        htmlBody,
        ``,
        `--${boundary}`,
        `Content-Type: application/pdf`,
        `Content-Transfer-Encoding: base64`,
        `Content-Disposition: attachment; filename="YAFT_Invoice_${data.invoice_no}.pdf"`,
        ``,
        pdfBase64,
        `--${boundary}--`,
      ].join('\n');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: Buffer.from(raw).toString('base64url') },
      });
    }

    return NextResponse.json({ ok: true, pdf: pdfBase64 });
  } catch (err) {
    console.error('Invoice error:', err);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}
