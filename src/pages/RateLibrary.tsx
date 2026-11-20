import { useState } from 'react';
import { RotateCcw, Search, FlaskConical, BadgeCheck } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { useEstimate } from '../store/EstimateContext';
import { COUNTRIES } from '../data/countries';
import { CATEGORY_LABEL, RATE_LIBRARY } from '../data/rateLibrary';
import { rateKey } from '../engine/estimate';
import { num, pct, rate as fmtRate } from '../engine/format';
import { Badge, Button, Notice, PageHeader, Panel, ProvenanceBadge, SafetyMark, Segmented, cx } from '../components/ui';
import type { Module, RateItem } from '../types';

type Field = 'material' | 'labourHours' | 'equipment' | 'subcontract';

function RateInput({ base, value, onCommit, label, decimals = 2 }: { base: number; value: number | undefined; onCommit: (v: number | undefined) => void; label: string; decimals?: number }) {
  const [text, setText] = useState<string | null>(null);
  const shown = value ?? base;
  const disabled = base === 0 && value === undefined;
  return (
    <input
      type="number"
      aria-label={label}
      disabled={disabled}
      value={text ?? (disabled ? '' : String(Math.round(shown * 10 ** decimals) / 10 ** decimals))}
      placeholder={disabled ? '–' : undefined}
      onFocus={() => setText(String(Math.round(shown * 10 ** decimals) / 10 ** decimals))}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text !== null) {
          const t = text.trim();
          const n = Number(t);
          if (t === '') onCommit(undefined);
          else if (Number.isFinite(n) && n >= 0 && Math.abs(n - shown) > 1e-9) onCommit(n);
        }
        setText(null);
      }}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className={cx(
        'h-8 w-24 rounded-md border px-2 text-right text-[13px] tabular-nums focus:border-rebar focus:outline-none focus:ring-2 focus:ring-rebar/30 disabled:border-transparent disabled:bg-transparent',
        value !== undefined ? 'border-rebar/40 bg-rebar-light font-semibold text-rebar-dark' : 'border-concrete-200 bg-white',
      )}
    />
  );
}

