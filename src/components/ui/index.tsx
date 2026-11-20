import { useEffect, useId, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { ShieldCheck, FlaskConical, BadgeCheck, Landmark, BarChart3 } from 'lucide-react';
import type { Provenance } from '../../types';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

// ── Layout ──────────────────────────────────────────────────────────────────

export function Panel({ title, subtitle, actions, children, className, bodyClass }: {
  title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string;
}) {
  return (
    <section className={cx('rounded-xl border border-concrete-200 bg-white shadow-sheet', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-concrete-200 px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-ink-mute">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx('p-5', bodyClass)}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, lead, actions }: { title: string; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]" style={{ fontStretch: '112%' }}>{title}</h1>
        {lead && <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// ── Buttons ─────────────────────────────────────────────────────────────────

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'brass';
export function Button({ variant = 'secondary', size = 'md', icon, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant; size?: 'sm' | 'md'; icon?: ReactNode;
}) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-rebar text-white hover:bg-rebar-dark border-transparent',
    brass: 'bg-ink text-white hover:bg-ink-soft border-transparent',
    secondary: 'bg-white text-ink border-concrete-300 hover:border-ink-mute hover:bg-concrete-50',
    ghost: 'bg-transparent text-ink-soft border-transparent hover:bg-concrete-100 hover:text-ink',
    danger: 'bg-white text-status-critical border-concrete-300 hover:border-status-critical hover:bg-red-50',
  };
  const s = size === 'sm' ? 'h-8 px-2.5 text-[13px] gap-1.5' : 'h-10 px-3.5 text-sm gap-2';
  return (
    <button
      className={cx('inline-flex items-center justify-center whitespace-nowrap rounded-lg border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rebar focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', v[variant], s, className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

// ── Form fields ─────────────────────────────────────────────────────────────

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-ink-soft">{label}</label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[12.5px] font-medium text-status-critical" role="alert">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12.5px] text-ink-mute">{hint}</p>
      ) : null}
    </div>
  );
}

const inputBase =
  'w-full rounded-lg border bg-white px-3 text-[14px] text-ink tabular-nums transition-colors placeholder:text-concrete-300 focus:outline-none focus:ring-2 focus:ring-rebar/30';

export function NumberInput({ value, onChange, min, max, step = 1, suffix, invalid, nullable, placeholder, id, className, ariaLabel }: {
  value: number | null; onChange: (v: number | null) => void; min?: number; max?: number; step?: number; suffix?: string;
  invalid?: boolean; nullable?: boolean; placeholder?: string; id?: string; className?: string; ariaLabel?: string;
}) {
  const [text, setText] = useState(value === null || Number.isNaN(value) ? '' : String(value));
  useEffect(() => {
    const parsed = text.trim() === '' ? null : Number(text);
    if (parsed !== value && !(Number.isNaN(value as number) && text === '')) {
      setText(value === null || Number.isNaN(value) ? '' : String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className={cx('relative', className)}>
      <input
        id={id}
        aria-label={ariaLabel}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        value={text}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value.trim() === '') onChange(nullable ? null : NaN);
          else {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }
        }}
        className={cx(inputBase, 'h-10', suffix && 'pr-14', invalid ? 'border-status-critical' : 'border-concrete-300 focus:border-rebar')}
      />
      {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[12.5px] text-ink-mute">{suffix}</span>}
    </div>
  );
}

export function TextInput({ value, onChange, invalid, id, list, placeholder }: { value: string; onChange: (v: string) => void; invalid?: boolean; id?: string; list?: string; placeholder?: string }) {
  return (
    <input
      id={id}
      list={list}
      value={value}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange(e.target.value)}
      className={cx(inputBase, 'h-10', invalid ? 'border-status-critical' : 'border-concrete-300 focus:border-rebar')}
    />
  );
}

export function Select<T extends string>({ value, onChange, options, id }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; id?: string }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cx(inputBase, 'h-10 cursor-pointer appearance-none border-concrete-300 bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9 focus:border-rebar')}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7780' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function Segmented<T extends string>({ value, onChange, options, size = 'md', ariaLabel }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; size?: 'sm' | 'md'; ariaLabel?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex max-w-full flex-wrap rounded-lg border border-concrete-300 bg-concrete-50 p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rebar',
              size === 'sm' ? 'px-2.5 py-1 text-[12.5px]' : 'px-3.5 py-1.5 text-[13.5px]',
              active ? 'bg-white text-ink shadow-sm ring-1 ring-concrete-300' : 'text-ink-mute hover:text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; id?: string }) {
  const autoId = useId();
  const tid = id ?? autoId;
  return (
    <label htmlFor={tid} className="flex cursor-pointer items-center gap-3 text-[13.5px] text-ink-soft">
      <span className="relative inline-flex h-5 w-9 shrink-0">
        <input id={tid} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="absolute inset-0 rounded-full bg-concrete-300 transition-colors peer-checked:bg-rebar peer-focus-visible:ring-2 peer-focus-visible:ring-rebar peer-focus-visible:ring-offset-2" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
      {label}
    </label>
  );
}

// ── Badges ──────────────────────────────────────────────────────────────────

export function Badge({ tone = 'neutral', children, icon, title }: { tone?: 'neutral' | 'teal' | 'brass' | 'warn' | 'critical' | 'good'; children: ReactNode; icon?: ReactNode; title?: string }) {
  const t = {
    neutral: 'bg-concrete-100 text-ink-soft ring-concrete-200',
    teal: 'bg-rebar-light text-rebar-dark ring-rebar/20',
    brass: 'bg-brass-light text-brass-dark ring-brass/25',
    warn: 'bg-amber-50 text-amber-800 ring-amber-200',
    critical: 'bg-red-50 text-red-800 ring-red-200',
    good: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  }[tone];
  return (
    <span title={title} className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11.5px] font-medium ring-1 ring-inset', t)}>
      {icon}
      {children}
    </span>
  );
}

