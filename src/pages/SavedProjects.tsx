import { useRef, useState } from 'react';
import { Copy, Download, FolderOpen, Plus, Save, Trash2, Upload } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { COUNTRIES } from '../data/countries';
import { TYPE_COEFFICIENTS } from '../data/defaults';
import { estimate } from '../engine/estimate';
import { validateInputs } from '../engine/validation';
import { compact } from '../engine/format';
import { downloadBlob, slug } from '../store/storage';
import { Badge, Button, PageHeader, Panel } from '../components/ui';
import type { Project } from '../types';

export function SavedProjects() {
  const saved = useProjectStore((s) => s.saved);
  const current = useProjectStore((s) => s.project);
  const saveCurrent = useProjectStore((s) => s.saveCurrent);
  const loadProject = useProjectStore((s) => s.loadProject);
  const duplicateProject = useProjectStore((s) => s.duplicateProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const createProject = useProjectStore((s) => s.createProject);
  const importProjects = useProjectStore((s) => s.importProjects);
  const notify = useProjectStore((s) => s.notify);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const total = (p: Project) => {
    if (validateInputs(p.inputs).length) return null;
    const r = estimate(p);
    return r.scenarios[p.inputs.quality].total;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saved estimates"
        lead="Estimates are stored in this browser. Export them to a file to back up or share with a colleague."
        actions={
          <>
            <Button size="sm" icon={<Plus size={14} />} onClick={createProject}>New estimate</Button>
            <Button size="sm" variant="primary" icon={<Save size={14} />} onClick={saveCurrent}>Save current</Button>
          </>
        }
      />

      <Panel
        title={`${saved.length} saved estimate${saved.length === 1 ? '' : 's'}`}
        actions={
          <>
            <Button size="sm" variant="ghost" icon={<Upload size={14} />} onClick={() => fileRef.current?.click()}>Import</Button>
            <Button size="sm" variant="ghost" icon={<Download size={14} />} disabled={!saved.length} onClick={() => downloadBlob(new Blob([JSON.stringify(saved, null, 2)], { type: 'application/json' }), 'buildcost-estimates.json')}>Export all</Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const data = JSON.parse(await f.text());
                  const n = importProjects(Array.isArray(data) ? data : [data]);
                  notify(n ? `Imported ${n} estimate${n > 1 ? 's' : ''}` : 'No estimates found in that file');
                } catch {
                  notify('That file is not a BuildCost AI export');
                }
                e.target.value = '';
              }}
            />
          </>
        }
        bodyClass="p-0"
      >
        {saved.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FolderOpen className="mx-auto text-concrete-300" size={34} />
            <p className="mt-3 text-[14px] text-ink-soft">No saved estimates yet. Save the current one to keep a copy you can come back to.</p>
            <Button className="mt-4" variant="primary" size="sm" icon={<Save size={14} />} onClick={saveCurrent}>Save “{current.inputs.name}”</Button>
          </div>
        ) : (
          <ul className="divide-y divide-concrete-200">
            {saved.map((p) => {
              const t = total(p);
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink">{p.inputs.name}</span>
                      {p.id === current.id && <Badge tone="teal">Open</Badge>}
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-ink-mute">
                      {TYPE_COEFFICIENTS[p.inputs.buildingType].label} · {p.inputs.floors}F + {p.inputs.basements}B · {p.inputs.city}, {COUNTRIES[p.inputs.country].name} · updated {new Date(p.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">{t !== null ? compact(t, p.inputs.displayCurrency) : 'Invalid inputs'}</div>
                    <div className="text-[12px] capitalize text-ink-mute">{p.inputs.quality} scenario</div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" onClick={() => loadProject(p.id)}>Open</Button>
                    <Button size="sm" variant="ghost" aria-label="Duplicate" icon={<Copy size={14} />} onClick={() => duplicateProject(p.id)} />
                    <Button size="sm" variant="ghost" aria-label="Export" icon={<Download size={14} />} onClick={() => downloadBlob(new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' }), `${slug(p.inputs.name)}.json`)} />
                    {pendingDelete === p.id ? (
                      <Button size="sm" variant="danger" icon={<Trash2 size={14} />} onClick={() => { deleteProject(p.id); setPendingDelete(null); }} onBlur={() => setPendingDelete(null)} autoFocus>Delete</Button>
                    ) : (
                      <Button size="sm" variant="ghost" aria-label="Delete" icon={<Trash2 size={14} />} onClick={() => setPendingDelete(p.id)} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
