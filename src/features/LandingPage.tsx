import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Check,
  CloudOff,
  Compass,
  Gift,
  Heart,
  LayoutDashboard,
  MapPin,
  Menu,
  QrCode,
  ShieldCheck,
  Sparkles,
  Stamp,
  Store,
  X,
} from 'lucide-react';
import { LoyaltyCard } from '../components/LoyaltyCard';
import { Button } from '../components/ui/button';
import { useAuth } from '../stores/auth';
import { isDemo, panelPathFor } from '../lib/utils';
import logo from '../assets/images/logo_2.webp';
import type { LoyaltyCard as Card } from '../lib/types';

const heroCards: Card[] = [
  {
    id: 'hero-cafe',
    businessId: 'b1',
    name: 'Café Avellaneda',
    category: 'Cafetería',
    tagline: '',
    reward: 'Un café de especialidad gratis',
    stamps: 6,
    goal: 8,
    theme: 'forest',
    icon: 'coffee',
    location: 'Roma Norte',
    distance: '',
    joined: true,
  },
  {
    id: 'hero-pan',
    businessId: 'b2',
    name: 'Pan de Barrio',
    category: 'Panadería',
    tagline: '',
    reward: 'Un pan de la casa gratis',
    stamps: 4,
    goal: 6,
    theme: 'terracotta',
    icon: 'bread',
    location: 'Condesa',
    distance: '',
    joined: true,
  },
];

const navLinks = [
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#negocios', label: 'Para negocios' },
  { href: '#historias', label: 'Historias' },
];

