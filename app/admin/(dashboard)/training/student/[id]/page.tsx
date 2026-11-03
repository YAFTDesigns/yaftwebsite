import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import styles from '../../../admin.module.css';

export const dynamic = 'force-dynamic';

const money = (n: unknown) => `₹${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const when = (v: string | null | undefined) => v ? new Date(v).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : '—';
type Plan = { id?: string; description?: string | null; client_email?: string | null; base_total?: number | null; status?: string | null };
type LinkRow = { plan_id: string; linked_via: string; linked_at: string; course_payment_plans: Plan | Plan[] | null };

export default async function Student360Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const a = getSupabaseAdmin();

  const { data: student } = await a.from('students').select('id, user_id, display_name, certificate_name, created_at, deleted_at').eq('id', id).maybeSingle();
  if (!student || student.deleted_at) notFound();

  const { data: links } = await a.from('student_enrolments')
    .select('student_id, plan_id, linked_via, linked_at, course_payment_plans(id, description, client_name, client_email, client_phone, client_state, base_total, advance_base, structure, status, created_at)')
    .eq('student_id', id).order('linked_at', { ascending: false });

  const planIds = (links ?? []).map((x) => x.plan_id);
  const [payments, projects, certs, testimonials] = await Promise.all([
    planIds.length ? a.from('course_payments').select('id, plan_id, kind, status, paid_at, amount_minor, invoice_no, sync_status').in('plan_id', planIds).order('paid_at', { ascending: false }) : Promise.resolve({ data: [] }),
    a.from('student_projects').select('id, plan_id, course_slug, status, public_display_name, created_at, updated_at').eq('student_id', id).order('updated_at', { ascending: false }),
    a.from('certificates').select('id, certificate_id, student_name, course_suffix, issue_date, revoked, revoked_reason, plan_id, course_slug').eq('student_id', id).order('created_at', { ascending: false }),
    planIds.length ? a.from('student_testimonials').select('id, plan_id, course_slug, status, public_display_name, updated_at').in('plan_id', planIds).order('updated_at', { ascending: false }) : Promise.resolve({ data: [] }),
  ]);

  const paidFor = (planId: string) => (payments.data ?? []).filter((p) => p.plan_id === planId && p.status === 'paid');
  const totalPaid = (payments.data ?? []).filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount_minor ?? 0) / 100, 0);

  return <>
    <div className={styles.student360Head}>
      <div>
        <Link href="/admin/training" className={styles.student360Back}>← Students & payments</Link>
        <div className="eyebrow">STUDENT 360°</div>
        <h1 className={styles.student360Title}>{student.display_name ?? student.certificate_name ?? 'Student'}</h1>
        <p className={styles.student360Sub}>Joined {when(student.created_at)} · Certificate name: {student.certificate_name ?? 'not set'}</p>
      </div>
      <div className={styles.student360Stats}>
        <div><span>Enrolments</span><strong>{(links ?? []).length}</strong></div>
        <div><span>Paid recorded</span><strong>{money(totalPaid)}</strong></div>
        <div><span>Projects</span><strong>{(projects.data ?? []).length}</strong></div>
        <div><span>Certificates</span><strong>{(certs.data ?? []).filter((c) => !c.revoked).length}</strong></div>
      </div>
    </div>

    <div className={styles.student360Grid}>
      <section className={styles.student360Panel}>
        <div className={styles.todaySectionHead}><div><div className="eyebrow">ENROLMENTS & PAYMENTS</div><h2>Course relationships</h2></div><Link href="/admin/payment-plans">Payment plans →</Link></div>
        {!(links ?? []).length && <p className={styles.empty}>No enrolments linked.</p>}
        {((links ?? []) as unknown as LinkRow[]).map((x) => {
          const raw = x.course_payment_plans;
          const p: Plan = Array.isArray(raw) ? (raw[0] ?? {}) : (raw ?? {});
          const pays = paidFor(x.plan_id);
          const paid = pays.reduce((s, y) => s + Number(y.amount_minor ?? 0) / 100, 0);
          return <div key={x.plan_id} className={styles.student360Row}>
            <div><strong>{p.description ?? 'Course payment plan'}</strong><small>{p.client_email ?? ''} · linked via {x.linked_via} · {when(x.linked_at)}</small></div>
            <div className={styles.student360Money}><strong>{money(paid)}</strong><small>paid recorded · plan base {money(p.base_total)} · {p.status ?? 'status unavailable'}</small></div>
          </div>;
        })}
        <p className={styles.student360Note}>Payment Plans and Invoices remain the financial source of truth. This view only summarizes recorded relationships and paid transactions.</p>
      </section>

      <section className={styles.student360Panel}>
        <div className={styles.todaySectionHead}><div><div className="eyebrow">PROJECTS</div><h2>Student work</h2></div><Link href="/admin/training">Review queue →</Link></div>
        {!(projects.data ?? []).length && <p className={styles.empty}>No projects yet.</p>}
        {(projects.data ?? []).map((p) => <div key={p.id} className={styles.student360Row}><div><strong>{p.course_slug}</strong><small>{p.public_display_name ?? 'Private profile'} · updated {when(p.updated_at ?? p.created_at)}</small></div><span className={styles.statusPill}>{String(p.status).replace(/_/g,' ')}</span></div>)}
      </section>

      <section className={styles.student360Panel}>
        <div className={styles.todaySectionHead}><div><div className="eyebrow">CERTIFICATES</div><h2>Issued records</h2></div><Link href="/admin/certificates">Certificates →</Link></div>
        {!(certs.data ?? []).length && <p className={styles.empty}>No certificates issued.</p>}
        {(certs.data ?? []).map((c) => <div key={c.id} className={styles.student360Row}><div><strong>{c.certificate_id}</strong><small>{c.course_suffix ?? c.course_slug ?? ''} · {c.issue_date}</small>{c.revoked && c.revoked_reason && <small className={styles.dangerText}>{c.revoked_reason}</small>}</div><span className={styles.statusPill} data-tone={c.revoked ? 'red' : 'green'}>{c.revoked ? 'Revoked' : 'Valid'}</span></div>)}
      </section>

      <section className={styles.student360Panel}>
        <div className={styles.todaySectionHead}><div><div className="eyebrow">TESTIMONIAL</div><h2>Publishing relationship</h2></div><Link href="/admin/training">Training →</Link></div>
        {!(testimonials.data ?? []).length && <p className={styles.empty}>No testimonial submitted.</p>}
        {(testimonials.data ?? []).map((t) => <div key={t.id} className={styles.student360Row}><div><strong>{t.public_display_name ?? 'Student testimonial'}</strong><small>{t.course_slug} · updated {when(t.updated_at)}</small></div><span className={styles.statusPill}>{t.status}</span></div>)}
      </section>
    </div>
  </>;
}
