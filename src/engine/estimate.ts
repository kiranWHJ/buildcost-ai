import type {
  BoqLine,
  CategoryId,
  CostSplit,
  EstimateResult,
  IndirectLine,
  Module,
  ModuleEstimate,
  Project,
  Provenance,
  Quality,
  RateItem,
  ScenarioEstimate,
} from '../types';
import { COUNTRIES, CURRENCY_PER_USD } from '../data/countries';
import { BASELINE_PROVENANCE, CATEGORIES, CATEGORY_LABEL, RATE_LIBRARY } from '../data/rateLibrary';
import { PRELIMS, QUALITIES, QUALITY_INDEX } from '../data/defaults';
import { deriveGeometry } from './geometry';
import { buildContext, INTEGER_UNITS, QTY_RULES, RATE_SCALE_RULES, type QtyContext } from './quantities';

/** Share of a quality uplift that is carried by extra labour hours (finer workmanship). */
export const LABOUR_QUALITY_SHARE = 0.5;

export interface BaseRates {
  material: number;
  labourHours: number;
  equipment: number;
  subcontract: number;
  provenance: Provenance;
  overridden: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const rateKey = (country: string, itemId: string) => `${country}:${itemId}`;

/**
 * Medium-spec base rates for one item in the DISPLAY currency.
 * Rate-library overrides are stored in the country's LOCAL currency and converted here.
 */
export function baseRates(project: Project, item: RateItem): BaseRates {
  const { inputs } = project;
  const country = COUNTRIES[inputs.country];
  const perUsd = CURRENCY_PER_USD[inputs.displayCurrency];
  const localToDisplay = perUsd / country.fxPerUsd;
  const loc = country.locationFactor;
  const matIdx = 1 + inputs.materialIndexPct / 100;
  const eqIdx = 1 + inputs.equipmentIndexPct / 100;
  const ov = project.rateOverrides[rateKey(inputs.country, item.id)];

  const material = ov?.material !== undefined ? ov.material * localToDisplay : item.material * perUsd * loc * matIdx;
  const equipment = ov?.equipment !== undefined ? ov.equipment * localToDisplay : item.equipment * perUsd * loc * eqIdx;
  const subcontract = ov?.subcontract !== undefined ? ov.subcontract * localToDisplay : item.subcontract * perUsd * loc;
  const labourHours = ov?.labourHours !== undefined ? ov.labourHours : item.labourHours;

  const provenance: Provenance = ov
    ? { kind: 'user', label: ov.source || 'User input', date: ov.date }
    : BASELINE_PROVENANCE;

  return { material, labourHours, equipment, subcontract, provenance, overridden: !!ov };
}

/** All-in labour cost per man-hour in the display currency. */
export function labourRate(project: Project): number {
  const { inputs } = project;
  const country = COUNTRIES[inputs.country];
  const perUsd = CURRENCY_PER_USD[inputs.displayCurrency];
  if (inputs.labourRateOverride !== null && inputs.labourRateOverride > 0) {
    return inputs.labourRateOverride * (perUsd / country.fxPerUsd);
  }
  return country.labourUsdPerHour * perUsd;
}

function emptySplit(): CostSplit {
  return { material: 0, labour: 0, equipment: 0, subcontract: 0, total: 0 };
}

function addSplit(a: CostSplit, b: Pick<CostSplit, 'material' | 'labour' | 'equipment' | 'subcontract'>): CostSplit {
  const r = {
    material: a.material + b.material,
    labour: a.labour + b.labour,
    equipment: a.equipment + b.equipment,
    subcontract: a.subcontract + b.subcontract,
    total: 0,
  };
  r.total = r.material + r.labour + r.equipment + r.subcontract;
  return r;
}

function quantityFor(project: Project, item: RateItem, ctx: QtyContext): { qty: number; edited: boolean } {
  const ov = project.boqOverrides[item.id];
  if (ov?.qty !== undefined && ov.qty >= 0) return { qty: ov.qty, edited: true };
  const rule = QTY_RULES[item.id];
  let q = rule ? rule(ctx) : 0;
  q = INTEGER_UNITS.has(item.unit) ? Math.ceil(q - 1e-9) : round2(q);
  return { qty: Math.max(0, q), edited: false };
}

/**
 * Price one BOQ line for one quality scenario:  Quantity × Unit rate = Amount,
 * with the unit rate built up from material + labour + equipment + subcontract.
 */
function priceLine(
  project: Project,
  item: RateItem,
  quality: Quality,
  ctx: QtyContext,
  lhRate: number,
  mediumLine: BoqLine | null,
  warnings: string[],
): BoqLine {
  const base = baseRates(project, item);
  const { qty, edited } = quantityFor(project, item, ctx);
  const scale = RATE_SCALE_RULES[item.id]?.(ctx) ?? 1;
  const perUsd = CURRENCY_PER_USD[project.inputs.displayCurrency];
  const localToDisplay = perUsd / COUNTRIES[project.inputs.country].fxPerUsd;

  const rawQf = item.qualityFactor[QUALITY_INDEX[quality]];
  const mediumQf = item.qualityFactor[1];
  let qf = rawQf;
  let safetyFloorApplied = false;
  if (item.safetyCritical && rawQf < mediumQf) {
    qf = mediumQf;
    safetyFloorApplied = true;
  }
  const lf = 1 + (qf - 1) * LABOUR_QUALITY_SHARE;

  let materialRate = base.material * qf * scale;
  let labourRateU = base.labourHours * lf * lhRate * scale;
  let equipmentRate = base.equipment * qf * scale;
  let subcontractRate = base.subcontract * qf * scale;
  let unitRate = materialRate + labourRateU + equipmentRate + subcontractRate;

  // Safety-critical items: Low scenario follows the Medium line unless explicitly edited.
  const ovRate = project.boqOverrides[item.id]?.rate?.[quality];
  if (item.safetyCritical && quality === 'low' && mediumLine && ovRate === undefined) {
    materialRate = mediumLine.materialRate;
    labourRateU = mediumLine.labourRate;
    equipmentRate = mediumLine.equipmentRate;
    subcontractRate = mediumLine.subcontractRate;
    unitRate = mediumLine.unitRate;
  }

  let rateEdited = false;
  if (ovRate !== undefined && ovRate >= 0) {
    let target = ovRate * localToDisplay;
    if (item.safetyCritical && quality === 'low' && mediumLine && target < mediumLine.unitRate - 1e-6) {
      target = mediumLine.unitRate;
      safetyFloorApplied = true;
      warnings.push(`${item.id}: Low-scenario rate raised to the Medium rate – safety-critical items cannot be downgraded.`);
    }
    if (unitRate > 0) {
      const f = target / unitRate;
      materialRate *= f;
      labourRateU *= f;
      equipmentRate *= f;
      subcontractRate *= f;
    } else {
      materialRate = 0;
      labourRateU = 0;
      equipmentRate = 0;
      subcontractRate = target;
    }
    unitRate = target;
    rateEdited = true;
  }

  const material = qty * materialRate;
  const labour = qty * labourRateU;
  const equipment = qty * equipmentRate;
  const subcontract = qty * subcontractRate;

  return {
    id: item.id,
    module: item.module,
    category: item.category,
    description: item.description,
    spec: item.spec[quality],
    unit: item.unit,
    qty,
    qtyBasis: item.qtyBasis,
    qtyEdited: edited,
    materialRate,
    labourRate: labourRateU,
    equipmentRate,
    subcontractRate,
    unitRate,
    rateEdited,
    material,
    labour,
    equipment,
    subcontract,
    amount: material + labour + equipment + subcontract,
    safetyCritical: item.safetyCritical,
    safetyFloorApplied,
    provenance: rateEdited ? { kind: 'user', label: 'Edited in BOQ', date: new Date().toISOString().slice(0, 10) } : base.provenance,
  };
}

/** Contingency % for a module from the enabled risks in the register (Σ probability × impact). */
export function riskContingencyPct(project: Project, module: Module): number {
  return project.risks
    .filter((r) => r.enabled && (r.module === module || r.module === 'both'))
    .reduce((s, r) => s + r.probability * r.impactPct, 0);
}

function indirectLines(project: Project, module: Module, direct: number, ctx: QtyContext): IndirectLine[] {
  const { inputs } = project;
  const country = COUNTRIES[inputs.country];
  const k = CURRENCY_PER_USD[inputs.displayCurrency] * country.locationFactor;
  const months = inputs.durationMonths;
  const years = months / 12;
  const lines: IndirectLine[] = [];
  const pct = (id: string, label: string, p: number, basis: string) =>
    lines.push({ id, label, basis, qty: direct, unit: `${p.toFixed(2)} % of direct`, rate: p / 100, amount: (direct * p) / 100 });

  if (module === 'construction') {
    const P = PRELIMS.construction;
    const staff = Math.round(P.staffBase + inputs.builtUpArea * P.staffPerM2);
    lines.push({ id: 'IC-01', label: 'Project management and site staff', basis: `${staff} staff × ${months} months`, qty: staff * months, unit: 'person-mth', rate: P.staffMonthlyUsd * k, amount: staff * months * P.staffMonthlyUsd * k });
    const est = (P.establishmentLumpUsd + inputs.builtUpArea * P.establishmentPerM2Usd) * k;
    lines.push({ id: 'IC-02', label: 'Site establishment, offices, labour welfare and hoarding', basis: 'Lump + per m² of BUA', qty: 1, unit: 'lot', rate: est, amount: est });
    lines.push({ id: 'IC-03', label: 'Temporary power, water and telecoms', basis: `${months} months`, qty: months, unit: 'month', rate: P.utilitiesMonthlyUsd * k, amount: months * P.utilitiesMonthlyUsd * k });
    lines.push({ id: 'IC-04', label: 'Health, safety, security and logistics', basis: `${months} months`, qty: months, unit: 'month', rate: P.hseMonthlyUsd * k, amount: months * P.hseMonthlyUsd * k });
    pct('IC-05', 'Contractor all-risk and third-party insurance', P.insurancePct, 'CAR + TPL');
    pct('IC-06', 'Performance bond and advance payment guarantee', P.bondsPctPerYear * years, `${P.bondsPctPerYear} % per year × ${years.toFixed(1)} years`);
    pct('IC-07', 'Shop drawings, surveys, BIM and testing', P.designPct, 'Contractor design obligations');
    pct('IC-08', 'Municipality permits and authority fees', P.permitsPct, 'Building permit, NOCs');
  } else {
    const P = PRELIMS.electrical;
    const staff = Math.round(P.staffBase + inputs.builtUpArea * P.staffPerM2);
    lines.push({ id: 'IE-01', label: 'Electrical project manager, engineers and supervisors', basis: `${staff} staff × ${months} months`, qty: staff * months, unit: 'person-mth', rate: P.staffMonthlyUsd * k, amount: staff * months * P.staffMonthlyUsd * k });
    lines.push({ id: 'IE-02', label: 'Site office, stores and test equipment', basis: `${months} months`, qty: months, unit: 'month', rate: P.officeMonthlyUsd * k, amount: months * P.officeMonthlyUsd * k });
    const kva = Math.round(ctx.g.demandKVA);
    lines.push({ id: 'IE-03', label: `Utility connection and ${country.powerAuthority} charges`, basis: `${kva.toLocaleString()} kVA demand`, qty: kva, unit: 'kVA', rate: P.utilityPerKvaUsd * k, amount: kva * P.utilityPerKvaUsd * k });
    pct('IE-04', 'Insurance', P.insurancePct, 'Subcontract CAR');
    pct('IE-05', 'Bonds and guarantees', P.bondsPctPerYear * years, `${P.bondsPctPerYear} % per year × ${years.toFixed(1)} years`);
    pct('IE-06', 'Shop drawings, coordination (BIM) and load calculations', P.designPct, 'Design-and-build obligations');
  }
  return lines;
}

function moduleEstimate(project: Project, module: Module, lines: BoqLine[], ctx: QtyContext): ModuleEstimate {
  const { inputs } = project;
  const country = COUNTRIES[inputs.country];
  const direct = lines.reduce((s, l) => addSplit(s, l), emptySplit());

  const byCategory = CATEGORIES.filter((c) => c.module === module).map((c) => ({
    category: c.id as CategoryId,
    label: CATEGORY_LABEL[c.id],
    amount: lines.filter((l) => l.category === c.id).reduce((s, l) => s + l.amount, 0),
  }));

  const indirect = indirectLines(project, module, direct.total, ctx);
  const indirectTotal = indirect.reduce((s, l) => s + l.amount, 0);
  const escalation = inputs.includeEscalation ? direct.total * country.escalationPerYear * (inputs.durationMonths / 12 / 2) : 0;
  const base = direct.total + indirectTotal + escalation;
  const contPct = inputs.contingencyMode === 'risk' ? riskContingencyPct(project, module) : inputs.contingencyPct;
  const overhead = (base * inputs.overheadPct) / 100;
  const contingency = (base * contPct) / 100;
  const subtotalBeforeProfit = base + overhead + contingency;
  const profit = (subtotalBeforeProfit * inputs.profitPct) / 100;
  const netBeforeTax = subtotalBeforeProfit + profit;
  const vat = inputs.includeVat ? netBeforeTax * country.vat : 0;
  return {
    module,
    lines,
    direct,
    byCategory,
    indirect,
    indirectTotal,
    escalation,
    overhead,
    contingency,
    subtotalBeforeProfit,
    profit,
    netBeforeTax,
    vat,
    total: netBeforeTax + vat,
  };
}

/** Round a tender figure up to a presentable step (4 significant figures). */
export function roundTender(n: number): number {
  if (n <= 0) return 0;
  const step = Math.max(1, 10 ** (Math.floor(Math.log10(n)) - 3));
  return Math.ceil(n / step) * step;
}

/**
 * Run the full estimate for all three quality scenarios.
 * Pure function of the project – the UI calls it on every input change.
 */
export function estimate(project: Project): EstimateResult {
  const { inputs } = project;
  const country = COUNTRIES[inputs.country];
  const geometry = deriveGeometry(inputs);
  const ctx = buildContext(inputs, geometry);
  const lh = labourRate(project);
  const warnings: string[] = [];
  const modules: Module[] =
    inputs.scope === 'both' ? ['construction', 'electrical'] : [inputs.scope];

  const scenarios = {} as Record<Quality, ScenarioEstimate>;
  const mediumLines: Record<string, BoqLine> = {};

  // Price Medium first so Low can reference it for safety-critical floors.
  const order: Quality[] = ['medium', 'high', 'low'];
  for (const q of order) {
    const moduleResults: Partial<Record<Module, ModuleEstimate>> = {};
    for (const m of modules) {
      const lines = RATE_LIBRARY.filter((r) => r.module === m).map((item) =>
        priceLine(project, item, q, ctx, lh, q === 'medium' ? null : mediumLines[item.id] ?? null, warnings),
      );
      if (q === 'medium') lines.forEach((l) => (mediumLines[l.id] = l));
      moduleResults[m] = moduleEstimate(project, m, lines, ctx);
    }
    const parts = Object.values(moduleResults) as ModuleEstimate[];
    const sum = (f: (x: ModuleEstimate) => number) => parts.reduce((s, x) => s + f(x), 0);
    const direct = parts.reduce((s, x) => addSplit(s, x.direct), emptySplit());
    const total = sum((x) => x.total);
    scenarios[q] = {
      quality: q,
      construction: moduleResults.construction ?? null,
      electrical: moduleResults.electrical ?? null,
      direct,
      indirect: sum((x) => x.indirectTotal),
      escalation: sum((x) => x.escalation),
      overhead: sum((x) => x.overhead),
      contingency: sum((x) => x.contingency),
      profit: sum((x) => x.profit),
      netBeforeTax: sum((x) => x.netBeforeTax),
      vat: sum((x) => x.vat),
      total,
      costPerM2: total / inputs.builtUpArea,
      recommendedTender: roundTender(total),
    };
  }

  // Effective contingency %, weighted by base cost across modules (medium scenario)
  const med = scenarios.medium;
  const medBase = med.direct.total + med.indirect + med.escalation;
  const riskBlend =
    medBase > 0
      ? modules.reduce((s, m) => {
          const me = m === 'construction' ? med.construction : med.electrical;
          if (!me) return s;
          return s + riskContingencyPct(project, m) * ((me.direct.total + me.indirectTotal + me.escalation) / medBase);
        }, 0)
      : 0;

  // Provenance warnings
  const items = RATE_LIBRARY.filter((r) => modules.includes(r.module));
  const illustrative = items.filter((r) => !project.rateOverrides[rateKey(inputs.country, r.id)]).length;
  if (illustrative > 0) {
    warnings.unshift(
      `${illustrative} of ${items.length} unit rates are illustrative assumptions, not verified market prices. Replace them with supplier or subcontractor quotes in the Rate Library before submitting.`,
    );
  }
  if (country.code === 'KW') warnings.push('KWD is basket-managed; the conversion rate used is approximate.');
  if (geometry.plateArea < 600) warnings.push(`Typical floor plate is only ${Math.round(geometry.plateArea)} m² – check built-up area against floor count.`);
  if (geometry.plateArea > 4000) warnings.push(`Typical floor plate is ${Math.round(geometry.plateArea)} m² – unusually large for a tower; check built-up area.`);

  return {
    currency: inputs.displayCurrency,
    fx: CURRENCY_PER_USD[inputs.displayCurrency] / country.fxPerUsd,
    geometry,
    labourRatePerHour: lh,
    contingencyPct: inputs.contingencyMode === 'risk' ? riskBlend : inputs.contingencyPct,
    riskContingencyPct: riskBlend,
    scenarios,
    warnings: Array.from(new Set(warnings)),
  };
}

export { QUALITIES };
