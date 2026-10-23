import { AppChrome } from './components/layout/AppChrome';
import { AppOverlays } from './components/layout/AppOverlays';
import { PlannerContent } from './components/layout/PlannerContent';
import { useAppController } from './hooks/useAppController';

export default function App() {
  const app = useAppController();
  if (!app.perfilCargado) return <div className="app-loading" role="status">Cargando planificación…</div>;

  return <div className="academic-app">
    <AppChrome app={app} />
    <PlannerContent app={app} />
    <AppOverlays app={app} />
  </div>;
}
