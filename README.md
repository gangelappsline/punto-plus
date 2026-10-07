# Punto Plus

SPA de fidelidad **React 19 + TypeScript + Vite 6**, en español, responsive y preparada como PWA. Incluye una **landing pública**, un **panel de clientes** y un **panel de administración independientes**.

## Rutas y paneles

| Ruta | Vista | Acceso |
| --- | --- | --- |
| `/` | Landing de marca y publicidad (qué, cómo funciona, para negocios, historias, CTA) | Público |
| `/login` | Inicio de sesión (redirige al panel según rol) | Público |
| `/app` | Panel de cliente: mis tarjetas, explorar, recompensas, actividad | Cliente (o demo) |
| `/admin` | Panel de administración independiente: resumen + espacio de negocio | Negocio/admin (o demo) |
| `/admin/negocio` | Tarjeta del negocio, registro de compras y promociones (lazy) | Negocio/admin (o demo) |

En **modo demo** (`VITE_DATA_MODE=demo`, valor por defecto) cualquier ruta de panel está abierta con datos ficticios y sin backend. En **modo API** los guards del router redirigen a `/login` y, tras autenticar, a `/app` o `/admin` según el rol del usuario.

## Paleta de marca

Tokens definidos en `@theme` de `src/index.css` (Tailwind v4): `#F5BE8B` (arena, acentos), `#254865` (azul, tarjetas/estado), `#FBFBFA` (crema, superficies), `#2399A0` (teal, marca y acciones), `#022F53` (marino, texto y panel de administración). El logo (`src/assets/images/`) se aplica en landing, login, barras de cada panel y estados de carga; los iconos PWA (`public/icon.svg`, `icon-192/512.png`) siguen la misma paleta.

> **Estado de integración:** la API `https://api.punto-plus.com.mx` no resolvió por DNS desde el entorno de desarrollo el 6 de octubre de 2026. No se recibió un contrato OpenAPI. Los endpoints de `src/services/api.ts` son una **propuesta explícita**, no una integración de producción verificada. La aplicación inicia en **modo demo**, identificado en la interfaz, sin enviar compras ni datos personales al backend.

## Inicio rápido

Requisitos: Node.js **22.12+** y npm 10+.

```bash
npm ci
cp .env.example .env
npm run dev
```

Abrir `http://localhost:5173`. El servidor escucha en `0.0.0.0` y permite el dominio de preview `.e2b.app`. No hacen falta cuentas, claves ni servicios para explorar la demostración.

```bash
npm run build         # TypeScript estricto + build y service worker
npm run preview       # Compilación de producción en :4173
npm test              # Vitest + React Testing Library: 19 pruebas
npm run typecheck
npm run format:check
npx playwright install --with-deps chromium
npm run test:e2e      # 10 pruebas: escritorio + móvil
```

`.npmrc` activa `legacy-peer-deps` para evitar un error de resolución de peers opcionales de Vitest en npm 10. El lockfile fija las versiones instaladas. No se emplea para eludir incompatibilidades conocidas entre React, Router, Query o Vite.

## Funcionalidades

### Cliente

- Tarjetas con sellos, progreso, filtros y ordenación.
- Búsqueda insensible a mayúsculas y acentos.
- Exploración por categoría, promociones con condiciones y favoritos persistentes.
- Alta en la tarjeta de un negocio desde Explorar o su QR.
- QR personal; el modo API espera tokens temporales emitidos por el servidor.
- Recompensas, confirmación explícita de canje e historial actualizado.
- Diálogos accesibles con Radix, foco atrapado, cierre con Escape y restauración del foco.
- Estados de carga, error, vacío y conexión; notificaciones derivadas de la actividad.

### Negocio

- Nombre, recompensa, meta de 2–12 sellos, paleta, icono y logo.
- Vista previa de la tarjeta.
- Promociones con imagen opcional, validación, condiciones y vigencia.
- Escaneo mediante cámara tras permiso explícito o entrada manual del código.
- Confirmación de compra antes de otorgar un sello.
- Guarda de ruta por rol en modo API. **La autorización definitiva siempre debe realizarse en el servidor.**

No se implementa dashboard de administrador (opcional en la solicitud). Registro, recuperación de contraseña, geolocalización, push y analítica no se presentan como funcionalidades disponibles: necesitan requisitos y contratos adicionales. La ciudad, distancia y negocios del demo son datos ilustrativos, no resultados de geolocalización.

## Probar los flujos sin backend

1. **Canje:** abrir Matcha & Co. → Canjear → Confirmar. Se consumen cinco sellos y se registra un evento.
2. **Compra:** Mi negocio → Registrar una compra → Probar con un QR de demostración → Confirmar. Agrega un sello a Café Avellaneda; una tarjeta completa no admite más sellos hasta canjear.
3. **Alta:** Escanear un negocio → Probar con un QR de demostración → Agregar a mis tarjetas. Incorpora Casa Botánica.
4. **Promociones:** Mi negocio → Promociones → Nueva promoción. La nueva promoción aparece en Explorar.
5. **Restablecer:** eliminar la clave `punto-plus-demo-v1` de localStorage y recargar.

