import { AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { useEstimate } from '../store/EstimateContext';
import { COUNTRY_LIST, COUNTRIES, CURRENCIES } from '../data/countries';
import { QUALITY_META, TYPE_COEFFICIENTS } from '../data/defaults';
import { issuesFor, LIMITS } from '../engine/validation';
import { money, num } from '../engine/format';
import { Button, Field, Notice, NumberInput, PageHeader, Panel, Segmented, Select, TextInput, Toggle, cx } from '../components/ui';
import { Elevation } from '../components/charts/Elevation';
import type { BuildingType, CountryCode, CurrencyCode, Quality, TenderScope } from '../types';

export function ProjectSetup() {
  const project = useProjectStore((s) => s.project);
  const setInput = useProjectStore((s) => s.setInput);
  const setPage = useProjectStore((s) => s.setPage);
  const { result, issues, stale } = useEstimate();
  const i = project.inputs;
  const c = COUNTRIES[i.country];
  const err = (f: Parameters<typeof issuesFor>[1]) => issuesFor(issues, f);

  return (
    <div>
      <PageHeader
        title="Project inputs"
        lead="Describe the building and the tender. Every figure on the dashboard recalculates as you type."
        actions={<Button variant="primary" icon={<ArrowRight size={16} />} onClick={() => setPage('dashboard')} disabled={stale}>View estimate</Button>}
      />

      {issues.length > 0 && (
        <div className="mb-5">
          <Notice tone="critical" icon={<AlertTriangle size={16} />}>
            <strong>Fix {issues.length === 1 ? 'one input' : `${issues.length} inputs`} to update the estimate.</strong> The dashboard is showing the last valid result until then.
          </Notice>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Panel title="Project and location">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Project name" htmlFor="name" error={err('name')}>
                <TextInput id="name" value={i.name} onChange={(v) => setInput('name', v)} invalid={!!err('name')} />
              </Field>
              <Field label="Client" htmlFor="client">
                <TextInput id="client" value={i.client} onChange={(v) => setInput('client', v)} />
              </Field>
              <Field label="Country" htmlFor="country" hint={`${c.vatNote}. ${c.fxNote}.`}>
                <Select<CountryCode> id="country" value={i.country} onChange={(v) => setInput('country', v)} options={COUNTRY_LIST.map((x) => ({ value: x.code, label: x.name }))} />
              </Field>
              <Field label="City" htmlFor="city" error={err('city')}>
                <TextInput id="city" list="cities" value={i.city} onChange={(v) => setInput('city', v)} invalid={!!err('city')} />
                <datalist id="cities">{c.cities.map((x) => <option key={x} value={x} />)}</datalist>
              </Field>
              <Field label="Currency" htmlFor="currency" hint={i.displayCurrency !== c.currency ? `Converted from ${c.currency} at USD peg rates.` : 'Local currency of the selected country.'}>
                <Select<CurrencyCode> id="currency" value={i.displayCurrency} onChange={(v) => setInput('displayCurrency', v)} options={CURRENCIES.map((x) => ({ value: x.code, label: `${x.code} – ${x.name}` }))} />
              </Field>
            </div>
          </Panel>

          <Panel title="Building">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Building type">
                <Segmented<BuildingType>
                  ariaLabel="Building type"
                  value={i.buildingType}
                  onChange={(v) => setInput('buildingType', v)}
                  options={[{ value: 'residential', label: 'Residential' }, { value: 'commercial', label: 'Commercial' }, { value: 'hotel', label: 'Hotel' }, { value: 'mixed', label: 'Mixed-use' }]}
                />
              </Field>
              <div />
              <Field label="Above-ground floors" htmlFor="floors" error={err('floors')} hint="20 to 30 floors">
                <NumberInput id="floors" value={i.floors} onChange={(v) => setInput('floors', v as number)} min={LIMITS.floors.min} max={LIMITS.floors.max} invalid={!!err('floors')} suffix="floors" />
              </Field>
              <Field label="Basement floors" htmlFor="basements" error={err('basements')} hint="0 to 6 levels">
                <NumberInput id="basements" value={i.basements} onChange={(v) => setInput('basements', v as number)} min={0} max={6} invalid={!!err('basements')} suffix="levels" />
              </Field>
              <Field label="Total built-up area (incl. basements)" htmlFor="bua" error={err('builtUpArea')} hint={result ? `Typical floor plate ≈ ${num(result.geometry.plateArea)} m²` : undefined}>
                <NumberInput id="bua" value={i.builtUpArea} onChange={(v) => setInput('builtUpArea', v as number)} step={500} invalid={!!err('builtUpArea')} suffix="m²" />
              </Field>
              <Field label="Project duration" htmlFor="duration" error={err('durationMonths')} hint="Drives preliminaries, plant hire and escalation">
                <NumberInput id="duration" value={i.durationMonths} onChange={(v) => setInput('durationMonths', v as number)} min={12} max={60} invalid={!!err('durationMonths')} suffix="months" />
              </Field>
            </div>
          </Panel>

          <Panel title="Tender scope and quality">
            <div className="grid gap-5">
              <Field label="Tender to price">
                <Segmented<TenderScope>
                  ariaLabel="Tender scope"
                  value={i.scope}
                  onChange={(v) => setInput('scope', v)}
                  options={[{ value: 'construction', label: 'Construction' }, { value: 'electrical', label: 'Electrical' }, { value: 'both', label: 'Both' }]}
                />
              </Field>
              <div>
                <div className="mb-1.5 text-[13px] font-medium text-ink-soft">Lead quality specification</div>
                <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="Quality">
                  {(['high', 'medium', 'low'] as Quality[]).map((q) => (
                    <button
                      key={q}
                      role="radio"
                      aria-checked={i.quality === q}
                      onClick={() => setInput('quality', q)}
                      className={cx(
                        'rounded-lg border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rebar',
                        i.quality === q ? 'border-rebar bg-rebar-light/50 ring-1 ring-rebar' : 'border-concrete-300 hover:border-ink-mute',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-semibold text-ink">{QUALITY_META[q].label}</span>
                        {result && <span className="text-[12.5px] tabular-nums text-ink-mute">{money(result.scenarios[q].costPerM2, i.displayCurrency)}/m²</span>}
                      </div>
                      <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">{QUALITY_META[q].blurb}</p>
                    </button>
                  ))}
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-ink-mute"><ShieldCheck size={14} className="text-rebar" /> All three scenarios are always calculated. Safety-critical items never drop below Medium.</p>
              </div>
            </div>
          </Panel>

          <Panel title="Design parameters" subtitle={`Defaults for a ${TYPE_COEFFICIENTS[i.buildingType].label.toLowerCase()} building. Change them if the drawings say otherwise.`}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Floor-to-floor height" htmlFor="fh" error={err('floorHeight')}>
                <NumberInput id="fh" value={i.floorHeight} onChange={(v) => setInput('floorHeight', v as number)} step={0.1} invalid={!!err('floorHeight')} suffix="m" />
              </Field>
              <Field label="Basement level height" htmlFor="bh" error={err('basementHeight')}>
                <NumberInput id="bh" value={i.basementHeight} onChange={(v) => setInput('basementHeight', v as number)} step={0.1} invalid={!!err('basementHeight')} suffix="m" />
              </Field>
            </div>
          </Panel>

          <Panel title="Rate overrides (optional)" subtitle="Leave blank to use the illustrative country baseline. Item-level rates are edited in the rate library and BOQ.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={`All-in labour rate (${c.currency}/man-hour)`} htmlFor="lab" error={err('labourRateOverride')} hint={`Baseline ${num(c.labourUsdPerHour * c.fxPerUsd, 2)} ${c.currency}/h`}>
                <NumberInput id="lab" nullable value={i.labourRateOverride} onChange={(v) => setInput('labourRateOverride', v)} step={0.5} placeholder="Baseline" invalid={!!err('labourRateOverride')} />
              </Field>
              <Field label="Material price adjustment" htmlFor="mat" error={err('materialIndexPct')} hint="Applies to baseline material rates">
                <NumberInput id="mat" value={i.materialIndexPct} onChange={(v) => setInput('materialIndexPct', v as number)} step={1} invalid={!!err('materialIndexPct')} suffix="%" />
              </Field>
              <Field label="Equipment price adjustment" htmlFor="eq" error={err('equipmentIndexPct')} hint="Applies to baseline plant rates">
                <NumberInput id="eq" value={i.equipmentIndexPct} onChange={(v) => setInput('equipmentIndexPct', v as number)} step={1} invalid={!!err('equipmentIndexPct')} suffix="%" />
              </Field>
            </div>
          </Panel>

          <Panel title="Markups and tax">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Head-office overheads" htmlFor="oh" error={err('overheadPct')}>
                <NumberInput id="oh" value={i.overheadPct} onChange={(v) => setInput('overheadPct', v as number)} step={0.5} invalid={!!err('overheadPct')} suffix="%" />
              </Field>
              <Field label="Contractor profit" htmlFor="pr" error={err('profitPct')}>
                <NumberInput id="pr" value={i.profitPct} onChange={(v) => setInput('profitPct', v as number)} step={0.5} invalid={!!err('profitPct')} suffix="%" />
              </Field>
              <Field label="Contingency" htmlFor="ct" error={err('contingencyPct')} hint={i.contingencyMode === 'risk' && result ? `From risk register: ${result.riskContingencyPct.toFixed(2)} %` : undefined}>
                <div className="space-y-2">
                  <Segmented<'risk' | 'manual'> size="sm" ariaLabel="Contingency method" value={i.contingencyMode} onChange={(v) => setInput('contingencyMode', v)} options={[{ value: 'risk', label: 'Risk-based' }, { value: 'manual', label: 'Manual' }]} />
                  {i.contingencyMode === 'manual' && <NumberInput id="ct" value={i.contingencyPct} onChange={(v) => setInput('contingencyPct', v as number)} step={0.5} invalid={!!err('contingencyPct')} suffix="%" />}
                </div>
              </Field>
            </div>
            <div className="mt-5 flex flex-wrap gap-6">
              <Toggle checked={i.includeEscalation} onChange={(v) => setInput('includeEscalation', v)} label={`Price escalation (${(c.escalationPerYear * 100).toFixed(1)} %/yr to mid-point)`} />
              <Toggle checked={i.includeVat} onChange={(v) => setInput('includeVat', v)} label={c.vat > 0 ? `Include VAT at ${(c.vat * 100).toFixed(0)} %` : `VAT (not applicable in ${c.name})`} />
            </div>
          </Panel>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Panel title="What is being priced">
            {result ? (
              <>
                <Elevation inputs={i} geometry={result.geometry} className="mx-auto w-full max-w-[300px]" />
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-concrete-200 pt-4 text-[13px]">
                  <dt className="text-ink-mute">Above ground</dt><dd className="text-right tabular-nums">{num(result.geometry.aboveGroundArea)} m²</dd>
                  <dt className="text-ink-mute">Basements</dt><dd className="text-right tabular-nums">{num(result.geometry.basementArea)} m²</dd>
                  <dt className="text-ink-mute capitalize">{result.geometry.unitLabel}</dt><dd className="text-right tabular-nums">≈ {num(result.geometry.units)}</dd>
                  <dt className="text-ink-mute">Cooling load</dt><dd className="text-right tabular-nums">{num(result.geometry.coolingTR)} TR</dd>
                  <dt className="text-ink-mute">Electrical demand</dt><dd className="text-right tabular-nums">{num(result.geometry.demandKVA)} kVA</dd>
                </dl>
              </>
            ) : (
              <p className="text-sm text-ink-mute">Enter valid inputs to see the building.</p>
            )}
          </Panel>
          {result && (
            <div className="rounded-xl bg-ink p-5 text-white">
              <div className="text-[13px] text-concrete-300">{QUALITY_META[i.quality].label} tender</div>
              <div className="mt-1 text-[26px] font-semibold tabular-nums tracking-tight" style={{ fontStretch: '110%' }}>{money(result.scenarios[i.quality].recommendedTender, i.displayCurrency)}</div>
              <div className="mt-1 text-[13px] text-concrete-300 tabular-nums">{money(result.scenarios[i.quality].costPerM2, i.displayCurrency)} per m² {stale && '· last valid'}</div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
