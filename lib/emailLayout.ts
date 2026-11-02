import { imageUrl } from '@/lib/assetUrl';

/** Same look as the client invoice email: Arial, 560px, red button, rhino banner, YAFT footer. bodyHtml must already be escaped. */
export function brandedEmail(opts: { heading?: string; bodyHtml: string; cta?: { label: string; href: string } }): string {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;">
  ${opts.heading ? `<p style="font-size:16px;font-weight:600;margin:0 0 16px;">${opts.heading}</p>` : ''}
  <div style="font-size:14px;line-height:1.8;margin:0 0 20px;">${opts.bodyHtml}</div>
  ${opts.cta ? `<a href="${opts.cta.href}" style="display:inline-block;background:#E63946;color:#fff;font-size:13px;padding:11px 22px;border-radius:6px;text-decoration:none;margin-bottom:24px;">${opts.cta.label} &rarr;</a>` : ''}
  <img src="${imageUrl('rhino-banner.png')}" alt="Rhinoceros, design, model, present, analyze, realize" style="width:100%;display:block;margin:0 0 24px;" />
  <hr style="border:none;border-top:1px solid #eee;margin:0 0 16px;">
  <p style="font-size:12px;color:#888;margin:0;line-height:1.7;">YAFT Designs &middot; Authorized Rhino Training Center &middot; Coimbatore, India<br><a href="https://www.yaftdesigns.com" style="color:#E63946;text-decoration:none;">yaftdesigns.com</a></p>
</div>`;
}

/** Label/value rows in the invoice-email table style. Values must already be escaped. */
export function brandedRows(rows: Array<[string, string]>): string {
  return `<table style="font-size:13px;border-collapse:collapse;width:100%;margin:0 0 8px;">${rows
    .map(([k, v], i) => `<tr${i % 2 === 0 ? ' style="background:#f8f8f8;"' : ''}><td style="padding:8px 12px;color:#888;white-space:nowrap;vertical-align:top;">${k}</td><td style="padding:8px 12px;">${v}</td></tr>`)
    .join('')}</table>`;
}
