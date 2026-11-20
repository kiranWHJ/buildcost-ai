import type { Geometry, ProjectInputs } from '../types';
import { TYPE_COEFFICIENTS } from '../data/defaults';
import { BASEMENT_SPREAD, PLAN_SHAPE, raftThickness } from './geometry';

/**
 * Quantity take-off rules. Each BOQ item id maps to a function that returns its
 * quantity from the project inputs and derived geometry. Every rule is a short,
 * readable formula that matches the `qtyBasis` text in the rate library.
 */
export interface QtyContext {
  i: ProjectInputs;
  g: Geometry;
  /** structural concrete volumes, computed once */
  conc: {
    raft: number;
    retaining: number;
    columns: number;
    walls: number;
    beams: number;
    slabs: number;
    total: number;
  };
  gross: number;     // gross built-up area
  levels: number;    // floors + basements
  parkingArea: number;
  transformers: number;
  generators: number;
  smdb: number;
}

export function buildContext(i: ProjectInputs, g: Geometry): QtyContext {
  const c = TYPE_COEFFICIENTS[i.buildingType];
  const gross = i.builtUpArea;
  const footprint = g.plateArea * BASEMENT_SPREAD;
  const raft = footprint * raftThickness(i.floors);
  const retaining = i.basements > 0 ? g.basementPerimeter * i.basements * i.basementHeight * 0.45 : 0;
  const columns = gross * 0.045 * (1 + i.floors / 50);
  const walls = g.aboveGroundArea * 0.055 + g.basementArea * 0.03;
  const beams = gross * 0.035;
  const slabs = gross * 0.25;
  const total = raft + retaining + columns + walls + beams + slabs;
  const transformers = Math.max(1, Math.ceil(g.demandKVA / (1500 * 0.85)));
  const generators = Math.max(1, Math.ceil((g.demandKVA * c.standbyRatio) / 1000));
  const levels = i.floors + i.basements;
  const smdb = levels + Math.ceil(g.coolingTR / 400);
  // Without basements, parking is assumed on podium / grade equal to one tower plate.
  const parkingArea = i.basements > 0 ? g.basementArea : g.plateArea;
  return { i, g, conc: { raft, retaining, columns, walls, beams, slabs, total }, gross, levels, parkingArea, transformers, generators, smdb };
}

type Rule = (x: QtyContext) => number;

const T = (x: QtyContext) => TYPE_COEFFICIENTS[x.i.buildingType];

