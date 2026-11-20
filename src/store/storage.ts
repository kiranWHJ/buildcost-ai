import type { Project } from '../types';

/**
 * Browser persistence. localStorage can be unavailable (private mode, sandboxed
 * iframes) so every access is guarded – the app keeps working in memory.
 */
const CURRENT_KEY = 'buildcost-ai:current';
const SAVED_KEY = 'buildcost-ai:saved';

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const storage = {
  loadCurrent: () => read<Project>(CURRENT_KEY),
  saveCurrent: (p: Project) => write(CURRENT_KEY, p),
  loadSaved: () => read<Project[]>(SAVED_KEY) ?? [],
  saveSaved: (list: Project[]) => write(SAVED_KEY, list),
};

type DownloadsNs = { save: (r: { filename: string; data: Blob }) => Promise<unknown> };
type ClaudeHost = { use: (name: string) => Promise<DownloadsNs | null> };

/**
 * Save a generated file. Inside a claude.ai artifact (sandboxed frame) direct downloads
 * are blocked, so the host `downloads` capability is used when present; in a normal
 * browser a temporary <a download> link is clicked. Resolves true if the file was handed over.
 */
export async function downloadBlob(blob: Blob, filename: string): Promise<boolean> {
  const host = (window as unknown as { claude?: ClaudeHost }).claude;
  if (host?.use) {
    try {
      const d = await host.use('downloads');
      if (d) {
        await d.save({ filename, data: blob });
        return true;
      }
    } catch (e) {
      if ((e as { code?: string })?.code === 'declined') return false;
      // otherwise fall through to a normal download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'project';
}
