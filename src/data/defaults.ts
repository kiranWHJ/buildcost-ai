import type { BuildingType, Project, ProjectInputs, Quality, Risk } from '../types';

/**
 * Parametric design coefficients by building type. These turn a few headline inputs
 * (floors, area, type) into measurable quantities. They are typical estimating norms
 * for GCC high-rise buildings and are deliberately visible so an estimator can
 * challenge them. Replace derived quantities with measured take-offs in the BOQ
 * whenever drawings are available.
 */
export interface TypeCoefficients {
  label: string;
  floorHeight: number;      // m
  wwr: number;              // window-to-wall ratio
  unitArea: number;         // gross m² per apartment / key / tenancy
  unitLabel: string;
  partitionFactor: number;  // m² internal blockwork per m² floor
  wetFactor: number;        // m² wall tiling per m² floor
  doorDensity: number;      // m² floor per internal door
  fixtureDensity: number;   // m² floor per sanitary fixture
  liftServiceArea: number;  // m² above-ground floor per passenger lift
  m2PerTR: number;          // m² per ton of refrigeration
  vaPerM2: number;          // connected load density VA/m² (incl. HVAC)
  luminaireM2: number;      // m² per luminaire
  socketM2: number;         // m² per socket outlet
  standbyRatio: number;     // share of demand on standby generation
  escalators: number;
  balconyFactor: number;    // share of floor perimeter with balustrade
  lightingControlCoverage: number;
  trunkingFactor: number;   // m trunking per m²
  voiceEvacFactor: number;
}

export const TYPE_COEFFICIENTS: Record<BuildingType, TypeCoefficients> = {
  residential: { label: 'Residential', floorHeight: 3.3, wwr: 0.4, unitArea: 115, unitLabel: 'apartments', partitionFactor: 0.95, wetFactor: 0.32, doorDensity: 14, fixtureDensity: 16, liftServiceArea: 5500, m2PerTR: 24, vaPerM2: 115, luminaireM2: 9, socketM2: 7, standbyRatio: 0.35, escalators: 0, balconyFactor: 0.35, lightingControlCoverage: 0.25, trunkingFactor: 0.02, voiceEvacFactor: 0.5 },
  commercial: { label: 'Commercial office', floorHeight: 4.0, wwr: 0.62, unitArea: 600, unitLabel: 'tenancies', partitionFactor: 0.3, wetFactor: 0.08, doorDensity: 55, fixtureDensity: 45, liftServiceArea: 3800, m2PerTR: 18, vaPerM2: 150, luminaireM2: 7, socketM2: 9, standbyRatio: 0.5, escalators: 4, balconyFactor: 0.03, lightingControlCoverage: 1, trunkingFactor: 0.12, voiceEvacFactor: 1 },
  hotel: { label: 'Hotel', floorHeight: 3.4, wwr: 0.45, unitArea: 48, unitLabel: 'keys', partitionFactor: 1.05, wetFactor: 0.42, doorDensity: 12, fixtureDensity: 11, liftServiceArea: 4200, m2PerTR: 20, vaPerM2: 155, luminaireM2: 6, socketM2: 8, standbyRatio: 0.65, escalators: 2, balconyFactor: 0.2, lightingControlCoverage: 1, trunkingFactor: 0.03, voiceEvacFactor: 1 },
  mixed: { label: 'Mixed-use', floorHeight: 3.6, wwr: 0.5, unitArea: 130, unitLabel: 'units', partitionFactor: 0.7, wetFactor: 0.25, doorDensity: 18, fixtureDensity: 20, liftServiceArea: 4600, m2PerTR: 21, vaPerM2: 135, luminaireM2: 8, socketM2: 8, standbyRatio: 0.45, escalators: 4, balconyFactor: 0.2, lightingControlCoverage: 0.7, trunkingFactor: 0.06, voiceEvacFactor: 1 },
};

/**
 * Preliminaries / indirect cost assumptions (USD, Dubai-equivalent; scaled by FX and
 * location factor like the rate library). Illustrative – edit per tender.
 */
