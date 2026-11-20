import { describe, expect, it } from 'vitest';
import { estimate, roundTender } from '../estimate';
import { validateInputs } from '../validation';
import { newProject } from '../../data/defaults';
import { RATE_LIBRARY } from '../../data/rateLibrary';
import { QTY_RULES } from '../quantities';
import type { Project } from '../../types';

const base = () => newProject();

describe('quantity rules', () => {
  it('every rate-library item has a quantity rule', () => {
    for (const r of RATE_LIBRARY) expect(QTY_RULES[r.id], r.id).toBeTypeOf('function');
  });
});

describe('estimate engine', () => {
  it('every line obeys Quantity × Unit rate = Amount', () => {
    const r = estimate(base());
    for (const q of ['high', 'medium', 'low'] as const) {
      const s = r.scenarios[q];
      for (const l of [...(s.construction?.lines ?? []), ...(s.electrical?.lines ?? [])]) {
        expect(l.amount).toBeCloseTo(l.qty * l.unitRate, 4);
        expect(l.unitRate).toBeCloseTo(l.materialRate + l.labourRate + l.equipmentRate + l.subcontractRate, 6);
      }
    }
  });

  it('orders scenarios high > medium > low', () => {
    const s = estimate(base()).scenarios;
    expect(s.high.total).toBeGreaterThan(s.medium.total);
    expect(s.medium.total).toBeGreaterThan(s.low.total);
  });

  it('never prices a safety-critical item lower in Low than in Medium', () => {
    const s = estimate(base()).scenarios;
    const med = new Map(s.medium.construction!.lines.concat(s.medium.electrical!.lines).map((l) => [l.id, l]));
    for (const l of s.low.construction!.lines.concat(s.low.electrical!.lines)) {
      if (l.safetyCritical) expect(l.unitRate).toBeGreaterThanOrEqual(med.get(l.id)!.unitRate - 1e-6);
    }
  });

  it('clamps a user edit that tries to downgrade a safety item in Low', () => {
    const p: Project = base();
    p.boqOverrides['C-FF-01'] = { rate: { low: 1 } };
    const r = estimate(p);
    const low = r.scenarios.low.construction!.lines.find((l) => l.id === 'C-FF-01')!;
    const med = r.scenarios.medium.construction!.lines.find((l) => l.id === 'C-FF-01')!;
    expect(low.unitRate).toBeCloseTo(med.unitRate, 6);
    expect(low.safetyFloorApplied).toBe(true);
  });

  it('keeps construction and electrical separate and additive', () => {
    const s = estimate(base()).scenarios.medium;
    expect(s.total).toBeCloseTo(s.construction!.total + s.electrical!.total, 2);
    const p = base();
    p.inputs.scope = 'electrical';
    const e = estimate(p).scenarios.medium;
    expect(e.construction).toBeNull();
    expect(e.total).toBeCloseTo(s.electrical!.total, 2);
  });

  it('responds to quantity and rate overrides', () => {
    const p = base();
    const before = estimate(p).scenarios.medium.total;
    p.boqOverrides['C-FRM-05'] = { qty: 1 };
    expect(estimate(p).scenarios.medium.total).toBeLessThan(before);
  });

  it('applies the country VAT rate', () => {
    const p = base();
    p.inputs.country = 'QA';
    p.inputs.city = 'Doha';
    p.inputs.displayCurrency = 'QAR';
    expect(estimate(p).scenarios.medium.vat).toBe(0);
    p.inputs.country = 'SA';
    p.inputs.displayCurrency = 'SAR';
    const s = estimate(p).scenarios.medium;
    expect(s.vat / s.netBeforeTax).toBeCloseTo(0.15, 6);
  });

  it('is currency-consistent (same project, different display currency)', () => {
    const p = base();
    const aed = estimate(p).scenarios.medium.total;
    p.inputs.displayCurrency = 'USD';
    const usd = estimate(p).scenarios.medium.total;
    expect(aed / usd).toBeCloseTo(3.6725, 3);
  });

  it('lands the Dubai residential Medium scenario inside a plausible benchmark band', () => {
    // T&T Tall Buildings Guide 2026: Dubai residential 20–60 storeys ≈ AED 5,000–6,500/m² (2025).
    const s = estimate(base()).scenarios.medium;
    const exVat = s.netBeforeTax / 42000;
    expect(exVat).toBeGreaterThan(4500);
    expect(exVat).toBeLessThan(7500);
  });
});

describe('validation', () => {
  it('accepts defaults and rejects out-of-range floors', () => {
    const p = base();
    expect(validateInputs(p.inputs)).toHaveLength(0);
    p.inputs.floors = 35;
    expect(validateInputs(p.inputs).some((i) => i.field === 'floors')).toBe(true);
  });
});

describe('roundTender', () => {
  it('rounds up to four significant figures', () => {
    expect(roundTender(252_345_678)).toBe(252_400_000);
    expect(roundTender(9_876)).toBe(9_876);
  });
});
