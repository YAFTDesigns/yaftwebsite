export default function SiteFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-bottom">
          <div className="fcol">
            <h3>YAFT Designs</h3>
            <p>Computational design training<br />&amp; consulting<br />Coimbatore, Tamil Nadu, India</p>
          </div>
          <div className="fcol">
            <h3>Courses</h3>
            <p>Rhino3D for Architecture<br />Grasshopper<br />Rhino.Inside.Revit<br />AEC &amp; Climate<br />Wearables &amp; Footwear<br />Industrial Design</p>
          </div>
          <div className="fcol">
            <h3>Company</h3>
            <p>© 2026 YAFT Designs<br />All rights reserved</p>
            <p style={{ marginTop: 8 }}>
              <a href="/terms" style={{ display: 'inline-block', padding: '6px 0', color: 'var(--ink-soft)', fontFamily: 'var(--mono)', fontSize: 11 }}>Terms</a><br />
              <a href="/privacy" style={{ display: 'inline-block', padding: '6px 0', color: 'var(--ink-soft)', fontFamily: 'var(--mono)', fontSize: 11 }}>Privacy</a><br />
              <a href="/consent" style={{ display: 'inline-block', padding: '6px 0', color: 'var(--ink-soft)', fontFamily: 'var(--mono)', fontSize: 11 }}>Consent</a><br />
              <a href="/cookies" style={{ display: 'inline-block', padding: '6px 0', color: 'var(--ink-soft)', fontFamily: 'var(--mono)', fontSize: 11 }}>Cookies</a>
            </p>
          </div>
        </div>
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          marginTop: 24,
          paddingTop: 16,
          paddingBottom: 8,
        }}>
          <p style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--ink-soft)',
            lineHeight: 1.7,
            margin: 0,
          }}>
            By engaging with YAFT Designs you agree to our terms and conditions. Course materials are for individual use only and remain the intellectual property of YAFT Designs. Fees paid are non-refundable within 15 days of course commencement. YAFT Designs does not sell or resell Rhino3D licenses. Governed by the laws of India, jurisdiction: Coimbatore, Tamil Nadu.
          </p>
        </div>
      </div>
    </footer>
  );
}
