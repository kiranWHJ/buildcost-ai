import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { useProjectStore } from './useProjectStore';
import { estimate } from '../engine/estimate';
import { validateInputs } from '../engine/validation';
import type { EstimateResult, ValidationIssue } from '../types';

interface EstimateState {
  result: EstimateResult | null;
  issues: ValidationIssue[];
  /** true when inputs are invalid and `result` is the last valid estimate */
  stale: boolean;
}

const Ctx = createContext<EstimateState>({ result: null, issues: [], stale: false });

/**
 * Recomputes the full estimate once per project change and shares it with every page.
 * Invalid inputs keep the last valid result (flagged stale) so the dashboard never
 * shows numbers derived from impossible inputs.
 */
export function EstimateProvider({ children }: { children: ReactNode }) {
  const project = useProjectStore((s) => s.project);
  const last = useRef<EstimateResult | null>(null);
  const value = useMemo<EstimateState>(() => {
    const issues = validateInputs(project.inputs);
    if (issues.length === 0) {
      last.current = estimate(project);
      return { result: last.current, issues, stale: false };
    }
    return { result: last.current, issues, stale: true };
  }, [project]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useEstimate = () => useContext(Ctx);
