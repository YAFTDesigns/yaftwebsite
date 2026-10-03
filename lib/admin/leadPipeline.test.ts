import { describe, it, expect } from 'vitest';
import { attentionReasons, istDate, type AttentionLead } from './leadPipeline';

const NOW = Date.parse('2026-10-10T06:00:00Z'); // 10 Oct, 11:30 IST
const day = (n: number) => new Date(NOW - n * 86_400_000).toISOString();
const base: AttentionLead = {
  id: 'x', status: 'contacted', declined: false, follow_up_date: null,
  proposal_status: 'none', proposal_updated_at: null, payment_status: 'none', payment_updated_at: null, hasEnquiry: true,
};
const r = (o: Partial<AttentionLead>) => attentionReasons({ ...base, ...o }, NOW).map((a) => a.reason);

describe('attentionReasons', () => {
  it('uses the India date', () => { expect(istDate(Date.parse('2026-10-09T20:00:00Z'))).toBe('2026-10-10'); });
  it('flags nothing for a quiet lead', () => { expect(r({})).toEqual([]); });
  it('never flags declined or lost leads', () => {
    expect(r({ declined: true, follow_up_date: '2026-10-01' })).toEqual([]);
    expect(r({ status: 'lost', follow_up_date: '2026-10-01' })).toEqual([]);
  });
  it('follow-up today, overdue, and future', () => {
    expect(r({ follow_up_date: '2026-10-10' })).toEqual(['Follow-up due today']);
    expect(r({ follow_up_date: '2026-10-08' })).toEqual(['Follow-up overdue by 2 days']);
    expect(r({ follow_up_date: '2026-10-11' })).toEqual([]);
  });
  it('new enquiry needs first contact only if an enquiry exists', () => {
    expect(r({ status: 'new' })).toEqual(['New enquiry, not contacted yet']);
    expect(r({ status: 'new', hasEnquiry: false })).toEqual([]);
  });
  it('proposal goes stale after 5 days', () => {
    expect(r({ proposal_status: 'sent', proposal_updated_at: day(4) })).toEqual([]);
    expect(r({ proposal_status: 'sent', proposal_updated_at: day(6) })).toEqual(['Proposal sent 6 days ago, no reply recorded']);
  });
  it('pending payment waits 3 days, and ranks first', () => {
    expect(r({ payment_status: 'advance_due', payment_updated_at: day(1) })).toEqual([]);
    expect(r({ payment_status: 'balance_due', payment_updated_at: day(5), follow_up_date: '2026-10-10' }))
      .toEqual(['Balance payment pending for 5 days', 'Follow-up due today']);
  });
  it('interested with no next step', () => {
    expect(r({ status: 'interested' })).toEqual(['Interested, but no next follow-up date set']);
  });
});
