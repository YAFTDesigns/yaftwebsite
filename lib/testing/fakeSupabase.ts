// Tiny in-memory stand-in for the Supabase client, for unit tests only. Supports just what the payment code uses,
// including the unique indexes that make duplicate bills and duplicate refunds impossible in the real database.
type Row = Record<string, unknown>;
type Filter = (r: Row) => boolean;

const UNIQUE: Record<string, { cols: string[]; when?: (r: Row) => boolean; name: string }[]> = {
  invoices: [{ cols: ['invoice_no'], name: 'invoices_invoice_no_key' }, { cols: ['course_payment_id'], when: (r) => r.course_payment_id != null, name: 'invoices_one_per_course_payment' }],
  course_payments: [{ cols: ['order_id'], name: 'course_payments_order_id_key' }, { cols: ['payment_id'], when: (r) => r.payment_id != null, name: 'course_payments_payment_id_key' }, { cols: ['plan_id', 'kind'], when: (r) => r.status === 'paid', name: 'course_payments_one_paid_per_kind' }],
  invoice_adjustments: [{ cols: ['razorpay_refund_id'], when: (r) => r.razorpay_refund_id != null, name: 'invoice_adjustments_razorpay_refund_id_key' }, { cols: ['credit_note_no'], when: (r) => r.credit_note_no != null, name: 'invoice_adjustments_credit_note_no_key' }],
};

export class FakeDb {
  tables: Record<string, Row[]> = {};
  failNext: { table: string; op: string; message: string } | null = null;
  private seq = 0;
  t(name: string) { return (this.tables[name] ??= []); }
  uuid() { return `00000000-0000-4000-8000-${String(++this.seq).padStart(12, '0')}`; }
  from(table: string) { return new Query(this, table); }
  rpc() { return Promise.resolve({ data: true, error: null }); }
}

class Query implements PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }> {
  private filters: Filter[] = [];
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private patch: Row = {};
  private mode: 'one' | 'maybe' | null = null;
  private returning = false;
  constructor(private db: FakeDb, private table: string) {}
  select() { if (this.op !== 'select') this.returning = true; return this; }
  insert(row: Row) { this.op = 'insert'; this.patch = row; return this; }
  update(p: Row) { this.op = 'update'; this.patch = p; return this; }
  eq(c: string, v: unknown) { this.filters.push((r) => r[c] === v); return this; }
  neq(c: string, v: unknown) { this.filters.push((r) => r[c] !== v); return this; }
  is(c: string, v: unknown) { this.filters.push((r) => (v === null ? r[c] == null : r[c] === v)); return this; }
  not(c: string, _op: string, v: unknown) { this.filters.push((r) => (v === null ? r[c] != null : r[c] !== v)); return this; }
  in(c: string, vs: unknown[]) { this.filters.push((r) => vs.includes(r[c])); return this; }
  like(c: string, pat: string) { const re = new RegExp('^' + pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$'); this.filters.push((r) => re.test(String(r[c] ?? ''))); return this; }
  order() { return this; }
  limit() { return this; }
  maybeSingle<T = Row>() { this.mode = 'maybe'; return this as unknown as PromiseLike<{ data: T | null; error: { code?: string; message: string } | null }> & Query; }
  singleRow() { this.mode = 'one'; return this; }

  private violates(candidate: Row, ignore?: Row): { code: string; message: string } | null {
    for (const u of UNIQUE[this.table] ?? []) {
      if (u.when && !u.when(candidate)) continue;
      const clash = this.db.t(this.table).find((o) => o !== ignore && u.cols.every((c) => o[c] === candidate[c]) && (!u.when || u.when(o)));
      if (clash) return { code: '23505', message: `duplicate key value violates unique constraint "${u.name}"` };
    }
    return null;
  }

  private run(): { data: unknown; error: { code?: string; message: string } | null } {
    const f = this.db.failNext;
    if (f && f.table === this.table && f.op === this.op) { this.db.failNext = null; return { data: null, error: { message: f.message } }; }
    const rows = this.db.t(this.table);
    if (this.op === 'insert') {
      const row: Row = { id: this.db.uuid(), created_at: new Date().toISOString(), ...this.patch };
      if (this.table === 'course_payments') Object.assign(row, { status: 'created', sync_status: 'pending', sync_attempts: 0, invoice_emailed: false, test_mode: false }, this.patch);
      const err = this.violates(row);
      if (err) return { data: null, error: err };
      rows.push(row);
      return this.shape(this.returning ? [row] : []);
    }
    const hit = rows.filter((r) => this.filters.every((f2) => f2(r)));
    if (this.op === 'update') {
      for (const r of hit) {
        const next = { ...r, ...this.patch };
        const err = this.violates(next, r);
        if (err) return { data: null, error: err };
      }
      for (const r of hit) Object.assign(r, this.patch);
      return this.shape(this.returning ? hit : []);
    }
    return this.shape(hit);
  }
  private shape(rows: Row[]) {
    if (this.mode === 'maybe') return { data: rows[0] ?? null, error: null };
    if (this.mode === 'one') return rows.length ? { data: rows[0], error: null } : { data: null, error: { message: 'no rows' } };
    return { data: rows, error: null };
  }
  then<A, B>(ok?: ((v: { data: unknown; error: { code?: string; message: string } | null }) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null) {
    try { return Promise.resolve(this.run()).then(ok, bad); } catch (e) { return Promise.reject(e).then(ok, bad); }
  }
}
// supabase-js uses .single() for "exactly one row"; expose it under that name too.
(Query.prototype as unknown as { single: () => Query }).single = function (this: Query) { return this.singleRow(); };