Los datos demo se validan con Zod y se guardan únicamente en el navegador. Los canjes y promociones demo **no tienen valor comercial**. No son un mecanismo de autorización ni un sustituto de transacciones del backend. El demo no garantiza atomicidad entre varias pestañas.

## Arquitectura

```text
src/
├── App.tsx                    # Router, shell, navegación y guards
├── main.tsx                   # Providers, ErrorBoundary y notificaciones
├── index.css                  # Tailwind v4 + estilos responsive y tokens
├── components/
│   ├── LoyaltyCard.tsx        # Tarjeta, sello y marca
│   ├── PromotionCard.tsx
│   ├── Scanner.tsx            # Cámara lazy, limpieza y entrada manual
│   └── ui/                   # Base estilo shadcn: Button (CVA), Dialog (Radix)
├── features/
│   ├── LandingPage.tsx        # Landing pública: marca, pasos, negocios, CTA
│   ├── CustomerPages.tsx      # Tarjetas, exploración, recompensas e historial
│   ├── AdminShell.tsx         # Shell + dashboard del panel de administración
│   ├── BusinessPage.tsx       # Configuración, compras y promociones (lazy)
│   ├── Dialogs.tsx            # QR, detalle, canje y promoción
│   └── Login.tsx
├── lib/
│   ├── types.ts              # Schemas Zod y tipos inferidos
│   ├── queries.ts            # TanStack Query, mutaciones e invalidación
│   └── utils.ts
├── services/
│   ├── api.ts                # Frontera demo/API, contrato provisional
│   ├── http.ts               # Axios y refresh single-flight
│   └── demo.ts               # Fixtures, persistencia y reglas demo
├── stores/auth.ts            # Zustand, usuario y token solo en memoria
├── assets/images/            # Logo de marca (webp original + versión alfa)
└── test/                     # Tests unitarios, de interfaz y HTTP
e2e/                          # Escenarios Playwright desktop y móvil
public/                       # Iconos PWA e imágenes locales optimizadas
```

La caché remota pertenece a TanStack Query; Zustand contiene solo la sesión. Formularios con React Hook Form + Zod. No se duplican peticiones en loaders del router: Query gestiona carga, caché y revalidación. El scanner y el panel de negocio se cargan de forma diferida. Tipografías variables locales; no se depende de Google Fonts ni de imágenes remotas para el demo.

## Conectar la API real

Leer [docs/API_CONTRACT.md](docs/API_CONTRACT.md) antes de habilitar:

```dotenv
VITE_API_BASE_URL=https://api.punto-plus.com.mx
VITE_DATA_MODE=api
```

Reiniciar Vite o recompilar después de cambiar variables. **Todo `VITE_*` es público: nunca incluir secretos.** En este modo se restaura la sesión usando la cookie refresh o se muestra login. No hay fallback silencioso a datos demo si la API falla.

## PWA, cámara y despliegue

- `npm run build` genera manifiesto, iconos y service worker con `vite-plugin-pwa`.
- Se precargan el shell, fuentes e imágenes locales. No se cachean respuestas privadas de API ni se encolan compras/canjes offline.
- La experiencia demo funciona offline después de una primera carga del build de producción. El modo API requiere red para consultar datos privados o realizar operaciones.
- La instalación es contextual mediante `beforeinstallprompt`, con instrucciones para Safari/iOS y navegadores sin ese evento.
- La cámara necesita **HTTPS** (o localhost) y permiso del usuario. En previews embebidos, el contenedor también debe permitir `camera`; si no, abrir la app en una pestaña independiente. Hay entrada manual como alternativa.
- Compilar y desplegar **`dist/`**. Todas las rutas SPA deben reescribirse a `/index.html`. Se incluyen `vercel.json` y `public/_redirects` para Vercel/Netlify.
- No usar `vite preview` como servidor de producción. Servir estáticos con CDN o un servidor adecuado y HTTPS.
- Para otros hosts de desarrollo, agregarlos explícitamente a `server.allowedHosts`. No desactivar indiscriminadamente el control de hosts.

### Nginx (fragmento)

```nginx
location / { try_files $uri $uri/ /index.html; }
location = /sw.js { add_header Cache-Control "no-cache"; }
location = /index.html { add_header Cache-Control "no-cache"; }
```

La API configurada es HTTPS y accesible desde el navegador. No hay URLs `localhost` para llamadas del cliente a otro servicio. Si se desea BFF/proxy de mismo origen, configurar su ruta relativa y la reescritura en infraestructura.

## Verificación y límites

Las pruebas comprueban consumos de sellos, rechazo de canjes inválidos, alta idempotente en demo, favoritos, almacenamiento corrupto, configuración, login/refresh concurrente y limpieza de sesión, QR accesible y flujos completos en ambos tamaños de pantalla. La cámara física y las operaciones del backend requieren pruebas de aceptación con dispositivos y el servicio real.

## Recursos visuales

- Las fotografías de café, panadería y matcha se generaron para esta aplicación y están optimizadas a WebP. Son ilustraciones: no representan los negocios mencionados.
- Tipografías DM Sans y Manrope distribuidas mediante Fontsource con sus licencias incluidas en los paquetes.
