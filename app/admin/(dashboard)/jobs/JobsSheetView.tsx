'use client';

import { useState } from 'react';
import { groupByMonth, revenueByType, revenueByMonth, STATUS_COLORS_HEX } from '@/lib/jobsGrouping';

type Job = {
  id: string; job_date: string; job_no: string | null;
  client_name: string; job_type: string;
  qty: number; rate: number; gst_type: string;
  cgst: number; sgst: number; igst: number; total: number;
  status: string; notes: string | null; status_date?: string | null;
};

const GST_LABEL: Record<string, string> = { intra: 'Intra-state (CGST+SGST)', inter: 'Inter-state (IGST)', none: 'No GST' };

function fmt(n: number) { return n.toLocaleString('en-IN', { minimumFractionDigits: 2 }); }

const th: React.CSSProperties = { padding: '9px 10px', textAlign: 'left', fontFamily: 'var(--mono)', fontSize: 10.5, color: '#888', textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: '1px solid #2a2a2a', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '8px 10px', fontSize: 12.5, color: '#ccc', borderBottom: '1px solid #1a1a1a', whiteSpace: 'nowrap' };

// A live, in-browser equivalent of the exported .xlsx -- same month
// segregation, same color-coded status, same Summary breakdown -- but for
// Yokes' own internal view only. Never used for the client-facing share
// link, which has its own simpler read-only table.
export default function JobsSheetView({ jobs }: { jobs: Job[] }) {
  const byMonth = groupByMonth(jobs);
  const [activeSheet, setActiveSheet] = useState<string>('summary');

  const typeBreakdown = revenueByType(jobs);
  const monthBreakdown = revenueByMonth(jobs);
  const grandTotal = jobs.reduce((s, j) => s + Number(j.total), 0);

  if (jobs.length === 0) {
    return <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#666', padding: '40px 0', textAlign: 'center' }}>No jobs to show yet.</p>;
  }

  return (
    <div>
      {/* Sheet tab strip, styled like actual Excel sheet tabs along the bottom of a workbook */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '2px solid #2a2a2a', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveSheet('summary')}
          style={{
            padding: '8px 16px', fontSize: 12, fontFamily: 'var(--mono)', cursor: 'pointer',
            background: activeSheet === 'summary' ? '#1a1408' : 'transparent',
            color: activeSheet === 'summary' ? 'var(--brass)' : '#777',
            border: 'none', borderBottom: activeSheet === 'summary' ? '2px solid var(--brass)' : '2px solid transparent',
            marginBottom: -2, fontWeight: activeSheet === 'summary' ? 700 : 400,
          }}
        >
          Summary
        </button>
        {monthBreakdown.map(m => (
          <button
            key={m.key}
            onClick={() => setActiveSheet(m.key)}
            style={{
              padding: '8px 16px', fontSize: 12, fontFamily: 'var(--mono)', cursor: 'pointer',
              background: activeSheet === m.key ? '#111' : 'transparent',
              color: activeSheet === m.key ? '#fff' : '#777',
              border: 'none', borderBottom: activeSheet === m.key ? '2px solid #58A6FF' : '2px solid transparent',
              marginBottom: -2, fontWeight: activeSheet === m.key ? 700 : 400,
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {activeSheet === 'summary' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          <div>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--brass)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Revenue by Job Type</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #2a2a2a', borderRadius: 8, overflow: 'hidden' }}>
              <thead><tr style={{ background: '#161616' }}><th style={th}>Job Type</th><th style={th}>Jobs</th><th style={{ ...th, textAlign: 'right' }}>Total (INR)</th></tr></thead>
              <tbody>
                {typeBreakdown.map(row => (
                  <tr key={row.type}>
                    <td style={td}>{row.type}</td>
                    <td style={td}>{row.count}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: row === typeBreakdown[0] ? 700 : 400, color: row === typeBreakdown[0] ? '#3FB950' : '#ccc' }}>{fmt(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--brass)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Revenue by Month</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #2a2a2a', borderRadius: 8, overflow: 'hidden' }}>
              <thead><tr style={{ background: '#161616' }}><th style={th}>Month</th><th style={th}>Jobs</th><th style={{ ...th, textAlign: 'right' }}>Total (INR)</th></tr></thead>
              <tbody>
                {monthBreakdown.map(row => (
                  <tr key={row.key}>
                    <td style={td}>{row.label}</td>
                    <td style={td}>{row.count}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{fmt(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #2a2a2a', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#888' }}>GRAND TOTAL</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>INR {fmt(grandTotal)}</span>
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #2a2a2a', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#161616' }}>
                <th style={th}>Job No</th>
                <th style={th}>Date</th>
                <th style={th}>Client</th>
                <th style={th}>Job Type</th>
                <th style={th}>Qty</th>
                <th style={{ ...th, textAlign: 'right' }}>Rate</th>
                <th style={th}>GST Type</th>
                <th style={{ ...th, textAlign: 'right' }}>CGST</th>
                <th style={{ ...th, textAlign: 'right' }}>SGST</th>
                <th style={{ ...th, textAlign: 'right' }}>IGST</th>
                <th style={{ ...th, textAlign: 'right' }}>Total</th>
                <th style={th}>Status</th>
                <th style={th}>Status Date</th>
                <th style={th}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {(byMonth.get(activeSheet) ?? []).map(j => (
                <tr key={j.id}>
                  <td style={{ ...td, fontFamily: 'var(--mono)' }}>{j.job_no || ''}</td>
                  <td style={td}>{j.job_date}</td>
                  <td style={td}>{j.client_name}</td>
                  <td style={td}>{j.job_type}</td>
                  <td style={td}>{j.qty}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmt(Number(j.rate))}</td>
                  <td style={{ ...td, fontSize: 11 }}>{GST_LABEL[j.gst_type] ?? j.gst_type}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmt(Number(j.cgst))}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmt(Number(j.sgst))}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmt(Number(j.igst))}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#fff' }}>{fmt(Number(j.total))}</td>
                  <td style={td}>
                    <span style={{
                      display: 'inline-block', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                      color: '#fff', background: STATUS_COLORS_HEX[j.status] ?? '#555',
                      borderRadius: 4, padding: '2px 8px',
                    }}>
                      {j.status}
                    </span>
                  </td>
                  <td style={{ ...td, fontSize: 11, color: '#888' }}>{j.status_date ? new Date(j.status_date).toLocaleDateString('en-IN') : ''}</td>
                  <td style={{ ...td, fontSize: 11, color: '#888' }}>{j.notes || ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #2a2a2a' }}>
                <td style={{ ...td, borderBottom: 'none' }} colSpan={10}></td>
                <td style={{ ...td, borderBottom: 'none', textAlign: 'right', fontWeight: 700, color: 'var(--brass)' }}>
                  TOTAL: INR {fmt((byMonth.get(activeSheet) ?? []).reduce((s, j) => s + Number(j.total), 0))}
                </td>
                <td style={{ ...td, borderBottom: 'none' }} colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
