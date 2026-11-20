import type { Category, CategoryId, Provenance, RateItem } from '../types';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  GULF BASELINE RATE LIBRARY  —  ILLUSTRATIVE ASSUMPTIONS, NOT MARKET PRICES
 * ─────────────────────────────────────────────────────────────────────────────
 *  All rates are in USD for a MEDIUM specification at a Dubai-equivalent location
 *  (location factor 1.00). The engine converts them per country:
 *
 *    local rate = USD rate × FX (local per USD) × location factor × quality factor
 *    labour     = man-hours/unit × all-in labour cost per hour (country)
 *
 *  A handful of rates were sense-checked against published Turner & Townsend 2025
 *  sample rates (excavation ≈ AED 20/m³, 20-storey lift ≈ AED 800k, rebar ≈ AED
 *  2,500/t, blocks ≈ AED 3,000/1,000). Everything else is a reasoned estimating
 *  assumption. Replace with supplier/subcontractor quotes in the Rate Library page
 *  before submitting a tender.
 */
export const BASELINE_PROVENANCE: Provenance = {
  kind: 'illustrative',
  label: 'BuildCost AI Gulf baseline v1 – illustrative assumption',
  date: '2026-11-20',
};

export const CATEGORIES: Category[] = [
  { id: 'substructure', module: 'construction', label: 'Excavation & foundations' },
  { id: 'frame', module: 'construction', label: 'Concrete & structural frame' },
  { id: 'masonry', module: 'construction', label: 'Masonry & plastering' },
  { id: 'flooring', module: 'construction', label: 'Flooring & tiling' },
  { id: 'finishes', module: 'construction', label: 'Painting, ceilings & finishing' },
  { id: 'openings', module: 'construction', label: 'Doors, windows & façade' },
  { id: 'waterproofing', module: 'construction', label: 'Waterproofing' },
  { id: 'vertical', module: 'construction', label: 'Elevators & escalators' },
  { id: 'hvac_plumbing', module: 'construction', label: 'HVAC & plumbing' },
  { id: 'firefighting', module: 'construction', label: 'Firefighting' },
  { id: 'plant_labour', module: 'construction', label: 'Labour, machinery & equipment' },
  { id: 'cables', module: 'electrical', label: 'Cables & wiring' },
  { id: 'distribution', module: 'electrical', label: 'Distribution boards & switchgear' },
  { id: 'power_supply', module: 'electrical', label: 'Transformers & generators' },
  { id: 'lighting', module: 'electrical', label: 'Lighting systems' },
  { id: 'accessories', module: 'electrical', label: 'Switches & sockets' },
  { id: 'containment', module: 'electrical', label: 'Cable trays & conduits' },
  { id: 'earthing', module: 'electrical', label: 'Earthing & lightning protection' },
  { id: 'emergency', module: 'electrical', label: 'Emergency lighting' },
  { id: 'fire_alarm', module: 'electrical', label: 'Fire alarm & voice evacuation' },
  { id: 'elv', module: 'electrical', label: 'CCTV, access control & ELV' },
  { id: 'tnc', module: 'electrical', label: 'Testing & commissioning' },
];

export const CATEGORY_LABEL: Record<CategoryId, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label]),
) as Record<CategoryId, string>;

type Def = Omit<RateItem, 'material' | 'labourHours' | 'equipment' | 'subcontract'> &
  Partial<Pick<RateItem, 'material' | 'labourHours' | 'equipment' | 'subcontract'>>;

const item = (d: Def): RateItem => ({ material: 0, labourHours: 0, equipment: 0, subcontract: 0, ...d });

const S = (low: string, medium: string, high: string) => ({ low, medium, high });

