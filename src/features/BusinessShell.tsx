import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  LayoutDashboard,
  LogOut,
  Menu,
  ScanLine,
  Sparkles,
  Store,
  Utensils,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLogout } from '../lib/session';
import { demoUser, useAuth } from '../stores/auth';
import { cn, isDemo } from '../lib/utils';
import { Button } from '../components/ui/button';
import logo from '../assets/images/logo_2.webp';

const businessNavigation = [
  { path: '/business', icon: LayoutDashboard, title: 'Resumen', end: true },
  { path: '/business/mi-menu', icon: Utensils, title: 'Mi menú', end: false },
  { path: '/business/crear', icon: Sparkles, title: 'Crear menú', end: false },
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
    <div className="flex min-h-screen">
      <a
        className="fixed -top-20 left-5 z-[100] rounded-lg border-2 border-brand bg-white p-3 transition-[top] focus:top-3"
        href="#main-content"
      >
        Saltar al contenido
      </a>
      {mobileNav && (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-[#022f5366] backdrop-blur-[3px] md:hidden"
          aria-label="Ocultar opciones del menú"
          data-mobile-close
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside
        data-panel-nav
        data-open={mobileNav ? 'true' : 'false'}
        className={cn(
          'sticky top-0 z-[35] flex h-dvh shrink-0 flex-col border-r-0 bg-[linear-gradient(180deg,#022f53_0%,#05385f_78%,#0a4a74_100%)] px-[22px] pb-[18px] pt-[30px] text-[#c8d6e5]',
          'w-[258px] max-[1200px]:w-[211px] max-[1200px]:px-[17px] min-[1600px]:w-[254px] min-[1600px]:px-[27px]',
          'min-[769px]:max-[1000px]:w-[190px] min-[769px]:max-[1000px]:px-[13px]',
          'max-md:hidden',
          mobileNav &&
            'max-md:block max-md:fixed max-md:left-0 max-md:top-0 max-md:z-[51] max-md:h-dvh max-md:w-[236px] max-md:shadow-[10px_0_40px_#022f5333]',
        )}
      >
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-full text-slate transition-colors hover:bg-mist md:hidden"
          aria-label="Ocultar opciones del menú"
          data-mobile-close
          onClick={() => setMobileNav(false)}
        >
          <X size={18} />
        </button>
        <Link
          to="/"
          className="flex items-center rounded-xl bg-white px-[14px] py-[10px]"
          aria-label="Punto Plus · Inicio"
        >
          <img
            src={logo}
            alt="Punto Plus"
            className="mx-auto block h-[26px] w-auto rounded-[4px]"
          />
        </Link>
        <div className="mx-[13px] mb-3 mt-6 text-[8px] font-[650] tracking-[1.8px] text-[#7d9ab4]">
          PANEL DE NEGOCIO
        </div>
        <nav
          id="business-navigation"
          className="flex flex-col gap-[7px]"
          aria-label="Navegación de negocio"
        >
          {businessNavigation.map(({ path, icon: Icon, title: label, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex h-[46px] items-center gap-3 rounded-[10px] px-[14px] text-[13px] font-medium text-[#a9bfd4] transition-colors hover:bg-[#ffffff14] hover:text-white',
                  isActive && 'bg-brand font-[650] text-white shadow-[0_8px_20px_#2399a040]',
                )
              }
            >
              <Icon size={19} strokeWidth={1.65} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-8">
          <div className="mt-[18px] flex items-center gap-[10px] border-t border-[#ffffff1f] px-[2px] pt-4 text-left">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-[3px] border-transparent bg-[linear-gradient(135deg,#d7edee_0%,#f5be8b_120%)] font-display text-[15px] font-[650] text-navy">
              {user.name[0]}
            </span>
            <span>
              <strong className="block text-xs font-[650] text-white">{user.name}</strong>
              <small className="mt-[3px] block text-[9px] text-[#7d9ab4]">
                {isDemo ? 'Negocio · Demostración' : 'Cuenta de negocio'}
              </small>
            </span>
          </div>
          {!isDemo && (
            <Button
              variant="ghost"
              className="w-full mt-4"
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
        <div className="mt-[14px] flex items-center justify-center gap-[6px] text-[6.5px] tracking-[1.6px] text-[#557a9c]">
          PUNTO PLUS® · NEGOCIO
        </div>
      </aside>
      <div className="min-w-0 flex-1 max-md:pb-[78px]">
        <header className="flex h-[75px] items-center justify-between border-b border-line bg-white px-[42px] max-[1200px]:px-[29px] min-[769px]:max-[1000px]:px-[23px] min-[1600px]:px-[54px] max-md:h-[65px] max-md:px-6 max-sm:px-5">
          <div className="max-md:flex max-md:items-center max-md:gap-3">
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-full text-slate transition-colors hover:bg-mist max-md:-ml-[9px] md:hidden"
              aria-label="Mostrar opciones del menú"
              aria-controls="business-navigation"
              aria-expanded={mobileNav}
              onClick={() => setMobileNav(true)}
            >
              <Menu size={22} />
            </button>
            <span className="flex items-center gap-[14px] text-[10px] text-muted min-[1001px]:text-[11px] max-md:hidden">
              Mi negocio <ArrowUpRight size={13} className="text-[#b6c2cd]" />{' '}
              <strong className="font-medium text-body">{title}</strong>
            </span>
            <Link
              to="/"
              className="hidden max-md:flex max-md:items-center"
              aria-label="Punto Plus · Inicio"
            >
              <img src={logo} alt="Punto Plus" className="block h-[30px] w-auto rounded-[7px]" />
            </Link>
          </div>
          <div className="flex items-center gap-[17px] max-[1200px]:gap-[10px] max-md:gap-[11px] max-sm:gap-[9px]">
            <Link
              to="/"
              className="flex items-center gap-[6px] text-[10px] text-slate transition-colors hover:text-brand-deep max-md:hidden"
            >
              <ScanLine size={14} /> Ir al sitio
            </Link>
            {isDemo && (
              <span className="flex items-center gap-1 rounded-[5px] border border-[#e5cfae] px-[6px] py-[3px] text-[9px] text-[#b98a4e] max-md:text-[8px]">
                <span className="size-1 rounded-full bg-[#d9a35f]" /> Demo
              </span>
            )}
            <button
              className="flex size-[31px] items-center justify-center rounded-full border-[3px] border-white bg-[radial-gradient(ellipse_at_70%_25%,#d7edee_0%,#9fd0d6_64%,#2399a0_100%)] font-display text-xs font-[650] text-navy max-md:size-[29px]"
              aria-label="Mi perfil"
            >
              {user.name[0]}
            </button>
          </div>
        </header>
        <main
          id="main-content"
          className="mx-auto max-w-[1540px] px-[42px] pt-[25px] max-[1200px]:px-[29px] min-[769px]:max-[1000px]:px-[23px] max-md:px-6 max-md:pt-[21px] max-sm:px-5 max-sm:pt-[19px]"
        >
          <div className="hidden">
            <span className="text-[8px] font-semibold tracking-[1.7px] text-[#9aa7b5]">
              {isDemo ? 'NEGOCIO EN DEMOSTRACIÓN' : 'TU NEGOCIO, EN ORDEN'}
            </span>
          </div>
          <Outlet />
          <footer className="mt-[15px] flex items-center justify-between gap-[15px] border-t border-line pb-[22px] pt-5 text-[9px] text-muted max-sm:justify-center max-sm:gap-[13px] max-sm:pb-[14px] max-sm:pt-[19px] max-sm:text-center max-sm:text-[8px]">
            <span>© {new Date().getFullYear()} Punto Plus. Lo bueno está cerca.</span>
            <Link
              to="/"
              className="flex items-center gap-[6px] text-[10px] text-slate transition-colors hover:text-brand-deep max-sm:text-[8px]"
            >
              Ir al sitio <ArrowUpRight size={12} />
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
}
