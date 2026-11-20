import type { Geometry, ProjectInputs } from '../../types';
import { num } from '../../engine/format';

/**
 * Live elevation drawing of the tower. Redraws from the inputs, so the estimator
 * can see at a glance what is being priced: floors, basements, height, depth.
 */
export function Elevation({ inputs, geometry, className }: { inputs: ProjectInputs; geometry: Geometry; className?: string }) {
  const W = 300;
  const Hsvg = 360;
  const groundY = 250;
  const aboveH = 205; // drawable height for tower
  const belowH = 90;
  const maxDepth = 6 * 4 + 3.5; // deepest possible, keeps scale stable
  const depthPx = Math.min(belowH, (geometry.excavationDepth / maxDepth) * belowH + 14);
  const floorPx = aboveH / inputs.floors;
  const towerW = 92;
  const towerX = 70;
  const baseW = inputs.basements > 0 ? towerW * 1.55 : towerW * 1.25;
  const baseX = towerX + towerW / 2 - baseW / 2;
  const top = groundY - aboveH;
  const glazing = Math.round(geometry.glazingArea / Math.max(1, geometry.facadeArea) * 10);

  return (
    <svg viewBox={`0 0 ${W} ${Hsvg}`} className={className} role="img" aria-label={`Elevation: ${inputs.floors} floors, ${inputs.basements} basements, ${num(geometry.buildingHeight)} m high`}>
      <defs>
        <pattern id="earth" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="#c6ccc8" strokeWidth="1.2" />
        </pattern>
      </defs>

      {/* ground */}
      <rect x="0" y={groundY} width={W} height={Hsvg - groundY} fill="url(#earth)" opacity="0.55" />
      {/* excavation / basements */}
      <rect x={baseX} y={groundY} width={baseW} height={depthPx} fill="#f6f7f6" stroke="#3d4b56" strokeWidth="1.2" />
      {Array.from({ length: inputs.basements }).map((_, b) => {
        const h = (depthPx - 10) / Math.max(1, inputs.basements);
        return <line key={b} x1={baseX} x2={baseX + baseW} y1={groundY + h * (b + 1)} y2={groundY + h * (b + 1)} stroke="#c6ccc8" strokeWidth="1" />;
      })}
      {/* raft */}
      <rect x={baseX - 4} y={groundY + depthPx - 10} width={baseW + 8} height="10" fill="#3d4b56" />
      {/* piles */}
      {Array.from({ length: 7 }).map((_, k) => {
        const x = baseX + 6 + (k * (baseW - 12)) / 6;
        return <line key={k} x1={x} x2={x} y1={groundY + depthPx} y2={Math.min(Hsvg - 6, groundY + depthPx + 34)} stroke="#6b7780" strokeWidth="2" strokeDasharray="3 2" />;
      })}

      {/* tower */}
      <rect x={towerX} y={top} width={towerW} height={aboveH} fill="#ffffff" stroke="#16222c" strokeWidth="1.4" />
      {Array.from({ length: inputs.floors }).map((_, f) => {
        const y = top + f * floorPx;
        return (
          <g key={f}>
            <line x1={towerX} x2={towerX + towerW} y1={y} y2={y} stroke="#dde1de" strokeWidth="0.8" />
            {floorPx > 4 &&
              Array.from({ length: 6 }).map((__, w) => (
                <rect key={w} x={towerX + 6 + w * 14} y={y + floorPx * 0.22} width={(10 * glazing) / 6} height={floorPx * 0.56} fill="#d7ebe9" />
              ))}
          </g>
        );
      })}
      {/* crown */}
      <rect x={towerX + 18} y={top - 12} width={towerW - 36} height="12" fill="#16222c" />
      <line x1={towerX + towerW / 2} x2={towerX + towerW / 2} y1={top - 30} y2={top - 12} stroke="#16222c" strokeWidth="1.4" />
      {/* ground line */}
      <line x1="0" x2={W} y1={groundY} y2={groundY} stroke="#a87a2c" strokeWidth="2" />

      {/* dimensions */}
      <g stroke="#6b7780" strokeWidth="1" fill="none">
        <line x1={towerX + towerW + 24} x2={towerX + towerW + 24} y1={top} y2={groundY} />
        <line x1={towerX + towerW + 19} x2={towerX + towerW + 29} y1={top} y2={top} />
        <line x1={towerX + towerW + 19} x2={towerX + towerW + 29} y1={groundY} y2={groundY} />
        {inputs.basements > 0 && (
          <>
            <line x1={baseX + baseW + 12} x2={baseX + baseW + 12} y1={groundY} y2={groundY + depthPx} />
            <line x1={baseX + baseW + 7} x2={baseX + baseW + 17} y1={groundY + depthPx} y2={groundY + depthPx} />
          </>
        )}
      </g>
      <g fontFamily="inherit" fill="#16222c">
        <text x={towerX + towerW + 34} y={top + aboveH / 2 - 8} fontSize="20" fontWeight="600" style={{ fontVariantNumeric: 'tabular-nums' }}>{num(geometry.buildingHeight)} m</text>
        <text x={towerX + towerW + 34} y={top + aboveH / 2 + 10} fontSize="12" fill="#3d4b56">{inputs.floors} floors</text>
        <text x={towerX + towerW + 34} y={top + aboveH / 2 + 25} fontSize="12" fill="#6b7780">@ {inputs.floorHeight} m</text>
        {inputs.basements > 0 ? (
          <text x={baseX + baseW + 20} y={groundY + depthPx / 2 + 4} fontSize="11.5" fill="#3d4b56">{inputs.basements} B · {num(geometry.excavationDepth, 1)} m dig</text>
        ) : (
          <text x={baseX + baseW + 8} y={groundY + 22} fontSize="11.5" fill="#3d4b56">No basement · raft</text>
        )}
        <text x="8" y={groundY - 6} fontSize="10.5" fill="#7d5a1f">±0.00</text>
        <text x={towerX} y={Hsvg - 4} fontSize="11" fill="#6b7780">Plate {num(geometry.plateArea)} m² · façade {num(geometry.facadeArea)} m²</text>
      </g>
    </svg>
  );
}
