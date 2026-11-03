import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppSplash } from './components/AppSplash';
import { CardsPage, NearbyPage, PromotionsPage } from './features/CustomerPages';
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
import { MenuPro } from './features/public-menu/MenuPro';
const MenuBuilder = lazy(() =>
  import('./features/MenuBuilder').then((m) => ({ default: m.MenuBuilder })),
);
const PublicMenuLayout = lazy(() =>
  import('./features/public-menu/PublicMenuLayout').then((m) => ({ default: m.PublicMenuLayout })),
);
const PublicMenuOverview = lazy(() =>
  import('./features/public-menu/Overview').then((m) => ({ default: m.Overview })),
);
const PublicMenuCatalog = lazy(() =>
  import('./features/public-menu/Catalog').then((m) => ({ default: m.Catalog })),
);
const PublicMenuDish = lazy(() =>
  import('./features/public-menu/DishDetail').then((m) => ({ default: m.DishDetail })),
);
const PublicMenuCart = lazy(() =>
  import('./features/public-menu/Cart').then((m) => ({ default: m.Cart })),
);
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
      {/* Menú público por enlace corto: /menu/<slug>. */}
      <Route
        path="/menu/:businessSlug"
        element={
          <Suspense fallback={<AppSplash message="Preparamos algo rico para ti…" />}>
            <PublicMenuLayout />
          </Suspense>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<AppSplash message="Preparamos algo rico para ti…" />}>
              <PublicMenuOverview />
            </Suspense>
          }
        />
        <Route
          path="menu"
          element={
            <Suspense fallback={<AppSplash message="Abriendo la carta…" />}>
              <PublicMenuCatalog />
            </Suspense>
          }
        />
        <Route
          path="categoria/:categorySlug"
          element={
            <Suspense fallback={<AppSplash message="Abriendo la carta…" />}>
              <PublicMenuCatalog />
            </Suspense>
          }
        />
        <Route
          path="platillo/:dishSlug"
          element={
            <Suspense fallback={<AppSplash message="Preparando el platillo…" />}>
              <PublicMenuDish />
            </Suspense>
          }
        />
        <Route
          path="platillo/:dishSlug/:extra"
          element={
            <Suspense fallback={<AppSplash message="Preparando el platillo…" />}>
              <PublicMenuDish />
            </Suspense>
          }
        />
        <Route
          path="carrito"
          element={
            <Suspense fallback={<AppSplash message="Armando tu pedido…" />}>
              <PublicMenuCart />
            </Suspense>
          }
        />
      </Route>
      <Route path="/menu/:businessId" element={<MenuPage />} />
      <Route path="/menu-pro" element={<MenuPro />} />
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
      {/* Creador público: cualquiera arma su menú, con o sin cuenta. */}
      <Route
        path="/crear-menu"
        element={
          <Suspense fallback={<AppSplash message="Armando tu menú…" />}>
            <MenuBuilder publicRoute />
          </Suspense>
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
        <Route path="recompensas" element={<Navigate to="/app" replace />} />
        <Route path="actividad" element={<Navigate to="/app" replace />} />
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
        <Route path="crear" element={<Navigate to="/crear-menu" replace />} />
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
