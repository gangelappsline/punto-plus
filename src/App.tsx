import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppSplash } from './components/AppSplash';
import { ActivityPage, CardsPage, ExplorePage, RewardsPage } from './features/CustomerPages';
import { AdminDashboard } from './features/AdminDashboard';
import { AdminLayout } from './features/AdminShell';
import { CustomerLayout } from './features/CustomerShell';
import { GuestOnly, PanelGate } from './features/Guards';
import { LandingPage } from './features/LandingPage';
import { Login } from './features/Login';
import { NotFoundPage } from './features/NotFoundPage';
const BusinessPage = lazy(() =>
  import('./features/BusinessPage').then((m) => ({ default: m.BusinessPage })),
);
const Register = lazy(() => import('./features/Register').then((m) => ({ default: m.Register })));

/**
 * Enrutado de la aplicación.
 *
 * `/app` (cliente) y `/admin` (negocio) son dos layouts independientes: cada
 * uno monta el suyo detrás de un `PanelGate`, que con la API real solo deja
 * pasar con el token guardado al iniciar sesión y el rol correspondiente.
 * `/login` y `/registro` son públicas y, con la sesión iniciada, devuelven al
 * panel de la cuenta.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <GuestOnly>
            <Login />
          </GuestOnly>
        }
      />
      <Route
        path="/registro"
        element={
          <GuestOnly>
            <Suspense fallback={<AppSplash message="Preparando tu registro…" />}>
              <Register />
            </Suspense>
          </GuestOnly>
        }
      />
      <Route
        path="/app"
        element={
          <PanelGate panel="customer">
            <CustomerLayout />
          </PanelGate>
        }
      >
        <Route index element={<CardsPage />} />
        <Route path="explorar" element={<ExplorePage />} />
        <Route path="recompensas" element={<RewardsPage />} />
        <Route path="actividad" element={<ActivityPage />} />
      </Route>
      <Route
        path="/admin"
        element={
          <PanelGate panel="business">
            <AdminLayout />
          </PanelGate>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route
          path="negocio"
          element={
            <Suspense fallback={<AppSplash message="Preparando tu negocio…" />}>
              <BusinessPage />
            </Suspense>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
