import type { Geometry, ProjectInputs } from '../types';
import { TYPE_COEFFICIENTS } from '../data/defaults';

/** Ratio of basement plate to tower plate (basements extend beyond the tower). */
export const BASEMENT_SPREAD = 1.3;
/** Perimeter of a slightly rectangular plan (≈ 1 : 1.5) relative to √area. A square is 4.0. */
export const PLAN_SHAPE = 4.1;

export function raftThickness(floors: number): number {
  return 1.5 + 0.05 * floors;
}

/**
 * Derive building geometry from headline inputs. Pure function – no side effects.
 */
export function deriveGeometry(i: ProjectInputs): Geometry {
  const c = TYPE_COEFFICIENTS[i.buildingType];
  const plateArea = i.builtUpArea / (i.floors + BASEMENT_SPREAD * i.basements);
  const basementPlate = i.basements > 0 ? plateArea * BASEMENT_SPREAD : 0;
  const aboveGroundArea = plateArea * i.floors;
  const basementArea = basementPlate * i.basements;
  const perimeter = PLAN_SHAPE * Math.sqrt(plateArea);
  const footprint = plateArea * BASEMENT_SPREAD;
  const basementPerimeter = PLAN_SHAPE * Math.sqrt(footprint);
  const buildingHeight = i.floors * i.floorHeight;
  const raft = raftThickness(i.floors);
  const excavationDepth = i.basements > 0 ? i.basements * i.basementHeight + raft + 0.3 : raft + 0.5;
  const facadeArea = perimeter * buildingHeight;
  const glazingArea = facadeArea * c.wwr;
  const solidFacadeArea = facadeArea - glazingArea;
  const units = Math.max(1, Math.round(aboveGroundArea / c.unitArea));
  const coolingTR = aboveGroundArea / c.m2PerTR;
  const demandKVA = (i.builtUpArea * c.vaPerM2 * 0.65) / 1000;
  return {
    plateArea,
    basementPlate,
    aboveGroundArea,
    basementArea,
    perimeter,
    basementPerimeter,
    buildingHeight,
    excavationDepth,
    facadeArea,
    glazingArea,
    solidFacadeArea,
    units,
    unitLabel: c.unitLabel,
    coolingTR,
    demandKVA,
  };
}
