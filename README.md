# BuildCost AI – High-Rise Construction Tender Estimator

A browser-based estimating tool for contractors pricing **construction and electrical tenders for 20–30 floor buildings in the GCC** (UAE, Saudi Arabia, Qatar, Oman, Kuwait, Bahrain).

It is built around a **transparent quantity-surveying engine**: every number on screen comes from
`Quantity × Unit rate = Amount`, built up from material, labour, equipment and subcontract components,
then marked up with preliminaries, escalation, overheads, contingency, profit and VAT. No random numbers,
no hard-coded final prices.

> **Important:** the bundled unit rates are **illustrative assumptions**, calibrated to published 2025
> benchmarks for sanity, not market prices. Every rate is labelled with its source and date. Replace them
> with supplier and subcontractor quotations in the **Rate library** before submitting a tender.

---

## Features

| Area | What it does |
|---|---|
| **Project inputs** | Country, city, currency (AED, SAR, QAR, OMR, KWD, BHD, USD), building type, floors (20–30), basements (0–6), built-up area, duration, tender scope (construction / electrical / both), quality, design parameters, labour-rate and material/equipment price overrides, markups. Validated live with field-level messages. |
| **Construction module** | 52 BOQ items across excavation & foundations, structural frame, masonry & plaster, flooring & tiling, painting & finishing, doors/windows/façade, waterproofing, elevators, HVAC & plumbing, firefighting, and labour/machinery/equipment. |
| **Electrical module** | 42 BOQ items across cables & wiring, distribution boards, transformers & generators, lighting, switches & sockets, trays & conduits, earthing & lightning protection, emergency lighting, fire alarm, CCTV & access control, testing & commissioning. |
| **Three quality scenarios** | High, Medium and Low are always calculated. Low **never** downgrades structural, fire or electrical safety-critical items (they are held at the Medium specification, and a user edit that tries to undercut them is clamped). |
| **Dashboard** | Recommended tender price, construction/electrical/combined totals, cost per m², scenario range, live elevation drawing, scenario comparison chart, direct-to-tender waterfall, material/labour/equipment composition, cost by work section, cost summary table, largest BOQ items. |
| **BOQ editor** | Click any quantity or unit rate to replace it with a measured take-off or a quote; expand a line to see its rate build-up, quantity basis and rate source. Indirect costs and markups shown line by line. |
| **Rate library** | Country factors (FX, VAT, location factor, labour rate, escalation) and every medium-spec rate in local currency, editable, with source text and date. Edited rates are marked *User rate*. |
| **Risk & contingency** | Editable risk register (probability × impact). Contingency is the sum of expected values per module, or a manual %. |
| **Compare scenarios** | Side-by-side cost by work section and markup, delta vs medium, spec differences per tier. |
| **Exports** | **Excel BOQ** with live formulas (unit rate = Σ components, amount = qty × rate, subtotals, markups, VAT) plus summary, scenario comparison, rate library, risk register and assumptions sheets. **PDF tender estimate** with cover, scenario comparison, cost summary, section summaries, full BOQ, indirects/markups, risk register, assumptions and exclusions. |
| **Saved estimates** | Save, open, duplicate, delete; export/import JSON. Stored in the browser's localStorage (no backend needed). |

---

## Quick start

Requirements: **Node.js 18+** (tested on Node 22) and npm.

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

```bash
npm test             # engine unit tests (Vitest)
npm run typecheck    # strict TypeScript check
npm run build        # production build → dist/
npm run preview      # serve the production build
npm run build:single # one self-contained HTML file → dist-single/index.html
```

`dist/` can be hosted on any static host (Netlify, Vercel, S3, IIS, nginx). No server or database is required.

---

## Folder structure

```
buildcost-ai/
├── index.html
├── package.json
├── vite.config.ts            # normal + single-file build modes, Vitest config
├── tailwind.config.js        # "site office" palette: slate ink, concrete, rebar teal, brass
├── postcss.config.js
├── tsconfig.json
└── src/
    ├── main.tsx              # entry, font import
    ├── App.tsx               # page routing, export wiring
    ├── index.css
    ├── types/index.ts        # all domain and engine types
    ├── data/
    │   ├── countries.ts      # GCC countries, currencies, VAT, FX, location factors, sources
    │   ├── rateLibrary.ts    # 94 BOQ items: unit, rates, quality factors, safety flag, specs
    │   └── defaults.ts       # building-type coefficients, preliminaries, risks, assumptions, exclusions
    ├── engine/
    │   ├── geometry.ts       # floor plate, height, façade, excavation, cooling load, kVA
    │   ├── quantities.ts     # quantity take-off rule per BOQ item
    │   ├── estimate.ts       # pricing, safety floor, indirects, markups, VAT, scenarios
    │   ├── validation.ts     # input limits and cross-field checks
    │   ├── format.ts         # money / number formatting
    │   ├── index.ts
    │   └── __tests__/estimate.test.ts
    ├── store/
    │   ├── useProjectStore.ts  # Zustand store: inputs, overrides, risks, saved projects
    │   ├── EstimateContext.tsx # recomputes the estimate once per change, shares it
    │   └── storage.ts          # guarded localStorage + file download helper
    ├── export/
    │   ├── excel.ts          # ExcelJS workbook with live formulas
    │   └── pdf.ts            # jsPDF + AutoTable tender document
    ├── components/
    │   ├── layout/Shell.tsx  # sidebar, top bar, quality switch, export buttons
    │   ├── ui/index.tsx      # panels, inputs, segmented controls, badges
    │   └── charts/           # Recharts charts + SVG elevation drawing
    └── pages/
        ├── Dashboard.tsx
        ├── ProjectSetup.tsx
        ├── BOQ.tsx
        ├── Compare.tsx
        ├── RateLibrary.tsx
        ├── Risk.tsx
        ├── Assumptions.tsx
        ├── SavedProjects.tsx
        └── parts/CostSummaryTable.tsx
```

