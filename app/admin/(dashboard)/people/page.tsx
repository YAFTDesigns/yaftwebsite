import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { safeQuery } from '@/lib/admin/safeQuery';
import styles from '../admin.module.css';

export const dynamic = 'force-dynamic';

type Person = {
  key: string; name: string; email: string | null; phone: string | null; organisation: string | null;
  kind: Set<string>; status: string | null; funnel: string | null; interest: string | null;
  next: string | null; followUp: string | null; href: string; updated: string | null;
};
type LeadRow = { id:string; email:string; name:string|null; status:string|null; funnel:string|null; organisation:string|null; service_interest:string|null; follow_up_date:string|null; last_seen:string|null; declined:boolean };
type EnquiryRow = { id:string; lead_id:string|null; name:string; email:string; phone:string|null; organisation:string|null; course_interest:string|null; need:string|null; created_at:string|null };
type ClientRow = { id:string; name:string; email:string|null; phone:string|null; company_name:string|null; active:boolean; updated_at:string|null };
type BdRow = { id:string; organization:string; contact_name:string|null; status:string|null; relevant_service:string|null; next_action:string|null; follow_up_date:string|null; updated_at:string|null };

const norm = (v: string | null | undefined) => (v ?? '').trim().toLowerCase();
const fmt = (v: string | null) => v ? new Date(v).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ q?: string; view?: string }> }) {
  const { q = '', view = 'all' } = await searchParams;
  const a = getSupabaseAdmin();
  const [leads, enquiries, clients, bd] = await Promise.all([
    safeQuery<LeadRow[]>(a.from('leads').select('id,email,name,status,funnel,organisation,service_interest,follow_up_date,last_seen,declined').eq('is_test', false).order('last_seen',{ascending:false}).limit(500), [], 'people leads'),
    safeQuery<EnquiryRow[]>(a.from('enquiries').select('id,lead_id,name,email,phone,organisation,course_interest,need,created_at').eq('is_test', false).order('created_at',{ascending:false}).limit(500), [], 'people enquiries'),
    safeQuery<ClientRow[]>(a.from('clients').select('id,name,email,phone,company_name,active,updated_at').is('deleted_at', null).order('updated_at',{ascending:false}).limit(500), [], 'people clients'),
    safeQuery<BdRow[]>(a.from('bd_leads').select('id,organization,contact_name,contact_channel,status,relevant_service,next_action,follow_up_date,updated_at,priority').order('updated_at',{ascending:false}).limit(500), [], 'people bd'),
  ]);

  const map = new Map<string, Person>();
  const upsert = (key: string, p: Omit<Person,'kind'|'key'> & { kind: string }) => {
    const old = map.get(key);
    if (!old) { map.set(key, { ...p, key, kind: new Set([p.kind]) }); return; }
    old.kind.add(p.kind);
    old.name ||= p.name; old.email ||= p.email; old.phone ||= p.phone; old.organisation ||= p.organisation;
    old.status ||= p.status; old.funnel ||= p.funnel; old.interest ||= p.interest; old.next ||= p.next; old.followUp ||= p.followUp;
    if (p.updated && (!old.updated || p.updated > old.updated)) old.updated = p.updated;
    if (old.href === '/admin/enquiries' && p.href !== '/admin/enquiries') old.href = p.href;
  };

  for (const l of leads.data) {
    const key = norm(l.email) ? `email:${norm(l.email)}` : `lead:${l.id}`;
    upsert(key,{kind:'Inbound',name:l.name ?? l.email,email:l.email,phone:null,organisation:l.organisation,status:l.declined?'lost':l.status,funnel:l.funnel,interest:l.service_interest,next:null,followUp:l.follow_up_date,href:`/admin/leads/${l.id}`,updated:l.last_seen});
  }
  for (const e of enquiries.data) {
    const key = norm(e.email) ? `email:${norm(e.email)}` : `enquiry:${e.id}`;
    upsert(key,{kind:'Enquiry',name:e.name,email:e.email,phone:e.phone,organisation:e.organisation,status:null,funnel:null,interest:e.course_interest ?? e.need,next:null,followUp:null,href:e.lead_id?`/admin/leads/${e.lead_id}`:'/admin/enquiries',updated:e.created_at});
  }
  for (const c of clients.data) {
    const key = norm(c.email) ? `email:${norm(c.email)}` : `client:${c.id}`;
    upsert(key,{kind:'Client',name:c.name,email:c.email,phone:c.phone,organisation:c.company_name,status:c.active?'active client':'inactive client',funnel:null,interest:null,next:null,followUp:null,href:`/admin/clients/${c.id}`,updated:c.updated_at});
  }
  for (const b of bd.data) {
    const key = `bd:${b.id}`;
    upsert(key,{kind:'Outbound BD',name:b.contact_name || b.organization,email:null,phone:null,organisation:b.organization,status:b.status,funnel:'BD',interest:b.relevant_service,next:b.next_action,followUp:b.follow_up_date,href:'/admin/bd-leads',updated:b.updated_at});
  }

  let rows = [...map.values()].sort((x,y)=>(y.updated??'').localeCompare(x.updated??''));
  const query = q.trim().toLowerCase();
  if (query) rows = rows.filter((r)=>[r.name,r.email,r.phone,r.organisation,r.status,r.funnel,r.interest,...r.kind].filter(Boolean).join(' ').toLowerCase().includes(query));
  if (view !== 'all') rows = rows.filter((r)=>[...r.kind].some((k)=>k.toLowerCase().replace(/\s+/g,'-')===view));

  const totalClients=[...map.values()].filter(r=>r.kind.has('Client')).length;
  const openSales=[...map.values()].filter(r=>!r.kind.has('Client') && !['lost','won'].includes((r.status??'').toLowerCase())).length;
  const followups=[...map.values()].filter(r=>r.followUp && r.followUp <= new Date().toISOString().slice(0,10)).length;

  return <>
    <div className={styles.peopleHero}>
      <div><div className="eyebrow">PEOPLE / PIPELINE</div><h1>One view of every relationship</h1><p>Inbound leads, enquiries, outbound BD and clients stay in their original systems; this page brings them together for navigation and follow-up.</p></div>
      <div className={styles.peopleStats}><div><span>Relationships</span><strong>{map.size}</strong></div><div><span>Open sales</span><strong>{openSales}</strong></div><div><span>Clients</span><strong>{totalClients}</strong></div><div><span>Follow-ups due</span><strong>{followups}</strong></div></div>
    </div>

    <form className={styles.peopleToolbar}>
      <input name="q" defaultValue={q} placeholder="Search name, email, company, interest…" />
      <select name="view" defaultValue={view}><option value="all">All relationships</option><option value="inbound">Inbound</option><option value="enquiry">Enquiries</option><option value="outbound-bd">Outbound BD</option><option value="client">Clients</option></select>
      <button type="submit">Filter</button>
      {(q || view !== 'all') && <Link href="/admin/people">Clear</Link>}
    </form>

    <div className={styles.peopleTableWrap}>
      <table className={styles.table}>
        <thead><tr><th>Person / organisation</th><th>Relationship</th><th>Contact</th><th>Stage</th><th>Interest</th><th>Next action</th><th>Follow-up</th><th>Last activity</th></tr></thead>
        <tbody>{rows.map((r)=><tr key={r.key}>
          <td><Link href={r.href} style={{textDecoration:'underline'}}><strong>{r.name}</strong></Link>{r.organisation && r.organisation!==r.name && <div style={{fontSize:11,opacity:.6}}>{r.organisation}</div>}</td>
          <td><div className={styles.relationshipChips}>{[...r.kind].map(k=><span key={k}>{k}</span>)}</div></td>
          <td>{r.email ?? '—'}{r.phone && <div style={{fontSize:11,opacity:.6}}>{r.phone}</div>}</td>
          <td>{r.status ?? '—'}{r.funnel && <div style={{fontSize:11,opacity:.6}}>{r.funnel}</div>}</td>
          <td>{r.interest ?? '—'}</td><td>{r.next ?? '—'}</td><td>{r.followUp ?? '—'}</td><td>{fmt(r.updated)}</td>
        </tr>)}</tbody>
      </table>
      {!rows.length && <p className={styles.empty}>No matching relationships.</p>}
    </div>
  </>;
}
