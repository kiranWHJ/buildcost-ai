import { create } from 'zustand';
import type { BoqOverride, Project, ProjectInputs, Quality, RateOverride, Risk } from '../types';
import { DEFAULT_RISKS, newProject, TYPE_COEFFICIENTS } from '../data/defaults';
import { COUNTRIES } from '../data/countries';
import { rateKey } from '../engine/estimate';
import { storage } from './storage';

export type Page = 'setup' | 'dashboard' | 'boq' | 'compare' | 'rates' | 'risk' | 'assumptions' | 'projects';

interface State {
  project: Project;
  saved: Project[];
  page: Page;
  toast: string | null;
  setPage: (p: Page) => void;
  notify: (msg: string) => void;
  setInput: <K extends keyof ProjectInputs>(key: K, value: ProjectInputs[K]) => void;
  setQuality: (q: Quality) => void;
  setRateOverride: (itemId: string, patch: Partial<Omit<RateOverride, 'date' | 'source'>> & { source?: string }) => void;
  clearRateOverride: (itemId: string) => void;
  clearAllRateOverrides: () => void;
  setBoqQty: (itemId: string, qty: number | undefined) => void;
  setBoqRate: (itemId: string, quality: Quality, rateLocal: number | undefined) => void;
  resetBoqItem: (itemId: string) => void;
  resetBoq: () => void;
  updateRisk: (id: string, patch: Partial<Risk>) => void;
  addRisk: () => void;
  removeRisk: (id: string) => void;
  resetRisks: () => void;
  saveCurrent: () => void;
  loadProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  deleteProject: (id: string) => void;
  createProject: () => void;
  importProjects: (list: Project[]) => number;
}

const today = () => new Date().toISOString().slice(0, 10);
const touch = (p: Project): Project => ({ ...p, updatedAt: new Date().toISOString() });

function initialProject(): Project {
  const stored = storage.loadCurrent();
  if (stored && stored.inputs && stored.id) {
    // forward-compatible merge with defaults in case new fields were added
    const fresh = newProject();
    return { ...fresh, ...stored, inputs: { ...fresh.inputs, ...stored.inputs }, risks: stored.risks ?? fresh.risks };
  }
  return newProject();
}

