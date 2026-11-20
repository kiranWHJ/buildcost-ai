import { AlertTriangle, ArrowRight, Building2, Zap, Layers, Ruler, FlaskConical, ShieldCheck } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { useEstimate } from '../store/EstimateContext';
import { COUNTRIES } from '../data/countries';
import { QUALITY_META, TYPE_COEFFICIENTS } from '../data/defaults';
import { compact, money, num, pct } from '../engine/format';
import { Badge, Button, Notice, Panel, cx } from '../components/ui';
import { Elevation } from '../components/charts/Elevation';
import { BuildUpChart, CategoryChart, CompositionChart, ScenarioChart } from '../components/charts';
import type { ModuleEstimate } from '../types';
import { CostSummaryTable } from './parts/CostSummaryTable';

function Kpi({ label, value, sub, icon, accent }: { label: string; value: string; sub?: string; icon: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-xl border border-concrete-200 bg-white p-4 shadow-sheet">
      <div className="flex items-center gap-2 text-[13px] text-ink-mute">
        <span className={cx('flex h-6 w-6 items-center justify-center rounded-md', accent ?? 'bg-concrete-100 text-ink-soft')}>{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-[22px] font-semibold tabular-nums tracking-tight text-ink" style={{ fontStretch: '108%' }}>{value}</div>
      {sub && <div className="mt-0.5 text-[12.5px] tabular-nums text-ink-mute">{sub}</div>}
    </div>
  );
}

export function Dashboard() {
  const project = useProjectStore((s) => s.project);
  const setPage = useProjectStore((s) => s.setPage);
  const { result, stale, issues } = useEstimate();
  const i = project.inputs;
  const cur = i.displayCurrency;

  if (!result) {
    return (
      <Notice tone="critical" icon={<AlertTriangle size={16} />}>
        The estimate can’t run yet. {issues[0]?.message} <button className="font-semibold underline" onClick={() => setPage('setup')}>Open project inputs</button>
      </Notice>
    );
  }

  const s = result.scenarios[i.quality];
  const modules = [s.construction, s.electrical].filter(Boolean) as ModuleEstimate[];
  const lines = modules.flatMap((m) => m.lines).sort((a, b) => b.amount - a.amount).slice(0, 8);
  const lo = result.scenarios.low.recommendedTender;
  const hi = result.scenarios.high.recommendedTender;
  const marker = hi > lo ? ((s.recommendedTender - lo) / (hi - lo)) * 100 : 50;

  return (
    <div className="space-y-6">
      {stale && (
        <Notice tone="critical" icon={<AlertTriangle size={16} />}>
          Some inputs are invalid, so these figures are from the last valid estimate. <button className="font-semibold underline" onClick={() => setPage('setup')}>Fix inputs</button>
        </Notice>
      )}

      {/* Tender sheet hero */}
      <section className="overflow-hidden rounded-2xl border border-concrete-200 bg-white shadow-sheet">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brass">{QUALITY_META[i.quality].label}</Badge>
              <Badge>{i.scope === 'both' ? 'Construction + electrical' : i.scope === 'construction' ? 'Construction tender' : 'Electrical tender'}</Badge>
              <Badge>{i.city}, {COUNTRIES[i.country].name}</Badge>
            </div>
            <p className="mt-6 text-[14px] text-ink-mute">Recommended tender price</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
              <span className="text-[17px] font-medium text-ink-soft">{cur}</span>
              <span className="text-[44px] font-semibold leading-none tracking-tight tabular-nums text-ink sm:text-[56px]" style={{ fontStretch: '118%' }}>
                {num(s.recommendedTender)}
              </span>
            </div>
            <p className="mt-2 text-[14px] text-ink-soft">
              {i.includeVat && s.vat > 0 ? `Including ${pct(COUNTRIES[i.country].vat * 100, 0)} VAT` : 'Excluding VAT'} · {money(s.costPerM2, cur)} per m² of built-up area · rounded up from {money(s.total, cur)}
            </p>

            {/* Scenario range */}
            <div className="mt-7 max-w-xl">
              <div className="flex justify-between text-[12.5px] text-ink-mute">
                <span>Low {compact(lo, cur)}</span>
                <span>High {compact(hi, cur)}</span>
              </div>
              <div className="relative mt-2 h-2 rounded-full bg-gradient-to-r from-concrete-200 via-concrete-300 to-ink-mute">
                <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-brass shadow" style={{ left: `${Math.min(100, Math.max(0, marker))}%` }} />
              </div>
              <p className="mt-2 text-[12.5px] text-ink-mute">The same building priced at all three specifications. Switch the lead scenario from the top bar.</p>
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              <Button size="sm" icon={<ArrowRight size={15} />} onClick={() => setPage('boq')}>Open detailed BOQ</Button>
              <Button size="sm" variant="ghost" onClick={() => setPage('compare')}>Compare scenarios</Button>
            </div>
          </div>
          <div className="border-t border-concrete-200 bg-concrete-50 p-5 lg:border-l lg:border-t-0">
            <Elevation inputs={i} geometry={result.geometry} className="mx-auto w-full max-w-[300px]" />
          </div>
        </div>
      </section>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Construction estimate" icon={<Building2 size={14} />} accent="bg-blue-50 text-[#2a78d6]" value={s.construction ? compact(s.construction.total, cur) : '—'} sub={s.construction ? `${money(s.construction.total / i.builtUpArea, cur)}/m²` : 'Not in scope'} />
        <Kpi label="Electrical estimate" icon={<Zap size={14} />} accent="bg-orange-50 text-[#c4521f]" value={s.electrical ? compact(s.electrical.total, cur) : '—'} sub={s.electrical ? `${money(s.electrical.total / i.builtUpArea, cur)}/m²` : 'Not in scope'} />
        <Kpi label="Combined tender value" icon={<Layers size={14} />} value={compact(s.total, cur)} sub={money(s.total, cur)} />
        <Kpi label="Cost per square metre" icon={<Ruler size={14} />} value={money(s.costPerM2, cur)} sub={`${num(i.builtUpArea)} m² BUA · ${TYPE_COEFFICIENTS[i.buildingType].label}`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="High, medium and low compared" subtitle="Tender value by quality scenario">
          <ScenarioChart result={result} cur={cur} />
        </Panel>
        <Panel title="From direct cost to tender price" subtitle={`${QUALITY_META[i.quality].label} build-up`}>
          <BuildUpChart result={result} quality={i.quality} cur={cur} />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Panel title="Material, labour and equipment" subtitle="Direct cost composition by tender module">
          <CompositionChart modules={modules} cur={cur} />
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-concrete-200 pt-4 text-[13px] sm:grid-cols-4">
            {([['Material', s.direct.material], ['Labour', s.direct.labour], ['Equipment', s.direct.equipment], ['Subcontract', s.direct.subcontract]] as const).map(([k, v]) => (
              <div key={k}>
                <div className="text-ink-mute">{k}</div>
                <div className="font-semibold tabular-nums text-ink">{compact(v, cur)}</div>
                <div className="text-[12px] tabular-nums text-ink-mute">{pct((v / s.direct.total) * 100, 0)}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Where the money goes" subtitle="Direct cost by work section">
          <CategoryChart modules={modules} cur={cur} />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Panel title="Cost summary" subtitle="Construction and electrical are priced and marked up separately">
          <CostSummaryTable scenario={s} cur={cur} />
        </Panel>
        <div className="space-y-6">
          <Panel title="Largest BOQ items" actions={<Button size="sm" variant="ghost" onClick={() => setPage('boq')}>Full BOQ</Button>} bodyClass="p-0">
            <ul className="divide-y divide-concrete-200">
              {lines.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13px]">
                  <div className="min-w-0">
                    <div className="truncate text-ink">{l.description}</div>
                    <div className="text-[12px] tabular-nums text-ink-mute">{num(l.qty, l.qty % 1 === 0 ? 0 : l.qty < 100 ? 1 : 0)} {l.unit} × {num(l.unitRate, l.unitRate < 100 ? 2 : 0)}</div>
                  </div>
                  <div className="shrink-0 font-medium tabular-nums">{compact(l.amount, cur)}</div>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Read before you submit">
            <ul className="space-y-3 text-[13px] leading-relaxed text-ink-soft">
              {result.warnings.slice(0, 3).map((w) => (
                <li key={w} className="flex gap-2.5"><FlaskConical size={15} className="mt-0.5 shrink-0 text-amber-600" />{w}</li>
              ))}
              <li className="flex gap-2.5"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-rebar" />Contingency {pct(result.contingencyPct, 2)} ({i.contingencyMode === 'risk' ? 'from the risk register' : 'manual'}), overheads {pct(i.overheadPct)}, profit {pct(i.profitPct)}.</li>
            </ul>
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => setPage('rates')}>Verify rates</Button>
              <Button size="sm" variant="ghost" onClick={() => setPage('assumptions')}>Assumptions</Button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
