'use client';

import { useState } from 'react';
import styles from './certificates.module.css';

type VerifyResult = {
  verified: boolean;
  data?: {
    certificate_id: string;
    student_name: string;
    course_key: string;
    course_suffix: string;
    duration_hours: string;
    issue_date: string;
  };
};

const COURSE_LABELS: Record<string, string> = {
  rhino: 'Rhinoceros 3D',
  grasshopper: 'Grasshopper',
  default: '',
};

export default function CertificateVerify() {
  const [certId, setCertId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!certId.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/certificates/verify?id=${encodeURIComponent(certId.trim())}`);
      const json = await res.json();
      setResult(res.ok ? json : { verified: false });
    } catch {
      setResult({ verified: false });
    }
    setLoading(false);
  }

  return (
    <div className={styles.wrap}>
      <form onSubmit={handleVerify} className={styles.form}>
        <input
          type="text"
          value={certId}
          onChange={(e) => setCertId(e.target.value)}
          placeholder="e.g. YAFT202607-05"
          className={styles.input}
          autoCapitalize="characters"
        />
        <button type="submit" className={styles.btn} disabled={loading}>
          {loading ? 'Checking...' : 'Verify'}
        </button>
      </form>

      {searched && !loading && result && (
        result.verified && result.data ? (
          <div className={styles.resultCard}>
            <div className={styles.verifiedTag}>✓ Verified</div>
            <h3>{result.data.student_name}</h3>
            <p className={styles.courseLine}>
              {COURSE_LABELS[result.data.course_key] ?? result.data.course_key} {result.data.course_suffix}
            </p>
            <p className={styles.meta}>
              {result.data.duration_hours} hour training · Issued {new Date(result.data.issue_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className={styles.meta}>Certificate ID: {result.data.certificate_id}</p>
            <a
              href={`/api/certificates/${encodeURIComponent(result.data.certificate_id)}/pdf`}
              className={styles.downloadBtn}
            >
              Download certificate →
            </a>
          </div>
        ) : (
          <div className={styles.notFound}>
            No certificate found for that ID. Double check the code and try again, or contact YAFT Designs if you believe this is an error.
          </div>
        )
      )}
    </div>
  );
}
