import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  LayoutDashboard,
  LogOut,
  Menu,
  ScanLine,
  Store,
  Utensils,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLogout } from '../lib/session';
import { demoUser, useAuth } from '../stores/auth';
import { isDemo } from '../lib/utils';
import { Button } from '../components/ui/button';
import logo from '../assets/images/logo_2.webp';

const businessNavigation = [
  { path: '/business', icon: LayoutDashboard, title: 'Resumen', end: true },
  { path: '/business/mi-menu', icon: Utensils, title: 'Mi menú', end: false },
  { path: '/business/negocio', icon: Store, title: 'Mi negocio', end: false },
];

/**
 * Layout del panel de negocio: barra lateral, barra superior y navegación
 * móvil propias. Independiente del panel de cliente y protegido por
 * `PanelGate`, que exige el token guardado al iniciar sesión y el rol
 * `business`.
 */
export function BusinessLayout() {
  const realUser = useAuth((s) => s.user);
  // Con la API real el guard garantiza el usuario; en demo se usa el de muestra.
  const user = realUser ?? demoUser;
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useLogout();
  const [mobileNav, setMobileNav] = useState(false);
  const title = businessNavigation.find((n) => n.path === location.pathname)?.title || 'Negocio';
  useEffect(() => {
    setMobileNav(false);
    window.scrollTo({ top: 0 });
    document.title = `${title} · Negocio · Punto Plus`;
  }, [location.pathname, title]);
  useEffect(() => {
    if (!mobileNav) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNav(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileNav]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      {mobileNav && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Ocultar opciones del menú"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside className={`sidebar admin-sidebar ${mobileNav ? 'mobile-open' : ''}`}>
        <button
          type="button"
          className="mobile-sidebar-close icon-button"
          aria-label="Ocultar opciones del menú"
          onClick={() => setMobileNav(false)}
        >
          <X size={18} />
        </button>
        <Link to="/" className="admin-brand block" aria-label="Punto Plus · Inicio">
          <img src={logo} alt="Punto Plus" className="block mx-auto" />
        </Link>
        <div className="admin-label">PANEL DE NEGOCIO</div>
        <nav id="business-navigation" className="admin-nav" aria-label="Navegación de negocio">
          {businessNavigation.map(({ path, icon: Icon, title: label, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} strokeWidth={1.65} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="admin-user-chip">
            <span className="avatar">{user.name[0]}</span>
            <span>
              <strong>{user.name}</strong>
              <small>{isDemo ? 'Negocio · Demostración' : 'Cuenta de negocio'}</small>
            </span>
          </div>
          {!isDemo && (
            <Button
              variant="ghost"
              className="full-width mt-4"
              disabled={logout.isPending}
              onClick={() =>
                logout.mutate(undefined, {
                  onError: () =>
                    toast.error('No pudimos revocar la sesión del servidor; inténtalo de nuevo.'),
                  onSettled: () => navigate('/'),
                })
              }
            >
              <LogOut size={16} /> {logout.isPending ? 'Cerrando…' : 'Cerrar sesión'}
            </Button>
          )}
        </div>
        <div className="admin-footer">PUNTO PLUS® · NEGOCIO</div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="icon-button mobile-menu"
              aria-label="Mostrar opciones del menú"
              aria-controls="business-navigation"
              aria-expanded={mobileNav}
              onClick={() => setMobileNav(true)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              Mi negocio <ArrowUpRight size={13} /> <strong>{title}</strong>
            </span>
            <Link to="/" className="mobile-brand" aria-label="Punto Plus · Inicio">
              <img src={logo} alt="Punto Plus" />
            </Link>
          </div>
          <div className="header-actions">
            <Link to="/" className="admin-topbar-link">
              <ScanLine size={14} /> Ir al sitio
            </Link>
            {isDemo && (
              <span className="demo-indicator">
                <span /> Demo
              </span>
            )}
            <button className="avatar small-avatar" aria-label="Mi perfil">
              {user.name[0]}
            </button>
          </div>
        </header>
        <main id="main-content">
          <div className="main-topline" style={{ display: 'none' }}>
            <span className="section-eyebrow">
              {isDemo ? 'NEGOCIO EN DEMOSTRACIÓN' : 'TU NEGOCIO, EN ORDEN'}
            </span>
          </div>
          <Outlet />
          <footer className="main-footer">
            <span>© {new Date().getFullYear()} Punto Plus. Lo bueno está cerca.</span>
            <Link to="/" className="admin-topbar-link">
              Ir al sitio <ArrowUpRight size={12} />
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
}
