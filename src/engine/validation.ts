import type { ProjectInputs, ValidationIssue } from '../types';
import { COUNTRIES } from '../data/countries';

export const LIMITS = {
  floors: { min: 20, max: 30 },
  basements: { min: 0, max: 6 },
  builtUpArea: { min: 8000, max: 250000 },
  durationMonths: { min: 12, max: 60 },
  floorHeight: { min: 2.9, max: 5.5 },
  basementHeight: { min: 3.0, max: 5.0 },
  pct: { min: 0, max: 40 },
  index: { min: -50, max: 100 },
};

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

export function validateInputs(i: ProjectInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const range = (field: keyof ProjectInputs, v: number, min: number, max: number, label: string, integer = false) => {
    if (!isNum(v)) issues.push({ field, message: `${label} is required.` });
    else if (integer && !Number.isInteger(v)) issues.push({ field, message: `${label} must be a whole number.` });
    else if (v < min || v > max) issues.push({ field, message: `${label} must be between ${min} and ${max}.` });
  };

  if (!i.name.trim()) issues.push({ field: 'name', message: 'Enter a project name.' });
  if (!COUNTRIES[i.country]) issues.push({ field: 'country', message: 'Choose a supported country.' });
  if (!i.city.trim()) issues.push({ field: 'city', message: 'Choose or type a city.' });
  range('floors', i.floors, LIMITS.floors.min, LIMITS.floors.max, 'Number of floors', true);
  range('basements', i.basements, LIMITS.basements.min, LIMITS.basements.max, 'Basement floors', true);
  range('builtUpArea', i.builtUpArea, LIMITS.builtUpArea.min, LIMITS.builtUpArea.max, 'Built-up area');
  range('durationMonths', i.durationMonths, LIMITS.durationMonths.min, LIMITS.durationMonths.max, 'Project duration', true);
  range('floorHeight', i.floorHeight, LIMITS.floorHeight.min, LIMITS.floorHeight.max, 'Floor-to-floor height');
  range('basementHeight', i.basementHeight, LIMITS.basementHeight.min, LIMITS.basementHeight.max, 'Basement level height');
  range('overheadPct', i.overheadPct, LIMITS.pct.min, LIMITS.pct.max, 'Overheads');
  range('profitPct', i.profitPct, LIMITS.pct.min, LIMITS.pct.max, 'Profit margin');
  if (i.contingencyMode === 'manual') range('contingencyPct', i.contingencyPct, LIMITS.pct.min, LIMITS.pct.max, 'Contingency');
  range('materialIndexPct', i.materialIndexPct, LIMITS.index.min, LIMITS.index.max, 'Material price adjustment');
  range('equipmentIndexPct', i.equipmentIndexPct, LIMITS.index.min, LIMITS.index.max, 'Equipment price adjustment');
  if (i.labourRateOverride !== null && (!isNum(i.labourRateOverride) || i.labourRateOverride <= 0)) {
    issues.push({ field: 'labourRateOverride', message: 'Labour rate must be a positive number, or leave it blank to use the default.' });
  }

  // Cross-field: plausible floor plate
  if (isNum(i.builtUpArea) && isNum(i.floors) && isNum(i.basements) && i.floors > 0) {
    const plate = i.builtUpArea / (i.floors + 1.3 * i.basements);
    if (plate < 350) issues.push({ field: 'builtUpArea', message: `That gives a ${Math.round(plate)} m² floor plate – too small for a ${i.floors}-floor tower. Check the area.` });
    if (plate > 6000) issues.push({ field: 'builtUpArea', message: `That gives a ${Math.round(plate).toLocaleString()} m² floor plate – too large for a tower. Check the area.` });
  }
  return issues;
}

export function issuesFor(issues: ValidationIssue[], field: keyof ProjectInputs): string | undefined {
  return issues.find((x) => x.field === field)?.message;
}
