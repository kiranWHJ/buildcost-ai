import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, RotateCcw, Search, Pencil, Info } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { useEstimate } from '../store/EstimateContext';
import { CATEGORIES } from '../data/rateLibrary';
import { QUALITY_META } from '../data/defaults';
import { money, num, pct, rate as fmtRate } from '../engine/format';
import { Badge, Button, Notice, PageHeader, Panel, ProvenanceBadge, SafetyMark, Segmented, cx } from '../components/ui';
import type { BoqLine, CurrencyCode, Module, ModuleEstimate, Quality } from '../types';

function EditableNumber({ value, display, onCommit, edited, label }: { value: number; display: string; onCommit: (v: number | undefined) => void; edited: boolean; label: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        aria-label={label}
        className="h-8 w-28 rounded-md border border-rebar bg-white px-2 text-right text-[13px] tabular-nums focus:outline-none focus:ring-2 focus:ring-rebar/30"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (text.trim() === '') onCommit(undefined);
          else if (Number.isFinite(Number(text)) && Number(text) >= 0) onCommit(Number(text));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setEditing(false);
        }}
      />
    );
  }
  return (
    <button
      onClick={() => { setText(String(Math.round(value * 1000) / 1000)); setEditing(true); }}
      aria-label={`Edit ${label}`}
      className={cx(
        'group inline-flex h-8 items-center justify-end gap-1.5 rounded-md px-2 text-right tabular-nums transition-colors hover:bg-concrete-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rebar',
        edited ? 'bg-rebar-light font-semibold text-rebar-dark' : 'text-ink',
      )}
      title={edited ? 'Edited – clear the field to restore the calculated value' : 'Click to edit'}
    >
      <Pencil size={11} className="opacity-0 transition-opacity group-hover:opacity-50" aria-hidden />
      {display}
    </button>
  );
}

function BuildUp({ l, cur, lhRate }: { l: BoqLine; cur: CurrencyCode; lhRate: number }) {
  const parts = [
    { k: 'Material', v: l.materialRate },
    { k: `Labour (${num(l.labourRate / lhRate, 2)} h × ${fmtRate(lhRate, cur)})`, v: l.labourRate },
    { k: 'Equipment', v: l.equipmentRate },
    { k: 'Subcontract', v: l.subcontractRate },
  ].filter((p) => p.v > 0);
  return (
    <div className="grid gap-4 bg-concrete-50 px-5 py-4 text-[12.5px] md:grid-cols-[1fr_1fr]">
      <div>
        <div className="mb-1.5 font-medium text-ink">Unit-rate build-up ({cur}/{l.unit})</div>
        <table className="w-full max-w-sm">
          <tbody>
            {parts.map((p) => (
              <tr key={p.k}><td className="py-0.5 text-ink-soft">{p.k}</td><td className="py-0.5 text-right tabular-nums">{fmtRate(p.v, cur)}</td></tr>
            ))}
            <tr className="border-t border-concrete-300"><td className="py-1 font-semibold">Unit rate</td><td className="py-1 text-right font-semibold tabular-nums">{fmtRate(l.unitRate, cur)}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="space-y-2 text-ink-soft">
        <div><span className="font-medium text-ink">Quantity basis: </span>{l.qtyEdited ? 'Entered by user (measured)' : l.qtyBasis}</div>
        <div><span className="font-medium text-ink">Rate source: </span>{l.provenance.label} · {l.provenance.date}</div>
        {l.safetyCritical && <div className="flex items-start gap-1.5 text-rebar-dark"><SafetyMark applied={l.safetyFloorApplied} /> Safety-critical: the Low scenario can never be priced below Medium.</div>}
      </div>
    </div>
  );
}

