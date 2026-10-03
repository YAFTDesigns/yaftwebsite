// Pure rules for the admin "needs attention today" view. No I/O.

export const LEAD_STATUSES = ['new', 'contacted', 'interested', 'confirmed', 'lost'] as const;
export const PROPOSAL_STATUSES = ['none', 'drafted', 'sent', 'accepted', 'declined'] as const;
export const PAYMENT_STATUSES = ['none', 'advance_due', 'advance_paid', 'balance_due', 'paid'] as const;

export const PROPOSAL_LABELS: Record<string, string> = {
  none: 'No proposal', drafted: 'Drafted', sent: 'Sent', accepted: 'Accepted', declined: 'Declined',
};
export const PAYMENT_LABELS: Record<string, string> = {
  none: 'None', advance_due: 'Advance due', advance_paid: 'Advance paid', balance_due: 'Balance due', paid: 'Paid in full',
};

export const PROPOSAL_STALE_DAYS = 5;
export const PAYMENT_STALE_DAYS = 3;

export type AttentionLead = {
  id: string;
  status: string;
  declined: boolean;
  follow_up_date: string | null;
  proposal_status: string;
  proposal_updated_at: string | null;
  payment_status: string;
  payment_updated_at: string | null;
  hasEnquiry: boolean;
};

export type Attention = { reason: string; rank: number };

// Wrapper so server pages can read the clock without calling Date.now() in render.
export const nowMs = () => Date.now();

// Today's date in India as YYYY-MM-DD.
export function istDate(now = Date.now()): string {
  return new Date(now).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function dayDiff(fromYmd: string, toYmd: string): number {
  return Math.round((Date.parse(toYmd) - Date.parse(fromYmd)) / 86_400_000);
}

function daysSince(iso: string | null, now: number): number | null {
  return iso ? Math.floor((now - new Date(iso).getTime()) / 86_400_000) : null;
}

// Lower rank = more urgent. A lead can have several reasons; all are returned.
// Declined and lost leads never appear (nothing to chase).
export function attentionReasons(l: AttentionLead, now = Date.now()): Attention[] {
  if (l.declined || l.status === 'lost') return [];
  const out: Attention[] = [];
  const today = istDate(now);

  if ((l.payment_status === 'advance_due' || l.payment_status === 'balance_due')) {
    const d = daysSince(l.payment_updated_at, now);
    if (d === null || d >= PAYMENT_STALE_DAYS) {
      out.push({ rank: 1, reason: `${l.payment_status === 'advance_due' ? 'Advance' : 'Balance'} payment pending${d === null ? '' : ` for ${d} days`}` });
    }
  }
  if (l.follow_up_date && l.follow_up_date <= today) {
    const late = dayDiff(l.follow_up_date, today);
    out.push({ rank: 2, reason: late === 0 ? 'Follow-up due today' : `Follow-up overdue by ${late} day${late === 1 ? '' : 's'}` });
  }
  if (l.status === 'new' && l.hasEnquiry) {
    out.push({ rank: 3, reason: 'New enquiry, not contacted yet' });
  }
  if (l.proposal_status === 'sent') {
    const d = daysSince(l.proposal_updated_at, now);
    if (d !== null && d >= PROPOSAL_STALE_DAYS) out.push({ rank: 4, reason: `Proposal sent ${d} days ago, no reply recorded` });
  }
  if (l.status === 'interested' && !l.follow_up_date) {
    out.push({ rank: 5, reason: 'Interested, but no next follow-up date set' });
  }
  return out.sort((a, b) => a.rank - b.rank);
}
