import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, LayoutDashboard, LogOut, ScanLine, Store } from 'lucide-react';
import { toast } from 'sonner';
import { useLogout } from '../lib/session';
import { demoUser, useAuth } from '../stores/auth';
import { isDemo } from '../lib/utils';
import { Button } from '../components/ui/button';
import logo from '../assets/images/logo_2.webp';

const adminNavigation = [
  { path: '/admin', icon: LayoutDashboard, title: 'Resumen', end: true },
  { path: '/admin/negocio', icon: Store, title: 'Mi negocio', end: false },
];

/**
 * Layout del panel de negocio: barra lateral, barra superior y navegación
 * móvil propias. Independiente del panel de cliente y protegido por
 * `PanelGate`, que exige el token guardado al iniciar sesión y el rol
 * `business` o `admin`.
 */
export function AdminLayout() {
  const realUser = useAuth((s) => s.user);
  // Con la API real el guard garantiza el usuario; en demo se usa el de muestra.
  const user = realUser ?? demoUser;
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useLogout();
  const title =
    adminNavigation.find((n) => n.path === location.pathname)?.title || 'Administración';
  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.title = `${title} · Administración · Punto Plus`;
  }, [location.pathname, title]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <aside className="sidebar admin-sidebar">
        <Link to="/" className="admin-brand block" aria-label="Punto Plus · Inicio">
          <img src={logo} alt="Punto Plus" className="block mx-auto" />
        </Link>
        <div className="admin-label">PANEL DE ADMINISTRACIÓN</div>
        <nav className="admin-nav" aria-label="Navegación de administración">
          {adminNavigation.map(({ path, icon: Icon, title: label, end }) => (
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
        <div className="admin-footer">PUNTO PLUS® · ADMINISTRACIÓN</div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <span className="breadcrumb">
              Administración <ArrowUpRight size={13} /> <strong>{title}</strong>
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
          <div className="main-topline">
            <span className="section-eyebrow">
              {isDemo ? 'ADMINISTRACIÓN EN DEMOSTRACIÓN' : 'TU NEGOCIO, EN ORDEN'}
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
      <nav className="bottom-nav" aria-label="Navegación móvil">
        {adminNavigation.map(({ path, icon: Icon, title: label, end }) => (
          <NavLink key={path} end={end} to={path}>
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
