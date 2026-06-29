-- Update enquiry confirmation email template
update public.email_templates
set
  subject  = 'Re: Your enquiry{{interest}} — YAFT Designs',
  body_html = '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;">
  <p style="font-size:14px;line-height:1.8;margin:0 0 16px;">Hi {{name}},</p>
  <p style="font-size:14px;line-height:1.8;margin:0 0 16px;">Thank you for your enquiry{{interest_line}}.</p>
  <table style="font-size:14px;line-height:1.9;margin:0 0 20px;border-collapse:collapse;width:100%;">
    <tr>
      <td style="color:#555;padding:4px 16px 4px 0;vertical-align:top;white-space:nowrap;">Training schedule</td>
      <td style="padding:4px 0;color:#111;">10 hrs/week across 3 consecutive sessions. Total duration depends on course level — full details on <a href="https://yaftdesigns.com/courses" style="color:#E63946;text-decoration:none;">yaftdesigns.com/courses</a>.</td>
    </tr>
    <tr>
      <td style="color:#555;padding:4px 16px 4px 0;vertical-align:top;white-space:nowrap;">Group discount</td>
      <td style="padding:4px 0;color:#111;">Available for a minimum batch of 3. Reply to this email to avail.</td>
    </tr>
  </table>
  <img src="https://yaftdesigns.com/assets/images/rhino-banner.png" alt="Rhinoceros — design, model, present, analyze, realize" style="width:100%;display:block;margin:0 0 20px;" />
  <p style="font-size:14px;line-height:1.8;margin:0 0 24px;">Reply to this email to confirm your slot or ask any questions.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:0 0 16px;">
  <p style="font-size:12px;color:#888;margin:0;line-height:1.7;">
    This is an automated message from YAFT Designs.<br>
    Authorized Rhino Training Center · Coimbatore, India<br>
    <a href="https://yaftdesigns.com" style="color:#E63946;text-decoration:none;">yaftdesigns.com</a>
  </p>
</div>',
  updated_at = now()
where key = 'enquiry_confirmation';