export const RATE_LIBRARY: RateItem[] = [
  // ── 1. Excavation & foundations ───────────────────────────────────────────
  item({ id: 'C-SUB-01', module: 'construction', category: 'substructure', description: 'Bulk excavation for basements and raft', unit: 'm³', labourHours: 0.04, equipment: 4.2, qualityFactor: [1, 1, 1], safetyCritical: false, spec: S('Mechanical excavation', 'Mechanical excavation', 'Mechanical excavation, GPS-controlled'), qtyBasis: 'Raft footprint × excavation depth × 1.10 over-break' }),
  item({ id: 'C-SUB-02', module: 'construction', category: 'substructure', description: 'Load and cart away surplus material to approved tip', unit: 'm³', labourHours: 0.01, equipment: 3.5, qualityFactor: [1, 1, 1], safetyCritical: false, spec: S('Licensed tip', 'Licensed tip', 'Licensed tip'), qtyBasis: 'Equal to excavated volume' }),
  item({ id: 'C-SUB-03', module: 'construction', category: 'substructure', description: 'Shoring – secant / contiguous pile wall incl. capping beam', unit: 'm²', subcontract: 260, qualityFactor: [1, 1, 1.05], safetyCritical: true, spec: S('Engineered secant wall (design-to-code)', 'Engineered secant wall', 'Secant wall + monitoring instrumentation'), qtyBasis: 'Basement perimeter × excavation depth (0 if no basement)' }),
  item({ id: 'C-SUB-04', module: 'construction', category: 'substructure', description: 'Dewatering system incl. monitoring and discharge permits', unit: 'month', subcontract: 18000, qualityFactor: [1, 1, 1.1], safetyCritical: false, spec: S('Wellpoint system', 'Deep-well system', 'Deep-well system with redundancy'), qtyBasis: '2 months + 1.5 months per basement level' }),
  item({ id: 'C-SUB-05', module: 'construction', category: 'substructure', description: 'Bored cast-in-situ piles Ø1200 mm incl. testing', unit: 'lm', subcontract: 330, qualityFactor: [1, 1, 1.05], safetyCritical: true, spec: S('Structural design to code – no downgrade', 'Ø1200 bored piles, C50', 'Ø1200 bored piles, C50, extra integrity tests'), qtyBasis: 'Pile count (building load ÷ 7,500 kN × 1.15) × pile length (28 m + 0.4 m/floor)' }),
  item({ id: 'C-SUB-06', module: 'construction', category: 'substructure', description: 'Reinforced concrete raft foundation C50/60 (SRC)', unit: 'm³', material: 115, labourHours: 1.2, equipment: 8, qualityFactor: [1, 1, 1.04], safetyCritical: true, spec: S('C50 SRC – structural design to code', 'C50 SRC', 'C60 SRC with crystalline admixture'), qtyBasis: 'Raft footprint × raft thickness (1.5 m + 0.05 m/floor)' }),
  item({ id: 'C-SUB-07', module: 'construction', category: 'substructure', description: 'Reinforced concrete basement retaining walls', unit: 'm³', material: 115, labourHours: 3.0, equipment: 8, qualityFactor: [1, 1, 1.04], safetyCritical: true, spec: S('C45 SRC – design to code', 'C45 SRC', 'C50 SRC with crystalline admixture'), qtyBasis: 'Basement perimeter × basement depth × 0.45 m' }),

  // ── 2. Concrete & structural frame ────────────────────────────────────────
  item({ id: 'C-FRM-01', module: 'construction', category: 'frame', description: 'Reinforced concrete columns C60', unit: 'm³', material: 125, labourHours: 3.5, equipment: 10, qualityFactor: [1, 1, 1.04], safetyCritical: true, spec: S('C60 – structural design to code', 'C60', 'C60/C70 high-performance'), qtyBasis: 'Gross area × 0.045 m³/m² × (1 + floors/50)' }),
  item({ id: 'C-FRM-02', module: 'construction', category: 'frame', description: 'Reinforced concrete core and shear walls', unit: 'm³', material: 120, labourHours: 3.0, equipment: 10, qualityFactor: [1, 1, 1.04], safetyCritical: true, spec: S('C50 – design to code', 'C50', 'C60, jump-form system'), qtyBasis: 'Above-ground area × 0.055 + basement area × 0.03 m³/m²' }),
  item({ id: 'C-FRM-03', module: 'construction', category: 'frame', description: 'Reinforced concrete beams incl. transfer structures', unit: 'm³', material: 118, labourHours: 3.2, equipment: 10, qualityFactor: [1, 1, 1.04], safetyCritical: true, spec: S('C50 – design to code', 'C50', 'C60'), qtyBasis: 'Gross area × 0.035 m³/m²' }),
  item({ id: 'C-FRM-04', module: 'construction', category: 'frame', description: 'Post-tensioned flat slabs (concrete)', unit: 'm³', material: 112, labourHours: 2.0, equipment: 9, qualityFactor: [1, 1, 1.03], safetyCritical: true, spec: S('C45 PT slab – design to code', 'C45 PT slab', 'C50 PT slab, power-floated'), qtyBasis: 'All slab area × 0.25 m average thickness' }),
  item({ id: 'C-FRM-05', module: 'construction', category: 'frame', description: 'High-yield reinforcement B500B, cut, bent and fixed', unit: 't', material: 680, labourHours: 22, equipment: 15, qualityFactor: [1, 1, 1.03], safetyCritical: true, spec: S('B500B – mill-certified', 'B500B – mill-certified', 'B500B + couplers'), qtyBasis: 'Concrete volumes × element rebar densities (95–240 kg/m³)' }),
  item({ id: 'C-FRM-06', module: 'construction', category: 'frame', description: 'Post-tensioning strands, anchors and stressing', unit: 't', subcontract: 3200, qualityFactor: [1, 1, 1.05], safetyCritical: true, spec: S('Bonded PT – design to code', 'Bonded PT', 'Bonded PT, specialist supplier'), qtyBasis: 'Slab concrete × 14 kg/m³' }),
  item({ id: 'C-FRM-07', module: 'construction', category: 'frame', description: 'Formwork – system formwork to slabs, columns, walls, beams', unit: 'm²', material: 9, labourHours: 0.9, equipment: 3, qualityFactor: [1, 1, 1.12], safetyCritical: false, spec: S('Conventional system forms', 'System formwork', 'Fair-faced system formwork'), qtyBasis: 'Slab area × 1.08 + element contact-area ratios' }),

  // ── 3. Masonry & plastering ───────────────────────────────────────────────
  item({ id: 'C-MAS-01', module: 'construction', category: 'masonry', description: 'Concrete blockwork 200 mm incl. mortar and lintels', unit: 'm²', material: 11, labourHours: 0.9, equipment: 0.5, qualityFactor: [0.92, 1, 1.12], safetyCritical: false, spec: S('Hollow blocks', 'Solid/hollow blocks', 'Thermal (AAC) blocks'), qtyBasis: 'Above-ground area × partition factor + solid façade + basement walls' }),
  item({ id: 'C-MAS-02', module: 'construction', category: 'masonry', description: 'Internal cement plaster 15 mm', unit: 'm²', material: 3.2, labourHours: 0.45, equipment: 0.2, qualityFactor: [0.9, 1, 1.2], safetyCritical: false, spec: S('Single coat', 'Two coat', 'Two coat + mesh at joints'), qtyBasis: 'Both faces of internal walls + inside face of façade' }),
  item({ id: 'C-MAS-03', module: 'construction', category: 'masonry', description: 'External render 20 mm', unit: 'm²', material: 4.5, labourHours: 0.6, equipment: 1.0, qualityFactor: [0.9, 1, 1.15], safetyCritical: false, spec: S('Standard render', 'Polymer-modified render', 'Polymer render + insulation board'), qtyBasis: 'Solid (non-glazed) façade area' }),

  // ── 4. Flooring & tiling ──────────────────────────────────────────────────
  item({ id: 'C-FLR-01', module: 'construction', category: 'flooring', description: 'Cement-sand screed 50–75 mm', unit: 'm²', material: 6, labourHours: 0.25, equipment: 0.3, qualityFactor: [1, 1, 1.05], safetyCritical: false, spec: S('Sand-cement screed', 'Sand-cement screed', 'Self-levelling screed'), qtyBasis: 'Above-ground area × 0.88' }),
  item({ id: 'C-FLR-02', module: 'construction', category: 'flooring', description: 'Floor finishes – tiles / stone incl. skirting', unit: 'm²', material: 36, labourHours: 0.9, equipment: 0.3, qualityFactor: [0.5, 1, 3.0], safetyCritical: false, spec: S('Ceramic tiles', 'Porcelain tiles', 'Natural marble / engineered timber'), qtyBasis: 'Above-ground area × 0.85 net' }),
  item({ id: 'C-FLR-03', module: 'construction', category: 'flooring', description: 'Wall tiling to wet areas and kitchens', unit: 'm²', material: 24, labourHours: 1.0, qualityFactor: [0.6, 1, 2.5], safetyCritical: false, spec: S('Ceramic wall tiles', 'Porcelain wall tiles', 'Large-format porcelain / marble'), qtyBasis: 'Above-ground area × wet-area factor' }),
  item({ id: 'C-FLR-04', module: 'construction', category: 'flooring', description: 'Car park epoxy / floor hardener with markings', unit: 'm²', material: 9, labourHours: 0.15, equipment: 0.4, qualityFactor: [0.8, 1, 1.3], safetyCritical: false, spec: S('Dry-shake hardener', 'Epoxy coating', 'PU traffic deck system'), qtyBasis: 'Parking area × 0.95' }),

  // ── 5. Painting & finishing ───────────────────────────────────────────────
  item({ id: 'C-FIN-01', module: 'construction', category: 'finishes', description: 'Gypsum board false ceilings incl. access panels', unit: 'm²', material: 14, labourHours: 0.6, qualityFactor: [0.75, 1, 1.8], safetyCritical: false, spec: S('Mineral fibre tiles', 'Gypsum board', 'Gypsum with coves & feature bulkheads'), qtyBasis: 'Above-ground area × 0.75' }),
  item({ id: 'C-FIN-02', module: 'construction', category: 'finishes', description: 'Internal painting – primer + 2 coats emulsion', unit: 'm²', material: 2.2, labourHours: 0.22, qualityFactor: [0.7, 1, 1.8], safetyCritical: false, spec: S('Economy emulsion', 'Branded emulsion', 'Premium low-VOC / feature finishes'), qtyBasis: 'Internal plaster × 0.95 + exposed soffits' }),
  item({ id: 'C-FIN-03', module: 'construction', category: 'finishes', description: 'External textured paint system', unit: 'm²', material: 4, labourHours: 0.25, equipment: 0.6, qualityFactor: [0.75, 1, 1.6], safetyCritical: false, spec: S('Acrylic paint', 'Textured elastomeric', 'Silicone elastomeric, 10-yr warranty'), qtyBasis: 'Solid façade area' }),
  item({ id: 'C-FIN-04', module: 'construction', category: 'finishes', description: 'Joinery – kitchens, wardrobes and vanities', unit: 'unit', subcontract: 6500, qualityFactor: [0.5, 1, 2.4], safetyCritical: false, spec: S('Laminate joinery', 'HPL / lacquer joinery', 'Bespoke veneer, stone tops, branded fittings'), qtyBasis: 'Apartments / keys (commercial: 2 cores per floor)' }),

  // ── 6. Doors, windows & façade ────────────────────────────────────────────
  item({ id: 'C-OPN-01', module: 'construction', category: 'openings', description: 'Internal timber doors incl. frames and ironmongery', unit: 'nr', subcontract: 650, qualityFactor: [0.6, 1, 2.2], safetyCritical: false, spec: S('Flush HDF doors', 'Solid-core veneer doors', 'Full-height bespoke doors'), qtyBasis: 'Above-ground area ÷ door density' }),
  item({ id: 'C-OPN-02', module: 'construction', category: 'openings', description: 'Fire-rated doors 60/90 min incl. closers and panic hardware', unit: 'nr', subcontract: 1250, qualityFactor: [1, 1, 1.25], safetyCritical: true, spec: S('Certified FD60/FD90 (no downgrade)', 'Certified FD60/FD90', 'Certified FD90, architectural finish'), qtyBasis: '6 per level (stairs, lift lobby, risers)' }),
  item({ id: 'C-OPN-03', module: 'construction', category: 'openings', description: 'Aluminium glazing / curtain wall system', unit: 'm²', subcontract: 360, qualityFactor: [0.7, 1, 1.7], safetyCritical: false, spec: S('Stick-system windows, single low-e', 'Semi-unitised, double-glazed low-e', 'Unitised curtain wall, high-performance DGU'), qtyBasis: 'Façade area × window-to-wall ratio' }),
  item({ id: 'C-OPN-04', module: 'construction', category: 'openings', description: 'Balustrades and handrails (balconies and stairs)', unit: 'lm', subcontract: 180, qualityFactor: [1, 1, 1.6], safetyCritical: true, spec: S('Code-compliant steel balustrade', 'Aluminium / glass balustrade', 'Frameless structural glass'), qtyBasis: 'Balcony perimeter + 2 stairs × 14 m per level' }),

  // ── 7. Waterproofing ──────────────────────────────────────────────────────
  item({ id: 'C-WPF-01', module: 'construction', category: 'waterproofing', description: 'Basement tanking membrane incl. protection board', unit: 'm²', subcontract: 24, qualityFactor: [0.85, 1, 1.35], safetyCritical: false, spec: S('Bituminous sheet', 'Pre-applied HDPE membrane', 'Dual membrane + crystalline system'), qtyBasis: 'Raft footprint + basement wall area' }),
  item({ id: 'C-WPF-02', module: 'construction', category: 'waterproofing', description: 'Roof waterproofing, insulation and screed to falls', unit: 'm²', subcontract: 38, qualityFactor: [0.85, 1, 1.4], safetyCritical: false, spec: S('Bituminous membrane', 'Inverted roof with XPS', 'Liquid PU + inverted roof, 20-yr warranty'), qtyBasis: 'Tower roof × 1.1 + podium roof' }),
  item({ id: 'C-WPF-03', module: 'construction', category: 'waterproofing', description: 'Wet-area waterproofing', unit: 'm²', subcontract: 12, qualityFactor: [0.85, 1, 1.3], safetyCritical: false, spec: S('Cementitious coating', 'Polymer membrane', 'Polymer membrane + flood test certificate'), qtyBasis: 'Wet-area factor × 0.55 × above-ground area' }),

  // ── 8. Elevators ──────────────────────────────────────────────────────────
  item({ id: 'C-VRT-01', module: 'construction', category: 'vertical', description: 'Passenger lifts (MRL / traction), rate for 20 stops', unit: 'nr', subcontract: 205000, qualityFactor: [0.78, 1, 1.45], safetyCritical: false, spec: S('Regional brand, 1.75 m/s', 'International brand, 2.5 m/s', 'Premium brand, 4 m/s, destination control'), qtyBasis: 'Above-ground area ÷ lift service area (min. 3); rate scaled +2.5 % per stop above 20' }),
  item({ id: 'C-VRT-02', module: 'construction', category: 'vertical', description: 'Firefighting / service lift to code', unit: 'nr', subcontract: 230000, qualityFactor: [1, 1, 1.2], safetyCritical: true, spec: S('Code-compliant firefighting lift (no downgrade)', 'Firefighting lift', 'Firefighting lift, premium brand'), qtyBasis: '1 + 1 if ≥ 25 floors + 1 for hotels; rate scaled per stop' }),
  item({ id: 'C-VRT-03', module: 'construction', category: 'vertical', description: 'Escalators to podium levels', unit: 'nr', subcontract: 160000, qualityFactor: [0.85, 1, 1.3], safetyCritical: false, spec: S('Standard escalator', 'Commercial escalator', 'Heavy-duty glass balustrade escalator'), qtyBasis: 'By building type (residential 0)' }),

  // ── 9. HVAC & plumbing ────────────────────────────────────────────────────
  item({ id: 'C-MEP-01', module: 'construction', category: 'hvac_plumbing', description: 'Chilled-water plant – chillers, pumps, cooling towers', unit: 'TR', subcontract: 950, qualityFactor: [0.8, 1, 1.35], safetyCritical: false, spec: S('Air-cooled screw chillers', 'Air-cooled high-efficiency chillers', 'Water-cooled magnetic-bearing chillers'), qtyBasis: 'Above-ground area ÷ m² per TR (Gulf cooling load)' }),
  item({ id: 'C-MEP-02', module: 'construction', category: 'hvac_plumbing', description: 'Air distribution – FCUs, ductwork, insulation, diffusers', unit: 'm²', subcontract: 55, qualityFactor: [0.8, 1, 1.4], safetyCritical: false, spec: S('Standard FCUs, GI duct', 'EC-motor FCUs, insulated duct', 'EC FCUs, VAV, acoustic treatment'), qtyBasis: 'Above-ground area' }),
  item({ id: 'C-MEP-03', module: 'construction', category: 'hvac_plumbing', description: 'Car-park ventilation, smoke extract and stair pressurisation', unit: 'm²', subcontract: 28, qualityFactor: [1, 1, 1.15], safetyCritical: true, spec: S('Code-compliant jet-fan system (no downgrade)', 'Jet-fan system + CO sensors', 'Jet-fan system + CFD-verified design'), qtyBasis: 'Parking area' }),
  item({ id: 'C-MEP-04', module: 'construction', category: 'hvac_plumbing', description: 'Building management system (BMS)', unit: 'm²', subcontract: 6, qualityFactor: [0.6, 1, 1.8], safetyCritical: false, spec: S('Basic plant monitoring', 'BACnet BMS', 'Integrated smart-building platform'), qtyBasis: 'Gross built-up area' }),
  item({ id: 'C-MEP-05', module: 'construction', category: 'hvac_plumbing', description: 'Water supply, drainage and vent pipework', unit: 'm²', subcontract: 34, qualityFactor: [0.8, 1, 1.35], safetyCritical: false, spec: S('PPR / uPVC', 'PPR / uPVC, insulated', 'Copper / HDPE, acoustic drainage'), qtyBasis: 'Gross built-up area' }),
  item({ id: 'C-MEP-06', module: 'construction', category: 'hvac_plumbing', description: 'Sanitary fixtures and fittings', unit: 'nr', subcontract: 420, qualityFactor: [0.55, 1, 2.6], safetyCritical: false, spec: S('Economy sanitaryware', 'Branded mid-range', 'Premium European brands'), qtyBasis: 'Above-ground area ÷ fixture density' }),
  item({ id: 'C-MEP-07', module: 'construction', category: 'hvac_plumbing', description: 'Water storage, booster and transfer pumps (per level)', unit: 'level', subcontract: 6500, qualityFactor: [0.85, 1, 1.3], safetyCritical: false, spec: S('GRP tanks, standard pumps', 'GRP tanks, VSD pumps', 'SS tanks, VSD duty/standby pumps'), qtyBasis: 'Floors + basements' }),

  // ── 10. Firefighting ──────────────────────────────────────────────────────
  item({ id: 'C-FF-01', module: 'construction', category: 'firefighting', description: 'Automatic sprinkler system incl. valves and pipework', unit: 'm²', subcontract: 17, qualityFactor: [1, 1, 1.15], safetyCritical: true, spec: S('Listed/approved sprinklers (no downgrade)', 'UL/FM sprinklers', 'UL/FM concealed sprinklers'), qtyBasis: 'Gross built-up area' }),
  item({ id: 'C-FF-02', module: 'construction', category: 'firefighting', description: 'Fire pump set – electric, diesel and jockey', unit: 'set', subcontract: 140000, qualityFactor: [1, 1, 1.15], safetyCritical: true, spec: S('UL/FM listed set (no downgrade)', 'UL/FM listed set', 'UL/FM listed, premium brand'), qtyBasis: '1 per building, 2 if height > 90 m (zoned)' }),
  item({ id: 'C-FF-03', module: 'construction', category: 'firefighting', description: 'Wet risers, landing valves and hose reels', unit: 'level', subcontract: 5200, qualityFactor: [1, 1, 1.15], safetyCritical: true, spec: S('Code-compliant (no downgrade)', 'Code-compliant', 'Code-compliant, stainless cabinets'), qtyBasis: 'Floors + basements' }),
  item({ id: 'C-FF-04', module: 'construction', category: 'firefighting', description: 'Clean-agent suppression to electrical / IT rooms', unit: 'room', subcontract: 32000, qualityFactor: [1, 1, 1.15], safetyCritical: true, spec: S('Listed FM-200/Novec (no downgrade)', 'FM-200 / Novec 1230', 'Novec 1230 with VESDA'), qtyBasis: '2 + 1 per 10 floors' }),

  // ── 11. Labour, machinery & equipment ─────────────────────────────────────
  item({ id: 'C-PLT-01', module: 'construction', category: 'plant_labour', description: 'Tower crane rental incl. operator, erection and climbing', unit: 'crane-mth', equipment: 28000, qualityFactor: [1, 1, 1], safetyCritical: false, spec: S('Tower crane', 'Tower crane', 'Tower crane'), qtyBasis: 'Cranes (1, or 2 if plate > 1,400 m²) × duration × 0.7' }),
  item({ id: 'C-PLT-02', module: 'construction', category: 'plant_labour', description: "Builder's passenger / material hoists", unit: 'hoist-mth', equipment: 6500, qualityFactor: [1, 1, 1], safetyCritical: false, spec: S('Rack & pinion hoist', 'Rack & pinion hoist', 'High-speed rack & pinion hoist'), qtyBasis: '2 hoists × duration × 0.6' }),
  item({ id: 'C-PLT-03', module: 'construction', category: 'plant_labour', description: 'High-pressure concrete pumping and placing booms', unit: 'm³', equipment: 9, qualityFactor: [1, 1, 1], safetyCritical: false, spec: S('Mobile pumps', 'Static pump + placing boom', 'Static pump + placing boom'), qtyBasis: 'Total structural concrete volume' }),
  item({ id: 'C-PLT-04', module: 'construction', category: 'plant_labour', description: 'Façade access – scaffolding, mast climbers, gondolas', unit: 'm²', labourHours: 0.15, equipment: 6, qualityFactor: [1, 1, 1], safetyCritical: false, spec: S('Scaffold + BMU hire', 'Mast climbers + BMU hire', 'Mast climbers + BMU hire'), qtyBasis: 'Total façade area' }),
  item({ id: 'C-PLT-05', module: 'construction', category: 'plant_labour', description: 'General labour, attendance, cleaning and housekeeping', unit: 'man-mth', labourHours: 208, qualityFactor: [1, 1, 1], safetyCritical: false, spec: S('General labour', 'General labour', 'General labour'), qtyBasis: 'Duration × (6 + gross area ÷ 2,500) operatives' }),
  item({ id: 'C-PLT-06', module: 'construction', category: 'plant_labour', description: 'Small tools, consumables and minor plant', unit: 'month', material: 7500, qualityFactor: [1, 1, 1], safetyCritical: false, spec: S('Small tools', 'Small tools', 'Small tools'), qtyBasis: 'Project duration' }),

  // ── E1. Cables & wiring ───────────────────────────────────────────────────
  item({ id: 'E-CAB-01', module: 'electrical', category: 'cables', description: 'LV XLPE/SWA sub-main cables (avg. 4C 95 mm²) incl. glands', unit: 'm', material: 38, labourHours: 0.35, equipment: 0.5, qualityFactor: [1, 1, 1.25], safetyCritical: true, spec: S('Approved-vendor XLPE (sized to code)', 'XLPE/SWA, approved vendor', 'LSZH XLPE, premium brand'), qtyBasis: 'SMDBs × (height/2 + 35 m) × 2 feeders × 1.15' }),
  item({ id: 'E-CAB-02', module: 'electrical', category: 'cables', description: 'Final circuit wiring in conduit (lighting and power)', unit: 'm', material: 1.1, labourHours: 0.05, qualityFactor: [1, 1, 1.2], safetyCritical: true, spec: S('Approved PVC/LSZH wire (no downgrade)', 'LSZH single-core wire', 'LSZH wire, premium brand'), qtyBasis: 'Gross area × 6.5 m/m²' }),
  item({ id: 'E-CAB-03', module: 'electrical', category: 'cables', description: 'Fire-rated cables for life-safety circuits', unit: 'm', material: 9, labourHours: 0.12, qualityFactor: [1, 1, 1.15], safetyCritical: true, spec: S('BS 8519 / EN 50200 rated (no downgrade)', 'BS 8519 rated', 'BS 8519 enhanced 120 min'), qtyBasis: 'Gross area × 0.35 m/m²' }),
  item({ id: 'E-CAB-04', module: 'electrical', category: 'cables', description: 'Rising-main busbar trunking incl. tap-off units', unit: 'm', subcontract: 420, qualityFactor: [0.9, 1, 1.3], safetyCritical: false, spec: S('Aluminium busbar', 'Aluminium busbar, IP55', 'Copper busbar, IP55'), qtyBasis: 'Building height × 2 risers + 40 m horizontal' }),

  // ── E2. Distribution boards ───────────────────────────────────────────────
  item({ id: 'E-DST-01', module: 'electrical', category: 'distribution', description: 'Main LV switchboard (MDB) form 4b', unit: 'nr', subcontract: 85000, qualityFactor: [1, 1, 1.3], safetyCritical: true, spec: S('Type-tested assembly (no downgrade)', 'Type-tested, form 4b', 'Type-tested, form 4b, digital metering'), qtyBasis: '1 per transformer' }),
  item({ id: 'E-DST-02', module: 'electrical', category: 'distribution', description: 'Sub-main distribution boards (SMDB)', unit: 'nr', subcontract: 9500, qualityFactor: [1, 1, 1.3], safetyCritical: true, spec: S('Type-tested (no downgrade)', 'Type-tested, branded MCCBs', 'Type-tested, smart MCCBs'), qtyBasis: 'Floors + basements + 1 per 400 TR of plant' }),
  item({ id: 'E-DST-03', module: 'electrical', category: 'distribution', description: 'Final distribution boards incl. MCBs and RCBOs', unit: 'nr', subcontract: 1100, qualityFactor: [1, 1, 1.35], safetyCritical: true, spec: S('RCD-protected (no downgrade)', 'Branded MCB/RCBO', 'Premium brand, surge protection'), qtyBasis: 'Units + 1 common DB per level' }),
  item({ id: 'E-DST-04', module: 'electrical', category: 'distribution', description: 'Energy meters and metering panels', unit: 'nr', subcontract: 260, qualityFactor: [0.85, 1, 1.6], safetyCritical: false, spec: S('Utility meters', 'Utility + sub-meters', 'Smart AMI meters'), qtyBasis: 'Units + 1 per level' }),
  item({ id: 'E-DST-05', module: 'electrical', category: 'distribution', description: 'Capacitor bank / power-factor correction', unit: 'nr', subcontract: 22000, qualityFactor: [0.9, 1, 1.25], safetyCritical: false, spec: S('Fixed steps', 'Automatic, detuned', 'Active harmonic filter'), qtyBasis: '1 per transformer' }),

  // ── E3. Transformers & generators ─────────────────────────────────────────
  item({ id: 'E-PWR-01', module: 'electrical', category: 'power_supply', description: '11/0.4 kV oil-type transformer 1,500 kVA', unit: 'nr', subcontract: 62000, qualityFactor: [1, 1, 1.25], safetyCritical: true, spec: S('Utility-approved vendor (no downgrade)', 'Utility-approved vendor', 'Low-loss Tier 2 transformer'), qtyBasis: 'Demand kVA ÷ (1,500 × 0.85 loading)' }),
  item({ id: 'E-PWR-02', module: 'electrical', category: 'power_supply', description: '11 kV ring main unit (RMU)', unit: 'nr', subcontract: 28000, qualityFactor: [1, 1, 1.15], safetyCritical: true, spec: S('Utility-approved (no downgrade)', 'SF6 RMU, utility-approved', 'SF6-free RMU'), qtyBasis: '1 per transformer' }),
  item({ id: 'E-PWR-03', module: 'electrical', category: 'power_supply', description: 'Standby diesel generator 1,000 kVA incl. ATS, tank, flue', unit: 'nr', subcontract: 190000, qualityFactor: [1, 1, 1.3], safetyCritical: true, spec: S('Rated for life-safety loads (no downgrade)', 'International brand, sound-attenuated', 'Premium brand, synchronised, 24 h tank'), qtyBasis: 'Demand × standby ratio ÷ 1,000 kVA (min. 1 for life safety)' }),
  item({ id: 'E-PWR-04', module: 'electrical', category: 'power_supply', description: 'Substation room fit-out, ventilation and cable trenches', unit: 'nr', subcontract: 35000, qualityFactor: [1, 1, 1.15], safetyCritical: false, spec: S('To utility standard', 'To utility standard', 'To utility standard + monitoring'), qtyBasis: '1 per 2 transformers' }),

  // ── E4. Lighting ──────────────────────────────────────────────────────────
  item({ id: 'E-LTG-01', module: 'electrical', category: 'lighting', description: 'LED interior luminaires incl. drivers', unit: 'nr', material: 55, labourHours: 0.8, qualityFactor: [0.6, 1, 2.6], safetyCritical: false, spec: S('Economy LED panels', 'Branded LED downlights', 'Architectural LED, tunable white'), qtyBasis: 'Above-ground area ÷ m² per luminaire' }),
  item({ id: 'E-LTG-02', module: 'electrical', category: 'lighting', description: 'Car-park LED battens with occupancy sensors', unit: 'nr', material: 38, labourHours: 0.6, qualityFactor: [0.75, 1, 1.4], safetyCritical: false, spec: S('LED battens', 'LED battens + sensors', 'Networked LED battens'), qtyBasis: 'Parking area ÷ 14 m²' }),
  item({ id: 'E-LTG-03', module: 'electrical', category: 'lighting', description: 'Façade and landscape lighting', unit: 'm²', subcontract: 9, qualityFactor: [0.4, 1, 3.0], safetyCritical: false, spec: S('Entrance & signage only', 'Crown + entrance lighting', 'Dynamic RGBW façade lighting'), qtyBasis: 'Total façade area' }),
  item({ id: 'E-LTG-04', module: 'electrical', category: 'lighting', description: 'Lighting control system (DALI / KNX)', unit: 'm²', subcontract: 7, qualityFactor: [0.3, 1, 2.6], safetyCritical: false, spec: S('Timers + PIR in common areas', 'DALI in common areas', 'Full KNX / DALI-2 with scenes'), qtyBasis: 'Above-ground area × building-type coverage' }),

  // ── E5. Switches & sockets ────────────────────────────────────────────────
  item({ id: 'E-ACC-01', module: 'electrical', category: 'accessories', description: 'Light switches and dimmers', unit: 'nr', material: 6, labourHours: 0.35, qualityFactor: [0.6, 1, 3.0], safetyCritical: false, spec: S('Economy white plastic', 'Branded mid-range', 'Designer metal / smart switches'), qtyBasis: 'Luminaires × 0.35' }),
  item({ id: 'E-ACC-02', module: 'electrical', category: 'accessories', description: 'Socket outlets 13 A incl. USB variants', unit: 'nr', material: 8, labourHours: 0.45, qualityFactor: [0.6, 1, 2.8], safetyCritical: false, spec: S('Economy sockets', 'Branded sockets', 'Designer sockets with USB-C'), qtyBasis: 'Above-ground area ÷ m² per socket' }),
  item({ id: 'E-ACC-03', module: 'electrical', category: 'accessories', description: 'Isolators and power connections to MEP equipment', unit: 'nr', material: 45, labourHours: 1.5, qualityFactor: [0.8, 1, 1.3], safetyCritical: false, spec: S('Standard isolators', 'IP65 isolators', 'IP65 lockable isolators'), qtyBasis: 'Cooling TR ÷ 4 + 4 per floor' }),

  // ── E6. Cable trays & conduits ────────────────────────────────────────────
  item({ id: 'E-CON-01', module: 'electrical', category: 'containment', description: 'Hot-dip galvanised cable trays and ladders', unit: 'm', material: 22, labourHours: 0.35, equipment: 0.3, qualityFactor: [0.9, 1, 1.3], safetyCritical: false, spec: S('Pre-galvanised tray', 'HDG tray and ladder', 'HDG heavy-duty with covers'), qtyBasis: 'Gross area × 0.18 m/m²' }),
  item({ id: 'E-CON-02', module: 'electrical', category: 'containment', description: 'PVC / GI conduits and boxes', unit: 'm', material: 1.5, labourHours: 0.08, qualityFactor: [0.85, 1, 1.4], safetyCritical: false, spec: S('PVC conduit', 'Heavy-gauge PVC / GI exposed', 'GI conduit throughout'), qtyBasis: 'Gross area × 3.2 m/m²' }),
  item({ id: 'E-CON-03', module: 'electrical', category: 'containment', description: 'Cable trunking and floor boxes', unit: 'm', material: 14, labourHours: 0.3, qualityFactor: [0.85, 1, 1.5], safetyCritical: false, spec: S('PVC trunking', 'Steel trunking', 'Steel trunking + raised-floor boxes'), qtyBasis: 'Above-ground area × building-type factor' }),

  // ── E7. Earthing & lightning protection ───────────────────────────────────
  item({ id: 'E-EAR-01', module: 'electrical', category: 'earthing', description: 'Earth pits with copper rods and test chambers', unit: 'nr', subcontract: 650, qualityFactor: [1, 1, 1.15], safetyCritical: true, spec: S('Code-compliant (no downgrade)', 'Copper-bonded rods', 'Solid copper rods + ground enhancement'), qtyBasis: '2 per transformer + 2 per generator + 8' }),
  item({ id: 'E-EAR-02', module: 'electrical', category: 'earthing', description: 'Earthing conductors, bars and equipotential bonding', unit: 'm', material: 7, labourHours: 0.12, qualityFactor: [1, 1, 1.15], safetyCritical: true, spec: S('Code-compliant (no downgrade)', 'Copper tape / PVC-insulated', 'Copper tape, exothermic joints'), qtyBasis: 'Height × 4 + basement perimeter × 2 + 60 m per transformer + 200 m' }),
  item({ id: 'E-EAR-03', module: 'electrical', category: 'earthing', description: 'Lightning protection – air terminals, testing and certification', unit: 'lot', subcontract: 18000, qualityFactor: [1, 1, 1.2], safetyCritical: true, spec: S('BS EN 62305 compliant (no downgrade)', 'BS EN 62305 mesh system', 'BS EN 62305 + surge protection cascade'), qtyBasis: '1 per building' }),
  item({ id: 'E-EAR-04', module: 'electrical', category: 'earthing', description: 'Lightning down conductors', unit: 'm', material: 12, labourHours: 0.2, qualityFactor: [1, 1, 1.15], safetyCritical: true, spec: S('Code-compliant (no downgrade)', 'Copper tape', 'Copper tape, concealed'), qtyBasis: 'Height × max(4, perimeter ÷ 20)' }),

  // ── E8. Emergency lighting ────────────────────────────────────────────────
  item({ id: 'E-EMG-01', module: 'electrical', category: 'emergency', description: 'Emergency luminaires and illuminated exit signs', unit: 'nr', material: 85, labourHours: 0.7, qualityFactor: [1, 1, 1.3], safetyCritical: true, spec: S('Listed 3-hour fittings (no downgrade)', 'Listed 3-hour, self-test', 'Addressable self-test system'), qtyBasis: 'Gross area ÷ 30 m² + 10 per level' }),
  item({ id: 'E-EMG-02', module: 'electrical', category: 'emergency', description: 'Central battery / emergency lighting monitoring panels', unit: 'nr', subcontract: 14000, qualityFactor: [1, 1, 1.2], safetyCritical: true, spec: S('Code-compliant (no downgrade)', 'Central monitoring', 'Central battery + graphics'), qtyBasis: '1 + 1 per 10 floors' }),

  // ── E9. Fire alarm ────────────────────────────────────────────────────────
  item({ id: 'E-FA-01', module: 'electrical', category: 'fire_alarm', description: 'Addressable smoke / heat detectors incl. bases', unit: 'nr', material: 48, labourHours: 0.6, qualityFactor: [1, 1, 1.25], safetyCritical: true, spec: S('UL/EN 54 listed (no downgrade)', 'UL/EN 54 addressable', 'Multi-criteria detectors'), qtyBasis: 'Gross area ÷ 45 m²' }),
  item({ id: 'E-FA-02', module: 'electrical', category: 'fire_alarm', description: 'Manual call points, sounders and beacons', unit: 'nr', material: 55, labourHours: 0.7, qualityFactor: [1, 1, 1.2], safetyCritical: true, spec: S('UL/EN 54 listed (no downgrade)', 'UL/EN 54 listed', 'UL/EN 54, combined sounder-beacons'), qtyBasis: '8 per level' }),
  item({ id: 'E-FA-03', module: 'electrical', category: 'fire_alarm', description: 'Networked fire alarm control panels and graphics', unit: 'nr', subcontract: 16000, qualityFactor: [1, 1, 1.2], safetyCritical: true, spec: S('Listed panel (no downgrade)', 'Networked addressable panel', 'Networked panel + graphics workstation'), qtyBasis: '1 per 12 levels (min. 1)' }),
  item({ id: 'E-FA-04', module: 'electrical', category: 'fire_alarm', description: 'Voice evacuation / PA speakers and amplifiers', unit: 'nr', material: 70, labourHours: 0.7, qualityFactor: [1, 1, 1.25], safetyCritical: true, spec: S('EN 54-24 listed (no downgrade)', 'EN 54-24 speakers', 'EN 54-24 + zoned BGM'), qtyBasis: 'Gross area ÷ 60 m² (× 0.5 residential)' }),

  // ── E10. CCTV & access control ────────────────────────────────────────────
  item({ id: 'E-ELV-01', module: 'electrical', category: 'elv', description: 'IP CCTV cameras incl. PoE cabling', unit: 'nr', material: 380, labourHours: 2.0, qualityFactor: [0.65, 1, 1.8], safetyCritical: false, spec: S('2 MP fixed cameras', '4 MP cameras with analytics', '4K cameras, AI analytics'), qtyBasis: '4 per floor + 14 per basement + 24 external' }),
  item({ id: 'E-ELV-02', module: 'electrical', category: 'elv', description: 'CCTV recording, storage and control-room equipment', unit: 'lot', subcontract: 38000, qualityFactor: [0.7, 1, 1.8], safetyCritical: false, spec: S('NVR, 31 days', 'NVR, 90 days (local requirement)', 'Redundant VMS, video wall'), qtyBasis: '1 per building' }),
  item({ id: 'E-ELV-03', module: 'electrical', category: 'elv', description: 'Access-controlled doors incl. readers, locks, controllers', unit: 'nr', subcontract: 1400, qualityFactor: [0.7, 1, 1.7], safetyCritical: false, spec: S('Proximity card', 'Proximity + PIN', 'Mobile credential + biometrics'), qtyBasis: '2 per floor + 4 per basement + 12' }),
  item({ id: 'E-ELV-04', module: 'electrical', category: 'elv', description: 'Video intercom / guest-room management per unit', unit: 'unit', subcontract: 320, qualityFactor: [0.6, 1, 2.2], safetyCritical: false, spec: S('Audio intercom', 'IP video intercom', 'IP video + smart-home / GRMS'), qtyBasis: 'Units (commercial: 1 per floor)' }),
  item({ id: 'E-ELV-05', module: 'electrical', category: 'elv', description: 'Structured cabling, data network backbone and Wi-Fi', unit: 'm²', subcontract: 9, qualityFactor: [0.7, 1, 1.6], safetyCritical: false, spec: S('Cat6 to units', 'Cat6A + fibre backbone', 'Cat6A + fibre + managed Wi-Fi'), qtyBasis: 'Gross built-up area' }),

  // ── E11. Testing & commissioning ──────────────────────────────────────────
  item({ id: 'E-TNC-01', module: 'electrical', category: 'tnc', description: 'Testing and commissioning of LV and ELV installations', unit: 'm²', subcontract: 2.2, qualityFactor: [1, 1, 1.2], safetyCritical: true, spec: S('Full statutory testing (no downgrade)', 'Full statutory testing', 'Testing + third-party witness'), qtyBasis: 'Gross built-up area' }),
  item({ id: 'E-TNC-02', module: 'electrical', category: 'tnc', description: 'Integrated life-safety systems test (cause & effect)', unit: 'lot', subcontract: 25000, qualityFactor: [1, 1, 1.2], safetyCritical: true, spec: S('Mandatory (no downgrade)', 'Integrated test', 'Integrated test + independent commissioning agent'), qtyBasis: '1 per building' }),
  item({ id: 'E-TNC-03', module: 'electrical', category: 'tnc', description: 'Utility and civil-defence inspections and approvals', unit: 'lot', subcontract: 30000, qualityFactor: [1, 1, 1], safetyCritical: true, spec: S('Mandatory', 'Mandatory', 'Mandatory'), qtyBasis: '1 per building' }),
  item({ id: 'E-TNC-04', module: 'electrical', category: 'tnc', description: 'As-built drawings, O&M manuals and operator training', unit: 'lot', subcontract: 15000, qualityFactor: [0.8, 1, 1.3], safetyCritical: false, spec: S('PDF as-builts', 'As-builts + O&M', 'BIM as-builts + training programme'), qtyBasis: '1 per building' }),
];

export const RATE_BY_ID: Record<string, RateItem> = Object.fromEntries(RATE_LIBRARY.map((r) => [r.id, r]));
