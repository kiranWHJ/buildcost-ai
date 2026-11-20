import type { CurrencyCode, ModuleEstimate, ScenarioEstimate } from '../../types';
import { money } from '../../engine/format';
import { cx } from '../../components/ui';

type Row = { label: string; get: (m: ModuleEstimate) => number; strong?: boolean; total?: boolean; indent?: boolean };

const ROWS: Row[] = [
  { label: 'Material', get: (m) => m.direct.material, indent: true },
  { label: 'Labour', get: (m) => m.direct.labour, indent: true },
  { label: 'Equipment', get: (m) => m.direct.equipment, indent: true },
  { label: 'Subcontract', get: (m) => m.direct.subcontract, indent: true },
  { label: 'Direct cost', get: (m) => m.direct.total, strong: true },
  { label: 'Indirect cost (preliminaries)', get: (m) => m.indirectTotal },
  { label: 'Price escalation', get: (m) => m.escalation },
  { label: 'Head-office overheads', get: (m) => m.overhead },
  { label: 'Contingency', get: (m) => m.contingency },
  { label: 'Contractor profit', get: (m) => m.profit },
  { label: 'Tender before tax', get: (m) => m.netBeforeTax, strong: true },
  { label: 'VAT', get: (m) => m.vat },
  { label: 'Final tender quotation', get: (m) => m.total, total: true },
];

export function CostSummaryTable({ scenario, cur }: { scenario: ScenarioEstimate; cur: CurrencyCode }) {
  const mods = [scenario.construction, scenario.electrical].filter(Boolean) as ModuleEstimate[];
  const both = mods.length > 1;
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[520px] text-[13px]">
        <thead>
          <tr className="border-b border-concrete-200 text-left text-[12px] text-ink-mute">
            <th className="px-5 pb-2 font-medium">Cost element</th>
            {mods.map((m) => (
              <th key={m.module} className="px-3 pb-2 text-right font-medium">{m.module === 'construction' ? 'Construction' : 'Electrical'}</th>
            ))}
            {both && <th className="px-5 pb-2 text-right font-medium">Combined</th>}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => {
            const vals = mods.map(r.get);
            const sum = vals.reduce((a, b) => a + b, 0);
            return (
              <tr key={r.label} className={cx('border-b border-concrete-100', r.total && 'border-t-2 border-t-ink bg-concrete-50', r.strong && 'bg-concrete-50/60')}>
                <td className={cx('px-5 py-2', r.indent && 'pl-9 text-ink-mute', (r.strong || r.total) && 'font-semibold text-ink')}>{r.label}</td>
                {vals.map((v, k) => (
                  <td key={k} className={cx('px-3 py-2 text-right tabular-nums', (r.strong || r.total) && 'font-semibold', r.indent && 'text-ink-mute')}>{money(v, cur)}</td>
                ))}
                {both && <td className={cx('px-5 py-2 text-right tabular-nums', (r.strong || r.total) && 'font-semibold')}>{money(sum, cur)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
