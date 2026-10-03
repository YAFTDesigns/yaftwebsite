'use client';

import { useState } from 'react';

export type BdLead = {
  id: string; organization: string; segment: string | null; country: string | null; city: string | null;
  website: string | null; department: string | null; contact_name: string | null; contact_role: string | null;
  contact_channel: string | null; opportunity: string | null; relevant_service: string | null;
  evidence: string | null; personalization_angle: string | null; priority: 'high' | 'medium' | 'low';
  status: string; last_contact_date: string | null; next_action: string | null; follow_up_date: string | null; notes: string | null;
};

const STATUSES = ['researched','qualified','contact_identified','outreach_ready','contacted','replied','discussion','proposal','negotiation','won','lost'];
const PRIORITY_COLOR: Record<string, string> = { high: '#E63946', medium: '#e5a935', low: '#666' };

const EMPTY: Omit<BdLead, 'id'> = {
  organization: '', segment: null, country: null, city: null, website: null, department: null,
  contact_name: null, contact_role: null, contact_channel: null, opportunity: null, relevant_service: null,
  evidence: null, personalization_angle: null, priority: 'medium', status: 'researched',
  last_contact_date: null, next_action: null, follow_up_date: null, notes: null,
};

const input: React.CSSProperties = { width: '100%', background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 6, padding: '6px 9px', color: '#fff', fontSize: 12, fontFamily: 'var(--mono)' };
const label: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 3 };

