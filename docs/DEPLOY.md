# Despliegue y pantallas en blanco

Esta app es una **SPA con rutas propias** (`/app`, `/business`, `/admin`, `/:slug`) y un
**service worker** (PWA). Las dos cosas son las que más veces producen una pantalla en
blanco en producción, y ninguna de las dos tiene por qué aparecer en la consola.

## Checklist antes de publicar

1. `npm ci && npm run build` (el build falla si `tsc` no pasa).
2. Define las variables `VITE_*` **en el momento del build**: Vite las incrusta en el
   bundle, no se leen en el servidor.
   - `VITE_API_BASE_URL` → URL del backend (por defecto `https://api.punto-plus.com.mx`).
   - `VITE_DATA_MODE` → `api` en producción (`demo` deja los datos de ejemplo y desactiva
     la protección de los paneles).
   - `VITE_AUTH_*` → rutas de login/refresh/perfil del backend.
   - `VITE_GOOGLE_MAPS_API_KEY` → clave restringida por HTTP referrer al dominio.
3. Sirve `dist/` **con reescritura de rutas** hacia `index.html` (ver abajo).
4. Comprueba `/app` **entrando directo** (no solo navegando desde la portada).

## Reescritura de rutas por hosting

| Hosting                         | Configuración                                                                |
| ------------------------------- | ---------------------------------------------------------------------------- |
| Vercel                          | `vercel.json` → `{ "source": "/(.*)", "destination": "/index.html" }`        |
| Netlify / Cloudflare Pages      | `public/_redirects` → `/* /index.html 200`                                   |
| Apache / cPanel / hosting Linux | `public/.htaccess` → `RewriteRule . /index.html [L]`                         |
| Nginx                           | `try_files $uri $uri/ /index.html;`                                          |
| GitHub Pages                    | No sirve tal cual: usa un `404.html` igual al `index.html` o cambia de host. |

> **Ojo con Vercel:** `source` usa _path-to-regexp_, **no** expresiones regulares. Un
> patrón con _negative lookahead_ (`/((?!assets/).*)`) no se compila o no coincide nunca:
> el deploy falla o las rutas profundas responden 404. Vercel ya comprueba el sistema de
> archivos antes de aplicar la reescritura, así que el catch-all `/(.*)` es el correcto y
> `/assets/*`, `/sw.js` y las imágenes se sirven intactos.

## Caché

- `index.html`, `sw.js` y `registerSW.js` → `no-cache`: cada despliegue se ve al instante.
- `/assets/*` → inmutable: llevan hash en el nombre y no cambian.

Si el HTML se cachea, el navegador pide fragmentos con el hash **anterior**; esos archivos
ya no existen en el servidor, el bundle no arranca y la pantalla queda en blanco sin
errores de JavaScript.

## Cómo diagnosticar una pantalla en blanco

1. **DevTools → Network**, recarga con `Ctrl/Cmd + Shift + R`:
   - ¿`/app` responde `200` con `text/html`? Si responde 404 o el HTML de la portada del
     hosting, falta la reescritura de rutas (arriba).
   - ¿`/assets/index-*.js` responde `200` con `Content-Type: application/javascript`?
     Si responde `text/html`, una reescritura demasiado amplia está capturando los assets.
   - En la columna _Size_ de `index.html` debe decir `(disk cache)` o un tamaño real; si
     dice **`(ServiceWorker)`**, la copia viene del service worker.
2. **Application → Service Workers → Unregister** y recarga. Si con eso ya carga, el
   problema era una versión vieja del service worker: `cleanupOutdatedCaches` y las
   cabeceras de `sw.js` lo evitan.
3. **Console** con _Preserve log_ activado y recarga completa: los errores de arranque
   (MIME, import fallido) aparecen aquí y no siempre sobreviven a una navegación.
4. Si el panel carga pero se ve vacío, revisa **Application → Local Storage**
   (`punto-plus.auth.v1`): un rol distinto de `client`/`customer`/`cliente` manda a otro
   panel, y sin sesión la app va a `/login`.

### Red de seguridad en el arranque

`index.html` incluye un respaldo que **no depende del bundle**:

- Si el módulo no llega a ejecutarse, a los 10 s aparece un aviso con botón **Recargar**
  en lugar de una pantalla en blanco.
- Si un fragmento con hash desaparece tras un despliegue (`vite:preloadError`), la página
  se recarga **una sola vez** para pedir la versión vigente.
- Cualquier error de arranque se muestra con su mensaje.
- `<noscript>` explica qué hacer si JavaScript está desactivado.

## Probar el bundle de producción sin navegador

```bash
npm run build
node scripts/smoke-prod.mjs /app
```

Monta `dist/` en jsdom con una sesión de cliente y dice si `#root` quedó vacío, con qué
texto y qué errores se capturaron. Acepta escenarios:

```bash
SMOKE_NO_SESSION=1 node scripts/smoke-prod.mjs /app   # debe mostrar el login
SMOKE_EXPIRED=1 node scripts/smoke-prod.mjs /app      # token vencido
SMOKE_NO_USER=1 node scripts/smoke-prod.mjs /app      # token sin perfil
SMOKE_ROLE=customer node scripts/smoke-prod.mjs /app  # rol legado
```
