import type { MouseEvent } from 'react';

/**
 * "Enquire" buttons point at the #contact form. Not every page has one (Projects, Insights, Labs, Terms...).
 * When this page has no #contact section, send the visitor to the homepage form instead of doing nothing.
 */
export function goToContact(e: MouseEvent<HTMLAnchorElement>): void {
  if (typeof document === 'undefined' || document.getElementById('contact')) return;
  e.preventDefault();
  window.location.assign('/#contact');
}