export const QTY_RULES: Record<string, Rule> = {
  // Substructure
  'C-SUB-01': (x) => x.g.plateArea * BASEMENT_SPREAD * x.g.excavationDepth * 1.1,
  'C-SUB-02': (x) => x.g.plateArea * BASEMENT_SPREAD * x.g.excavationDepth * 1.1,
  'C-SUB-03': (x) => (x.i.basements > 0 ? x.g.basementPerimeter * x.g.excavationDepth : 0),
  'C-SUB-04': (x) => Math.round(2 + 1.5 * x.i.basements),
  'C-SUB-05': (x) => {
    const piles = Math.ceil(((x.gross * 14) / 7500) * 1.15);
    return piles * (28 + 0.4 * x.i.floors);
  },
  'C-SUB-06': (x) => x.conc.raft,
  'C-SUB-07': (x) => x.conc.retaining,
  // Frame
  'C-FRM-01': (x) => x.conc.columns,
  'C-FRM-02': (x) => x.conc.walls,
  'C-FRM-03': (x) => x.conc.beams,
  'C-FRM-04': (x) => x.conc.slabs,
  'C-FRM-05': (x) =>
    x.conc.raft * 0.13 + x.conc.retaining * 0.11 + x.conc.slabs * 0.095 + x.conc.columns * 0.24 + x.conc.walls * 0.15 + x.conc.beams * 0.18,
  'C-FRM-06': (x) => x.conc.slabs * 0.014,
  'C-FRM-07': (x) =>
    x.gross * 1.08 + x.conc.columns * 9 + x.conc.walls * 7 + x.conc.beams * 8 + x.conc.retaining * 5 +
    PLAN_SHAPE * Math.sqrt(x.g.plateArea * BASEMENT_SPREAD) * raftThickness(x.i.floors),
  // Masonry
  'C-MAS-01': (x) => x.g.aboveGroundArea * T(x).partitionFactor + x.g.solidFacadeArea + x.g.basementArea * 0.15,
  'C-MAS-02': (x) => (x.g.aboveGroundArea * T(x).partitionFactor + x.g.basementArea * 0.15) * 2 + x.g.solidFacadeArea,
  'C-MAS-03': (x) => x.g.solidFacadeArea,
  // Flooring
  'C-FLR-01': (x) => x.g.aboveGroundArea * 0.88,
  'C-FLR-02': (x) => x.g.aboveGroundArea * 0.85,
  'C-FLR-03': (x) => x.g.aboveGroundArea * T(x).wetFactor,
  'C-FLR-04': (x) => x.parkingArea * 0.95,
  // Finishes
  'C-FIN-01': (x) => x.g.aboveGroundArea * 0.75,
  'C-FIN-02': (x) =>
    ((x.g.aboveGroundArea * T(x).partitionFactor + x.g.basementArea * 0.15) * 2 + x.g.solidFacadeArea) * 0.95 + x.g.aboveGroundArea * 0.1,
  'C-FIN-03': (x) => x.g.solidFacadeArea,
  'C-FIN-04': (x) => (x.i.buildingType === 'commercial' ? x.i.floors * 2 : x.g.units),
  // Openings
  'C-OPN-01': (x) => Math.round(x.g.aboveGroundArea / T(x).doorDensity),
  'C-OPN-02': (x) => x.levels * 6,
  'C-OPN-03': (x) => x.g.glazingArea,
  'C-OPN-04': (x) => x.i.floors * x.g.perimeter * T(x).balconyFactor + x.levels * 2 * 14,
  // Waterproofing
  'C-WPF-01': (x) => x.g.plateArea * BASEMENT_SPREAD + (x.i.basements > 0 ? x.g.basementPerimeter * x.g.excavationDepth : 0),
  'C-WPF-02': (x) => x.g.plateArea * 1.1 + x.g.plateArea * (BASEMENT_SPREAD - 1),
  'C-WPF-03': (x) => x.g.aboveGroundArea * T(x).wetFactor * 0.55,
  // Vertical transportation
  'C-VRT-01': (x) => Math.max(3, Math.ceil(x.g.aboveGroundArea / T(x).liftServiceArea)),
  'C-VRT-02': (x) => 1 + (x.i.floors >= 25 ? 1 : 0) + (x.i.buildingType === 'hotel' ? 1 : 0),
  'C-VRT-03': (x) => T(x).escalators,
  // HVAC & plumbing
  'C-MEP-01': (x) => x.g.coolingTR,
  'C-MEP-02': (x) => x.g.aboveGroundArea,
  'C-MEP-03': (x) => x.parkingArea,
  'C-MEP-04': (x) => x.gross,
  'C-MEP-05': (x) => x.gross,
  'C-MEP-06': (x) => Math.round(x.g.aboveGroundArea / T(x).fixtureDensity),
  'C-MEP-07': (x) => x.levels,
  // Firefighting
  'C-FF-01': (x) => x.gross,
  'C-FF-02': (x) => (x.g.buildingHeight > 90 ? 2 : 1),
  'C-FF-03': (x) => x.levels,
  'C-FF-04': (x) => 2 + Math.ceil(x.i.floors / 10),
  // Plant & labour
  'C-PLT-01': (x) => (x.g.plateArea > 1400 ? 2 : 1) * x.i.durationMonths * 0.7,
  'C-PLT-02': (x) => 2 * x.i.durationMonths * 0.6,
  'C-PLT-03': (x) => x.conc.total,
  'C-PLT-04': (x) => x.g.facadeArea,
  'C-PLT-05': (x) => x.i.durationMonths * (6 + x.gross / 2500),
  'C-PLT-06': (x) => x.i.durationMonths,

  // Electrical – cables
  'E-CAB-01': (x) => x.smdb * (x.g.buildingHeight / 2 + 35) * 2 * 1.15,
  'E-CAB-02': (x) => x.gross * 6.5,
  'E-CAB-03': (x) => x.gross * 0.35,
  'E-CAB-04': (x) => x.g.buildingHeight * 2 + 40,
  // Distribution
  'E-DST-01': (x) => x.transformers,
  'E-DST-02': (x) => x.smdb,
  'E-DST-03': (x) => x.g.units + x.levels,
  'E-DST-04': (x) => x.g.units + x.i.floors,
  'E-DST-05': (x) => x.transformers,
  // Power supply
  'E-PWR-01': (x) => x.transformers,
  'E-PWR-02': (x) => x.transformers,
  'E-PWR-03': (x) => x.generators,
  'E-PWR-04': (x) => Math.ceil(x.transformers / 2),
  // Lighting
  'E-LTG-01': (x) => Math.round(x.g.aboveGroundArea / T(x).luminaireM2),
  'E-LTG-02': (x) => Math.round(x.parkingArea / 14),
  'E-LTG-03': (x) => x.g.facadeArea,
  'E-LTG-04': (x) => x.g.aboveGroundArea * T(x).lightingControlCoverage,
  // Accessories
  'E-ACC-01': (x) => Math.round((x.g.aboveGroundArea / T(x).luminaireM2) * 0.35),
  'E-ACC-02': (x) => Math.round(x.g.aboveGroundArea / T(x).socketM2),
  'E-ACC-03': (x) => Math.round(x.g.coolingTR / 4 + x.i.floors * 4),
  // Containment
  'E-CON-01': (x) => x.gross * 0.18,
  'E-CON-02': (x) => x.gross * 3.2,
  'E-CON-03': (x) => x.g.aboveGroundArea * T(x).trunkingFactor,
  // Earthing & lightning
  'E-EAR-01': (x) => x.transformers * 2 + x.generators * 2 + 8,
  'E-EAR-02': (x) => x.g.buildingHeight * 4 + (x.i.basements > 0 ? x.g.basementPerimeter * 2 : 0) + x.transformers * 60 + 200,
  'E-EAR-03': () => 1,
  'E-EAR-04': (x) => x.g.buildingHeight * Math.max(4, Math.ceil(x.g.perimeter / 20)),
  // Emergency lighting
  'E-EMG-01': (x) => Math.round(x.gross / 30 + x.levels * 10),
  'E-EMG-02': (x) => 1 + Math.ceil(x.i.floors / 10),
  // Fire alarm
  'E-FA-01': (x) => Math.round(x.gross / 45),
  'E-FA-02': (x) => x.levels * 8,
  'E-FA-03': (x) => Math.max(1, Math.ceil(x.levels / 12)),
  'E-FA-04': (x) => Math.round((x.gross / 60) * T(x).voiceEvacFactor),
  // ELV
  'E-ELV-01': (x) => Math.round((x.i.floors * 4 + x.i.basements * 14 + 24) * (x.i.buildingType === 'hotel' ? 1.4 : 1)),
  'E-ELV-02': () => 1,
  'E-ELV-03': (x) => x.i.floors * 2 + x.i.basements * 4 + 12,
  'E-ELV-04': (x) => (x.i.buildingType === 'commercial' ? x.i.floors : x.g.units),
  'E-ELV-05': (x) => x.gross,
  // Testing & commissioning
  'E-TNC-01': (x) => x.gross,
  'E-TNC-02': () => 1,
  'E-TNC-03': () => 1,
  'E-TNC-04': () => 1,
};

/**
 * Rate scaling rules that depend on the project (e.g. lift price grows with stops).
 */
export const RATE_SCALE_RULES: Record<string, Rule> = {
  'C-VRT-01': (x) => 1 + 0.025 * (x.i.floors + x.i.basements - 20),
  'C-VRT-02': (x) => 1 + 0.025 * (x.i.floors + x.i.basements - 20),
};

/** Units counted whole (rounded up in the BOQ). */
export const INTEGER_UNITS = new Set(['nr', 'unit', 'set', 'room', 'lot', 'level', 'month']);
