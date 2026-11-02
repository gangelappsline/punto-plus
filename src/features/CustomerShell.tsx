import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Compass,
  CreditCard,
  Download,
  Gift,
  Heart,
  LogOut,
  MapPin,
  Menu,
  QrCode,
  ShieldCheck,
  Sparkles,
  Store,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { CardDialog, PromotionDialog } from './Dialogs';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { Scanner } from '../components/Scanner';
import { useCards, useConfirmSaleToken } from '../lib/queries';
import { useLogout } from '../lib/session';
import { cn, isDemo } from '../lib/utils';
import { demoUser, useAuth } from '../stores/auth';
import type { LoyaltyCard, Promotion } from '../lib/types';
import type { PageContext } from './CustomerPages';
import logo from '../assets/images/logo_2.webp';

export const customerNavigation = [
  { path: '/app', icon: CreditCard, title: 'Tarjetas' },
  { path: '/app/promociones', icon: Gift, title: 'Promociones' },
  { path: '/app/cerca-de-mi', icon: MapPin, title: 'Cerca de mí' },
];

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Layout del panel de cliente: barra lateral, barra superior, navegación móvil
 * y los diálogos de la experiencia. Independiente del panel de negocio y
 * protegido por `PanelGate`, que exige el token guardado al iniciar sesión.
 */
