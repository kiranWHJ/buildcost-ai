// ─────────────────────────────────────────────────────────────────────────────
// Core domain types for BuildCost AI
// ─────────────────────────────────────────────────────────────────────────────

export type CountryCode = 'AE' | 'SA' | 'QA' | 'OM' | 'KW' | 'BH';
export type CurrencyCode = 'AED' | 'SAR' | 'QAR' | 'OMR' | 'KWD' | 'BHD' | 'USD';
export type BuildingType = 'residential' | 'commercial' | 'hotel' | 'mixed';
export type TenderScope = 'construction' | 'electrical' | 'both';
export type Quality = 'high' | 'medium' | 'low';
export type Module = 'construction' | 'electrical';

/** Provenance of a number. Every rate in the app carries one of these. */
export type SourceKind = 'illustrative' | 'benchmark' | 'user' | 'statutory';

export interface Provenance {
  kind: SourceKind;
  /** Human-readable source, e.g. "BuildCost AI illustrative baseline" or "Supplier quote #123" */
  label: string;
  /** ISO date (YYYY-MM-DD) the rate was set or verified */
  date: string;
}

export interface Country {
  code: CountryCode;
  name: string;
  currency: CurrencyCode;
  cities: string[];
  /** Units of local currency per 1 USD */
  fxPerUsd: number;
  fxNote: string;
  /** Standard VAT rate as a fraction (0.05 = 5 %) */
  vat: number;
  vatNote: string;
  /** Location factor applied to the Gulf baseline material/equipment/subcontract rates */
  locationFactor: number;
  /** All-in blended labour cost, USD per man-hour (wages + visa, housing, transport, insurance, EOSB) */
  labourUsdPerHour: number;
  /** Forecast annual construction cost escalation (fraction) */
  escalationPerYear: number;
  /** Utility / authority name used in the approvals line */
  powerAuthority: string;
  civilDefence: string;
  provenance: Provenance;
}

export interface ProjectInputs {
  name: string;
  client: string;
  country: CountryCode;
  city: string;
  displayCurrency: CurrencyCode;
  buildingType: BuildingType;
  floors: number;          // above-ground floors (20–30)
  basements: number;       // 0–6
  builtUpArea: number;     // m², total incl. basements
  durationMonths: number;  // 12–60
  scope: TenderScope;
  quality: Quality;        // the scenario the dashboard leads with
  // Design parameters (advanced, with sensible defaults per building type)
  floorHeight: number;     // m, floor-to-floor above ground
  basementHeight: number;  // m, per basement level
  // Optional global rate overrides
  labourRateOverride: number | null;   // local currency per man-hour, all-in
  materialIndexPct: number;            // ± % applied to all material rates
  equipmentIndexPct: number;           // ± % applied to all equipment rates
  // Markups (percentages, 0–100)
  overheadPct: number;
  profitPct: number;
  contingencyMode: 'risk' | 'manual';
  contingencyPct: number;  // used when contingencyMode = manual
  includeEscalation: boolean;
  includeVat: boolean;
}

/** Category groups used for BOQ sections */
export type CategoryId =
  // construction
  | 'substructure' | 'frame' | 'masonry' | 'flooring' | 'finishes' | 'openings'
  | 'waterproofing' | 'vertical' | 'hvac_plumbing' | 'firefighting' | 'plant_labour'
  // electrical
  | 'cables' | 'distribution' | 'power_supply' | 'lighting' | 'accessories'
  | 'containment' | 'earthing' | 'emergency' | 'fire_alarm' | 'elv' | 'tnc';

export interface Category {
  id: CategoryId;
  module: Module;
  label: string;
  /** Spec text per quality tier shown in BOQ */
}

/**
 * A rate-library item. Rates are stored in USD as the Gulf baseline (medium quality),
 * then converted with country FX × location factor × quality factor.
 */
