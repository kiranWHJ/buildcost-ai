import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { useEstimate } from '../store/EstimateContext';
import { riskContingencyPct } from '../engine/estimate';
import { money, pct } from '../engine/format';
import { Button, NumberInput, PageHeader, Panel, Segmented, Select, Toggle, cx } from '../components/ui';
import { RiskChart } from '../components/charts';
import type { Module } from '../types';

export function RiskPage() {
  const project = useProjectStore((s) => s.project);
  const updateRisk = useProjectStore((s) => s.updateRisk);
  const addRisk = useProjectStore((s) => s.addRisk);
  const removeRisk = useProjectStore((s) => s.removeRisk);
  const resetRisks = useProjectStore((s) => s.resetRisks);
  const setInput = useProjectStore((s) => s.setInput);
  const { result } = useEstimate();
  const i = project.inputs;
  const cur = i.displayCurrency;
  const s = result?.scenarios[i.quality];
  const mods: Module[] = i.scope === 'both' ? ['construction', 'electrical'] : [i.scope];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk and contingency"
        lead="Contingency is priced from the risks that could realistically hit this tender: expected value = probability × impact on direct cost. Switch to a manual percentage if your company policy sets one."
        actions={<><Button size="sm" variant="ghost" icon={<RotateCcw size={14} />} onClick={resetRisks}>Restore default risks</Button><Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={addRisk}>Add risk</Button></>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-concrete-200 bg-white p-5 shadow-sheet">
          <div className="text-[13px] text-ink-mute">Contingency method</div>
          <div className="mt-2">
            <Segmented<'risk' | 'manual'> size="sm" ariaLabel="Contingency method" value={i.contingencyMode} onChange={(v) => setInput('contingencyMode', v)} options={[{ value: 'risk', label: 'Risk register' }, { value: 'manual', label: 'Manual %' }]} />
          </div>
          {i.contingencyMode === 'manual' && (
            <div className="mt-3 max-w-[160px]"><NumberInput value={i.contingencyPct} onChange={(v) => setInput('contingencyPct', v as number)} step={0.5} suffix="%" ariaLabel="Manual contingency" /></div>
          )}
        </div>
        {mods.map((m) => {
          const me = m === 'construction' ? s?.construction : s?.electrical;
          const p = i.contingencyMode === 'risk' ? riskContingencyPct(project, m) : i.contingencyPct;
          return (
            <div key={m} className="rounded-xl border border-concrete-200 bg-white p-5 shadow-sheet">
              <div className="text-[13px] text-ink-mute">{m === 'construction' ? 'Construction' : 'Electrical'} contingency</div>
              <div className="mt-1 text-[24px] font-semibold tabular-nums">{pct(p, 2)}</div>
              <div className="text-[13px] tabular-nums text-ink-mute">{me ? money(me.contingency, cur) : '—'} on the {i.quality} scenario</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <Panel title="Risk register" bodyClass="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13px]">
              <thead>
                <tr className="border-b border-concrete-200 text-left text-[12px] text-ink-mute">
                  <th className="px-5 py-2.5 font-medium">Include</th>
                  <th className="px-2 py-2.5 font-medium">Risk and mitigation</th>
                  <th className="px-2 py-2.5 font-medium">Applies to</th>
                  <th className="px-2 py-2.5 font-medium">Probability</th>
                  <th className="px-2 py-2.5 font-medium">Impact</th>
                  <th className="px-2 py-2.5 text-right font-medium">Expected</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {project.risks.map((r) => (
                  <tr key={r.id} className={cx('border-b border-concrete-100 align-top', !r.enabled && 'opacity-55')}>
                    <td className="px-5 py-3"><Toggle checked={r.enabled} onChange={(v) => updateRisk(r.id, { enabled: v })} label={<span className="sr-only">Include {r.title}</span>} /></td>
                    <td className="px-2 py-2.5">
                      <input value={r.title} onChange={(e) => updateRisk(r.id, { title: e.target.value })} aria-label="Risk title" className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 font-medium text-ink hover:border-concrete-200 focus:border-rebar focus:outline-none" />
                      <textarea value={r.description} onChange={(e) => updateRisk(r.id, { description: e.target.value })} aria-label="Risk description" rows={2} className="mt-0.5 w-full resize-none rounded border border-transparent bg-transparent px-1 text-[12.5px] text-ink-soft hover:border-concrete-200 focus:border-rebar focus:outline-none" />
                      <textarea value={r.mitigation} onChange={(e) => updateRisk(r.id, { mitigation: e.target.value })} aria-label="Mitigation" rows={2} className="w-full resize-none rounded border border-transparent bg-transparent px-1 text-[12.5px] text-rebar-dark hover:border-concrete-200 focus:border-rebar focus:outline-none" />
                    </td>
                    <td className="w-44 px-2 py-2.5">
                      <Select<Module | 'both'> value={r.module} onChange={(v) => updateRisk(r.id, { module: v })} options={[{ value: 'both', label: 'Both' }, { value: 'construction', label: 'Construction' }, { value: 'electrical', label: 'Electrical' }]} />
                    </td>
                    <td className="w-28 px-2 py-2.5"><NumberInput value={Math.round(r.probability * 100)} onChange={(v) => updateRisk(r.id, { probability: Math.min(100, Math.max(0, (v as number) || 0)) / 100 })} min={0} max={100} step={5} suffix="%" ariaLabel={`Probability of ${r.title}`} /></td>
                    <td className="w-28 px-2 py-2.5"><NumberInput value={r.impactPct} onChange={(v) => updateRisk(r.id, { impactPct: Math.max(0, (v as number) || 0) })} min={0} step={0.5} suffix="%" ariaLabel={`Impact of ${r.title}`} /></td>
                    <td className="px-2 py-3 text-right font-medium tabular-nums">{pct(r.probability * r.impactPct, 2)}</td>
                    <td className="px-3 py-2.5"><button onClick={() => removeRisk(r.id)} className="rounded p-1.5 text-ink-mute hover:bg-red-50 hover:text-status-critical" aria-label={`Remove ${r.title}`}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Expected value by risk" subtitle="Share of direct cost">
          <RiskChart risks={project.risks} />
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-mute">Impact is the cost increase on the affected module’s base (direct + indirect + escalation) if the risk occurs. Contingency for each module sums the expected values of risks that apply to it.</p>
        </Panel>
      </div>
    </div>
  );
}
