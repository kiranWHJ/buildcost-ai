import type { Cell, Worksheet } from 'exceljs';
import type { EstimateResult, ModuleEstimate, Project, Quality } from '../types';
import { COUNTRIES } from '../data/countries';
import { ASSUMPTIONS, EXCLUSIONS, QUALITY_META, QUALITIES, TYPE_COEFFICIENTS } from '../data/defaults';
import { CATEGORIES, RATE_LIBRARY } from '../data/rateLibrary';
import { rateKey } from '../engine/estimate';
import { downloadBlob, slug } from '../store/storage';

const INK = 'FF16222C';
const CONCRETE = 'FFECEEEC';
const BRASS = 'FFF3EAD8';
const MONEY = '#,##0;[Red]-#,##0';
const RATE = '#,##0.00';
const QTY = '#,##0.00';

function headerRow(ws: Worksheet, values: string[], rowIdx?: number) {
  const row = rowIdx ? ws.getRow(rowIdx) : ws.addRow(values);
  if (rowIdx) row.values = values;
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };
    c.alignment = { vertical: 'middle', wrapText: true };
  });
  row.height = 22;
  return row;
}

function fill(c: Cell, argb: string) {
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function titleBlock(ws: Worksheet, title: string, project: Project, sub: string) {
  ws.addRow([title]).font = { bold: true, size: 15, color: { argb: INK } };
  ws.addRow([`${project.inputs.name} – ${project.inputs.city}, ${COUNTRIES[project.inputs.country].name}`]).font = { size: 11 };
  ws.addRow([sub]).font = { size: 10, italic: true, color: { argb: 'FF6B7780' } };
  ws.addRow([]);
}

/** Writes one BOQ sheet with live Excel formulas: Unit rate = Σ components, Amount = Qty × Unit rate. */
function boqSheet(wb: import('exceljs').Workbook, project: Project, m: ModuleEstimate, quality: Quality, cur: string, result: EstimateResult) {
  const name = m.module === 'construction' ? 'Construction BOQ' : 'Electrical BOQ';
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 5 }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } });
  titleBlock(ws, `${name} – ${QUALITY_META[quality].label}`, project, `All amounts in ${cur}. Edit Qty (col E) or rate components (cols F–I); Unit rate and Amount recalculate. Rates marked "Illustrative" are assumptions, not market prices.`);
  ws.columns = [
    { key: 'ref', width: 11 }, { key: 'desc', width: 52 }, { key: 'spec', width: 38 }, { key: 'unit', width: 9 },
    { key: 'qty', width: 13 }, { key: 'mat', width: 13 }, { key: 'lab', width: 13 }, { key: 'eqp', width: 13 }, { key: 'sub', width: 14 },
    { key: 'rate', width: 14 }, { key: 'amt', width: 17 }, { key: 'safe', width: 10 }, { key: 'src', width: 36 }, { key: 'date', width: 12 }, { key: 'basis', width: 60 },
  ];
  headerRow(ws, ['Ref', 'Description', 'Specification', 'Unit', 'Quantity', 'Material', 'Labour', 'Equipment', 'Subcontract', 'Unit rate', 'Amount', 'Safety', 'Rate source', 'Rate date', 'Quantity basis'], 5);

  const subtotalCells: string[] = [];
  const cats = CATEGORIES.filter((c) => c.module === m.module);
  cats.forEach((c, ci) => {
    const lines = m.lines.filter((l) => l.category === c.id);
    const h = ws.addRow([`${ci + 1}`, c.label]);
    h.font = { bold: true };
    h.eachCell({ includeEmpty: true }, (cell) => fill(cell, CONCRETE));
    for (let k = 1; k <= 15; k++) fill(h.getCell(k), CONCRETE);
    const first = ws.rowCount + 1;
    for (const l of lines) {
      const r = ws.addRow([l.id, l.description, l.spec, l.unit, l.qty, l.materialRate, l.labourRate, l.equipmentRate, l.subcontractRate, null, null, l.safetyCritical ? 'Yes' : '', `${l.provenance.kind === 'illustrative' ? 'Illustrative – ' : ''}${l.provenance.label}`, l.provenance.date, l.qtyEdited ? 'Entered by user' : l.qtyBasis]);
      const n = r.number;
      r.getCell(10).value = { formula: `SUM(F${n}:I${n})`, result: l.unitRate };
      r.getCell(11).value = { formula: `E${n}*J${n}`, result: l.amount };
      r.getCell(5).numFmt = QTY;
      [6, 7, 8, 9, 10].forEach((k) => (r.getCell(k).numFmt = RATE));
      r.getCell(11).numFmt = MONEY;
      r.getCell(2).alignment = { wrapText: true, vertical: 'top' };
      r.getCell(3).alignment = { wrapText: true, vertical: 'top' };
      r.getCell(15).alignment = { wrapText: true, vertical: 'top' };
      if (l.qtyEdited) fill(r.getCell(5), 'FFD7EBE9');
      if (l.rateEdited) fill(r.getCell(10), 'FFD7EBE9');
    }
    const last = ws.rowCount;
    const st = ws.addRow(['', `Subtotal – ${c.label}`]);
    st.font = { bold: true };
    st.getCell(11).value = { formula: `SUM(K${first}:K${last})`, result: lines.reduce((s, l) => s + l.amount, 0) };
    st.getCell(11).numFmt = MONEY;
    subtotalCells.push(`K${st.number}`);
    ws.addRow([]);
  });

  const direct = ws.addRow(['', 'TOTAL DIRECT COST']);
  direct.font = { bold: true, size: 12 };
  direct.getCell(11).value = { formula: subtotalCells.join('+'), result: m.direct.total };
  direct.getCell(11).numFmt = MONEY;
  for (let k = 1; k <= 15; k++) fill(direct.getCell(k), BRASS);
  const D = `K${direct.number}`;
  ws.addRow([]);

  // Indirect costs and markups – formulas reference the direct total
  headerRow(ws, ['', 'Indirect costs, markups and tax', 'Basis', '', 'Quantity', 'Rate', '', '', '', '', 'Amount']);
  const indFirst = ws.rowCount + 1;
  for (const x of m.indirect) {
    const pctLine = x.unit.includes('%');
    const r = ws.addRow(['', x.label, pctLine ? x.unit : x.basis, pctLine ? '' : x.unit, pctLine ? null : x.qty, x.rate]);
    const n = r.number;
    r.getCell(11).value = pctLine ? { formula: `${D}*F${n}`, result: x.amount } : { formula: `E${n}*F${n}`, result: x.amount };
    r.getCell(6).numFmt = pctLine ? '0.00%' : RATE;
    r.getCell(5).numFmt = QTY;
    r.getCell(11).numFmt = MONEY;
  }
  const indLast = ws.rowCount;
  const it = ws.addRow(['', 'Total indirect cost']);
  it.font = { bold: true };
  it.getCell(11).value = { formula: `SUM(K${indFirst}:K${indLast})`, result: m.indirectTotal };
  it.getCell(11).numFmt = MONEY;
  const I = `K${it.number}`;

  const i = project.inputs;
  const country = COUNTRIES[i.country];
  const escRate = i.includeEscalation ? country.escalationPerYear * (i.durationMonths / 12 / 2) : 0;
  const contPct = (m.contingency / Math.max(1, m.direct.total + m.indirectTotal + m.escalation));
  const add = (label: string, basis: string, rate: number | null, formula: string, res: number, bold = false) => {
    const r = ws.addRow(['', label, basis, '', null, rate]);
    if (rate !== null) r.getCell(6).numFmt = '0.00%';
    r.getCell(11).value = { formula: formula.replace(/#/g, String(r.number)), result: res };
    r.getCell(11).numFmt = MONEY;
    if (bold) r.font = { bold: true };
    return `K${r.number}`;
  };
  const E = add('Price escalation', 'Direct × rate (to mid-point)', escRate, `${D}*F#`, m.escalation);
  const OH = add('Head-office overheads', '% of direct + indirect + escalation', i.overheadPct / 100, `(${D}+${I}+${E})*F#`, m.overhead);
  const C = add('Contingency', i.contingencyMode === 'risk' ? 'Risk register (Σ probability × impact)' : 'Manual', contPct, `(${D}+${I}+${E})*F#`, m.contingency);
  const P = add('Contractor profit', '% of cost incl. overheads & contingency', i.profitPct / 100, `(${D}+${I}+${E}+${OH}+${C})*F#`, m.profit);
  const NET = add('Tender before tax', '', null, `${D}+${I}+${E}+${OH}+${C}+${P}`, m.netBeforeTax, true);
  const VAT = add('VAT', country.vatNote, i.includeVat ? country.vat : 0, `${NET}*F#`, m.vat);
  const tot = add(`FINAL ${m.module.toUpperCase()} TENDER (${cur})`, '', null, `${NET}+${VAT}`, m.total, true);
  const tr = ws.getRow(Number(tot.slice(1)));
  tr.font = { bold: true, size: 12 };
  for (let k = 1; k <= 15; k++) fill(tr.getCell(k), BRASS);
  void result;
}

export async function exportExcel(project: Project, result: EstimateResult): Promise<boolean> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BuildCost AI';
  wb.created = new Date();
  const i = project.inputs;
  const cur = i.displayCurrency;
  const country = COUNTRIES[i.country];
  const q = i.quality;
  const s = result.scenarios[q];

  // ── Summary ────────────────────────────────────────────────────────────
  const sum = wb.addWorksheet('Summary', { pageSetup: { paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  sum.columns = [{ width: 36 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 22 }];
  titleBlock(sum, 'BuildCost AI – Tender estimate', project, `Generated ${new Date().toISOString().slice(0, 10)} · Amounts in ${cur} · Illustrative rates unless marked "User"`);
  const info: [string, string | number][] = [
    ['Client', i.client], ['Country / city', `${country.name} / ${i.city}`], ['Building type', TYPE_COEFFICIENTS[i.buildingType].label],
    ['Floors / basements', `${i.floors} / ${i.basements}`], ['Built-up area (m²)', i.builtUpArea], ['Duration (months)', i.durationMonths],
    ['Tender scope', i.scope === 'both' ? 'Construction + electrical' : i.scope], ['Lead quality', QUALITY_META[q].label],
    ['Recommended tender price', s.recommendedTender], ['Cost per m²', s.costPerM2],
  ];
  for (const [k, v] of info) {
    const r = sum.addRow([k, v]);
    r.getCell(1).font = { color: { argb: 'FF6B7780' } };
    if (typeof v === 'number') r.getCell(2).numFmt = MONEY;
  }
  sum.getRow(sum.rowCount - 1).font = { bold: true, size: 13 };
  sum.addRow([]);
  headerRow(sum, ['Scenario comparison', ...QUALITIES.map((x) => QUALITY_META[x].label)]);
  const rows: [string, (x: Quality) => number][] = [
    ['Construction tender', (x) => result.scenarios[x].construction?.total ?? 0],
    ['Electrical tender', (x) => result.scenarios[x].electrical?.total ?? 0],
    ['Direct cost', (x) => result.scenarios[x].direct.total],
    ['  Material', (x) => result.scenarios[x].direct.material],
    ['  Labour', (x) => result.scenarios[x].direct.labour],
    ['  Equipment', (x) => result.scenarios[x].direct.equipment],
    ['  Subcontract', (x) => result.scenarios[x].direct.subcontract],
    ['Indirect cost', (x) => result.scenarios[x].indirect],
    ['Escalation', (x) => result.scenarios[x].escalation],
    ['Overheads', (x) => result.scenarios[x].overhead],
    ['Contingency', (x) => result.scenarios[x].contingency],
    ['Profit', (x) => result.scenarios[x].profit],
    ['VAT', (x) => result.scenarios[x].vat],
    ['Final tender quotation', (x) => result.scenarios[x].total],
    ['Cost per m²', (x) => result.scenarios[x].costPerM2],
    ['Recommended tender (rounded)', (x) => result.scenarios[x].recommendedTender],
  ];
  for (const [label, f] of rows) {
    const r = sum.addRow([label, ...QUALITIES.map(f)]);
    [2, 3, 4].forEach((k) => (r.getCell(k).numFmt = MONEY));
    if (label === 'Final tender quotation' || label.startsWith('Recommended')) r.font = { bold: true };
  }
  sum.addRow([]);
  sum.addRow(['Rates are illustrative assumptions unless marked as user rates. Verify all rates with suppliers and subcontractors before submitting a tender.']).font = { italic: true, color: { argb: 'FFA87A2C' } };

  // ── BOQ sheets ─────────────────────────────────────────────────────────
  if (s.construction) boqSheet(wb, project, s.construction, q, cur, result);
  if (s.electrical) boqSheet(wb, project, s.electrical, q, cur, result);

  // ── Scenario comparison by section ─────────────────────────────────────
  const cmp = wb.addWorksheet('Scenario comparison');
  cmp.columns = [{ width: 40 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 14 }];
  titleBlock(cmp, 'Direct cost by work section and quality', project, `Amounts in ${cur}`);
  headerRow(cmp, ['Work section', 'High', 'Medium', 'Low', 'High vs low']);
  const mods = [s.construction, s.electrical].filter(Boolean) as ModuleEstimate[];
  for (const mm of mods) {
    const h = cmp.addRow([mm.module === 'construction' ? 'CONSTRUCTION' : 'ELECTRICAL']);
    h.font = { bold: true };
    for (const c of mm.byCategory) {
      const vals = QUALITIES.map((x) => (mm.module === 'construction' ? result.scenarios[x].construction : result.scenarios[x].electrical)!.byCategory.find((b) => b.category === c.category)!.amount);
      const r = cmp.addRow([c.label, ...vals]);
      const n = r.number;
      r.getCell(5).value = { formula: `IF(D${n}=0,0,B${n}/D${n}-1)`, result: vals[2] ? vals[0] / vals[2] - 1 : 0 };
      [2, 3, 4].forEach((k) => (r.getCell(k).numFmt = MONEY));
      r.getCell(5).numFmt = '0%';
    }
  }

  // ── Rate library ───────────────────────────────────────────────────────
  const rl = wb.addWorksheet('Rate library');
  rl.columns = [{ width: 11 }, { width: 50 }, { width: 9 }, { width: 13 }, { width: 11 }, { width: 13 }, { width: 14 }, { width: 18 }, { width: 10 }, { width: 38 }, { width: 12 }];
  titleBlock(rl, `Rate library – ${country.name} (${country.currency}, medium specification)`, project, `FX ${country.fxPerUsd} ${country.currency}/USD (${country.fxNote}); location factor ${country.locationFactor}; labour ${(country.labourUsdPerHour * country.fxPerUsd).toFixed(2)} ${country.currency}/h`);
  headerRow(rl, ['Ref', 'Description', 'Unit', 'Material', 'Labour h', 'Equipment', 'Subcontract', 'Quality factors L/M/H', 'Safety', 'Source', 'Date']);
  for (const r of RATE_LIBRARY) {
    const ov = project.rateOverrides[rateKey(i.country, r.id)];
    const k = country.fxPerUsd * country.locationFactor;
    const row = rl.addRow([
      r.id, r.description, r.unit,
      ov?.material ?? r.material * k * (1 + i.materialIndexPct / 100),
      ov?.labourHours ?? r.labourHours,
      ov?.equipment ?? r.equipment * k * (1 + i.equipmentIndexPct / 100),
      ov?.subcontract ?? r.subcontract * k,
      r.qualityFactor.join(' / '), r.safetyCritical ? 'Yes' : '',
      ov ? `User – ${ov.source}` : 'Illustrative – BuildCost AI Gulf baseline v1', ov?.date ?? '2026-11-20',
    ]);
    [4, 6, 7].forEach((c) => (row.getCell(c).numFmt = RATE));
    row.getCell(5).numFmt = '0.000';
    if (ov) fill(row.getCell(10), 'FFD7EBE9');
  }

  // ── Risk register ──────────────────────────────────────────────────────
  const rk = wb.addWorksheet('Risk register');
  rk.columns = [{ width: 8 }, { width: 34 }, { width: 60 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 60 }];
  titleBlock(rk, 'Risk register and contingency', project, i.contingencyMode === 'risk' ? 'Contingency = Σ probability × impact for enabled risks' : `Manual contingency ${i.contingencyPct}%`);
  headerRow(rk, ['Include', 'Risk', 'Description', 'Applies to', 'Probability', 'Impact', 'Expected', 'Mitigation']);
  for (const r of project.risks) {
    const row = rk.addRow([r.enabled ? 'Yes' : 'No', r.title, r.description, r.module, r.probability, r.impactPct / 100, null, r.mitigation]);
    const n = row.number;
    row.getCell(7).value = { formula: `IF(A${n}="Yes",E${n}*F${n},0)`, result: r.enabled ? (r.probability * r.impactPct) / 100 : 0 };
    [5, 6].forEach((c) => (row.getCell(c).numFmt = '0%'));
    row.getCell(7).numFmt = '0.00%';
    row.getCell(3).alignment = { wrapText: true, vertical: 'top' };
    row.getCell(8).alignment = { wrapText: true, vertical: 'top' };
  }

  // ── Assumptions ────────────────────────────────────────────────────────
  const as = wb.addWorksheet('Assumptions');
  as.columns = [{ width: 130 }];
  titleBlock(as, 'Assumptions and exclusions', project, '');
  as.addRow(['ASSUMPTIONS']).font = { bold: true };
  ASSUMPTIONS.forEach((a) => (as.addRow([`• ${a}`]).getCell(1).alignment = { wrapText: true }));
  as.addRow([]);
  as.addRow(['EXCLUSIONS']).font = { bold: true };
  EXCLUSIONS.forEach((a) => (as.addRow([`• ${a}`]).getCell(1).alignment = { wrapText: true }));
  as.addRow([]);
  as.addRow(['WARNINGS']).font = { bold: true };
  result.warnings.forEach((a) => (as.addRow([`• ${a}`]).getCell(1).alignment = { wrapText: true }));

  const buf = await wb.xlsx.writeBuffer();
  return downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${slug(i.name)}-BOQ-${q}.xlsx`);
}
