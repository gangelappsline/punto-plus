import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppSplash } from './components/AppSplash';
import {
  ActivityPage,
  CardsPage,
  NearbyPage,
  PromotionsPage,
  RewardsPage,
} from './features/CustomerPages';
import { BusinessDashboard } from './features/BusinessDashboard';
import { BusinessLayout } from './features/BusinessShell';
import { AdminDashboard } from './features/AdminDashboard';
import { AdminLayout } from './features/AdminShell';
import { CustomerLayout } from './features/CustomerShell';
import { MenuPage } from './features/MenuPage';
import { GuestOnly, PanelGate } from './features/Guards';
import { LandingPage } from './features/LandingPage';
import { Login } from './features/Login';
import { NotFoundPage } from './features/NotFoundPage';
const BusinessPage = lazy(() =>
  import('./features/BusinessPage').then((m) => ({ default: m.BusinessPage })),
);
const BusinessMenuWizard = lazy(() =>
  import('./features/BusinessMenuWizard').then((m) => ({ default: m.BusinessMenuWizard })),
);
const AdminCategoriesPage = lazy(() =>
  import('./features/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage })),
);
const AdminBusinessesPage = lazy(() =>
  import('./features/AdminBusinessesPage').then((m) => ({ default: m.AdminBusinessesPage })),
);
const Register = lazy(() => import('./features/Register').then((m) => ({ default: m.Register })));

/**
 * Enrutado de la aplicación.
 *
 * `/app` (cliente), `/business` (negocio) y `/admin` (administrador) son
 * layouts independientes, cada uno protegido por el rol correspondiente.
 * `/login` y `/registro` son públicas y, con la sesión iniciada, devuelven al
 * panel de la cuenta.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/menu/:businessId" element={<MenuPage />} />
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
        <Route path="promociones" element={<PromotionsPage />} />
        <Route path="cerca-de-mi" element={<NearbyPage />} />
        <Route path="explorar" element={<Navigate to="/app/promociones" replace />} />
        <Route path="recompensas" element={<RewardsPage />} />
        <Route path="actividad" element={<ActivityPage />} />
      </Route>
      <Route
        path="/business"
        element={
          <PanelGate panel="business">
            <BusinessLayout />
          </PanelGate>
        }
      >
        <Route index element={<BusinessDashboard />} />
        <Route
          path="mi-menu"
          element={
            <Suspense fallback={<AppSplash message="Preparando tu menú…" />}>
              <BusinessMenuWizard />
            </Suspense>
          }
        />
        <Route
          path="negocio"
          element={
            <Suspense fallback={<AppSplash message="Preparando tu negocio…" />}>
              <BusinessPage />
            </Suspense>
          }
        />
        <Route path="onboarding" element={<Navigate to="/business/mi-menu" replace />} />
      </Route>
      <Route
        path="/admin"
        element={
          <PanelGate panel="admin">
            <AdminLayout />
          </PanelGate>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route
          path="categorias"
          element={
            <Suspense fallback={<AppSplash message="Preparando las categorías…" />}>
              <AdminCategoriesPage />
            </Suspense>
          }
        />
        <Route
          path="negocios"
          element={
            <Suspense fallback={<AppSplash message="Preparando los negocios…" />}>
              <AdminBusinessesPage />
            </Suspense>
          }
        />
      </Route>
      <Route path="/:businessSlug" element={<MenuPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
