import type { PayStatus } from './enrolmentView';

export type ProjectState = 'none' | 'draft' | 'submitted' | 'under_review' | 'changes_requested' | 'approved';
export type Eligibility = { eligible: boolean; missing: string[] };

/**
 * Certificate rule: an APPROVED project is always required. Full payment is required only when the course rule says so
 * (course_rules.requires_full_payment, flagged for the owner to confirm). Testimonials are never part of this.
 * A refunded/cancelled enrolment is never eligible.
 */
export function certificateEligibility(input: { projectState: ProjectState; payStatus: PayStatus; requiresFullPayment: boolean; hasLiveCertificate: boolean }): Eligibility {
  const missing: string[] = [];
  if (input.payStatus === 'cancelled') missing.push('This enrolment is cancelled');
  if (input.projectState !== 'approved') missing.push('Project approval');
  if (input.requiresFullPayment && input.payStatus !== 'paid_in_full') missing.push('Full payment');
  if (input.hasLiveCertificate) return { eligible: false, missing: ['Already issued'] };
  return { eligible: missing.length === 0, missing };
}