export const PRELIMS = {
  construction: {
    staffBase: 8,               // site management team, persons
    staffPerM2: 1 / 4000,       // + 1 person per 4,000 m²
    staffMonthlyUsd: 6500,      // all-in per person per month
    establishmentLumpUsd: 120000,
    establishmentPerM2Usd: 3,
    utilitiesMonthlyUsd: 9000,
    hseMonthlyUsd: 11000,
    insurancePct: 0.45,         // % of direct cost (CAR + TPL)
    bondsPctPerYear: 0.35,      // % of direct per year (performance + advance payment guarantees)
    designPct: 0.8,             // shop drawings, surveys, BIM
    permitsPct: 0.4,
  },
  electrical: {
    staffBase: 2,
    staffPerM2: 1 / 15000,
    staffMonthlyUsd: 5500,
    officeMonthlyUsd: 2500,
    insurancePct: 0.4,
    bondsPctPerYear: 0.3,
    designPct: 1.2,
    utilityPerKvaUsd: 30,       // utility connection & authority charges per kVA demand
  },
};

export const QUALITY_META: Record<Quality, { label: string; short: string; blurb: string }> = {
  high: { label: 'High quality', short: 'High', blurb: 'Premium materials, branded equipment and high-end specifications.' },
  medium: { label: 'Medium quality', short: 'Medium', blurb: 'Standard materials, reliable equipment and normal commercial specifications.' },
  low: { label: 'Low quality', short: 'Low', blurb: 'Economical materials and cost-optimised specifications. Structural, fire and electrical safety items are never downgraded.' },
};

export const QUALITY_INDEX: Record<Quality, 0 | 1 | 2> = { low: 0, medium: 1, high: 2 };
export const QUALITIES: Quality[] = ['high', 'medium', 'low'];

export const DEFAULT_RISKS: Risk[] = [
  { id: 'R1', title: 'Ground conditions', description: 'Unforeseen rock, high water table or contaminated soil affecting excavation, shoring and piling.', module: 'construction', probability: 0.3, impactPct: 4, mitigation: 'Commission a full geotechnical investigation; include provisional sums for rock excavation.', enabled: true },
  { id: 'R2', title: 'Steel and cement price volatility', description: 'Rebar, cement and aluminium prices move between tender and procurement.', module: 'construction', probability: 0.4, impactPct: 4, mitigation: 'Lock supplier prices early; negotiate a price-adjustment clause for rebar.', enabled: true },
  { id: 'R3', title: 'Copper price spike', description: 'Copper drives cable, busbar and transformer costs.', module: 'electrical', probability: 0.4, impactPct: 5, mitigation: 'Seek copper-indexed pricing or forward purchase of cables.', enabled: true },
  { id: 'R4', title: 'Design development and scope change', description: 'Tender drawings not fully coordinated; quantities grow during design development.', module: 'both', probability: 0.4, impactPct: 3, mitigation: 'Qualify the tender on drawing revisions; price variations separately.', enabled: true },
  { id: 'R5', title: 'Labour availability and summer productivity', description: 'Midday work ban (mid-June to mid-September) and skilled-labour shortages reduce productivity.', module: 'both', probability: 0.5, impactPct: 2, mitigation: 'Plan night pours and double shifts; secure labour supply agreements.', enabled: true },
  { id: 'R6', title: 'Authority approval delays', description: 'Civil defence, municipality and utility approvals take longer than programmed.', module: 'both', probability: 0.35, impactPct: 2, mitigation: 'Engage authorities early; programme float for NOCs and inspections.', enabled: true },
  { id: 'R7', title: 'Long-lead equipment', description: 'Lifts, chillers, transformers, generators and switchgear delivery delays.', module: 'both', probability: 0.3, impactPct: 2.5, mitigation: 'Place early orders; confirm lead times with shortlisted vendors.', enabled: true },
  { id: 'R8', title: 'MEP and façade interface', description: 'Coordination clashes between structure, façade and services.', module: 'construction', probability: 0.3, impactPct: 2, mitigation: 'Use coordinated BIM model and clash detection before construction.', enabled: true },
  { id: 'R9', title: 'Import duties and currency', description: 'Changes in customs duties or non-USD supplier currencies (EUR/GBP equipment).', module: 'both', probability: 0.2, impactPct: 1.5, mitigation: 'Price imported equipment in USD where possible; hedge EUR exposure.', enabled: false },
];

