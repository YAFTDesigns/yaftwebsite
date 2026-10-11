// Number formatters for INR amounts and counts (en-IN grouping).
export const fmt = (n: number) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
export const fmtFixed2 = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtInt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
