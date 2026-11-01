import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Building2,
  LayoutDashboard,
  LogOut,
  Menu,
  ScanLine,
  Tags,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { useLogout } from '../lib/session';
import { isDemo } from '../lib/utils';
import { demoUser, useAuth } from '../stores/auth';
import logo from '../assets/images/logo_2.webp';

/** Estructura exclusiva para cuentas con rol `admin` (administración de plataforma). */
export function AdminLayout() {
  const realUser = useAuth((state) => state.user);
  const user = realUser ?? demoUser;
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useLogout();
  const [mobileNav, setMobileNav] = useState(false);
  const title = location.pathname.startsWith('/admin/categorias')
    ? 'Categorías'
    : location.pathname.startsWith('/admin/negocios')
      ? 'Negocios'
      : 'Resumen';

  useEffect(() => {
    setMobileNav(false);
    window.scrollTo({ top: 0 });
    document.title = `${title} · Administración de plataforma · Punto Plus`;
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
        <div className="admin-label">ADMINISTRACIÓN DE PLATAFORMA</div>
        <nav id="admin-navigation" className="admin-nav" aria-label="Navegación de administración">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={19} strokeWidth={1.65} />
            <span>Resumen</span>
          </NavLink>
          <NavLink
            to="/admin/categorias"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            <Tags size={19} strokeWidth={1.65} />
            <span>Categorías</span>
          </NavLink>
          <NavLink
            to="/admin/negocios"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            <Building2 size={19} strokeWidth={1.65} />
            <span>Negocios</span>
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="admin-user-chip">
            <span className="avatar">{user.name[0]}</span>
            <span>
              <strong>{user.name}</strong>
              <small>{isDemo ? 'Administrador · Demostración' : 'Administrador'}</small>
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
        <div className="admin-footer">PUNTO PLUS® · ADMINISTRACIÓN DE PLATAFORMA</div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="icon-button mobile-menu"
              aria-label="Mostrar opciones del menú"
              aria-controls="admin-navigation"
              aria-expanded={mobileNav}
              onClick={() => setMobileNav(true)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              Administración de plataforma <ArrowUpRight size={13} /> <strong>{title}</strong>
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
            <span className="avatar small-avatar" aria-label={`Sesión de ${user.name}`}>
              {user.name[0]}
            </span>
          </div>
        </header>
        <main id="main-content">
          <div className="main-topline">
            <span className="section-eyebrow">CONSOLA DE ADMINISTRACIÓN</span>
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
