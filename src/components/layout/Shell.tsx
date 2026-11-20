import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard, SlidersHorizontal, Table2, GitCompareArrows, BookOpenCheck, ShieldAlert, ListChecks, FolderOpen,
  Save, FileSpreadsheet, FileText, Menu, X, Loader2,
} from 'lucide-react';
import { useProjectStore, type Page } from '../../store/useProjectStore';
import { useEstimate } from '../../store/EstimateContext';
import { COUNTRIES } from '../../data/countries';
import { QUALITY_META, TYPE_COEFFICIENTS } from '../../data/defaults';
import { Button, Segmented, cx } from '../ui';
import type { Quality } from '../../types';

const NAV: { id: Page; label: string; icon: typeof LayoutDashboard; group: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Estimate' },
  { id: 'setup', label: 'Project inputs', icon: SlidersHorizontal, group: 'Estimate' },
  { id: 'boq', label: 'Bill of quantities', icon: Table2, group: 'Estimate' },
  { id: 'compare', label: 'Compare scenarios', icon: GitCompareArrows, group: 'Estimate' },
  { id: 'rates', label: 'Rate library', icon: BookOpenCheck, group: 'Inputs & checks' },
  { id: 'risk', label: 'Risk & contingency', icon: ShieldAlert, group: 'Inputs & checks' },
  { id: 'assumptions', label: 'Assumptions', icon: ListChecks, group: 'Inputs & checks' },
  { id: 'projects', label: 'Saved estimates', icon: FolderOpen, group: 'Files' },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="7" fill="#16222c" />
        <path d="M9 26V7h6.5v19M18 26V12.5h5.5V26" stroke="#c99a4a" strokeWidth="2.4" fill="none" />
        <path d="M6 26h20" stroke="#dde1de" strokeWidth="1.6" />
      </svg>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold tracking-tight text-white" style={{ fontStretch: '115%' }}>BuildCost AI</div>
        <div className="text-[11px] text-concrete-300">High-rise tender estimator</div>
      </div>
    </div>
  );
}

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const page = useProjectStore((s) => s.page);
  const setPage = useProjectStore((s) => s.setPage);
  const groups = Array.from(new Set(NAV.map((n) => n.group)));
  return (
    <nav aria-label="Main" className="flex flex-col gap-6">
      {groups.map((g) => (
        <div key={g}>
          <div className="mb-1.5 px-3 text-[11.5px] font-medium text-concrete-300/80">{g}</div>
          <ul className="space-y-0.5">
            {NAV.filter((n) => n.group === g).map((n) => {
              const Icon = n.icon;
              const active = page === n.id;
              return (
                <li key={n.id}>
                  <button
                    onClick={() => { setPage(n.id); onNavigate?.(); }}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass',
                      active ? 'bg-white/10 font-medium text-white' : 'text-concrete-200 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    <Icon size={17} className={active ? 'text-brass' : 'text-concrete-300'} aria-hidden />
                    {n.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Shell({ children, onExcel, onPdf }: { children: ReactNode; onExcel: () => Promise<void>; onPdf: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<'xlsx' | 'pdf' | null>(null);
  const project = useProjectStore((s) => s.project);
  const saveCurrent = useProjectStore((s) => s.saveCurrent);
  const setQuality = useProjectStore((s) => s.setQuality);
  const toast = useProjectStore((s) => s.toast);
  const { stale } = useEstimate();
  const i = project.inputs;

  const run = async (kind: 'xlsx' | 'pdf') => {
    setBusy(kind);
    try { await (kind === 'xlsx' ? onExcel() : onPdf()); } finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-ink px-3 py-5 lg:flex">
        <div className="px-3"><Logo /></div>
        <div className="mt-8 flex-1 overflow-y-auto"><SideNav /></div>
        <div className="mx-3 mt-4 rounded-lg border border-white/10 p-3 text-[12px] leading-relaxed text-concrete-300">
          Rates are illustrative until you replace them with verified quotes in the rate library.
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-ink px-3 py-5">
            <div className="flex items-center justify-between px-3">
              <Logo />
              <button onClick={() => setOpen(false)} className="text-concrete-200" aria-label="Close menu"><X size={20} /></button>
            </div>
            <div className="mt-8"><SideNav onNavigate={() => setOpen(false)} /></div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-concrete-200 bg-concrete-50/90 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <button className="rounded-lg p-1.5 text-ink lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold text-ink">{i.name || 'Untitled estimate'}</div>
            <div className="truncate text-[12.5px] text-ink-mute">
              {TYPE_COEFFICIENTS[i.buildingType].label} · {i.floors} floors + {i.basements} basements · {i.city}, {COUNTRIES[i.country].name} · {i.scope === 'both' ? 'Construction + electrical' : i.scope === 'construction' ? 'Construction tender' : 'Electrical tender'}
            </div>
          </div>
          <Segmented<Quality>
            ariaLabel="Quality scenario"
            size="sm"
            value={i.quality}
            onChange={setQuality}
            options={(['high', 'medium', 'low'] as Quality[]).map((q) => ({ value: q, label: QUALITY_META[q].short }))}
          />
          <div className="flex gap-2">
            <Button size="sm" icon={<Save size={15} />} onClick={saveCurrent}>Save</Button>
            <Button size="sm" disabled={stale || !!busy} icon={busy === 'xlsx' ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />} onClick={() => run('xlsx')}>Excel BOQ</Button>
            <Button size="sm" variant="brass" disabled={stale || !!busy} icon={busy === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />} onClick={() => run('pdf')}>PDF tender</Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>

      {toast && (
        <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 text-[13.5px] text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
