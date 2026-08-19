/** Shared month-tab ordering/labels for pages driven by project_tasks.sheet_tab
 *  (e.g. "January 2026") — used by both project tracking and the internal dashboard. */
export const MONTH_ORDER = [
  'January 2026', 'February 2026', 'March 2026', 'April 2026',
  'May 2026', 'June 2026', 'July 2026', 'August 2026',
  'September 2026', 'October 2026', 'November 2026', 'December 2026',
];

export function sortMonths(months: string[]): string[] {
  return [...months].sort((a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b));
}

export function currentMonthLabel(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
