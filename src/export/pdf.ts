import type { EstimateResult, ModuleEstimate, Project, Quality } from '../types';
import { COUNTRIES } from '../data/countries';
import { ASSUMPTIONS, EXCLUSIONS, QUALITY_META, QUALITIES, TYPE_COEFFICIENTS } from '../data/defaults';
import { CATEGORIES } from '../data/rateLibrary';
import { downloadBlob, slug } from '../store/storage';

/** jsPDF's built-in Helvetica covers Latin-1 only; map the few typographic characters we use. */
const clean = (s: string) =>
  s
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/≈/g, '~')
    .replace(/→/g, '->')
    .replace(/Σ/g, 'sum')
    .replace(/≥/g, '>=')
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .replace(/[^\x00-\xFF]/g, '');

const n0 = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 0 });
const n2 = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const INK: [number, number, number] = [22, 34, 44];
const MUTE: [number, number, number] = [107, 119, 128];
const BRASS: [number, number, number] = [168, 122, 44];
const CONCRETE: [number, number, number] = [236, 238, 236];

export async function exportPdf(project: Project, result: EstimateResult): Promise<boolean> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;
  const i = project.inputs;
  const cur = i.displayCurrency;
  const country = COUNTRIES[i.country];
  const q = i.quality;
  const s = result.scenarios[q];
  const date = new Date().toISOString().slice(0, 10);
  const ref = `BC-${project.id.replace('P-', '')}-${date.replace(/-/g, '')}`;
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  const baseTable = {
    margin: { left: M, right: M, top: 22, bottom: 18 },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.6, textColor: INK, lineColor: [221, 225, 222] as [number, number, number], lineWidth: 0.1 },
    headStyles: { fillColor: INK, textColor: 255, fontStyle: 'bold' as const, fontSize: 8.5 },
    alternateRowStyles: { fillColor: [248, 249, 248] as [number, number, number] },
  };

  const section = (title: string, y?: number) => {
    let yy = y ?? lastY() + 10;
    if (yy > H - 40) { doc.addPage(); yy = 26; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...INK);
    doc.text(clean(title), M, yy);
    doc.setDrawColor(...BRASS);
    doc.setLineWidth(0.6);
    doc.line(M, yy + 1.8, M + 18, yy + 1.8);
    return yy + 5;
  };

  // ── Cover band ──────────────────────────────────────────────────────────
  doc.setFillColor(...INK);
  doc.rect(0, 0, W, 62, 'F');
  doc.setTextColor(201, 154, 74);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('BUILDCOST AI  |  TENDER ESTIMATE', M, 14);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text(clean(i.name), M, 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(221, 225, 222);
  doc.text(clean(`${TYPE_COEFFICIENTS[i.buildingType].label} | ${i.floors} floors + ${i.basements} basements | ${n0(i.builtUpArea)} m2 BUA | ${i.city}, ${country.name}`), M, 36);
  doc.text(clean(`Client: ${i.client}   |   Ref: ${ref}   |   Date: ${date}   |   Programme: ${i.durationMonths} months`), M, 42);
  doc.setFontSize(9);
  doc.text(clean(`Scope: ${i.scope === 'both' ? 'Construction and electrical tenders' : i.scope === 'construction' ? 'Construction tender' : 'Electrical tender'}   |   Lead specification: ${QUALITY_META[q].label}`), M, 50);

  // Key figure box
  doc.setFillColor(...CONCRETE);
  doc.roundedRect(M, 70, W - 2 * M, 30, 2, 2, 'F');
  doc.setTextColor(...MUTE);
  doc.setFontSize(9);
  doc.text('Recommended tender price', M + 6, 79);
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(`${cur} ${n0(s.recommendedTender)}`, M + 6, 91);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTE);
  doc.text(clean(`${i.includeVat && s.vat > 0 ? `Incl. ${(country.vat * 100).toFixed(0)}% VAT` : 'Excl. VAT'} | rounded up from ${cur} ${n0(s.total)}`), M + 6, 96.5);
  const kx = W / 2 + 10;
  const kv: [string, string][] = [
    ['Construction', s.construction ? `${cur} ${n0(s.construction.total)}` : 'Not in scope'],
    ['Electrical', s.electrical ? `${cur} ${n0(s.electrical.total)}` : 'Not in scope'],
    ['Cost per m2', `${cur} ${n0(s.costPerM2)}`],
  ];
  kv.forEach(([k, v], idx) => {
    doc.setTextColor(...MUTE);
    doc.text(k, kx, 79 + idx * 7);
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'bold');
    doc.text(v, W - M - 6, 79 + idx * 7, { align: 'right' });
    doc.setFont('helvetica', 'normal');
  });

  // ── Scenario comparison ────────────────────────────────────────────────
  let y = section('Quality scenario comparison', 112);
  autoTable(doc, {
    ...baseTable,
    startY: y,
    head: [['', ...QUALITIES.map((x) => QUALITY_META[x].label + (x === q ? ' (lead)' : ''))]],
    body: [
      ['Construction tender', ...QUALITIES.map((x) => n0(result.scenarios[x].construction?.total ?? 0))],
      ['Electrical tender', ...QUALITIES.map((x) => n0(result.scenarios[x].electrical?.total ?? 0))],
      ['Direct cost', ...QUALITIES.map((x) => n0(result.scenarios[x].direct.total))],
      ['Final tender quotation', ...QUALITIES.map((x) => n0(result.scenarios[x].total))],
      [`Cost per m2 (${cur})`, ...QUALITIES.map((x) => n0(result.scenarios[x].costPerM2))],
      ['Recommended tender (rounded)', ...QUALITIES.map((x) => n0(result.scenarios[x].recommendedTender))],
    ],
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    didParseCell: (d) => { if (d.section === 'body' && d.row.index >= 3 && d.row.index !== 4) d.cell.styles.fontStyle = 'bold'; },
  });
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTE);
  doc.text(clean(`Amounts in ${cur}. Low scenario never downgrades structural, fire or electrical safety items below the Medium specification.`), M, lastY() + 4);

  // ── Cost summary ───────────────────────────────────────────────────────
  const mods = [s.construction, s.electrical].filter(Boolean) as ModuleEstimate[];
  y = section(`Cost summary - ${QUALITY_META[q].label} (${cur})`, lastY() + 12);
  const sumRows: [string, (m: ModuleEstimate) => number][] = [
    ['Material', (m) => m.direct.material], ['Labour', (m) => m.direct.labour], ['Equipment', (m) => m.direct.equipment], ['Subcontract', (m) => m.direct.subcontract],
    ['Direct cost', (m) => m.direct.total], ['Indirect cost (preliminaries)', (m) => m.indirectTotal], ['Price escalation', (m) => m.escalation],
    [`Overheads (${i.overheadPct}%)`, (m) => m.overhead], [i.contingencyMode === 'risk' ? 'Contingency (risk register)' : `Contingency (${i.contingencyPct}%)`, (m) => m.contingency], [`Profit (${i.profitPct}%)`, (m) => m.profit],
    ['Tender before tax', (m) => m.netBeforeTax], [`VAT (${i.includeVat ? (country.vat * 100).toFixed(0) : 0}%)`, (m) => m.vat], ['Final tender quotation', (m) => m.total],
  ];
  autoTable(doc, {
    ...baseTable,
    startY: y,
    head: [['Cost element', ...mods.map((m) => (m.module === 'construction' ? 'Construction' : 'Electrical')), ...(mods.length > 1 ? ['Combined'] : [])]],
    body: sumRows.map(([k, f]) => [k, ...mods.map((m) => n0(f(m))), ...(mods.length > 1 ? [n0(mods.reduce((a, m) => a + f(m), 0))] : [])]),
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    didParseCell: (d) => {
      if (d.section !== 'body') return;
      const label = String((d.row.raw as string[])[0]);
      if (['Direct cost', 'Tender before tax', 'Final tender quotation'].includes(label)) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = CONCRETE; }
      if (d.row.index < 4 && d.column.index === 0) d.cell.styles.cellPadding = { left: 6, top: 1.6, bottom: 1.6, right: 1.6 };
    },
  });

  // ── Section summary per module ────────────────────────────────────────
  for (const m of mods) {
    y = section(`${m.module === 'construction' ? 'Construction' : 'Electrical'} - direct cost by work section`);
    autoTable(doc, {
      ...baseTable,
      startY: y,
      head: [['#', 'Work section', `Amount (${cur})`, 'Share']],
      body: m.byCategory.map((c, k) => [String(k + 1), clean(c.label), n0(c.amount), `${((c.amount / m.direct.total) * 100).toFixed(1)}%`]).concat([['', 'Total direct cost', n0(m.direct.total), '100%']]),
      columnStyles: { 0: { cellWidth: 8 }, 2: { halign: 'right' }, 3: { halign: 'right', cellWidth: 18 } },
      didParseCell: (d) => { if (d.section === 'body' && d.row.index === m.byCategory.length) d.cell.styles.fontStyle = 'bold'; },
    });
  }

  // ── Detailed BOQ ───────────────────────────────────────────────────────
  for (const m of mods) {
    doc.addPage();
    y = section(`${m.module === 'construction' ? 'Construction' : 'Electrical'} bill of quantities - ${QUALITY_META[q].label}`, 26);
    const body: (string | { content: string; colSpan?: number; styles?: object })[][] = [];
    CATEGORIES.filter((c) => c.module === m.module).forEach((c, ci) => {
      const lines = m.lines.filter((l) => l.category === c.id);
      body.push([{ content: `${ci + 1}. ${clean(c.label)}`, colSpan: 6, styles: { fontStyle: 'bold', fillColor: CONCRETE } }]);
      for (const l of lines) {
        body.push([
          l.id,
          clean(`${l.safetyCritical ? '[S] ' : ''}${l.description}\n${l.spec}`),
          clean(l.unit),
          l.qty % 1 === 0 ? n0(l.qty) : n2(l.qty),
          n2(l.unitRate),
          n0(l.amount),
        ]);
      }
      body.push(['', { content: `Subtotal - ${clean(c.label)}`, styles: { fontStyle: 'bold' } }, '', '', '', { content: n0(lines.reduce((a, l) => a + l.amount, 0)), styles: { fontStyle: 'bold' } }]);
    });
    body.push(['', { content: 'TOTAL DIRECT COST', styles: { fontStyle: 'bold' } }, '', '', '', { content: n0(m.direct.total), styles: { fontStyle: 'bold' } }]);
    autoTable(doc, {
      ...baseTable,
      startY: y,
      head: [['Ref', 'Description / specification', 'Unit', 'Qty', `Rate (${cur})`, `Amount (${cur})`]],
      body,
      styles: { ...baseTable.styles, fontSize: 7.6 },
      columnStyles: { 0: { cellWidth: 16, textColor: MUTE }, 2: { cellWidth: 14 }, 3: { halign: 'right', cellWidth: 20 }, 4: { halign: 'right', cellWidth: 24 }, 5: { halign: 'right', cellWidth: 28 } },
    });
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTE);
    doc.text('[S] = safety-critical item, never downgraded in the Low scenario.', M, lastY() + 4);

    y = section('Indirect costs, markups and tax', lastY() + 12);
    autoTable(doc, {
      ...baseTable,
      startY: y,
      head: [['Item', 'Basis', `Amount (${cur})`]],
      body: [
        ...m.indirect.map((x) => [clean(x.label), clean(x.unit.includes('%') ? x.unit : `${n0(x.qty)} ${x.unit} x ${n2(x.rate)}`), n0(x.amount)]),
        ['Total indirect cost', '', n0(m.indirectTotal)],
        ['Price escalation', `${(country.escalationPerYear * 100).toFixed(1)}%/yr to mid-point`, n0(m.escalation)],
        ['Head-office overheads', `${i.overheadPct}%`, n0(m.overhead)],
        ['Contingency', i.contingencyMode === 'risk' ? 'Risk register' : `${i.contingencyPct}% manual`, n0(m.contingency)],
        ['Contractor profit', `${i.profitPct}%`, n0(m.profit)],
        ['VAT', clean(country.vatNote), n0(m.vat)],
        [`Final ${m.module} tender`, '', n0(m.total)],
      ],
      columnStyles: { 2: { halign: 'right' } },
      didParseCell: (d) => {
        if (d.section !== 'body') return;
        const label = String((d.row.raw as string[])[0]);
        if (label.startsWith('Total') || label.startsWith('Final')) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = CONCRETE; }
      },
    });
  }

  // ── Risk register ──────────────────────────────────────────────────────
  doc.addPage();
  y = section('Risk and contingency', 26);
  autoTable(doc, {
    ...baseTable,
    startY: y,
    head: [['Risk', 'Applies to', 'Prob.', 'Impact', 'Expected', 'Mitigation']],
    body: project.risks.filter((r) => r.enabled).map((r) => [clean(`${r.title}\n${r.description}`), r.module, `${(r.probability * 100).toFixed(0)}%`, `${r.impactPct}%`, `${(r.probability * r.impactPct).toFixed(2)}%`, clean(r.mitigation)]),
    columnStyles: { 0: { cellWidth: 62 }, 1: { cellWidth: 20 }, 2: { halign: 'right', cellWidth: 13 }, 3: { halign: 'right', cellWidth: 14 }, 4: { halign: 'right', cellWidth: 17 } },
    styles: { ...baseTable.styles, fontSize: 7.6 },
  });
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  doc.text(clean(`Effective contingency: ${result.contingencyPct.toFixed(2)}% (${i.contingencyMode === 'risk' ? 'sum of probability x impact' : 'manual'}) = ${cur} ${n0(s.contingency)} on the ${q} scenario.`), M, lastY() + 6);

  // ── Assumptions & exclusions ──────────────────────────────────────────
  const bullets = (title: string, items: string[], start: number) => {
    let yy = section(title, start);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.6);
    doc.setTextColor(...INK);
    for (const a of items) {
      const lines = doc.splitTextToSize(clean(a), W - 2 * M - 5);
      if (yy + lines.length * 4 > H - 20) { doc.addPage(); yy = 26; }
      doc.text('-', M, yy);
      doc.text(lines, M + 4, yy);
      yy += lines.length * 4 + 1.6;
    }
    return yy;
  };
  let yy = bullets('Assumptions', ASSUMPTIONS, lastY() + 16);
  yy = bullets('Exclusions', EXCLUSIONS, yy + 8);
  yy = bullets('Important notes', result.warnings, yy + 8);

  // ── Footer on every page ──────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTE);
    if (p > 1) {
      doc.text(clean(`${i.name} | ${ref}`), M, 12);
      doc.text(clean(QUALITY_META[q].label), W - M, 12, { align: 'right' });
      doc.setDrawColor(221, 225, 222);
      doc.line(M, 14, W - M, 14);
    }
    doc.text(clean('Prepared with BuildCost AI. Unit rates are illustrative assumptions unless marked as user rates; verify before submission.'), M, H - 8);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 8, { align: 'right' });
  }
  void yy;

  return downloadBlob(doc.output('blob'), `${slug(i.name)}-tender-estimate-${q}.pdf`);
}

export type { Quality };
