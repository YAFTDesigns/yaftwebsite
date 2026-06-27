export default function SiteFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-bottom">
          <div className="fcol">
            <h4>YAFT Designs</h4>
            <p>Computational design training<br />&amp; consulting<br />Coimbatore, Tamil Nadu, India</p>
          </div>
          <div className="fcol">
            <h4>Courses</h4>
            <p>Rhino3D for Architecture<br />Grasshopper<br />Rhino.Inside.Revit<br />AEC &amp; Climate<br />Wearables &amp; Footwear<br />Industrial Design</p>
          </div>
          <div className="fcol">
            <h4>Company</h4>
            <p>© 2026 YAFT Designs<br />All rights reserved<br /><a href="/terms" style={{ color: 'var(--ink-soft)', fontFamily: 'var(--mono)', fontSize: 11 }}>Terms</a><br /><a href="/consent" style={{ color: 'var(--ink-soft)', fontFamily: 'var(--mono)', fontSize: 11 }}>Consent</a><br /><a href="/cookies" style={{ color: 'var(--ink-soft)', fontFamily: 'var(--mono)', fontSize: 11 }}>Cookies</a></p>
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
            opacity: 0.5,
            lineHeight: 1.7,
            margin: 0,
          }}>
            By engaging with YAFT Designs you agree to our terms and conditions. Course materials are for individual use only and remain the intellectual property of YAFT Designs. Fees paid are non-refundable within 15 days of course commencement. YAFT Designs does not sell or resell Rhino3D licenses. Certificates issued are informal and do not carry statutory credentials. Governed by the laws of India, jurisdiction: Coimbatore, Tamil Nadu.
          </p>
        </div>
      </div>
    </footer>
  );
}
