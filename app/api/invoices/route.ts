import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

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

    // YAFT logo text
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#000000')
       .text('YAFT', M, 30);
    doc.font('Helvetica').fontSize(10)
       .text('DESIGNS', M, 52);

    // ART badge
    try {
      doc.image('/home/claude/yaftwebsite/public/assets/logos/art-badge.png',
        W - 160, 18, { width: 120, height: 90 });
    } catch {}

    // Dotted divider
    doc.save().dash(2, { space: 3 }).moveTo(M, 115).lineTo(W - M, 115)
       .strokeColor('#aaaaaa').lineWidth(0.5).stroke().restore();

    // Title
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#555555')
       .text('TRAINING INVOICE', 0, 128, { align: 'center' });

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

    // Line items table
    const tableTop = 390;
    const cols = [M, M+43, M+284, M+327, M+398];
    const colW  = [43,  241,   43,    71,    76];
    const headers = ['S Nos','Description','hr(s)','Quantity','Total Price (Rs)'];

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
      doc.text(String(item.hrs), cols[2]+3, ry+5, { width: colW[2]-6, align: 'center' });
      doc.text(item.qty.toFixed(2), cols[3]+3, ry+5, { width: colW[3]-6, align: 'center' });
      doc.text(total.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
               cols[4]+3, ry+5, { width: colW[4]-6, align: 'right' });
      ry += 18;
    });
    // Empty rows
    for (let e = 0; e < 4 - data.items.length; e++) {
      doc.rect(M, ry, W-2*M, 18).stroke('#aaaaaa');
      doc.font('Helvetica').fontSize(8).fillColor('#000000');
      doc.text('-', cols[4]+3, ry+5, { width: colW[4]-6, align: 'right' });
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
      status:         'sent',
    }).select('id').single();
    if (error) console.error('Invoice save error:', error);

    // Send via Gmail with PDF attachment
    if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_REFRESH_TOKEN) {
      const gmail = await getGmailClient();
      const boundary = 'yaft_invoice_boundary';
      const subject  = `Invoice ${data.invoice_no} - YAFT Designs Training`;
      const bodyText = `Hi ${data.client_name},\n\nPlease find attached your invoice for YAFT Designs training.\n\nInvoice No: ${data.invoice_no}\nDate: ${data.date}\nAmount: INR ${data.grand_total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n\nReply to this email for any queries.\n\nYokes Marapa\nYAFT Designs\nyaftdesigns.com`;

      const raw = [
        `From: YAFT Designs <${YAFT_EMAIL}>`,
        `To: ${data.client_name} <${data.client_email}>`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        ``,
        `--${boundary}`,
        `Content-Type: text/plain; charset=utf-8`,
        ``,
        bodyText,
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