export function ProvenanceBadge({ p, compact }: { p: Provenance; compact?: boolean }) {
  const map = {
    illustrative: { tone: 'warn' as const, icon: <FlaskConical size={12} aria-hidden />, text: 'Illustrative' },
    user: { tone: 'teal' as const, icon: <BadgeCheck size={12} aria-hidden />, text: 'User rate' },
    benchmark: { tone: 'brass' as const, icon: <BarChart3 size={12} aria-hidden />, text: 'Benchmark' },
    statutory: { tone: 'neutral' as const, icon: <Landmark size={12} aria-hidden />, text: 'Statutory' },
  }[p.kind];
  return (
    <Badge tone={map.tone} icon={map.icon} title={`${p.label} · ${p.date}`}>
      {compact ? map.text : `${map.text} · ${p.date}`}
    </Badge>
  );
}

export function SafetyMark({ applied }: { applied?: boolean }) {
  return (
    <span
      className="inline-flex text-rebar"
      title={applied ? 'Safety-critical: Low scenario held at the Medium specification' : 'Safety-critical item – cannot be downgraded in the Low scenario'}
    >
      <ShieldCheck size={15} aria-label="Safety-critical" />
    </span>
  );
}

export function Notice({ tone = 'warn', icon, children }: { tone?: 'warn' | 'info' | 'critical'; icon?: ReactNode; children: ReactNode }) {
  const t = {
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    info: 'border-rebar/20 bg-rebar-light/60 text-rebar-dark',
    critical: 'border-red-200 bg-red-50 text-red-900',
  }[tone];
  return <div className={cx('flex gap-3 rounded-lg border px-4 py-3 text-[13.5px] leading-relaxed', t)}>{icon && <span className="mt-0.5 shrink-0">{icon}</span>}<div className="min-w-0">{children}</div></div>;
}