function ModuleTable({ m, cur, fx, quality, query, lhRate }: { m: ModuleEstimate; cur: CurrencyCode; fx: number; quality: Quality; query: string; lhRate: number }) {
  const setBoqQty = useProjectStore((s) => s.setBoqQty);
  const setBoqRate = useProjectStore((s) => s.setBoqRate);
  const resetBoqItem = useProjectStore((s) => s.resetBoqItem);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const q = query.trim().toLowerCase();
  const cats = CATEGORIES.filter((c) => c.module === m.module);

  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[920px] text-[13px]">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-concrete-200 text-left text-[12px] text-ink-mute">
            <th className="w-8 py-2 pl-5" />
            <th className="py-2 pr-3 font-medium">Ref</th>
            <th className="py-2 pr-3 font-medium">Description and specification</th>
            <th className="py-2 pr-3 font-medium">Unit</th>
            <th className="py-2 pr-3 text-right font-medium">Quantity</th>
            <th className="py-2 pr-3 text-right font-medium">Unit rate ({cur})</th>
            <th className="py-2 pr-3 text-right font-medium">Amount ({cur})</th>
            <th className="py-2 pr-5 font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {cats.map((c, ci) => {
            const lines = m.lines.filter((l) => l.category === c.id && (!q || l.description.toLowerCase().includes(q) || l.id.toLowerCase().includes(q) || l.spec.toLowerCase().includes(q)));
            if (!lines.length) return null;
            const subtotal = m.lines.filter((l) => l.category === c.id).reduce((s, l) => s + l.amount, 0);
            return (
              <Fragment key={c.id}>
                <tr className="bg-concrete-100/70">
                  <td colSpan={6} className="px-5 py-2 text-[12.5px] font-semibold text-ink">{ci + 1}. {c.label}</td>
                  <td className="py-2 pr-3 text-right text-[12.5px] font-semibold tabular-nums">{money(subtotal, cur).replace(`${cur} `, '')}</td>
                  <td className="py-2 pr-5 text-[12px] text-ink-mute">{pct((subtotal / m.direct.total) * 100)}</td>
                </tr>
                {lines.map((l) => {
                  const isOpen = !!open[l.id];
                  const edited = l.qtyEdited || l.rateEdited;
                  return (
                    <Fragment key={l.id}>
                      <tr className="border-b border-concrete-100 align-top hover:bg-concrete-50/60">
                        <td className="py-2 pl-5">
                          <button onClick={() => setOpen((o) => ({ ...o, [l.id]: !isOpen }))} className="mt-1 rounded text-ink-mute hover:text-ink" aria-expanded={isOpen} aria-label={`Show build-up for ${l.id}`}>
                            {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </button>
                        </td>
                        <td className="whitespace-nowrap py-2.5 pr-3 text-[12px] text-ink-mute">{l.id}</td>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-start gap-1.5 text-ink">
                            {l.safetyCritical && <SafetyMark applied={l.safetyFloorApplied} />}
                            <span>{l.description}</span>
                          </div>
                          <div className="mt-0.5 text-[12px] text-ink-mute">{l.spec}</div>
                        </td>
                        <td className="py-2.5 pr-3 text-ink-soft">{l.unit}</td>
                        <td className="py-1 pr-1 text-right">
                          <EditableNumber label={`quantity for ${l.id}`} value={l.qty} display={num(l.qty, l.qty % 1 === 0 ? 0 : 2)} edited={l.qtyEdited} onCommit={(v) => setBoqQty(l.id, v)} />
                        </td>
                        <td className="py-1 pr-1 text-right">
                          <EditableNumber label={`${quality} unit rate for ${l.id}`} value={l.unitRate} display={fmtRate(l.unitRate, cur)} edited={l.rateEdited} onCommit={(v) => setBoqRate(l.id, quality, v === undefined ? undefined : v / fx)} />
                        </td>
                        <td className="py-2.5 pr-3 text-right font-medium tabular-nums">{num(l.amount)}</td>
                        <td className="py-2 pr-5">
                          <div className="flex items-center gap-1.5">
                            <ProvenanceBadge p={l.provenance} compact />
                            {edited && (
                              <button onClick={() => resetBoqItem(l.id)} className="rounded p-1 text-ink-mute hover:bg-concrete-100 hover:text-ink" aria-label={`Reset ${l.id}`} title="Reset quantity and rates for this item">
                                <RotateCcw size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-concrete-200"><td colSpan={8} className="p-0"><BuildUp l={l} cur={cur} lhRate={lhRate} /></td></tr>
                      )}
                    </Fragment>
                  );
                })}
              </Fragment>
            );
          })}
          <tr className="border-t-2 border-ink">
            <td colSpan={6} className="px-5 py-3 text-[13.5px] font-semibold">Total direct cost – {m.module === 'construction' ? 'construction' : 'electrical'}</td>
            <td className="py-3 pr-3 text-right text-[13.5px] font-semibold tabular-nums">{num(m.direct.total)}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function IndirectAndMarkups({ m, cur, contingencyLabel }: { m: ModuleEstimate; cur: CurrencyCode; contingencyLabel: string }) {
  const rows: [string, string, number][] = [
    ['Direct cost', '', m.direct.total],
    ...m.indirect.map((x) => [x.label, x.unit.includes('%') ? x.unit : `${num(x.qty)} ${x.unit} × ${fmtRate(x.rate, cur)}`, x.amount] as [string, string, number]),
    ['Price escalation', 'To construction mid-point', m.escalation],
    ['Head-office overheads', '% of direct + indirect + escalation', m.overhead],
    ['Contingency', contingencyLabel, m.contingency],
    ['Contractor profit', '% of cost incl. overheads & contingency', m.profit],
    ['VAT', 'On tender before tax', m.vat],
  ];
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[640px] text-[13px]">
        <tbody>
          {rows.map(([a, b, v], k) => (
            <tr key={a + k} className={cx('border-b border-concrete-100', k === 0 && 'bg-concrete-50 font-semibold')}>
              <td className={cx('px-5 py-2', k > 0 && k <= m.indirect.length && 'pl-9')}>{a}</td>
              <td className="py-2 pr-3 text-[12.5px] text-ink-mute">{b}</td>
              <td className="py-2 pr-5 text-right tabular-nums">{money(v, cur)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-ink bg-concrete-50">
            <td className="px-5 py-3 font-semibold">Final {m.module} tender</td><td />
            <td className="py-3 pr-5 text-right font-semibold tabular-nums">{money(m.total, cur)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function BOQ() {
  const project = useProjectStore((s) => s.project);
  const setQuality = useProjectStore((s) => s.setQuality);
  const resetBoq = useProjectStore((s) => s.resetBoq);
  const { result } = useEstimate();
  const i = project.inputs;
  const available: Module[] = i.scope === 'both' ? ['construction', 'electrical'] : [i.scope];
  const [tab, setTab] = useState<Module>(available[0]);
  const [query, setQuery] = useState('');
  const active = available.includes(tab) ? tab : available[0];
  const editedCount = Object.keys(project.boqOverrides).length;

  const m = useMemo(() => {
    if (!result) return null;
    const s = result.scenarios[i.quality];
    return active === 'construction' ? s.construction : s.electrical;
  }, [result, i.quality, active]);

  if (!result || !m) return <Notice tone="critical">Enter valid project inputs to generate the BOQ.</Notice>;
  const cur = i.displayCurrency;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bill of quantities"
        lead={<>Every line is <strong className="font-semibold text-ink">quantity × unit rate = amount</strong>. Click a quantity or rate to replace it with a measured figure or a quote; clear the field to go back to the calculated value.</>}
        actions={editedCount > 0 && <Button size="sm" variant="danger" icon={<RotateCcw size={14} />} onClick={resetBoq}>Reset {editedCount} edited item{editedCount > 1 ? 's' : ''}</Button>}
      />

      <div className="flex flex-wrap items-center gap-3">
        {available.length > 1 && (
          <Segmented<Module> ariaLabel="Tender module" value={active} onChange={setTab} options={[{ value: 'construction', label: 'Construction tender' }, { value: 'electrical', label: 'Electrical tender' }]} />
        )}
        <Segmented<Quality> ariaLabel="Quality" size="sm" value={i.quality} onChange={setQuality} options={(['high', 'medium', 'low'] as Quality[]).map((q) => ({ value: q, label: QUALITY_META[q].short }))} />
        <div className="relative ml-auto w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter items" aria-label="Filter BOQ items" className="h-10 w-full rounded-lg border border-concrete-300 bg-white pl-9 pr-3 text-[14px] focus:border-rebar focus:outline-none focus:ring-2 focus:ring-rebar/30" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-ink-mute">
        <span className="inline-flex items-center gap-1.5"><SafetyMark /> Safety-critical (no downgrade in Low)</span>
        <span className="inline-flex items-center gap-1.5"><Badge tone="teal">edited</Badge> Your figure</span>
        <span className="inline-flex items-center gap-1.5"><Info size={13} /> Rate edits apply to the {QUALITY_META[i.quality].label.toLowerCase()} scenario only; quantity edits apply to all three.</span>
      </div>

      <Panel title={`${active === 'construction' ? 'Construction' : 'Electrical'} BOQ – ${QUALITY_META[i.quality].label}`} subtitle={`${m.lines.length} items · direct cost ${money(m.direct.total, cur)}`}>
        <ModuleTable m={m} cur={cur} fx={result.fx} quality={i.quality} query={query} lhRate={result.labourRatePerHour} />
      </Panel>

      <Panel title="Indirect costs, markups and tax" subtitle="Preliminaries are quantity × rate too; percentage items show their base">
        <IndirectAndMarkups m={m} cur={cur} contingencyLabel={i.contingencyMode === 'risk' ? 'From risk register' : `${i.contingencyPct} % manual`} />
      </Panel>
    </div>
  );
}
