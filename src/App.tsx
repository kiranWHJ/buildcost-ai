import { useProjectStore } from './store/useProjectStore';
import { EstimateProvider, useEstimate } from './store/EstimateContext';
import { Shell } from './components/layout/Shell';
import { Dashboard } from './pages/Dashboard';
import { ProjectSetup } from './pages/ProjectSetup';
import { BOQ } from './pages/BOQ';
import { Compare } from './pages/Compare';
import { RateLibrary } from './pages/RateLibrary';
import { RiskPage } from './pages/Risk';
import { Assumptions } from './pages/Assumptions';
import { SavedProjects } from './pages/SavedProjects';

function Routes() {
  const page = useProjectStore((s) => s.page);
  switch (page) {
    case 'setup': return <ProjectSetup />;
    case 'boq': return <BOQ />;
    case 'compare': return <Compare />;
    case 'rates': return <RateLibrary />;
    case 'risk': return <RiskPage />;
    case 'assumptions': return <Assumptions />;
    case 'projects': return <SavedProjects />;
    default: return <Dashboard />;
  }
}

function Inner() {
  const project = useProjectStore((s) => s.project);
  const notify = useProjectStore((s) => s.notify);
  const { result } = useEstimate();

  const guard = async (fn: () => Promise<boolean>, ok: string) => {
    if (!result) return;
    try {
      if (await fn()) notify(ok);
    } catch (e) {
      console.error(e);
      notify('Export failed – see the browser console for details');
    }
  };

  return (
    <Shell
      onExcel={() => guard(async () => (await import('./export/excel')).exportExcel(project, result!), 'Excel BOQ downloaded')}
      onPdf={() => guard(async () => (await import('./export/pdf')).exportPdf(project, result!), 'PDF tender estimate downloaded')}
    >
      <Routes />
    </Shell>
  );
}

export default function App() {
  return (
    <EstimateProvider>
      <Inner />
    </EstimateProvider>
  );
}