export interface RateItem {
  id: string;
  module: Module;
  category: CategoryId;
  description: string;
  unit: string;
  /** Material supply rate, USD / unit, medium spec */
  material: number;
  /** Labour productivity, man-hours / unit, medium spec */
  labourHours: number;
  /** Plant & equipment, USD / unit */
  equipment: number;
  /** Subcontract all-in supply & install, USD / unit (used instead of the three above when > 0) */
  subcontract: number;
  /** Multipliers for [low, medium, high] */
  qualityFactor: [number, number, number];
  /** Mandatory structural / fire / electrical safety item – Low can never drop below Medium */
  safetyCritical: boolean;
  spec: { low: string; medium: string; high: string };
  /** Short explanation of how the quantity is derived */
  qtyBasis: string;
}

/** User edits to the rate library, per country, in LOCAL currency */
export interface RateOverride {
  material?: number;
  labourHours?: number;
  equipment?: number;
  subcontract?: number;
  source: string;
  date: string;
}

/** User edits made directly in the BOQ */
export interface BoqOverride {
  qty?: number;          // applies to all quality scenarios
  rate?: Partial<Record<Quality, number>>; // composite unit rate, local currency, per scenario
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  module: Module | 'both';
  probability: number; // 0–1
  impactPct: number;   // % of affected direct cost if it occurs
  mitigation: string;
  enabled: boolean;
}

export interface Project {
  id: string;
  inputs: ProjectInputs;
  rateOverrides: Record<string, RateOverride>; // keyed by `${country}:${itemId}`
  boqOverrides: Record<string, BoqOverride>;  // keyed by itemId
  risks: Risk[];
  createdAt: string;
  updatedAt: string;
}

// ─── Engine outputs ─────────────────────────────────────────────────────────

export interface Geometry {
  plateArea: number;       // typical tower floor plate, m²
  basementPlate: number;   // m²
  aboveGroundArea: number; // m²
  basementArea: number;    // m²
  perimeter: number;       // tower, m
  basementPerimeter: number;
  buildingHeight: number;  // m
  excavationDepth: number; // m
  facadeArea: number;      // m²
  glazingArea: number;     // m²
  solidFacadeArea: number; // m²
  units: number;           // apartments / keys / tenancies
  unitLabel: string;
  coolingTR: number;
  demandKVA: number;
}

export interface BoqLine {
  id: string;
  module: Module;
  category: CategoryId;
  description: string;
  spec: string;
  unit: string;
  qty: number;
  qtyBasis: string;
  qtyEdited: boolean;
  // unit-rate build-up in local currency
  materialRate: number;
  labourRate: number;      // = labourHours × labour cost/hour
  equipmentRate: number;
  subcontractRate: number;
  unitRate: number;
  rateEdited: boolean;
  // amounts
  material: number;
  labour: number;
  equipment: number;
  subcontract: number;
  amount: number;
  safetyCritical: boolean;
  safetyFloorApplied: boolean;
  provenance: Provenance;
}

export interface CostSplit {
  material: number;
  labour: number;
  equipment: number;
  subcontract: number;
  total: number;
}

export interface IndirectLine {
  id: string;
  label: string;
  basis: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface ModuleEstimate {
  module: Module;
  lines: BoqLine[];
  direct: CostSplit;
  byCategory: { category: CategoryId; label: string; amount: number }[];
  indirect: IndirectLine[];
  indirectTotal: number;
  escalation: number;
  overhead: number;
  contingency: number;
  subtotalBeforeProfit: number;
  profit: number;
  netBeforeTax: number;
  vat: number;
  total: number;
}

export interface ScenarioEstimate {
  quality: Quality;
  construction: ModuleEstimate | null;
  electrical: ModuleEstimate | null;
  direct: CostSplit;
  indirect: number;
  escalation: number;
  overhead: number;
  contingency: number;
  profit: number;
  netBeforeTax: number;
  vat: number;
  total: number;
  costPerM2: number;
  recommendedTender: number;
}

export interface EstimateResult {
  currency: CurrencyCode;
  /** local currency → display currency multiplier */
  fx: number;
  geometry: Geometry;
  labourRatePerHour: number;   // local currency
  contingencyPct: number;      // effective
  riskContingencyPct: number;  // from risk register
  scenarios: Record<Quality, ScenarioEstimate>;
  warnings: string[];
}

export interface ValidationIssue {
  field: keyof ProjectInputs;
  message: string;
}
