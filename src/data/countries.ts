import type { Country, CountryCode, CurrencyCode } from '../types';

/**
 * Country reference data.
 *
 * - VAT rates: statutory standard rates, checked 2026-11-20 against PwC "GCC Indirect Tax News
 *   Roundup Q3 2026" and Khaleej Times (Jun 2026): KSA 15 %, Bahrain 10 %, UAE 5 %, Oman 5 %,
 *   Qatar and Kuwait have not introduced VAT. Construction supplies can have special treatment
 *   (e.g. zero-rating of first supply of residential buildings) – confirm with a tax adviser.
 * - FX: AED, SAR, QAR, OMR and BHD are pegged to the USD. KWD is managed against an undisclosed
 *   basket, so its rate is approximate.
 * - Location factors, labour rates and escalation are calibration assumptions informed by
 *   Turner & Townsend Global Construction Market Intelligence 2025 (average cost/m² and wage
 *   data for Riyadh, Doha, Dubai, Abu Dhabi). Oman, Kuwait and Bahrain factors are illustrative
 *   because that report does not cover them. Edit them in the Rate Library.
 */
const CHECKED = '2026-11-20';

export const COUNTRIES: Record<CountryCode, Country> = {
  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    currency: 'AED',
    cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah'],
    fxPerUsd: 3.6725,
    fxNote: 'USD peg (fixed)',
    vat: 0.05,
    vatNote: 'UAE standard VAT 5 %',
    locationFactor: 1.0,
    labourUsdPerHour: 6.5 * 1.55,
    escalationPerYear: 0.05,
    powerAuthority: 'DEWA / ADDC / SEWA',
    civilDefence: 'UAE Civil Defence',
    provenance: { kind: 'benchmark', label: 'Calibrated to T&T GCMI 2025 (Dubai wage US$6.50/h × 1.55 all-in)', date: CHECKED },
  },
  SA: {
    code: 'SA',
    name: 'Saudi Arabia',
    currency: 'SAR',
    cities: ['Riyadh', 'Jeddah', 'Dammam', 'Khobar', 'Makkah', 'Madinah'],
    fxPerUsd: 3.75,
    fxNote: 'USD peg (fixed)',
    vat: 0.15,
    vatNote: 'KSA standard VAT 15 %',
    locationFactor: 1.38,
    labourUsdPerHour: 9.5 * 1.45,
    escalationPerYear: 0.05,
    powerAuthority: 'Saudi Electricity Company (SEC)',
    civilDefence: 'Saudi Civil Defence (SBC 801)',
    provenance: { kind: 'benchmark', label: 'Calibrated to T&T GCMI 2025 (Riyadh avg US$3,112/m²)', date: CHECKED },
  },
  QA: {
    code: 'QA',
    name: 'Qatar',
    currency: 'QAR',
    cities: ['Doha', 'Lusail', 'Al Wakrah', 'Al Rayyan'],
    fxPerUsd: 3.64,
    fxNote: 'USD peg (fixed)',
    vat: 0,
    vatNote: 'No VAT in Qatar (as of Nov 2026)',
    locationFactor: 1.22,
    labourUsdPerHour: 5.4 * 1.6,
    escalationPerYear: 0.01,
    powerAuthority: 'KAHRAMAA',
    civilDefence: 'Qatar Civil Defence (QCDD)',
    provenance: { kind: 'benchmark', label: 'Calibrated to T&T GCMI 2025 (Doha avg US$2,613/m²)', date: CHECKED },
  },
  OM: {
    code: 'OM',
    name: 'Oman',
    currency: 'OMR',
    cities: ['Muscat', 'Salalah', 'Sohar', 'Duqm', 'Nizwa'],
    fxPerUsd: 0.3845,
    fxNote: 'USD peg (fixed)',
    vat: 0.05,
    vatNote: 'Oman standard VAT 5 %',
    locationFactor: 0.95,
    labourUsdPerHour: 5.5 * 1.55,
    escalationPerYear: 0.035,
    powerAuthority: 'Nama Electricity Distribution',
    civilDefence: 'Civil Defence & Ambulance Authority',
    provenance: { kind: 'illustrative', label: 'Illustrative assumption – no benchmark loaded', date: CHECKED },
  },
  KW: {
    code: 'KW',
    name: 'Kuwait',
    currency: 'KWD',
    cities: ['Kuwait City', 'Hawalli', 'Salmiya', 'Ahmadi', 'Jahra'],
    fxPerUsd: 0.307,
    fxNote: 'Basket-managed, approximate – verify on the day of tender',
    vat: 0,
    vatNote: 'No VAT in Kuwait (as of Nov 2026)',
    locationFactor: 1.08,
    labourUsdPerHour: 6.0 * 1.55,
    escalationPerYear: 0.03,
    powerAuthority: 'Ministry of Electricity, Water & Renewable Energy',
    civilDefence: 'Kuwait Fire Force',
    provenance: { kind: 'illustrative', label: 'Illustrative assumption – no benchmark loaded', date: CHECKED },
  },
  BH: {
    code: 'BH',
    name: 'Bahrain',
    currency: 'BHD',
    cities: ['Manama', 'Muharraq', 'Riffa', 'Seef', 'Diyar Al Muharraq'],
    fxPerUsd: 0.376,
    fxNote: 'USD peg (fixed)',
    vat: 0.1,
    vatNote: 'Bahrain standard VAT 10 %',
    locationFactor: 0.97,
    labourUsdPerHour: 5.5 * 1.55,
    escalationPerYear: 0.03,
    powerAuthority: 'Electricity & Water Authority (EWA)',
    civilDefence: 'Bahrain General Directorate of Civil Defence',
    provenance: { kind: 'illustrative', label: 'Illustrative assumption – no benchmark loaded', date: CHECKED },
  },
};