---

## How the engine works

1. **Geometry** (`engine/geometry.ts`) – from built-up area, floors and basements:
   typical plate = BUA ÷ (floors + 1.3 × basements); height = floors × floor-to-floor; façade = perimeter × height;
   glazing = façade × window-to-wall ratio; cooling TR = above-ground area ÷ m²/TR; demand kVA = BUA × VA/m² × 0.65.
2. **Quantities** (`engine/quantities.ts`) – one readable rule per BOQ item (e.g. rebar t = Σ concrete volume × element
   density; lifts = above-ground area ÷ service area, min. 3). Each rule matches the *quantity basis* text shown in the BOQ.
   Any quantity can be overridden.
3. **Unit rate** – for each item and scenario:
   ```
   material   = baseline USD × FX × location factor × (1 + material adj.) × quality factor
   labour     = man-hours × (1 + (quality factor − 1) × 0.5) × all-in labour rate
   equipment  = baseline USD × FX × location factor × (1 + equipment adj.) × quality factor
   subcontract= baseline USD × FX × location factor × quality factor
   unit rate  = material + labour + equipment + subcontract
   amount     = quantity × unit rate
   ```
   Rate-library overrides replace the baseline components; BOQ rate overrides replace the composite rate
   (components scaled pro rata so the material/labour/equipment split is kept).
4. **Safety floor** – items flagged `safetyCritical` (piles, raft, frame, rebar, fire doors, sprinklers, fire pumps,
   smoke extract, cables, switchgear, transformers, generators, earthing, emergency lighting, fire alarm, T&C …)
   are priced in Low exactly as in Medium; a lower user rate in Low is raised to Medium and flagged.
5. **Indirect costs** – preliminaries per module as quantity × rate (staff-months, utility-months, HSE-months,
   kVA utility charges) plus percentage items (insurance, bonds per year, shop drawings, permits).
6. **Markups** – escalation = direct × annual rate × duration/2; overheads and contingency on
   (direct + indirect + escalation); profit on everything before it; VAT at the country rate.
7. **Recommended tender** – final quotation rounded up to four significant figures.

All of this is a pure function `estimate(project)`; the UI recalculates on every change. Invalid inputs keep
the last valid estimate on screen with a clear "fix inputs" banner.

### Calibration

With default inputs (Dubai, residential, 25 floors + 3 basements, 42,000 m², 30 months) the Medium scenario
comes to about **AED 5,200/m² before VAT**, inside Turner & Townsend's 2025 range for Dubai residential towers of
20–60 storeys (≈ AED 5,000–6,500/m²). A unit test guards this band.

| Reference used for calibration | Note |
|---|---|
| Turner & Townsend, *Global Construction Market Intelligence 2025* | Average cost/m²: Riyadh US$3,112, Doha US$2,613, Dubai US$1,926; wages/hour. Used for location factors and labour rates. |
| Turner & Townsend, *Tall Buildings Construction Guide 2026 – Dubai* | Residential 20–60 storeys ≈ AED 5,000–6,500/m² (2025). |
| Turner & Townsend, *UAE market intelligence 2025* | Excavation ≈ AED 20/m³; 20-storey lift ≈ AED 800k. |
| PwC Middle East, *GCC Indirect Tax News Roundup Q3 2026* | VAT: KSA 15 %, Bahrain 10 %, UAE 5 %, Oman 5 %; not introduced in Qatar or Kuwait. |

Oman, Kuwait and Bahrain location factors are illustrative (not covered by the benchmark report).

---

## Customising

- **Rates** – edit `src/data/rateLibrary.ts` (baseline USD, labour hours, quality factors, specs) or, per project,
  in the Rate library page.
- **Countries** – `src/data/countries.ts` (FX, VAT, location factor, labour cost, escalation, authorities).
- **Design norms** – `TYPE_COEFFICIENTS` in `src/data/defaults.ts` (window-to-wall ratio, m²/TR, VA/m², densities…).
- **Preliminaries** – `PRELIMS` in `src/data/defaults.ts`.
- **New BOQ item** – add it to `RATE_LIBRARY` and give it a rule in `QTY_RULES`; a test fails if a rule is missing.

## Adding a backend (optional)

The app is fully client-side. To share estimates across a team, replace `src/store/storage.ts` with calls to an
API (e.g. a small Express/Fastify service with PostgreSQL storing the `Project` JSON). The engine needs no changes.

## Tech stack

React 18 · TypeScript (strict) · Vite 5 · Tailwind CSS 3 · Recharts 3 · Lucide icons · Zustand · ExcelJS · jsPDF + AutoTable · Vitest · Archivo variable font (self-hosted via Fontsource).

## Disclaimer

BuildCost AI produces budget estimates for tender preparation. It does not replace a quantity surveyor's measured
take-off, supplier quotations or professional tax advice. Verify quantities, rates, VAT treatment and exchange
rates before submitting any tender.
