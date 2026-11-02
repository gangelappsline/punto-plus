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
import { isDemo } from '../lib/utils';
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
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      {mobileNav && (
        <button
          type="button"
          aria-label="Ocultar opciones del menú"
          className="sidebar-backdrop"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
        <button
          type="button"
          className="mobile-sidebar-close icon-button"
          aria-label="Ocultar opciones del menú"
          onClick={() => setMobileNav(false)}
        >
          <X size={17} />
        </button>
        <Link to="/" className="brand" aria-label="Punto Plus · Inicio">
          <img src={logo} alt="Punto Plus" />
        </Link>
        <div className="community-label">TU COMUNIDAD, TUS RECOMPENSAS</div>
        <div className="sidebar-section-label">MI ESPACIO</div>
        <nav id="customer-navigation" aria-label="Navegación principal">
          {customerNavigation.map(({ path, icon: Icon, title: label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/app'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} strokeWidth={1.65} />
              <span>{label}</span>
              {path === '/app' && <span className="active-nav-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {canManage && (
            <NavLink to="/business" className="business-nav">
              <Store size={18} />
              <span>Mi negocio</span>
              <ArrowIcon />
            </NavLink>
          )}
          <button className="sidebar-help" onClick={() => setHelp(true)}>
            <CircleHelp size={17} /> ¿Te ayudamos?
          </button>
          <button className="profile-button" onClick={() => setProfile(true)}>
            <span className="avatar">{user.name[0]}</span>
            <span>
              <strong>{user.name}</strong>
              <small>{isDemo ? 'Miembro · Demostración' : 'Miembro Punto Plus'}</small>
            </span>
            <ChevronDown size={16} />
          </button>
        </div>
        <div className="sidebar-footer">
          HECHO PARA VOLVER <Heart size={10} />
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="icon-button mobile-menu"
              aria-label="Mostrar opciones del menú"
              aria-controls="customer-navigation"
              aria-expanded={mobileNav}
              onClick={() => setMobileNav(true)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              Mi espacio <ChevronRight size={13} /> <strong>{title}</strong>
            </span>
            <Link to="/" className="mobile-brand" aria-label="Punto Plus · Inicio">
              <img src={logo} alt="Punto Plus" />
            </Link>
          </div>
          <div className="header-actions">
            <span className="header-location">
              <MapPin size={15} /> Ciudad de México
            </span>
            <span className="header-divider" />
            {isDemo && (
              <button className="demo-indicator" onClick={() => setProfile(true)}>
                <span /> Demo
              </button>
            )}
            <button
              className="avatar small-avatar"
              aria-label="Mi perfil"
              onClick={() => setProfile(true)}
            >
              {user.name[0]}
            </button>
          </div>
        </header>
        {!online && (
          <div className="offline-banner" role="status">
            Estás sin conexión.{' '}
            {isDemo
              ? 'Tus datos demo siguen disponibles en este dispositivo.'
              : 'Las compras y canjes necesitan conexión a internet.'}
          </div>
        )}
        <main id="main-content">
          <div className="main-topline"></div>
          <nav className="customer-section-tabs" aria-label="Secciones del cliente">
            {customerNavigation.map(({ path, icon: Icon, title }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/app'}
                className={({ isActive }) => `customer-section-tab${isActive ? ' active' : ''}`}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{title}</span>
              </NavLink>
            ))}
          </nav>
          <Outlet context={context} />
          <footer className="main-footer">
            <span>© {new Date().getFullYear()} Punto Plus. Lo bueno está cerca.</span>
            <button onClick={() => void install()}>
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
            <Button className="full-width" onClick={() => setPurchaseOpen(false)}>
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
              className="full-width"
              disabled={confirmSale.isPending}
              onClick={() => confirmSale.mutate(purchaseToken)}
            >
              {confirmSale.isPending ? 'Validando compra…' : 'Confirmar compra'}
            </Button>
            <Button
              className="full-width"
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
          <span className="avatar">{user.name[0]}</span>
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
            className="full-width"
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
          className="full-width"
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