export function defaultInputs(): ProjectInputs {
  return {
    name: 'Marina Heights Tower',
    client: 'Client to be confirmed',
    country: 'AE',
    city: 'Dubai',
    displayCurrency: 'AED',
    buildingType: 'residential',
    floors: 25,
    basements: 3,
    builtUpArea: 42000,
    durationMonths: 30,
    scope: 'both',
    quality: 'medium',
    floorHeight: TYPE_COEFFICIENTS.residential.floorHeight,
    basementHeight: 3.6,
    labourRateOverride: null,
    materialIndexPct: 0,
    equipmentIndexPct: 0,
    overheadPct: 5,
    profitPct: 8,
    contingencyMode: 'risk',
    contingencyPct: 5,
    includeEscalation: true,
    includeVat: true,
  };
}

export function newProject(partial?: Partial<ProjectInputs>): Project {
  const now = new Date().toISOString();
  return {
    id: `P-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    inputs: { ...defaultInputs(), ...partial },
    rateOverrides: {},
    boqOverrides: {},
    risks: DEFAULT_RISKS.map((r) => ({ ...r })),
    createdAt: now,
    updatedAt: now,
  };
}

export const ASSUMPTIONS: string[] = [
  'Quantities are derived parametrically from floors, built-up area and building type using typical GCC high-rise norms. Replace them with measured take-offs from tender drawings wherever available (edit any quantity in the BOQ).',
  'Unit rates come from the BuildCost AI Gulf baseline, which is an illustrative assumption calibrated to published 2025 benchmarks. Rates are not supplier quotations or market prices and must be verified before submission.',
  'Built-up area includes basements. The typical tower floor plate is derived as BUA ÷ (floors + 1.3 × basements); basements are assumed to extend 30 % beyond the tower footprint.',
  'Foundations assume a piled raft on Ø1200 mm bored piles. Raft thickness is 1.5 m + 0.05 m per floor. Structural concrete averages about 0.40 m³ per m² of gross area.',
  'Labour is costed as man-hours × an all-in blended rate (wage + visa, accommodation, transport, medical insurance and end-of-service benefits). Higher specifications carry half their rate uplift in labour hours.',
  'Low-quality scenario never reduces rates for items flagged as structural, fire or electrical safety-critical; these items stay at least at the Medium specification.',
  'Price escalation is applied to direct costs at the country forecast rate to the mid-point of the construction period.',
  'Preliminaries (site staff, establishment, utilities, HSE, insurance, bonds, design and permits) are calculated separately for each tender module.',
  'VAT is applied at the statutory standard rate of the selected country. Special treatments (e.g. zero-rating of new residential buildings) are not modelled.',
  'Currency conversion uses USD pegs for AED, SAR, QAR, OMR and BHD; KWD is approximate.',
];

export const EXCLUSIONS: string[] = [
  'Land cost, plot fees, master-developer service charges and land-registration fees.',
  'Design consultant fees (architect, structural, MEP) and project management consultancy, except contractor shop drawings.',
  'Tenant fit-out for commercial floors, loose furniture, fixtures and equipment (FF&E) and operating supplies (OS&E).',
  'Kitchen and laundry equipment for hotels, swimming-pool mechanical systems and specialist AV.',
  'District cooling connection charges (where applicable) and off-site utility infrastructure.',
  'Rock excavation, contaminated-soil disposal and ground improvement beyond the allowance in contingency.',
  'Client-side contingencies, financing costs and changes in law after the tender date.',
  'Specialist façade features (fins, cladding art) beyond the stated glazing system.',
];