export const COUNTRY_LIST = Object.values(COUNTRIES);

/** USD per unit of currency → used to convert between any two currencies */
export const CURRENCY_PER_USD: Record<CurrencyCode, number> = {
  AED: 3.6725,
  SAR: 3.75,
  QAR: 3.64,
  OMR: 0.3845,
  KWD: 0.307,
  BHD: 0.376,
  USD: 1,
};

export const CURRENCIES: { code: CurrencyCode; name: string; decimals: number }[] = [
  { code: 'AED', name: 'UAE dirham', decimals: 0 },
  { code: 'SAR', name: 'Saudi riyal', decimals: 0 },
  { code: 'QAR', name: 'Qatari riyal', decimals: 0 },
  { code: 'OMR', name: 'Omani rial', decimals: 0 },
  { code: 'KWD', name: 'Kuwaiti dinar', decimals: 0 },
  { code: 'BHD', name: 'Bahraini dinar', decimals: 0 },
  { code: 'USD', name: 'US dollar', decimals: 0 },
];

export function convert(amount: number, from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return amount;
  return (amount / CURRENCY_PER_USD[from]) * CURRENCY_PER_USD[to];
}

export const CALIBRATION_SOURCES = [
  {
    label: 'Turner & Townsend – Global Construction Market Intelligence 2025 (Middle East)',
    note: 'Average build cost/m²: Riyadh US$3,112, Doha US$2,613, Dubai US$1,926, Abu Dhabi US$1,872; wages/hour Riyadh US$14.10, Dubai US$6.50, Doha US$5.40. Used only to calibrate location factors.',
    url: 'https://www.arabianbusiness.com/abnews/middle-east-construction-saudi-arabias-building-boom-faces-rising-costs-and-labour-crunch',
  },
  {
    label: 'Turner & Townsend – Tall Buildings Construction Guide 2026 (Dubai)',
    note: 'Dubai residential 20–60 storeys 2025: approx. AED 5,000–6,500 per m². Used as a sanity range for the Medium scenario.',
    url: 'https://reports.turnerandtownsend.com/tall-buildings-construction-guide-2026/dubai',
  },
  {
    label: 'Turner & Townsend – UAE market intelligence 2025',
    note: 'Sample rates: basement excavation ~AED 20/m³; commercial lift for 20 storeys ~AED 800,000 (Dubai).',
    url: 'https://marketintelligence.turnerandtownsend.com/uaemi-2025/construction-cost-performance',
  },
  {
    label: 'PwC Middle East – GCC Indirect Tax News Roundup Q3 2026',
    note: 'VAT status: Bahrain 10 %, Oman 5 %; not yet introduced in Qatar or Kuwait.',
    url: 'https://www.pwc.com/m1/en/tax/documents/2026/gcc-indirect-tax-news-roundup-q3-2026.pdf',
  },
];