export function RateLibrary() {
  const project = useProjectStore((s) => s.project);
  const setRateOverride = useProjectStore((s) => s.setRateOverride);
  const clearRateOverride = useProjectStore((s) => s.clearRateOverride);
  const clearAll = useProjectStore((s) => s.clearAllRateOverrides);
  const { result } = useEstimate();
  const i = project.inputs;
  const c = COUNTRIES[i.country];
  const [mod, setMod] = useState<Module | 'all'>('all');
  const [query, setQuery] = useState('');
  const [onlyIllustrative, setOnlyIllustrative] = useState(false);

  const local = (item: RateItem, f: Exclude<Field, 'labourHours'>) => {
    const idx = f === 'material' ? 1 + i.materialIndexPct / 100 : f === 'equipment' ? 1 + i.equipmentIndexPct / 100 : 1;
    return item[f] * c.fxPerUsd * c.locationFactor * idx;
  };

  const q = query.trim().toLowerCase();
  const items = RATE_LIBRARY.filter(
    (r) =>
      (mod === 'all' || r.module === mod) &&
      (!q || r.description.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)) &&
      (!onlyIllustrative || !project.rateOverrides[rateKey(i.country, r.id)]),
  );
  const verified = RATE_LIBRARY.filter((r) => project.rateOverrides[rateKey(i.country, r.id)]).length;
  const lh = result ? result.labourRatePerHour / result.fx : c.labourUsdPerHour * c.fxPerUsd;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Rate library – ${c.name}`}
        lead={<>Medium-specification unit rates in <strong className="font-semibold text-ink">{c.currency}</strong>. Type a supplier or subcontractor quote over any rate and record where it came from. Quality factors and the safety floor are applied on top.</>}
        actions={verified > 0 && <Button size="sm" variant="danger" icon={<RotateCcw size={14} />} onClick={clearAll}>Clear {verified} user rate{verified > 1 ? 's' : ''}</Button>}
      />

      <Notice tone="warn" icon={<FlaskConical size={16} />}>
        <strong>{RATE_LIBRARY.length - verified} of {RATE_LIBRARY.length} rates are illustrative assumptions</strong> derived from a Gulf baseline × location factor. They are not market prices. Rates you enter here are marked <Badge tone="teal" icon={<BadgeCheck size={12} />}>User rate</Badge> with today’s date.
      </Notice>

      <Panel title="Country factors" subtitle="Applied to every baseline rate for this country">
        <div className="grid gap-4 text-[13px] sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Exchange rate', `${c.fxPerUsd} ${c.currency} / USD`, c.fxNote],
            ['VAT', pct(c.vat * 100, 0), c.vatNote],
            ['Location factor', `× ${c.locationFactor.toFixed(2)}`, 'vs Dubai baseline'],
            ['All-in labour', `${fmtRate(lh, c.currency)} ${c.currency}/h`, i.labourRateOverride ? 'Your override' : 'Wage × all-in factor'],
            ['Escalation', `${pct(c.escalationPerYear * 100)} / year`, 'Forecast'],
          ].map(([k, v, n]) => (
            <div key={k} className="rounded-lg border border-concrete-200 p-3">
              <div className="text-ink-mute">{k}</div>
              <div className="mt-0.5 text-[15px] font-semibold tabular-nums">{v}</div>
              <div className="mt-0.5 text-[12px] text-ink-mute">{n}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-mute">
          <ProvenanceBadge p={c.provenance} /> {c.provenance.label}
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented<Module | 'all'> ariaLabel="Module" value={mod} onChange={setMod} options={[{ value: 'all', label: 'All' }, { value: 'construction', label: 'Construction' }, { value: 'electrical', label: 'Electrical' }]} />
        <label className="flex items-center gap-2 text-[13.5px] text-ink-soft">
          <input type="checkbox" checked={onlyIllustrative} onChange={(e) => setOnlyIllustrative(e.target.checked)} className="h-4 w-4 accent-rebar" />
          Show only illustrative rates
        </label>
        <div className="relative ml-auto w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter rates" aria-label="Filter rates" className="h-10 w-full rounded-lg border border-concrete-300 bg-white pl-9 pr-3 text-[14px] focus:border-rebar focus:outline-none focus:ring-2 focus:ring-rebar/30" />
        </div>
      </div>

      <Panel bodyClass="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-[13px]">
            <thead>
              <tr className="border-b border-concrete-200 text-left text-[12px] text-ink-mute">
                <th className="px-5 py-2.5 font-medium">Item</th>
                <th className="px-2 py-2.5 font-medium">Unit</th>
                <th className="px-2 py-2.5 text-right font-medium">Material</th>
                <th className="px-2 py-2.5 text-right font-medium">Labour h</th>
                <th className="px-2 py-2.5 text-right font-medium">Equipment</th>
                <th className="px-2 py-2.5 text-right font-medium">Subcontract</th>
                <th className="px-2 py-2.5 text-right font-medium">Medium rate</th>
                <th className="px-2 py-2.5 font-medium">Source and date</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const ov = project.rateOverrides[rateKey(i.country, r.id)];
                const mat = ov?.material ?? local(r, 'material');
                const eq = ov?.equipment ?? local(r, 'equipment');
                const sub = ov?.subcontract ?? local(r, 'subcontract');
                const hrs = ov?.labourHours ?? r.labourHours;
                const total = mat + eq + sub + hrs * lh;
                return (
                  <tr key={r.id} className="border-b border-concrete-100 align-middle hover:bg-concrete-50/60">
                    <td className="px-5 py-2">
                      <div className="flex items-center gap-1.5 text-ink">{r.safetyCritical && <SafetyMark />}{r.description}</div>
                      <div className="text-[12px] text-ink-mute">{r.id} · {CATEGORY_LABEL[r.category]}</div>
                    </td>
                    <td className="px-2 py-2 text-ink-soft">{r.unit}</td>
                    {(['material', 'labourHours', 'equipment', 'subcontract'] as Field[]).map((f) => (
                      <td key={f} className="px-2 py-2 text-right">
                        <RateInput
                          label={`${f} for ${r.id}`}
                          decimals={f === 'labourHours' ? 3 : 2}
                          base={f === 'labourHours' ? r.labourHours : local(r, f)}
                          value={ov?.[f]}
                          onCommit={(v) => setRateOverride(r.id, { [f]: v })}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-2 text-right font-medium tabular-nums">{fmtRate(total, c.currency)}</td>
                    <td className="px-2 py-2">
                      {ov ? (
                        <div className="flex flex-col gap-1">
                          <input
                            defaultValue={ov.source}
                            aria-label={`Source for ${r.id}`}
                            onBlur={(e) => e.target.value !== ov.source && setRateOverride(r.id, { source: e.target.value || 'User input' })}
                            className="h-7 w-48 rounded-md border border-concrete-200 px-2 text-[12.5px] focus:border-rebar focus:outline-none"
                          />
                          <span className="text-[11.5px] text-ink-mute">Updated {ov.date}</span>
                        </div>
                      ) : (
                        <ProvenanceBadge p={{ kind: 'illustrative', label: 'BuildCost AI Gulf baseline v1', date: '2026-11-20' }} />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {ov && (
                        <button onClick={() => clearRateOverride(r.id)} className="rounded p-1 text-ink-mute hover:bg-concrete-100 hover:text-ink" aria-label={`Restore baseline for ${r.id}`} title="Restore illustrative baseline">
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {items.length === 0 && <p className="p-6 text-center text-sm text-ink-mute">No rates match. Clear the filter to see all {RATE_LIBRARY.length} items.</p>}
      </Panel>
      <p className="text-[12.5px] text-ink-mute">Labour hours are productivity (man-hours per unit) and are multiplied by the all-in labour rate of {fmtRate(lh, c.currency)} {c.currency}/h. Showing {num(items.length)} items.</p>
    </div>
  );
}
