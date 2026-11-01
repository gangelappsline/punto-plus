import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Building2, LayoutDashboard, LogOut, ScanLine, Tags } from 'lucide-react';
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
  const title = location.pathname.startsWith('/admin/categorias')
    ? 'Categorías'
    : location.pathname.startsWith('/admin/negocios')
      ? 'Negocios'
      : 'Resumen';

  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.title = `${title} · Administración de plataforma · Punto Plus`;
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <aside className="sidebar admin-sidebar">
        <Link to="/" className="admin-brand block" aria-label="Punto Plus · Inicio">
          <img src={logo} alt="Punto Plus" className="block mx-auto" />
        </Link>
        <div className="admin-label">ADMINISTRACIÓN DE PLATAFORMA</div>
        <nav className="admin-nav" aria-label="Navegación de administración">
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
      <nav className="bottom-nav" aria-label="Navegación móvil">
        <NavLink to="/admin" end>
          <LayoutDashboard size={21} />
          <span>Resumen</span>
        </NavLink>
        <NavLink to="/admin/categorias">
          <Tags size={21} />
          <span>Categorías</span>
        </NavLink>
        <NavLink to="/admin/negocios">
          <Building2 size={21} />
          <span>Negocios</span>
        </NavLink>
      </nav>
    </div>
  );
}
