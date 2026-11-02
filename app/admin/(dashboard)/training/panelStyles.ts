export const GREEN = '#4caf50';
export const label = { display: 'block', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 6 } as const;
export const input = { width: '100%', minHeight: 44, background: 'var(--paper)', border: '1px solid #3a3a3a', color: 'var(--ink)', padding: '10px 12px', fontSize: 14, borderRadius: 6, boxSizing: 'border-box' } as const;
export const primary = { minHeight: 44, padding: '0 22px', background: '#D42B38', color: '#fff', border: '1px solid #D42B38', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' } as const;
export const ghost = { minHeight: 40, padding: '0 16px', background: 'transparent', color: 'var(--ink)', border: '1px solid #666', borderRadius: 6, fontSize: 13, cursor: 'pointer' } as const;
export const card = { border: '1px solid var(--line)', background: 'var(--paper-2)', borderRadius: 10, padding: 18, marginBottom: 14 } as const;
export const chip = (color: string) => ({ display: 'inline-block', fontSize: 11, padding: '3px 10px', borderRadius: 999, border: `1px solid ${color}`, color }) as const;
export const heading = { fontFamily: 'var(--mono)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink-soft)', margin: '26px 0 12px' } as const;
export const inr = (n: number | string) => `INR ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
