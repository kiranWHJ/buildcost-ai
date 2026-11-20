import { Fragment } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { useEstimate } from '../store/EstimateContext';
import { CATEGORIES, RATE_LIBRARY } from '../data/rateLibrary';
import { QUALITY_META, QUALITIES } from '../data/defaults';
import { money, pct } from '../engine/format';
import { Badge, Notice, PageHeader, Panel, cx } from '../components/ui';
import { ScenarioChart } from '../components/charts';
import type { Quality, ScenarioEstimate } from '../types';

const SPEC_ITEMS = ['C-FLR-02', 'C-OPN-03', 'C-VRT-01', 'C-MEP-06', 'C-MEP-01', 'C-FIN-04', 'E-LTG-01', 'E-ACC-01', 'E-ELV-01', 'E-LTG-04', 'C-FF-01', 'E-FA-01'];

export function Compare() {
  const project = useProjectStore((s) => s.project);
  const { result } = useEstimate();
  if (!result) return <Notice tone="critical">Enter valid project inputs to compare scenarios.</Notice>;
  const i = project.inputs;
  const cur = i.displayCurrency;
  const sc = result.scenarios;
  const mods = i.scope === 'both' ? ['construction', 'electrical'] : [i.scope];

  const catAmount = (s: ScenarioEstimate, id: string) =>
    [s.construction, s.electrical].filter(Boolean).flatMap((m) => m!.byCategory).find((c) => c.category === id)?.amount ?? 0;

  const rows: { label: string; get: (s: ScenarioEstimate) => number; strong?: boolean; section?: string }[] = [
    ...CATEGORIES.filter((c) => mods.includes(c.module)).map((c) => ({ label: c.label, get: (s: ScenarioEstimate) => catAmount(s, c.id), section: c.module })),
    { label: 'Direct cost', get: (s) => s.direct.total, strong: true },
    { label: 'Indirect cost', get: (s) => s.indirect },
    { label: 'Escalation', get: (s) => s.escalation },
    { label: 'Overheads', get: (s) => s.overhead },
    { label: 'Contingency', get: (s) => s.contingency },
    { label: 'Profit', get: (s) => s.profit },
    { label: 'VAT', get: (s) => s.vat },
    { label: 'Final tender quotation', get: (s) => s.total, strong: true },
  ];

  let lastSection = '';

  return (
    <div className="space-y-6">
      <PageHeader title="Compare quality scenarios" lead="The same building, the same quantities, priced at three specifications. Differences come only from unit rates." />

      <div className="grid gap-4 md:grid-cols-3">
        {QUALITIES.map((q) => {
          const s = sc[q];
          const d = s.total - sc.medium.total;
          return (
            <div key={q} className={cx('rounded-xl border bg-white p-5 shadow-sheet', q === i.quality ? 'border-brass ring-1 ring-brass' : 'border-concrete-200')}>
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold">{QUALITY_META[q].label}</span>
                {q === i.quality && <Badge tone="brass">Lead</Badge>}
              </div>
              <div className="mt-3 text-[26px] font-semibold tabular-nums tracking-tight" style={{ fontStretch: '108%' }}>{money(s.recommendedTender, cur)}</div>
              <div className="mt-1 text-[13px] tabular-nums text-ink-mute">{money(s.costPerM2, cur)}/m² · {q === 'medium' ? 'baseline' : `${d > 0 ? '+' : ''}${pct((d / sc.medium.total) * 100)} vs medium`}</div>
              <p className="mt-3 text-[12.5px] leading-snug text-ink-soft">{QUALITY_META[q].blurb}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Panel title="Side-by-side cost comparison" bodyClass="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b border-concrete-200 text-left text-[12px] text-ink-mute">
                  <th className="px-5 py-2.5 font-medium">Cost element</th>
                  {QUALITIES.map((q) => <th key={q} className="px-3 py-2.5 text-right font-medium">{QUALITY_META[q].short}</th>)}
                  <th className="px-5 py-2.5 text-right font-medium">High vs low</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const showSection = r.section && r.section !== lastSection;
                  if (r.section) lastSection = r.section;
                  const vals = QUALITIES.map((q) => r.get(sc[q]));
                  const spread = vals[2] > 0 ? (vals[0] / vals[2] - 1) * 100 : 0;
                  return (
                    <Fragment key={r.label}>
                      {showSection && (
                        <tr className="bg-concrete-100/70"><td colSpan={5} className="px-5 py-1.5 text-[12px] font-semibold">{r.section === 'construction' ? 'Construction tender' : 'Electrical tender'}</td></tr>
                      )}
                      <tr className={cx('border-b border-concrete-100', r.strong && 'bg-concrete-50 font-semibold')}>
                        <td className="px-5 py-2">{r.label}</td>
                        {vals.map((v, k) => <td key={k} className="px-3 py-2 text-right tabular-nums">{money(v, cur).replace(`${cur} `, '')}</td>)}
                        <td className={cx('px-5 py-2 text-right tabular-nums', spread < 0.05 ? 'text-ink-mute' : 'text-ink-soft')}>{spread < 0.05 ? 'same' : `+${spread.toFixed(0)} %`}</td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
        <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-1 2xl:content-start">
          <Panel title="Tender value by scenario"><ScenarioChart result={result} cur={cur} /></Panel>
          <Notice tone="info" icon={<ShieldCheck size={16} />}>
            Structural, fire and electrical safety items cost the same in Low as in Medium – the Low scenario never undercuts their Medium specification. Rows marked “same” (plant and general labour) do not vary with quality at all.
          </Notice>
        </div>
      </div>

      <Panel title="What changes between specifications" subtitle="Representative items – see the BOQ for every line" bodyClass="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-[13px]">
            <thead>
              <tr className="border-b border-concrete-200 text-left text-[12px] text-ink-mute">
                <th className="px-5 py-2.5 font-medium">Item</th>
                {(['low', 'medium', 'high'] as Quality[]).map((q) => <th key={q} className="px-3 py-2.5 font-medium">{QUALITY_META[q].short}</th>)}
              </tr>
            </thead>
            <tbody>
              {RATE_LIBRARY.filter((r) => SPEC_ITEMS.includes(r.id) && mods.includes(r.module)).map((r) => (
                <tr key={r.id} className="border-b border-concrete-100 align-top">
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-1.5 font-medium text-ink">{r.safetyCritical && <ShieldCheck size={14} className="text-rebar" aria-label="Safety-critical" />}{r.description}</div>
                    <div className="text-[12px] text-ink-mute">Rate factor {r.qualityFactor.map((f) => f.toFixed(2)).join(' / ')}</div>
                  </td>
                  <td className="px-3 py-2.5 text-ink-soft">{r.spec.low}</td>
                  <td className="px-3 py-2.5 text-ink-soft">{r.spec.medium}</td>
                  <td className="px-3 py-2.5 text-ink-soft">{r.spec.high}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
