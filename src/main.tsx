import { StrictMode, Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { Toaster } from 'sonner';
import App from './App';
import { hydrateAuthOnce } from './stores/auth';
import './index.css';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
});
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="app-loading">
        <img src="/icon.svg" alt="" />
        <h1>Necesitamos un nuevo comienzo.</h1>
        <p>Algo no salió como esperábamos. Tus datos guardados siguen aquí.</p>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-[9px] bg-brand px-[18px] py-[11px] text-xs font-[650] text-white shadow-[0_3px_5px_#1b7f8615] hover:bg-brand-dark"
          onClick={() => window.location.reload()}
        >
          Volver a intentar
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
// La sesión guardada se lee antes del primer render: así los guards de los
// paneles deciden con el token real desde el arranque, sin redirecciones de ida
// y vuelta ni peticiones innecesarias.
hydrateAuthOnce();

// La página trae un respaldo por si el bundle no llega a ejecutarse (versión
// vieja en caché, fragmento 404 tras un despliegue…). Al montar, se retira.
document.documentElement.dataset.appBooted = 'true';
document.getElementById('boot-fallback')?.remove();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MotionConfig reducedMotion="user">
            <App />
          </MotionConfig>
        </BrowserRouter>
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{ style: { fontFamily: 'DM Sans, sans-serif' } }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
