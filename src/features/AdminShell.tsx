import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Gift,
  Heart,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Palette,
  ScanLine,
  Stamp,
  Store,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth, demoUser } from '../stores/auth';
import { useLoyalty } from '../lib/queries';
import { isDemo } from '../lib/utils';
import { api } from '../services/api';
import { Button } from '../components/ui/button';
import logo from '../assets/images/logo-alpha.webp';

const adminNavigation = [
  { path: '/admin', icon: LayoutDashboard, title: 'Resumen', end: true },
  { path: '/admin/negocio', icon: Store, title: 'Mi negocio', end: false },
];

export function AdminLayout() {
  const realUser = useAuth((s) => s.user);
  const user = isDemo ? demoUser : realUser!;
  const location = useLocation();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
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
        <Link to="/" className="admin-brand" aria-label="Punto Plus · Inicio">
          <img src={logo} alt="Punto Plus" />
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
          <NavLink to="/app" className="admin-nav-item">
            <Users size={19} strokeWidth={1.65} />
            <span>Panel de clientes</span>
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
              disabled={loggingOut}
              onClick={async () => {
                setLoggingOut(true);
                try {
                  await api.logout();
                } catch {
                  toast.error('No pudimos revocar la sesión del servidor; inténtalo de nuevo.');
                } finally {
                  client.clear();
                  setLoggingOut(false);
                  navigate('/');
                }
              }}
            >
              <LogOut size={16} /> {loggingOut ? 'Cerrando…' : 'Cerrar sesión'}
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
        <NavLink to="/app">
          <Users size={21} />
          <span>Clientes</span>
        </NavLink>
      </nav>
    </div>
  );
}

export function AdminDashboard() {
  const { cards, activity } = useLoyalty();
  const promotions = useQuery({ queryKey: ['promotions'], queryFn: api.promotions });
  const cardsList = cards.data || [];
  const totalStamps = cardsList.reduce((sum, c) => sum + c.stamps, 0);
  const kpis = [
    {
      icon: Store,
      tone: 'blue',
      value: cards.isSuccess ? cardsList.length : '—',
      label: 'Negocios en la comunidad',
    },
    {
      icon: Stamp,
      tone: 'green',
      value: cards.isSuccess ? totalStamps : '—',
      label: 'Sellos acumulados',
    },
    {
      icon: Megaphone,
      tone: 'orange',
      value: promotions.isSuccess ? promotions.data.length : '—',
      label: 'Promociones activas',
    },
    {
      icon: Heart,
      tone: 'purple',
      value: activity.isSuccess ? activity.data.length : '—',
      label: 'Movimientos recientes',
    },
  ];
  const actions = [
    {
      icon: ScanLine,
      title: 'Registrar una compra',
      text: 'Escanea el QR de un cliente y agrégale un sello en segundos.',
    },
    {
      icon: Megaphone,
      title: 'Publicar una promoción',
      text: 'Comparte algo bueno con tu comunidad, con condiciones y vigencia.',
    },
    {
      icon: Palette,
      title: 'Dale tu personalidad',
      text: 'Ajusta el nombre, la recompensa y el estilo de la tarjeta de tu negocio.',
    },
  ];
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">
            <LayoutDashboard size={14} /> PANEL DE ADMINISTRACIÓN
          </div>
          <h1>
            Tu comunidad, <span>bajo control.</span>
          </h1>
          <p>Sigue de cerca las tarjetas, los sellos y las promociones de tu negocio.</p>
        </div>
      </div>
      <div className="admin-kpi-strip" aria-label="Indicadores del negocio">
        {kpis.map(({ icon: Icon, tone, value, label }) => (
          <div className="admin-kpi" key={label}>
            <div className="kpi-top">
              <span className={`stat-icon ${tone}`}>
                <Icon size={20} />
              </span>
            </div>
            <strong>{value}</strong>
            <small>{label}</small>
          </div>
        ))}
      </div>
      <div className="admin-dashboard-grid">
        <section className="section" style={{ marginBottom: 0 }}>
          <div className="section-title">
            <h2>Actividad reciente</h2>
            <Link to="/app/actividad" className="text-link subtle-link">
              Ver en el panel de clientes <ArrowUpRight size={15} />
            </Link>
          </div>
          {activity.isPending ? (
            <p className="muted">Cargando movimientos…</p>
          ) : (
            <div className="activity-list">
              {activity.data?.slice(0, 6).map((a) => (
                <div className="activity-item" key={a.id}>
                  <span
                    className={`stat-icon ${
                      a.type === 'reward' ? 'purple' : a.type === 'stamp' ? 'green' : 'orange'
                    }`}
                  >
                    {a.type === 'reward' ? (
                      <Gift size={20} />
                    ) : a.type === 'stamp' ? (
                      <Stamp size={20} />
                    ) : (
                      <Heart size={20} />
                    )}
                  </span>
                  <div>
                    <h3>{a.title}</h3>
                    <p>
                      {a.business}{' '}
                      <span>· {format(new Date(a.date), 'd MMM, HH:mm', { locale: es })}</span>
                    </p>
                  </div>
                </div>
              ))}
              {activity.isSuccess && !activity.data.length && (
                <p className="muted" style={{ padding: 18 }}>
                  Aún no hay movimientos. Registra la primera compra de tu comunidad.
                </p>
              )}
            </div>
          )}
        </section>
        <div>
          {actions.map(({ icon: Icon, title, text }) => (
            <div className="admin-action-card" key={title}>
              <div className="flex items-center gap-3" style={{ marginBottom: 4 }}>
                <span className="stat-icon orange">
                  <Icon size={20} />
                </span>
                <h3>{title}</h3>
              </div>
              <p>{text}</p>
              <Button size="sm" asChild>
                <Link to="/admin/negocio">Abrir mi negocio <ArrowUpRight size={14} /></Link>
              </Button>
            </div>
          ))}
          {isDemo && (
            <div className="notice" style={{ marginTop: 14 }}>
              <strong>Estás en modo demostración.</strong>
              <p>
                Estos datos son ficticios y se guardan solo en este navegador. La conexión real se
                habilita con VITE_DATA_MODE=api.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
