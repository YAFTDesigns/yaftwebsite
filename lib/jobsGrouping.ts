// Pure grouping/aggregation helpers, no ExcelJS or React dependency, so
// the downloaded .xlsx (lib/jobsExport.ts) and the in-browser spreadsheet
// view (JobsSheetView.tsx) compute identical numbers from one source
// instead of two copies of the same grouping logic drifting apart.

// Single source of truth for status colors -- red is reserved exclusively
// for Cancelled everywhere (admin UI badges, the exported sheet, the
// in-browser spreadsheet view), never reused for In Review.
export const STATUS_COLORS_HEX: Record<string, string> = {
  Completed: '#3FB950',   // green
  Cancelled: '#E63946',   // red
  'In Review': '#A371F7', // purple
  Submitted: '#58A6FF',   // blue
  Pending: '#D4A72C',     // orange
};

export type MinimalJob = {
  job_date: string;
  job_type: string;
  total: number | string;
};

export function monthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

// Most recent month first.
export function groupByMonth<T extends MinimalJob>(jobs: T[]): Map<string, T[]> {
  const byMonth = new Map<string, T[]>();
  jobs.forEach((j) => {
    const key = monthKey(j.job_date);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(j);
  });
  return new Map([...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0])));
}

// Highest-earning job type first -- "what earns me more".
export function revenueByType<T extends MinimalJob>(jobs: T[]): { type: string; count: number; total: number }[] {
  const byType = new Map<string, { count: number; total: number }>();
  jobs.forEach((j) => {
    const cur = byType.get(j.job_type) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(j.total);
    byType.set(j.job_type, cur);
  });
  return [...byType.entries()]
    .map(([type, v]) => ({ type, ...v }))
    .sort((a, b) => b.total - a.total);
}

// Most recent month first, for trend-spotting.
export function revenueByMonth<T extends MinimalJob>(jobs: T[]): { key: string; label: string; count: number; total: number }[] {
  const grouped = groupByMonth(jobs);
  return [...grouped.entries()].map(([key, monthJobs]) => ({
    key,
    label: monthLabel(key),
    count: monthJobs.length,
    total: monthJobs.reduce((s, j) => s + Number(j.total), 0),
  }));
}