export function CustomerLayout() {
  const realUser = useAuth((s) => s.user);
  // Con la API real el guard garantiza el usuario; en demo se usa el de muestra.
  const user = realUser ?? demoUser;
  const location = useLocation();
  const cards = useCards(location.pathname === '/app');
  const navigate = useNavigate();
  const logout = useLogout();
  const [search, setSearch] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseToken, setPurchaseToken] = useState<string | null>(null);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [help, setHelp] = useState(false);
  const [profile, setProfile] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [installHelp, setInstallHelp] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const confirmSale = useConfirmSaleToken(() => {
    setPurchaseComplete(true);
    setPurchaseToken(null);
  });
  useEffect(() => {
    if (scanOpen || purchaseOpen || help || profile) setMobileNav(false);
  }, [scanOpen, purchaseOpen, help, profile]);
  useEffect(() => {
    if (!mobileNav) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNav(false);
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [mobileNav]);
  const canManage = isDemo || user.role === 'business' || user.role === 'admin';
  const title = customerNavigation.find((n) => n.path === location.pathname)?.title || 'Punto Plus';
  useEffect(() => {
    setSearch('');
    setMobileNav(false);
    window.scrollTo({ top: 0 });
    document.title = `${title} · Punto Plus`;
  }, [location.pathname, title]);
  useEffect(() => {
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('beforeinstallprompt', onInstall);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstall);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);
  const scanned = useCallback(
    (token: string) => {
      const match = /^punto-plus:business:([a-zA-Z0-9_-]+)$/.exec(token);
      const found = match && cards.data?.find((c) => c.businessId === match[1]);
      if (found) {
        setScanOpen(false);
        setCard(found);
      } else
        toast.error(
          'No reconocemos este QR de negocio. Comprueba que sea un código de Punto Plus.',
        );
    },
    [cards.data],
  );
  const scannedPurchaseToken = useCallback((rawToken: string) => {
    const token = rawToken.trim().toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(token)) {
      toast.error('El código de venta debe tener 8 caracteres alfanuméricos.');
      return;
    }
    setPurchaseToken(token);
  }, []);
  function openPurchaseConfirmation() {
    setPurchaseToken(null);
    setPurchaseComplete(false);
    setPurchaseOpen(true);
  }
  async function install() {
    if (!installEvent) {
      setInstallHelp(true);
      return;
    }
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') toast.success('Punto Plus ya tiene un lugar en tu pantalla');
    setInstallEvent(null);
  }
  const context: PageContext = {
    search,
    userName: user.name,
    showCard: setCard,
    showPromotion: setPromotion,
    scan: () => setScanOpen(true),
    confirmPurchase: openPurchaseConfirmation,
  };
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
          aria-label="Ocultar opciones del menú"
          className="fixed inset-0 z-50 bg-[#022f5366] backdrop-blur-[3px] md:hidden"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside
        data-panel-nav
        data-open={mobileNav ? 'true' : 'false'}
        className={cn(
          'sticky top-0 z-[35] flex h-dvh w-[236px] shrink-0 flex-col border-r border-line bg-white px-[22px] pb-4 pt-[31px]',
          'max-[1200px]:w-[211px] max-[1200px]:px-[17px] min-[1600px]:w-[254px] min-[1600px]:px-[27px]',
          'min-[769px]:max-[1000px]:w-[190px] min-[769px]:max-[1000px]:px-[13px]',
          'max-md:invisible max-md:fixed max-md:-left-[260px] max-md:z-[51] max-md:w-[236px] max-md:px-[22px] max-md:pb-5 max-md:pt-[27px] max-md:transition-[left] max-md:duration-200',
          mobileNav && 'max-md:visible max-md:left-0 max-md:shadow-[10px_0_40px_#022f5333]',
        )}
      >
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-full text-slate transition-colors hover:bg-mist md:hidden"
          aria-label="Ocultar opciones del menú"
          data-mobile-close
          onClick={() => setMobileNav(false)}
        >
          <X size={17} />
        </button>
        <Link
          to="/"
          className="flex items-center gap-[9px] whitespace-nowrap"
          aria-label="Punto Plus · Inicio"
        >
          <img src={logo} alt="Punto Plus" className="block h-[30px] w-auto rounded-[7px]" />
        </Link>
        <div className="ml-px mt-[13px] text-[7.3px] font-semibold tracking-[1.05px] text-faint max-[1200px]:text-[6.6px] max-[1200px]:tracking-[0.8px] min-[769px]:max-[1000px]:text-[6.2px] min-[769px]:max-[1000px]:tracking-[0.7px]">
          TU COMUNIDAD, TUS RECOMPENSAS
        </div>
        <div className="mx-[13px] mb-[14px] mt-[43px] text-[9px] font-semibold tracking-[1.8px] text-faint">
          MI ESPACIO
        </div>
        <nav
          id="customer-navigation"
          className="flex flex-col gap-[7px]"
          aria-label="Navegación principal"
        >
          {customerNavigation.map(({ path, icon: Icon, title: label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/app'}
              className={({ isActive }) =>
                cn(
                  'group flex h-[45px] items-center gap-3 rounded-lg px-[13px] text-xs font-medium text-steel transition-colors hover:bg-haze',
                  'min-[769px]:max-[1000px]:gap-[10px] min-[769px]:max-[1000px]:px-[11px] min-[769px]:max-[1000px]:text-[11px] min-[1001px]:text-[13px]',
                  isActive && 'bg-[#d9eef0] font-[650] text-brand-deep',
                )
              }
            >
              <Icon size={19} strokeWidth={1.65} />
              <span>{label}</span>
              {path === '/app' && (
                <span className="ml-auto hidden size-[5px] rounded-full bg-brand group-aria-[current=page]:block" />
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-8">
          {canManage && (
            <NavLink
              to="/business"
              className="flex w-full items-center gap-[10px] rounded-lg px-[11px] py-3 text-[11.5px] text-slate transition-colors hover:bg-haze"
            >
              <Store size={18} />
              <span>Mi negocio</span>
              <ArrowIcon />
            </NavLink>
          )}
          <button
            className="flex w-full items-center gap-[10px] rounded-lg px-[11px] pb-[15px] pt-[10px] text-[11.5px] text-slate transition-colors hover:bg-haze"
            onClick={() => setHelp(true)}
          >
            <CircleHelp size={17} /> ¿Te ayudamos?
          </button>
          <button
            className="mt-[6px] flex w-full items-center gap-[10px] border-t border-line pb-[11px] pt-[18px] text-left min-[769px]:max-[1000px]:gap-[7px]"
            onClick={() => setProfile(true)}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-[radial-gradient(ellipse_at_70%_25%,#d7edee_0%,#9fd0d6_64%,#2399a0_100%)] font-display text-[15px] font-[650] text-navy">
              {user.name[0]}
            </span>
            <span>
              <strong className="block text-[11px] font-[650] min-[769px]:max-[1000px]:text-[10px]">
                {user.name}
              </strong>
              <small className="mt-1 block text-[8.5px] text-[#aeb9c4] min-[769px]:max-[1000px]:text-[7.5px]">
                {isDemo ? 'Miembro · Demostración' : 'Miembro Punto Plus'}
              </small>
            </span>
            <ChevronDown size={16} className="ml-auto text-[#b0bcc7]" />
          </button>
        </div>
        <div className="mt-[13px] flex items-center justify-center gap-[6px] text-[6.5px] tracking-[1.5px] text-[#aeb9c4]">
          HECHO PARA VOLVER <Heart size={10} />
        </div>
      </aside>
      <div className="min-w-0 flex-1 max-md:pb-[78px]">
        <header className="flex h-[75px] items-center justify-between border-b border-line bg-white px-[42px] max-[1200px]:px-[29px] min-[769px]:max-[1000px]:px-[23px] min-[1600px]:px-[54px] max-md:h-[65px] max-md:px-6 max-sm:px-5">
          <div className="max-md:flex max-md:items-center max-md:gap-3">
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-full text-slate transition-colors hover:bg-mist max-md:-ml-[9px] max-md:inline-flex md:hidden"
              aria-label="Mostrar opciones del menú"
              aria-controls="customer-navigation"
              aria-expanded={mobileNav}
              onClick={() => setMobileNav(true)}
            >
              <Menu size={22} />
            </button>
            <span className="flex items-center gap-[14px] text-[10px] text-muted min-[1001px]:text-[11px] max-md:hidden">
              Mi espacio <ChevronRight size={13} className="text-[#b6c2cd]" />{' '}
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
            <span className="flex items-center gap-[6px] text-[10px] text-muted min-[769px]:max-[1000px]:text-[9px] max-md:hidden">
              <MapPin size={15} /> Ciudad de México
            </span>
            <span className="ml-[3px] h-[18px] w-px bg-line max-md:hidden" />
            {isDemo && (
              <button
                className="flex items-center gap-1 rounded-[5px] border border-[#e5cfae] px-[6px] py-[3px] text-[9px] text-[#b98a4e] max-md:text-[8px]"
                onClick={() => setProfile(true)}
              >
                <span className="size-1 rounded-full bg-[#d9a35f]" /> Demo
              </button>
            )}
            <button
              className="flex size-[31px] items-center justify-center rounded-full border-[3px] border-white bg-[radial-gradient(ellipse_at_70%_25%,#d7edee_0%,#9fd0d6_64%,#2399a0_100%)] font-display text-xs font-[650] text-navy max-md:size-[29px]"
              aria-label="Mi perfil"
              onClick={() => setProfile(true)}
            >
              {user.name[0]}
            </button>
          </div>
        </header>
        {!online && (
          <div
            className="bg-[#fbeed6] px-5 py-[10px] text-center text-xs text-[#8a5a26]"
            role="status"
          >
            Estás sin conexión.{' '}
            {isDemo
              ? 'Tus datos demo siguen disponibles en este dispositivo.'
              : 'Las compras y canjes necesitan conexión a internet.'}
          </div>
        )}
        <main
          id="main-content"
          className="mx-auto max-w-[1540px] px-[42px] pt-[25px] max-[1200px]:px-[29px] min-[769px]:max-[1000px]:px-[23px] max-md:px-6 max-md:pt-[21px] max-sm:px-5 max-sm:pt-[19px]"
        >
          <div className="mb-4 flex min-h-[35px] items-center justify-between max-md:mb-[25px] max-md:gap-[15px] max-sm:mb-[25px] max-sm:min-h-0"></div>
          <nav
            className="mb-7 flex gap-2 border-b border-line pb-[10px]"
            aria-label="Secciones del cliente"
          >
            {customerNavigation.map(({ path, icon: Icon, title }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/app'}
                className={({ isActive }) =>
                  cn(
                    'inline-flex min-h-[42px] items-center justify-center gap-2 rounded-t-[9px] border border-transparent px-4 text-xs font-[650] text-[#60758a] transition-[background-color,color,border-color] duration-150 hover:bg-[#f0f5f7] hover:text-brand',
                    'max-sm:min-w-0 max-sm:flex-1 max-sm:gap-[5px] max-sm:px-[7px] max-sm:text-[10px]',
                    isActive &&
                      "relative font-black text-brand-deep after:absolute after:inset-x-3 after:-bottom-[11px] after:h-[3px] after:rounded-t-[3px] after:bg-brand-deep after:content-['']",
                  )
                }
              >
                <Icon size={17} aria-hidden="true" />
                <span>{title}</span>
              </NavLink>
            ))}
          </nav>
          <Outlet context={context} />
          <footer className="mt-[15px] flex items-center justify-between gap-[15px] border-t border-line pb-[22px] pt-5 text-[9px] text-muted max-sm:justify-center max-sm:gap-[13px] max-sm:pb-[14px] max-sm:pt-[19px] max-sm:text-center max-sm:text-[8px]">
            <span>© {new Date().getFullYear()} Punto Plus. Lo bueno está cerca.</span>
            <button
              className="flex items-center gap-[6px] text-[9px] text-muted transition-colors hover:text-brand max-sm:text-[8px]"
              onClick={() => void install()}
            >
              <Download size={13} /> Lleva Punto Plus contigo <ArrowIcon />
            </button>
          </footer>
        </main>
      </div>
      <CardDialog selected={card} onClose={() => setCard(null)} />
      <PromotionDialog promotion={promotion} onClose={() => setPromotion(null)} />
      <Dialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        title="Escanear un negocio"
        description="Escanea el QR de un negocio participante para consultar la información de su tarjeta."
      >
        <Scanner onResult={scanned} />
      </Dialog>
      <Dialog
        open={purchaseOpen}
        onOpenChange={(open) => {
          if (!confirmSale.isPending) {
            setPurchaseOpen(open);
            if (!open) {
              setPurchaseToken(null);
              setPurchaseComplete(false);
            }
          }
        }}
        title={purchaseComplete ? 'Compra verificada' : 'Confirma tu compra'}
        description={
          purchaseComplete
            ? 'El token se consumió y tu tarjeta ya se actualizó.'
            : 'Escanea el QR que muestra el negocio o ingresa el código de venta de 8 caracteres.'
        }
      >
        {purchaseComplete ? (
          <div className="confirm-panel sale-confirm-success">
            <span className="confirm-icon">
              <ShieldCheck size={34} />
            </span>
            <h3>¡Compra confirmada!</h3>
            <p>
              El token se eliminó para que no pueda reutilizarse y se agregó un sello a tu tarjeta.
            </p>
            <Button className="w-full" onClick={() => setPurchaseOpen(false)}>
              Ver mis tarjetas
            </Button>
          </div>
        ) : purchaseToken ? (
          <div className="confirm-panel">
            <span className="confirm-icon">
              <QrCode size={34} />
            </span>
            <h3>Verifica el código</h3>
            <p>Confirma solo si acabas de realizar una compra en el negocio.</p>
            <strong className="sale-token-code" aria-label="Código ingresado">
              {purchaseToken}
            </strong>
            {isDemo && <div className="notice">Demostración: la compra es ficticia.</div>}
            <Button
              className="w-full"
              disabled={confirmSale.isPending}
              onClick={() => confirmSale.mutate(purchaseToken)}
            >
              {confirmSale.isPending ? 'Validando compra…' : 'Confirmar compra'}
            </Button>
            <Button
              className="w-full"
              variant="ghost"
              disabled={confirmSale.isPending}
              onClick={() => setPurchaseToken(null)}
            >
              Ingresar otro código
            </Button>
          </div>
        ) : (
          <Scanner
            onResult={scannedPurchaseToken}
            scanPrompt="Escanea el QR de venta que muestra el negocio"
            codeLabel="Código de venta de 8 caracteres"
            codePlaceholder="Ej. A7BC29XZ"
            maxLength={8}
            demoCode=""
          />
        )}
      </Dialog>
      <Dialog
        open={profile}
        onOpenChange={setProfile}
        title="Qué bueno que eres parte"
        description="Tu espacio dentro de la comunidad Punto Plus."
      >
        <div className="profile-detail">
          <span className="mx-auto mb-[14px] flex size-[63px] shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-[radial-gradient(ellipse_at_70%_25%,#d7edee_0%,#9fd0d6_64%,#2399a0_100%)] font-display text-[25px] font-[650] text-navy">
            {user.name[0]}
          </span>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <span className="membership">
            <ShieldCheck size={14} /> {isDemo ? 'Cuenta de demostración' : 'Miembro Punto Plus'}
          </span>
        </div>
        {isDemo ? (
          <div className="notice">
            <strong>Estás explorando una demostración.</strong>
            <p>
              Los negocios, sellos, compras y canjes son ficticios y se guardan solo en este
              navegador. No se envían a la API ni tienen valor comercial.
            </p>
            <p>
              El modo demostración se activa con VITE_DATA_MODE=demo; con la API real verás aquí tus
              datos y podrás cerrar la sesión.
            </p>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            disabled={logout.isPending}
            onClick={() =>
              logout.mutate(undefined, {
                onError: () =>
                  toast.error(
                    'Sesión local cerrada. No pudimos revocar la sesión del servidor; vuelve a intentarlo cuando haya conexión.',
                  ),
                onSettled: () => {
                  setProfile(false);
                  navigate('/');
                },
              })
            }
          >
            <LogOut size={16} /> {logout.isPending ? 'Cerrando…' : 'Cerrar sesión'}
          </Button>
        )}
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            setProfile(false);
            void install();
          }}
        >
          <Download size={16} /> Instalar Punto Plus
        </Button>
      </Dialog>
      <Dialog
        open={help}
        onOpenChange={setHelp}
        title="Cada visita tiene su lado bueno"
        description="Así de fácil es disfrutar de Punto Plus."
      >
        <div className="help-steps">
          {[
            {
              icon: Compass,
              title: '1. Encuentra tu lugar',
              text: 'Consulta tus tarjetas, promociones y negocios cercanos en las secciones del perfil.',
            },
            {
              icon: QrCode,
              title: '2. Visita y suma',
              text: 'El negocio genera un código de un solo uso. Escanea su QR o ingrésalo para confirmar la compra y sumar un sello.',
            },
            {
              icon: Gift,
              title: '3. Date ese gusto',
              text: 'Completa tu tarjeta y canjea tu recompensa frente al personal del negocio.',
            },
          ].map(({ icon: Icon, title: t, text }) => (
            <div key={t}>
              <span className="stat-icon orange">
                <Icon size={21} />
              </span>
              <div>
                <h3>{t}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="notice">
          <Heart size={17} /> ¿Falta un sello? Consulta al negocio donde realizaste tu compra. Solo
          su personal puede verificarla.
        </div>
      </Dialog>
      <Dialog
        open={installHelp}
        onOpenChange={setInstallHelp}
        title="Un lugar en tu pantalla"
        description="Tus tarjetas a un toque de distancia, sin buscar entre pestañas."
      >
        <div className="help-steps">
          <div>
            <span className="stat-icon orange">
              <Download size={22} />
            </span>
            <div>
              <h3>En iPhone o iPad</h3>
              <p>Abre la app en Safari, toca Compartir y elige “Agregar a inicio”.</p>
            </div>
          </div>
          <div>
            <span className="stat-icon green">
              <Sparkles size={22} />
            </span>
            <div>
              <h3>En Android o computadora</h3>
              <p>
                Abre el menú de tu navegador y selecciona “Instalar aplicación” o “Agregar a
                pantalla principal”. Si ya la instalaste, ábrela desde su icono.
              </p>
            </div>
          </div>
        </div>
        <p className="fine-print">
          La instalación requiere HTTPS y un navegador compatible. En desarrollo, prueba la
          compilación de producción.
        </p>
      </Dialog>
    </div>
  );
}
function ArrowIcon() {
  return <ChevronRight size={14} />;
}