export const useProjectStore = create<State>((set, get) => {
  const commit = (fn: (p: Project) => Project) => {
    const next = touch(fn(get().project));
    storage.saveCurrent(next);
    set({ project: next });
  };

  return {
    project: initialProject(),
    saved: storage.loadSaved(),
    page: 'dashboard',
    toast: null,

    setPage: (page) => {
      set({ page });
      if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
    },
    notify: (msg) => {
      set({ toast: msg });
      setTimeout(() => {
        if (get().toast === msg) set({ toast: null });
      }, 2600);
    },

    setInput: (key, value) =>
      commit((p) => {
        const inputs = { ...p.inputs, [key]: value };
        // Keep dependent fields coherent
        if (key === 'country') {
          const c = COUNTRIES[value as ProjectInputs['country']];
          inputs.city = c.cities[0];
          inputs.displayCurrency = c.currency;
          inputs.labourRateOverride = null; // local-currency override no longer meaningful
        }
        if (key === 'buildingType') {
          inputs.floorHeight = TYPE_COEFFICIENTS[value as ProjectInputs['buildingType']].floorHeight;
        }
        return { ...p, inputs };
      }),

    setQuality: (q) => commit((p) => ({ ...p, inputs: { ...p.inputs, quality: q } })),

    setRateOverride: (itemId, patch) =>
      commit((p) => {
        const key = rateKey(p.inputs.country, itemId);
        const prev = p.rateOverrides[key];
        const next: RateOverride = { ...prev, ...patch, source: patch.source ?? prev?.source ?? 'User input', date: today() };
        const rateOverrides = { ...p.rateOverrides, [key]: next };
        // An override with no numbers left is no override at all
        if ([next.material, next.labourHours, next.equipment, next.subcontract].every((v) => v === undefined)) delete rateOverrides[key];
        return { ...p, rateOverrides };
      }),
    clearRateOverride: (itemId) =>
      commit((p) => {
        const rateOverrides = { ...p.rateOverrides };
        delete rateOverrides[rateKey(p.inputs.country, itemId)];
        return { ...p, rateOverrides };
      }),
    clearAllRateOverrides: () =>
      commit((p) => ({
        ...p,
        rateOverrides: Object.fromEntries(Object.entries(p.rateOverrides).filter(([k]) => !k.startsWith(`${p.inputs.country}:`))),
      })),

    setBoqQty: (itemId, qty) =>
      commit((p) => {
        const prev: BoqOverride = p.boqOverrides[itemId] ?? {};
        const next: BoqOverride = { ...prev, qty };
        if (qty === undefined) delete next.qty;
        return { ...p, boqOverrides: { ...p.boqOverrides, [itemId]: next } };
      }),
    setBoqRate: (itemId, quality, rateLocal) =>
      commit((p) => {
        const prev: BoqOverride = p.boqOverrides[itemId] ?? {};
        const rate = { ...(prev.rate ?? {}) };
        if (rateLocal === undefined) delete rate[quality];
        else rate[quality] = rateLocal;
        return { ...p, boqOverrides: { ...p.boqOverrides, [itemId]: { ...prev, rate } } };
      }),
    resetBoqItem: (itemId) =>
      commit((p) => {
        const boqOverrides = { ...p.boqOverrides };
        delete boqOverrides[itemId];
        return { ...p, boqOverrides };
      }),
    resetBoq: () => commit((p) => ({ ...p, boqOverrides: {} })),

    updateRisk: (id, patch) => commit((p) => ({ ...p, risks: p.risks.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
    addRisk: () =>
      commit((p) => ({
        ...p,
        risks: [
          ...p.risks,
          { id: `R${Date.now().toString(36)}`, title: 'New risk', description: 'Describe the risk event.', module: 'both', probability: 0.2, impactPct: 1, mitigation: 'Describe the mitigation.', enabled: true },
        ],
      })),
    removeRisk: (id) => commit((p) => ({ ...p, risks: p.risks.filter((r) => r.id !== id) })),
    resetRisks: () => commit((p) => ({ ...p, risks: DEFAULT_RISKS.map((r) => ({ ...r })) })),

    saveCurrent: () => {
      const p = touch(get().project);
      const list = [p, ...get().saved.filter((s) => s.id !== p.id)];
      storage.saveSaved(list);
      storage.saveCurrent(p);
      set({ saved: list, project: p });
      get().notify(`Saved “${p.inputs.name}”`);
    },
    loadProject: (id) => {
      const p = get().saved.find((s) => s.id === id);
      if (!p) return;
      storage.saveCurrent(p);
      set({ project: p, page: 'dashboard' });
      get().notify(`Opened “${p.inputs.name}”`);
    },
    duplicateProject: (id) => {
      const p = get().saved.find((s) => s.id === id);
      if (!p) return;
      const copy: Project = {
        ...structuredClone(p),
        id: `P-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        inputs: { ...p.inputs, name: `${p.inputs.name} (copy)` },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const list = [copy, ...get().saved];
      storage.saveSaved(list);
      set({ saved: list });
      get().notify('Duplicated');
    },
    deleteProject: (id) => {
      const list = get().saved.filter((s) => s.id !== id);
      storage.saveSaved(list);
      set({ saved: list });
      get().notify('Deleted');
    },
    createProject: () => {
      const p = newProject({ name: 'New tender estimate' });
      storage.saveCurrent(p);
      set({ project: p, page: 'setup' });
    },
    importProjects: (incoming) => {
      const valid = incoming.filter((x) => x && x.id && x.inputs);
      const ids = new Set(valid.map((v) => v.id));
      const list = [...valid, ...get().saved.filter((s) => !ids.has(s.id))];
      storage.saveSaved(list);
      set({ saved: list });
      return valid.length;
    },
  };
});
