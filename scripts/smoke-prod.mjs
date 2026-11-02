/**
 * Smoke test del bundle de producción: monta `dist/` dentro de jsdom (sin
 * navegador) para comprobar que el panel del cliente pinta algo.
 *
 *   node scripts/smoke-prod.mjs /app
 *
 * Variables para reproducir escenarios:
 *   SMOKE_ROLE=client|business|admin|customer   rol guardado en la sesión
 *   SMOKE_NO_USER=1                             sesión con token pero sin usuario
 *   SMOKE_EXPIRED=1                             access token vencido
 *   SMOKE_NO_SESSION=1                          sin sesión guardada
 */
import { JSDOM } from 'jsdom';
import { readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const route = process.argv[2] ?? '/app';
const dist = path.resolve('dist');
const html = readFileSync(path.join(dist, 'index.html'), 'utf8');

const noBundle = Boolean(process.env.SMOKE_NO_BUNDLE);
const dom = new JSDOM(html, {
  url: `https://app.punto-plus.com.mx${route}`,
  pretendToBeVisual: true,
  // Con SMOKE_NO_BUNDLE se ejecutan solo los scripts en línea del HTML (el
  // respaldo de arranque) para comprobar que la página nunca queda en blanco.
  runScripts: noBundle ? 'dangerously' : undefined,
});

const { window } = dom;
globalThis.window = window;
// Copia los constructores del DOM que espera el bundle (MutationObserver, etc.).
for (const key of Object.getOwnPropertyNames(window)) {
  if (key in globalThis) continue;
  try {
    globalThis[key] = window[key];
  } catch {}
}
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
Object.defineProperty(globalThis, 'location', { value: window.location, configurable: true });
globalThis.document = window.document;
globalThis.history = window.history;
globalThis.localStorage = window.localStorage;
globalThis.sessionStorage = window.sessionStorage;
globalThis.getComputedStyle = window.getComputedStyle;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.matchMedia = window.matchMedia;
globalThis.ResizeObserver =
  window.ResizeObserver ??
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
window.ResizeObserver = globalThis.ResizeObserver;
globalThis.IntersectionObserver = window.IntersectionObserver ?? globalThis.ResizeObserver;
window.scrollTo = () => {};
globalThis.scrollTo = window.scrollTo;
globalThis.fetch = async () => {
  throw new Error('fetch bloqueado en el smoke test');
};
window.fetch = globalThis.fetch;

if (!process.env.SMOKE_NO_SESSION) {
  localStorage.setItem(
    'punto-plus.auth.v1',
    JSON.stringify({
      accessToken: 'smoke-token',
      refreshToken: 'smoke-refresh',
      tokenType: 'Bearer',
      expiresAt: process.env.SMOKE_EXPIRED ? Date.now() - 1000 : Date.now() + 3_600_000,
      scope: null,
      user: process.env.SMOKE_NO_USER
        ? null
        : {
            id: '1',
            name: 'Sofía',
            email: 'sofia@example.com',
            role: process.env.SMOKE_ROLE ?? 'client',
          },
      storedAt: Date.now(),
    }),
  );
}

// XHR que siempre falla como una API caída/bloqueada por CORS, sin tocar la red.
class DeadXHR {
  static UNSENT = 0;
  static OPENED = 1;
  static DONE = 4;
  readyState = 0;
  status = 0;
  statusText = '';
  response = '';
  responseText = '';
  responseType = '';
  timeout = 0;
  withCredentials = false;
  upload = { addEventListener() {}, removeEventListener() {} };
  onload = null;
  onerror = null;
  ontimeout = null;
  onabort = null;
  onreadystatechange = null;
  open() {
    this.readyState = 1;
  }
  send() {
    setTimeout(() => {
      this.readyState = 4;
      this.status = 0;
      this.onreadystatechange?.();
      this.onerror?.(new window.ProgressEvent('error'));
      this.onloadend?.(new window.ProgressEvent('loadend'));
    }, 5);
  }
  abort() {}
  setRequestHeader() {}
  getAllResponseHeaders() {
    return '';
  }
  addEventListener() {}
  removeEventListener() {}
}
window.XMLHttpRequest = DeadXHR;
globalThis.XMLHttpRequest = DeadXHR;

const entry = readdirSync(path.join(dist, 'assets')).find(
  (f) => f.startsWith('index-') && f.endsWith('.js'),
);
const errors = [];
const originalConsoleError = console.error;
console.error = (...args) => {
  const text = args.map(String).join(' ');
  if (/getaddrinfo|ENOTFOUND|Network Error|XMLHttpRequest/i.test(text)) return;
  originalConsoleError(...args);
};
window.addEventListener('error', (e) => errors.push(`error: ${e.message}`));
process.on('unhandledRejection', (e) => {
  const message = e?.message ?? String(e);
  if (/fetch bloqueado/.test(message)) return;
  errors.push(`unhandledRejection: ${message}`);
});

if (noBundle) {
  // El bundle nunca carga: el respaldo debe hacerse visible con el error.
  window.dispatchEvent(new window.ErrorEvent('error', { message: 'boom de arranque' }));
  await new Promise((r) => setTimeout(r, 120));
} else {
  await import(pathToFileURL(path.join(dist, 'assets', entry)).href);
  await new Promise((r) => setTimeout(r, 2500));
}

const root = document.getElementById('root');
const text = (root?.textContent ?? '').replace(/\s+/g, ' ').trim();
console.log('escenario:', JSON.stringify({ route, ...process.env, SMOKE_ROLE: undefined }));
console.log('URL final:', window.location.pathname);
console.log('#root hijos:', root?.children.length ?? 0);
console.log('#root texto:', text.slice(0, 220) || '(VACÍO)');
const fallback = document.getElementById('boot-fallback');
console.log(
  'respaldo de arranque:',
  !fallback
    ? 'retirado (la app montó)'
    : fallback.getAttribute('data-visible') === 'true'
      ? `VISIBLE → ${(fallback.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 160)}`
      : 'oculto',
);
if (errors.length) console.log('errores capturados:\n' + errors.join('\n'));
process.exit(0);