export default function BdLeadsClient({ initialLeads }: { initialLeads: BdLead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<BdLead, 'id'>>(EMPTY);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const visible = leads.filter((l) => (filterPriority === 'all' || l.priority === filterPriority) && (filterStatus === 'all' || l.status === filterStatus));

  async function patch(id: string, fields: Partial<BdLead>) {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...fields } : l)));
    await fetch(`/api/admin/bd-leads/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
  }

  async function addLead() {
    if (!draft.organization.trim()) { setError('Organization is required'); return; }
    setAdding(true); setError('');
    try {
      const res = await fetch('/api/admin/bd-leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Save failed');
      setLeads((ls) => {
        const others = ls.filter((l) => l.id !== json.lead.id);
        return [json.lead as BdLead, ...others];
      });
      setDraft(EMPTY);
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); }
    finally { setAdding(false); }
  }

  return (
    <div>
      <details style={{ marginBottom: 28, border: '1px solid var(--line)', borderRadius: 8, padding: 16 }}>
        <summary style={{ cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--brass)' }}>+ Add a lead</summary>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}><span style={label}>Organization *</span><input style={input} value={draft.organization} onChange={(e) => setDraft({ ...draft, organization: e.target.value })} /></div>
          <div><span style={label}>Segment</span><input style={input} placeholder="Institution / Corporate" value={draft.segment ?? ''} onChange={(e) => setDraft({ ...draft, segment: e.target.value })} /></div>
          <div><span style={label}>Country</span><input style={input} value={draft.country ?? ''} onChange={(e) => setDraft({ ...draft, country: e.target.value })} /></div>
          <div><span style={label}>City</span><input style={input} value={draft.city ?? ''} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></div>
          <div style={{ gridColumn: '1 / -1' }}><span style={label}>Website</span><input style={input} value={draft.website ?? ''} onChange={(e) => setDraft({ ...draft, website: e.target.value })} /></div>
          <div><span style={label}>Contact name</span><input style={input} value={draft.contact_name ?? ''} onChange={(e) => setDraft({ ...draft, contact_name: e.target.value })} /></div>
          <div><span style={label}>Contact role</span><input style={input} value={draft.contact_role ?? ''} onChange={(e) => setDraft({ ...draft, contact_role: e.target.value })} /></div>
          <div><span style={label}>Contact channel</span><input style={input} placeholder="email / LinkedIn" value={draft.contact_channel ?? ''} onChange={(e) => setDraft({ ...draft, contact_channel: e.target.value })} /></div>
          <div style={{ gridColumn: '1 / -1' }}><span style={label}>Opportunity</span><input style={input} value={draft.opportunity ?? ''} onChange={(e) => setDraft({ ...draft, opportunity: e.target.value })} /></div>
          <div><span style={label}>Relevant YAFT service</span><input style={input} value={draft.relevant_service ?? ''} onChange={(e) => setDraft({ ...draft, relevant_service: e.target.value })} /></div>
          <div style={{ gridColumn: '2 / 4' }}><span style={label}>Evidence of relevance</span><input style={input} value={draft.evidence ?? ''} onChange={(e) => setDraft({ ...draft, evidence: e.target.value })} /></div>
          <div style={{ gridColumn: '1 / -1' }}><span style={label}>Personalization angle</span><input style={input} value={draft.personalization_angle ?? ''} onChange={(e) => setDraft({ ...draft, personalization_angle: e.target.value })} /></div>
          <div>
            <span style={label}>Priority</span>
            <select style={input} value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as BdLead['priority'] })}>
              <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
          </div>
          <div style={{ gridColumn: '2 / -1' }}><span style={label}>Next action</span><input style={input} value={draft.next_action ?? ''} onChange={(e) => setDraft({ ...draft, next_action: e.target.value })} /></div>
        </div>
        <button onClick={addLead} disabled={adding} style={{ marginTop: 12, background: 'var(--brass)', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          {adding ? 'Saving…' : 'Save lead'}
        </button>
        {error && <span style={{ marginLeft: 10, fontSize: 12, color: '#E63946' }}>{error}</span>}
      </details>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, fontFamily: 'var(--mono)', fontSize: 12 }}>
        <select style={input} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="all">All priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <select style={input} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {visible.length === 0 && <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#666' }}>No leads yet.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.map((l) => (
          <div key={l.id} style={{ border: '1px solid var(--line)', borderLeft: `3px solid ${PRIORITY_COLOR[l.priority]}`, borderRadius: 6, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <span style={{ fontFamily: 'var(--display)', fontSize: 15, color: '#fff' }}>{l.organization}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#777', marginLeft: 10 }}>{[l.city, l.country].filter(Boolean).join(', ') || '—'}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select style={{ ...input, width: 140 }} value={l.status} onChange={(e) => patch(l.id, { status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
                <button onClick={() => setExpanded(expanded === l.id ? null : l.id)} style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 6, color: '#999', fontSize: 11, padding: '5px 10px', cursor: 'pointer' }}>
                  {expanded === l.id ? 'Hide' : 'Details'}
                </button>
              </div>
            </div>
            {expanded === l.id && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #222', fontFamily: 'var(--mono)', fontSize: 12, color: '#ccc', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {l.contact_name && <div><b style={{ color: '#888' }}>Contact:</b> {l.contact_name}{l.contact_role ? ` (${l.contact_role})` : ''}</div>}
                {l.contact_channel && <div><b style={{ color: '#888' }}>Channel:</b> {l.contact_channel}</div>}
                {l.opportunity && <div style={{ gridColumn: '1 / -1' }}><b style={{ color: '#888' }}>Opportunity:</b> {l.opportunity}</div>}
                {l.relevant_service && <div><b style={{ color: '#888' }}>Service:</b> {l.relevant_service}</div>}
                {l.evidence && <div style={{ gridColumn: '1 / -1' }}><b style={{ color: '#888' }}>Evidence:</b> {l.evidence}</div>}
                {l.personalization_angle && <div style={{ gridColumn: '1 / -1' }}><b style={{ color: '#888' }}>Angle:</b> {l.personalization_angle}</div>}
                {l.website && <div style={{ gridColumn: '1 / -1' }}><a href={l.website} target="_blank" style={{ color: 'var(--blueprint)' }}>{l.website} ↗</a></div>}
                <div>
                  <span style={label}>Priority</span>
                  <select style={input} value={l.priority} onChange={(e) => patch(l.id, { priority: e.target.value as BdLead['priority'] })}>
                    <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                  </select>
                </div>
                <div><span style={label}>Follow-up date</span><input type="date" style={input} value={l.follow_up_date ?? ''} onChange={(e) => patch(l.id, { follow_up_date: e.target.value || null })} /></div>
                <div style={{ gridColumn: '1 / -1' }}><span style={label}>Next action</span><input style={input} value={l.next_action ?? ''} onChange={(e) => patch(l.id, { next_action: e.target.value })} /></div>
                <div style={{ gridColumn: '1 / -1' }}><span style={label}>Notes</span><textarea style={{ ...input, minHeight: 50 }} value={l.notes ?? ''} onChange={(e) => patch(l.id, { notes: e.target.value })} /></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