export function LandingPage() {
  const user = useAuth((s) => s.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const myPanel = user ? panelPathFor(user.role) : isDemo ? '/app' : '/login';
  const primaryCta = isDemo ? '/app' : '/login';
  return (
    <div className="min-h-screen bg-cream text-ink">
      {/* Navbar */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5">
          <Link to="/" className="shrink-0" aria-label="Punto Plus · Inicio">
            <img src={logo} alt="Punto Plus" className="h-9" />
          </Link>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Navegación del sitio">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-body transition-colors hover:text-navy"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Button asChild variant="ghost" className="text-navy">
              <Link to={myPanel}>
                {user ? 'Mi panel' : isDemo ? 'Ir a mi demo' : 'Iniciar sesión'}
              </Link>
            </Button>
            <Button asChild>
              <Link to={primaryCta}>
                Soy un negocio <LayoutDashboard size={16} />
              </Link>
            </Button>
          </div>
          <button
            className="icon-button md:hidden lg:hidden xl:hidden"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-line bg-cream px-5 py-4 md:hidden">
            <nav className="flex flex-col gap-1" aria-label="Navegación móvil">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-body hover:bg-line/50"
                >
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="mt-3 flex flex-col gap-2 border-t border-line pt-4">
              <Button asChild variant="outline">
                <Link to={myPanel} onClick={() => setMenuOpen(false)}>
                  {user ? 'Mi panel' : isDemo ? 'Ir a mi demo' : 'Iniciar sesión'}
                </Link>
              </Button>
              <Button asChild>
                <Link to={primaryCta} onClick={() => setMenuOpen(false)}>
                  Soy un negocio <LayoutDashboard size={16} />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-[132px] pb-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 -right-28 h-96 w-96 rounded-full bg-sand/40 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 -left-36 h-96 w-96 rounded-full bg-brand/15 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-5 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-sand/70 bg-[#fdf6ec] px-4 py-2 text-[11px] font-semibold tracking-[0.14em] text-sand-dark">
              <Sparkles size={14} /> FIDELIDAD PARA EL COMERCIO LOCAL
            </span>
            <h1 className="mt-6 font-display text-[42px] leading-[1.06] font-bold tracking-tight text-navy md:text-[58px]">
              Lo bueno está cerca.
              <br />
              <span className="text-brand">Y ahora te da más.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-body md:text-lg">
              Punto Plus convierte cada visita a tus negocios favoritos en sellos y recompensas de
              verdad. Sin libretas, sin registros: solo tu QR y tu barrio.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild className="h-12 px-6 text-sm">
                <Link to={primaryCta}>
                  Comenzar gratis <ArrowRight size={17} />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 border-line bg-cream px-6 text-sm text-navy"
              >
                <a href="#negocios">
                  Soy un negocio <Store size={17} />
                </a>
              </Button>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-muted">
              <Check size={14} className="text-brand" /> Demo disponible hoy · Sin tarjeta de
              crédito
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="relative">
              <div className="hidden translate-x-8 translate-y-12 rotate-3 opacity-95 sm:block">
                <LoyaltyCard card={heroCards[1]} onClick={() => {}} />
              </div>
              <div className="relative -rotate-2">
                <LoyaltyCard card={heroCards[0]} onClick={() => {}} />
              </div>
              <div
                className="floaty absolute -left-5 top-6 z-10 flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-xl"
                style={{ '--rot': '-4deg' } as CSSProperties}
              >
                <span className="stat-icon green">
                  <Stamp size={18} />
                </span>
                <div>
                  <strong className="block text-xs font-semibold text-navy">Sello 6 de 8</strong>
                  <small className="block text-[11px] text-muted">Café Avellaneda</small>
                </div>
              </div>
              <div
                className="floaty-slow absolute -right-4 bottom-16 z-10 flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-xl"
                style={{ '--rot': '3deg' } as CSSProperties}
              >
                <span className="stat-icon orange">
                  <Gift size={18} />
                </span>
                <div>
                  <strong className="block text-xs font-semibold text-navy">
                    ¡Recompensa lista!
                  </strong>
                  <small className="block text-[11px] text-muted">Matcha &amp; Co.</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="bg-navy text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-5 py-12 text-center md:grid-cols-4">
          {[
            ['+120', 'Negocios participantes'],
            ['48 mil', 'Sellos registrados'],
            ['12.4k', 'Recompensas canjeadas'],
            ['6', 'Ciudades del país'],
          ].map(([value, label]) => (
            <div key={label}>
              <div className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                {value}
              </div>
              <div className="mt-1.5 text-xs text-white/60">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="scroll-mt-24 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-[11px] font-semibold tracking-[0.18em] text-sand-dark">
              ASÍ DE FÁCIL
            </div>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-navy md:text-4xl">
              Tres pasos y ya está.
            </h2>
            <p className="mt-4 text-body">
              Punto Plus está hecho para que lo mejor de tu barrio te espere, visita tras visita.
            </p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Compass,
                tone: 'bg-[#e0eff0] text-brand',
                title: '1. Encuentra tu lugar',
                text: 'Explora cafeterías, panaderías y más en tu barrio, y agrega sus tarjetas a tu colección.',
              },
              {
                icon: QrCode,
                tone: 'bg-sand/25 text-sand-dark',
                title: '2. Visita y suma',
                text: 'Muestra tu QR al pagar. El negocio registra la compra y agrega un sello a tu tarjeta.',
              },
              {
                icon: Gift,
                tone: 'bg-navy text-sand',
                title: '3. Date ese gusto',
                text: 'Completa la tarjeta y canjea tu recompensa: un café, un pan, un matcha. Tuyo.',
              },
            ].map(({ icon: Icon, tone, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-line bg-white p-7 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
                  <Icon size={22} strokeWidth={1.8} />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-navy">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-body">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="max-w-2xl">
            <div className="text-[11px] font-semibold tracking-[0.18em] text-sand-dark">
              TODO LO NECESARIO
            </div>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-navy md:text-4xl">
              Pequeñas visitas, grandes detalles.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: QrCode,
                title: 'Tu QR personal',
                text: 'Un código seguro y temporal. Muéstralo al pagar y listo.',
              },
              {
                icon: Bell,
                title: 'Avisos que sí importan',
                text: 'Te contamos en cuanto una recompensa esté lista para canjearse.',
              },
              {
                icon: MapPin,
                title: 'Explora tu barrio',
                text: 'Negocios con personalidad, a unos pasos de donde estás.',
              },
              {
                icon: Heart,
                title: 'Tus favoritos a la mano',
                text: 'Guarda promociones para tu próxima visita, sin perderlas entre chats.',
              },
              {
                icon: CloudOff,
                title: 'Funciona sin conexión',
                text: 'Instálala como app y llévate tus tarjetas, incluso sin señal.',
              },
              {
                icon: ShieldCheck,
                title: 'Tus datos, protegidos',
                text: 'Sesión segura y sellos que solo el personal del negocio puede otorgar.',
              },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4 rounded-2xl border border-line bg-cream p-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-brand">
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-navy">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-body">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Para negocios */}
      <section
        id="negocios"
        className="relative scroll-mt-24 overflow-hidden bg-navy py-24 text-white"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-brand/20 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-2">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.18em] text-sand">
              PARA NEGOCIOS
            </div>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight md:text-[40px]">
              Haz que tus clientes <span className="text-sand">quieran volver.</span>
            </h2>
            <p className="mt-5 max-w-xl leading-relaxed text-white/70">
              Configura tu tarjeta, publica promociones y registra visitas con un escaneo. Todo
              desde un panel de administración independiente, pensado para ti.
            </p>
            <ul className="mt-8 space-y-3.5">
              {[
                'Tarjeta de fidelidad con tu nombre, tu recompensa y tu color',
                'Promociones en minutos, sin imprenta ni papeles',
                'Registro de compras con escaneo de QR',
                'Resumen de tu comunidad en un solo lugar',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/25 text-brand">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span className="text-sm text-white/85">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild className="h-12 bg-sand px-6 text-sm text-navy hover:bg-[#efb279]">
                <Link to={isDemo ? '/admin' : '/login'}>
                  Abrir panel de negocio <LayoutDashboard size={16} />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 border-white/40 bg-transparent px-6 text-sm text-white hover:bg-white/10 hover:text-white"
              >
                <a href="#historias">Ver historias</a>
              </Button>
            </div>
          </div>
          <div className="relative">
            <img
              src="/images/bakery.webp"
              alt="Panadería de barrio participante en Punto Plus"
              className="h-[380px] w-full rounded-3xl border border-white/10 object-cover shadow-2xl"
            />
            <div className="floaty-slow absolute -bottom-7 left-7 flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-navy shadow-xl">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sand/30 text-sand-dark">
                <Store size={19} />
              </span>
              <div>
                <strong className="block text-sm font-semibold">Tu comunidad, tus reglas</strong>
                <small className="block text-xs text-muted">Desde el panel de administración</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Historias */}
      <section id="historias" className="scroll-mt-24 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-[11px] font-semibold tracking-[0.18em] text-sand-dark">
              HISTORIAS DEL BARRIO
            </div>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-navy md:text-4xl">
              Negocios que ya repiten.
            </h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                img: '/images/coffee.webp',
                alt: 'Cafés de especialidad',
                quote:
                  'La tarjeta se llenó en un mes. Ahora llegan solo para completar los sellos.',
                name: 'Rosa Méndez',
                role: 'Café Avellaneda',
              },
              {
                img: '/images/bakery.webp',
                alt: 'Pan recién horneado',
                quote: 'Publicar una promoción toma dos minutos. Y sí, el pan de la casa vuela.',
                name: 'Mateo Ruiz',
                role: 'Pan de Barrio',
              },
              {
                img: '/images/matcha.webp',
                alt: 'Matcha helado',
                quote:
                  'Los sellos se volvieron el plan favorito de mis clientas. Vuelven y se quedan.',
                name: 'Alma Torres',
                role: 'Matcha & Co.',
              },
            ].map(({ img, alt, quote, name, role }) => (
              <figure
                key={name}
                className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm"
              >
                <img src={img} alt={alt} className="h-44 w-full object-cover" loading="lazy" />
                <figcaption className="p-6">
                  <blockquote className="text-sm leading-relaxed text-body">“{quote}”</blockquote>
                  <div className="mt-4">
                    <div className="text-sm font-semibold text-navy">{name}</div>
                    <div className="text-xs text-muted">{role}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-sand py-20">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-navy md:text-4xl">
            Tu próximo favorito te está esperando.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-navy/70">
            Únete hoy y convierte cada visita en una recompensa. Para clientes y para negocios.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild className="h-12 bg-navy px-7 text-sm text-white hover:bg-blue">
              <Link to={primaryCta}>
                Comenzar gratis <ArrowRight size={17} />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 border-navy/30 bg-transparent px-7 text-sm text-navy hover:bg-navy/5 hover:text-navy"
            >
              <a href="#negocios">Soy un negocio</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <span className="inline-block rounded-xl bg-white p-2">
              <img src={logo} alt="Punto Plus" className="h-7" />
            </span>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
              Fidelidad para el comercio local. Pequeñas visitas, grandes recompensas.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold tracking-[0.16em] text-white">PRODUCTO</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a href="#como-funciona" className="transition-colors hover:text-sand">
                  Cómo funciona
                </a>
              </li>
              <li>
                <a href="#historias" className="transition-colors hover:text-sand">
                  Historias
                </a>
              </li>
              <li>
                <Link to="/app" className="transition-colors hover:text-sand">
                  Panel de clientes
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold tracking-[0.16em] text-white">NEGOCIOS</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a href="#negocios" className="transition-colors hover:text-sand">
                  ¿Por qué Punto Plus?
                </a>
              </li>
              <li>
                <Link to="/admin" className="transition-colors hover:text-sand">
                  Panel de administración
                </Link>
              </li>
              <li>
                <Link to="/login" className="transition-colors hover:text-sand">
                  Iniciar sesión
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold tracking-[0.16em] text-white">LEGALES</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a href="#" className="transition-colors hover:text-sand">
                  Privacidad
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-sand">
                  Términos
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-white/50">
            <span>© {new Date().getFullYear()} Punto Plus. Lo bueno está cerca.</span>
            <span className="flex items-center gap-1.5">
              Hecho para volver <Heart size={12} className="text-sand" />
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
