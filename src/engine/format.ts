import type { CurrencyCode } from '../types';

const THREE_DP: CurrencyCode[] = ['OMR', 'KWD', 'BHD'];

/** Full money, e.g. "AED 152,430,000" */
export function money(n: number, cur: CurrencyCode, opts: { decimals?: number } = {}): string {
  const d = opts.decimals ?? 0;
  return `${cur} ${n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

/** Unit-rate formatting: more decimals for small values and 3-dp currencies */
export function rate(n: number, cur: CurrencyCode): string {
  const d = THREE_DP.includes(cur) ? (n < 100 ? 3 : 2) : n < 10 ? 2 : n < 1000 ? 2 : 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

/** Compact money, e.g. "AED 152.4M" */
export function compact(n: number, cur?: CurrencyCode): string {
  const abs = Math.abs(n);
  let s: string;
  if (abs >= 1e9) s = `${(n / 1e9).toFixed(2)}B`;
  else if (abs >= 1e6) s = `${(n / 1e6).toFixed(abs >= 1e8 ? 0 : 1)}M`;
  else if (abs >= 1e3) s = `${(n / 1e3).toFixed(0)}k`;
  else s = n.toFixed(0);
  return cur ? `${cur} ${s}` : s;
}

export function num(n: number, d = 0): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function pct(n: number, d = 1): string {
  return `${n.toFixed(d)} %`;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
