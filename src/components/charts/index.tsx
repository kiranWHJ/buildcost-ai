import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList,
} from 'recharts';
import type { CurrencyCode, EstimateResult, ModuleEstimate, Quality, Risk } from '../../types';
import { compact, money } from '../../engine/format';
import { QUALITY_META } from '../../data/defaults';

// Validated categorical slots (light mode) – fixed order, never cycled.
export const SERIES = {
  construction: '#2a78d6',
  electrical: '#eb6834',
  material: '#2a78d6',
  labour: '#eb6834',
  equipment: '#1baf7a',
  subcontract: '#eda100',
};
const GRID = '#e6e9e7';
const AXIS = '#6b7780';

const axisProps = { tick: { fill: AXIS, fontSize: 12 }, axisLine: false, tickLine: false } as const;

function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="min-w-[180px] rounded-lg border border-concrete-200 bg-white px-3 py-2.5 text-[12.5px] shadow-lg">
      <div className="mb-1.5 font-semibold text-ink">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-2 text-ink-soft">
            {r.color && <span className="h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="font-medium tabular-nums text-ink">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function LegendRow({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-soft">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** Stacked bars: construction + electrical per quality scenario */
export function ScenarioChart({ result, cur }: { result: EstimateResult; cur: CurrencyCode }) {
  const data = (['high', 'medium', 'low'] as Quality[]).map((q) => ({
    name: QUALITY_META[q].short,
    construction: result.scenarios[q].construction?.total ?? 0,
    electrical: result.scenarios[q].electrical?.total ?? 0,
    total: result.scenarios[q].total,
  }));
  const hasC = data.some((d) => d.construction > 0);
  const hasE = data.some((d) => d.electrical > 0);
  return (
    <div>
      <LegendRow items={[hasC && { label: 'Construction', color: SERIES.construction }, hasE && { label: 'Electrical', color: SERIES.electrical }].filter(Boolean) as { label: string; color: string }[]} />
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 22, right: 8, left: 4, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="name" {...axisProps} />
          <YAxis {...axisProps} tickFormatter={(v) => compact(v)} width={48} />
          <Tooltip
            cursor={{ fill: 'rgba(22,34,44,0.04)' }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox
                  title={`${label} quality`}
                  rows={[
                    ...(hasC ? [{ label: 'Construction', value: money(payload[0].payload.construction, cur), color: SERIES.construction }] : []),
                    ...(hasE ? [{ label: 'Electrical', value: money(payload[0].payload.electrical, cur), color: SERIES.electrical }] : []),
                    { label: 'Tender total', value: money(payload[0].payload.total, cur) },
                  ]}
                />
              ) : null
            }
          />
          {hasC && (
            <Bar isAnimationActive={false} dataKey="construction" stackId="s" fill={SERIES.construction} stroke="#fff" strokeWidth={2} radius={hasE ? [0, 0, 0, 0] : [4, 4, 0, 0]} maxBarSize={64}>
              {!hasE && <LabelList dataKey="total" position="top" formatter={(v) => compact(Number(v))} style={{ fill: '#16222c', fontSize: 12, fontWeight: 600 }} />}
            </Bar>
          )}
          {hasE && (
            <Bar isAnimationActive={false} dataKey="electrical" stackId="s" fill={SERIES.electrical} stroke="#fff" strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={64}>
              <LabelList dataKey="total" position="top" formatter={(v) => compact(Number(v))} style={{ fill: '#16222c', fontSize: 12, fontWeight: 600 }} />
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal stacked bar per module – material / labour / equipment / subcontract */
export function CompositionChart({ modules, cur }: { modules: ModuleEstimate[]; cur: CurrencyCode }) {
  const data = modules.map((m) => ({
    name: m.module === 'construction' ? 'Construction' : 'Electrical',
    material: m.direct.material,
    labour: m.direct.labour,
    equipment: m.direct.equipment,
    subcontract: m.direct.subcontract,
    total: m.direct.total,
  }));
  const keys = ['material', 'labour', 'equipment', 'subcontract'] as const;
  const label = { material: 'Material', labour: 'Labour', equipment: 'Equipment', subcontract: 'Subcontract (supply & install)' };
  return (
    <div>
      <LegendRow items={keys.map((k) => ({ label: label[k], color: SERIES[k] }))} />
      <ResponsiveContainer width="100%" height={56 + data.length * 56}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" {...axisProps} tickFormatter={(v) => compact(v)} />
          <YAxis type="category" dataKey="name" {...axisProps} width={92} />
          <Tooltip
            cursor={{ fill: 'rgba(22,34,44,0.04)' }}
            content={({ active, payload, label: l }) =>
              active && payload?.length ? (
                <TooltipBox
                  title={`${l} – direct cost`}
                  rows={[
                    ...keys.map((k) => ({ label: label[k], value: `${money(payload[0].payload[k], cur)} (${((payload[0].payload[k] / payload[0].payload.total) * 100).toFixed(0)} %)`, color: SERIES[k] })),
                    { label: 'Total direct', value: money(payload[0].payload.total, cur) },
                  ]}
                />
              ) : null
            }
          />
          {keys.map((k, idx) => (
            <Bar isAnimationActive={false} key={k} dataKey={k} stackId="c" fill={SERIES[k]} stroke="#fff" strokeWidth={2} radius={idx === keys.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]} maxBarSize={30} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Ranked categories of direct cost, coloured by tender module */
export function CategoryChart({ modules, cur, limit = 12 }: { modules: ModuleEstimate[]; cur: CurrencyCode; limit?: number }) {
  const rows = modules
    .flatMap((m) => m.byCategory.map((c) => ({ ...c, module: m.module })))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const data = rows.slice(0, limit);
  const rest = rows.slice(limit).reduce((s, r) => s + r.amount, 0);
  const both = new Set(data.map((d) => d.module)).size > 1;
  return (
    <div>
      {both && <LegendRow items={[{ label: 'Construction', color: SERIES.construction }, { label: 'Electrical', color: SERIES.electrical }]} />}
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 30 + 20)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }} barCategoryGap="22%">
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" {...axisProps} width={206} interval={0} tick={{ fill: '#3d4b56', fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: 'rgba(22,34,44,0.04)' }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipBox
                  title={payload[0].payload.label}
                  rows={[
                    { label: payload[0].payload.module === 'construction' ? 'Construction' : 'Electrical', value: money(payload[0].payload.amount, cur), color: SERIES[payload[0].payload.module as 'construction'] },
                    { label: 'Share of direct cost', value: `${((payload[0].payload.amount / total) * 100).toFixed(1)} %` },
                  ]}
                />
              ) : null
            }
          />
          <Bar isAnimationActive={false} dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {data.map((d) => <Cell key={d.category} fill={SERIES[d.module]} />)}
            <LabelList dataKey="amount" position="right" formatter={(v) => compact(Number(v))} style={{ fill: '#3d4b56', fontSize: 11.5 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {rest > 0 && <p className="mt-1 text-[12px] text-ink-mute">Other categories: {money(rest, cur)}</p>}
    </div>
  );
}

/** Waterfall: direct → indirect → escalation → overheads → contingency → profit → VAT → tender */
export function BuildUpChart({ result, quality, cur }: { result: EstimateResult; quality: Quality; cur: CurrencyCode }) {
  const s = result.scenarios[quality];
  const steps = [
    { name: 'Direct', value: s.direct.total, kind: 'step' },
    { name: 'Indirect', value: s.indirect, kind: 'step' },
    { name: 'Escalation', value: s.escalation, kind: 'step' },
    { name: 'Overheads', value: s.overhead, kind: 'step' },
    { name: 'Contingency', value: s.contingency, kind: 'step' },
    { name: 'Profit', value: s.profit, kind: 'step' },
    { name: 'VAT', value: s.vat, kind: 'step' },
  ].filter((x) => x.value > 0 || x.name === 'Direct');
  let run = 0;
  const data = steps.map((st) => {
    const d = { name: st.name, base: run, value: st.value, kind: st.kind };
    run += st.value;
    return d;
  });
  data.push({ name: 'Tender', base: 0, value: run, kind: 'total' });
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 22, right: 8, left: 4, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="name" {...axisProps} interval={0} angle={-30} textAnchor="end" height={52} tick={{ fill: AXIS, fontSize: 11.5 }} />
        <YAxis {...axisProps} tickFormatter={(v) => compact(v)} width={48} />
        <Tooltip
          cursor={{ fill: 'rgba(22,34,44,0.04)' }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TooltipBox
                title={payload[0].payload.name}
                rows={[
                  { label: 'Amount', value: money(payload[0].payload.value, cur) },
                  { label: 'Share of tender', value: `${((payload[0].payload.value / s.total) * 100).toFixed(1)} %` },
                ]}
              />
            ) : null
          }
        />
        <Bar isAnimationActive={false} dataKey="base" stackId="w" fill="transparent" />
        <Bar isAnimationActive={false} dataKey="value" stackId="w" radius={[4, 4, 0, 0]} maxBarSize={46}>
          {data.map((d) => <Cell key={d.name} fill={d.kind === 'total' ? '#16222c' : d.name === 'Direct' ? '#2a78d6' : '#86b6ef'} />)}
          <LabelList dataKey="value" position="top" formatter={(v) => compact(Number(v))} style={{ fill: '#3d4b56', fontSize: 11 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Expected value (probability × impact) per risk */
export function RiskChart({ risks }: { risks: Risk[] }) {
  const data = risks
    .filter((r) => r.enabled)
    .map((r) => ({ name: r.title, ev: r.probability * r.impactPct, p: r.probability, i: r.impactPct }))
    .sort((a, b) => b.ev - a.ev);
  if (!data.length) return <p className="text-sm text-ink-mute">Enable at least one risk to see its expected value.</p>;
  return (
    <ResponsiveContainer width="100%" height={data.length * 32 + 16}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }} barCategoryGap="24%">
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" {...axisProps} width={220} interval={0} tick={{ fill: '#3d4b56', fontSize: 12 }} />
        <Tooltip
          cursor={{ fill: 'rgba(22,34,44,0.04)' }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TooltipBox title={payload[0].payload.name} rows={[
                { label: 'Probability', value: `${(payload[0].payload.p * 100).toFixed(0)} %` },
                { label: 'Impact if it occurs', value: `${payload[0].payload.i} % of direct` },
                { label: 'Expected value', value: `${payload[0].payload.ev.toFixed(2)} %` },
              ]} />
            ) : null
          }
        />
        <Bar isAnimationActive={false} dataKey="ev" fill="#2a78d6" radius={[0, 4, 4, 0]} maxBarSize={16}>
          <LabelList dataKey="ev" position="right" formatter={(v) => `${Number(v).toFixed(2)} %`} style={{ fill: '#3d4b56', fontSize: 11.5 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

