import { ExternalLink } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { useEstimate } from '../store/EstimateContext';
import { CALIBRATION_SOURCES, COUNTRIES } from '../data/countries';
import { ASSUMPTIONS, EXCLUSIONS, TYPE_COEFFICIENTS } from '../data/defaults';
import { num, pct } from '../engine/format';
import { Notice, PageHeader, Panel } from '../components/ui';

export function Assumptions() {
  const project = useProjectStore((s) => s.project);
  const { result } = useEstimate();
  const i = project.inputs;
  const c = COUNTRIES[i.country];
  const t = TYPE_COEFFICIENTS[i.buildingType];
  const g = result?.geometry;

  return (
    <div className="space-y-6">
      <PageHeader title="Assumptions, exclusions and method" lead="Attach this page to the tender so the client knows exactly what the price covers." />

      {result && result.warnings.length > 0 && (
        <Notice tone="warn"><ul className="list-disc space-y-1 pl-4">{result.warnings.map((w) => <li key={w}>{w}</li>)}</ul></Notice>
      )}

      <Panel title="How the estimate is calculated">
        <ol className="space-y-2.5 text-[13.5px] leading-relaxed text-ink-soft">
          {[
            ['Quantities', 'derived from floors, built-up area and building type (or entered by you in the BOQ).'],
            ['Unit rate', '= material + labour hours × all-in labour rate + equipment + subcontract, each × country FX × location factor × quality factor.'],
            ['Item cost', '= quantity × unit rate. Summed by work section into direct cost (material, labour, equipment, subcontract).'],
            ['Indirect cost', '= preliminaries priced as quantity × rate (staff-months, utilities-months) plus percentage items (insurance, bonds, design, permits).'],
            ['Escalation', `= direct cost × ${pct(c.escalationPerYear * 100)}/yr × half the programme.`],
            ['Overheads and contingency', '= percentage of (direct + indirect + escalation). Contingency comes from the risk register unless set manually.'],
            ['Profit', '= percentage of cost including overheads and contingency.'],
            ['VAT', `= ${pct(c.vat * 100, 0)} of the tender before tax (${c.vatNote}).`],
          ].map(([k, v], n) => (
            <li key={k} className="flex gap-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-concrete-100 text-[11px] font-semibold text-ink">{n + 1}</span><span><strong className="font-semibold text-ink">{k}</strong> {v}</span></li>
          ))}
        </ol>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Assumptions">
          <ul className="list-disc space-y-2 pl-5 text-[13.5px] leading-relaxed text-ink-soft">{ASSUMPTIONS.map((a) => <li key={a}>{a}</li>)}</ul>
        </Panel>
        <Panel title="Exclusions">
          <ul className="list-disc space-y-2 pl-5 text-[13.5px] leading-relaxed text-ink-soft">{EXCLUSIONS.map((a) => <li key={a}>{a}</li>)}</ul>
        </Panel>
      </div>

      {g && (
        <Panel title="Derived geometry and design coefficients" subtitle={`${t.label} norms – used to calculate quantities`}>
          <div className="grid gap-x-8 gap-y-2 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Typical floor plate', `${num(g.plateArea)} m²`], ['Basement plate', `${num(g.basementPlate)} m²`], ['Building height', `${num(g.buildingHeight, 1)} m`],
              ['Excavation depth', `${num(g.excavationDepth, 1)} m`], ['Façade area', `${num(g.facadeArea)} m²`], ['Glazing (WWR)', `${num(g.glazingArea)} m² (${pct(t.wwr * 100, 0)})`],
              [`${g.unitLabel} (est.)`, num(g.units)], ['Cooling load', `${num(g.coolingTR)} TR (${t.m2PerTR} m²/TR)`], ['Electrical demand', `${num(g.demandKVA)} kVA (${t.vaPerM2} VA/m² × 0.65)`],
              ['Partition factor', `${t.partitionFactor} m²/m²`], ['Lift service area', `${num(t.liftServiceArea)} m²/lift`], ['Standby generation', pct(t.standbyRatio * 100, 0) + ' of demand'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-concrete-100 py-1.5"><span className="capitalize text-ink-mute">{k}</span><span className="tabular-nums text-ink">{v}</span></div>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Calibration references" subtitle="Published benchmarks used to sanity-check the illustrative baseline. They are not the source of individual unit rates.">
        <ul className="space-y-3 text-[13px]">
          {CALIBRATION_SOURCES.map((s) => (
            <li key={s.label}>
              <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-rebar-dark underline-offset-2 hover:underline">{s.label}<ExternalLink size={12} /></a>
              <p className="mt-0.5 leading-relaxed text-ink-soft">{s.note}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
