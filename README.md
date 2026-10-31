# Punto Plus

SPA de fidelidad **React 19 + TypeScript + Vite 6**, en español, responsive y preparada como PWA. Incluye una **landing pública** y tres paneles independientes para clientes, negocios y administración.

## Rutas y paneles

| Ruta                   | Vista                                                                             | Acceso                            |
| ---------------------- | --------------------------------------------------------------------------------- | --------------------------------- |
| `/`                    | Landing de marca y publicidad (qué, cómo funciona, para negocios, historias, CTA) | Público                           |
| `/login`               | Inicio de sesión contra la API (redirige al panel según rol)                      | Público; con sesión va a su panel |
| `/registro`            | Alta de cuentas: clientes y negocios (lazy)                                       | Público; con sesión va a su panel |
| `/menu/:negocio`       | Menú digital público del negocio, con su QR                                       | Público                           |
| `/app`                 | Panel de cliente: mis tarjetas, explorar, recompensas, actividad                  | Cliente con token vigente         |
| `/business`            | Panel de negocio: resumen, tarjeta, compras y promociones                         | Negocio con token vigente         |
| `/business/negocio`    | Configuración de tarjeta y promociones (lazy)                                     | Negocio con token vigente         |
| `/business/onboarding` | Asistente por pasos para dar de alta el negocio (lazy)                            | Negocio con token vigente         |
| `/admin`               | Panel de administración de plataforma                                             | Admin con token vigente           |

Cada rol tiene un **layout independiente** (`CustomerShell.tsx`, `BusinessShell.tsx` y `AdminShell.tsx`) y se monta detrás de su guarda en `src/features/Guards.tsx`:

- **Sin token** → `/login`, recordando la ruta pedida en `state.from` para volver ahí tras autenticar.
- **Token vigente, rol que no corresponde** → redirección al panel propio (`/app` para clientes, `/business` para negocios y `/admin` para administradores).
- **Token vencido** → se intenta renovar con el refresh token antes de decidir; si el backend lo rechaza, la sesión se cierra y se vuelve a `/login`.
- **Sesión iniciada en `/login` o `/registro`** → se devuelve al panel de la cuenta.

La validez se resuelve **en local** (access token presente y no vencido, con el margen de `EXPIRY_SKEW_MS`): entrar a un panel no dispara una petición extra. La renovación y el cierre por 401 los hacen el interceptor de Axios y la consulta de sesión (`useSession`), que solo llama a la API cuando falta el perfil o el token ya venció. En **modo demo** (`VITE_DATA_MODE=demo`, opt-in) los paneles siguen abiertos: los datos son locales y no hay sesión real que proteger.

## Paleta de marca

Tokens definidos en `@theme` de `src/index.css` (Tailwind v4): `#F5BE8B` (arena, acentos), `#254865` (azul, tarjetas/estado), `#FBFBFA` (crema, superficies), `#2399A0` (teal, marca y acciones), `#022F53` (marino, texto y panel de administración). El logo (`src/assets/images/`) se aplica en landing, login, barras de cada panel y estados de carga; los iconos PWA (`public/icon.svg`, `icon-192/512.png`) siguen la misma paleta.

> **Estado de integración:** la API `https://api.punto-plus.com.mx` no resolvió por DNS desde el entorno de desarrollo el 6 de octubre de 2026. No se recibió un contrato OpenAPI. Los endpoints de `src/services/api.ts` son una **propuesta explícita**, no una integración de producción verificada. La aplicación apunta a la API por defecto; con `VITE_DATA_MODE=demo` arranca en modo demostración, identificado en la interfaz, sin enviar compras ni datos personales al backend.

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
npm test              # Vitest + React Testing Library: 84 pruebas
npm run typecheck
npm run format:check
npx playwright install --with-deps chromium
npm run test:e2e      # 10 pruebas: escritorio + móvil (corren en modo demo)
```

`.npmrc` activa `legacy-peer-deps` para evitar un error de resolución de peers opcionales de Vitest en npm 10. El lockfile fija las versiones instaladas. No se emplea para eludir incompatibilidades conocidas entre React, Router, Query o Vite.

## Funcionalidades

### Acceso

- Inicio de sesión en `/login` contra la API real (Passport `Bearer` + `refresh_token` o el controlador propio del backend, según `VITE_AUTH_LOGIN_MODE`). El formulario envía las credenciales con `useLogin`, guarda el token que responde el servidor y entra al panel del rol; vuelve a la ruta que se intentó abrir si le corresponde.
- Los paneles quedan protegidos por token y rol (ver [Rutas y paneles](#rutas-y-paneles)).
- Alta de **clientes y negocios** desde la misma página `/registro`, con los mismos cuatro datos para ambos: **nombre, correo, teléfono y contraseña** (más confirmación y aceptación de términos). El selector de tipo de cuenta solo cambia el copy y el rol enviado; los datos del negocio se capturan después, en el asistente por pasos (ver [Negocio](#negocio)).
- Validación con Zod en el navegador y traducción de los errores **422** de Laravel al campo correspondiente.
- Contraseña con confirmación, medidor de seguridad y envío deshabilitado mientras hay petición en vuelo.
- En modo demo ninguna credencial sale del navegador: se crea una sesión local identificada como demo.

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

**Asistente de alta por pasos** (`/business/onboarding`, también montado en `/business/negocio` mientras el perfil esté incompleto). Tras crear la cuenta e iniciar sesión, el dueño completa su negocio en siete pasos; al publicar se guarda todo de una vez y se le devuelve a su panel:

1. **Logo** (obligatorio). Al subirlo se analizan sus píxeles en el navegador y se propone la paleta.
2. **Banner** (opcional), portada del menú digital y de la tarjeta.
3. **Nombre del negocio**.
4. **Categorías de comida** que vende (selección múltiple).
5. **Menú**: subir la foto del menú impreso genera un borrador de platos a partir de las categorías elegidas; el dueño edita nombre, precio y descripción, agrega o quita platos antes de publicar.
6. **Colores del menú y el QR**, precargados con los del logo y ajustables; hay vista previa de la tarjeta del menú y del QR ya pintado con esos colores.
7. **Promoción de bienvenida**, con el tipo que el dueño elija (ver abajo).

El análisis de color (`src/lib/colors.ts`) ocurre por completo en el cliente: cuantiza los píxeles, descarta transparencias y fondos blancos/negros, elige el color dominante y el que mejor contraste hace con él, y oscurece el frente del QR hasta alcanzar un contraste ≥ 4.5:1. **Si la imagen no se puede decodificar, se usa la paleta de marca como respaldo** y el flujo continúa.

**Promociones** — tres tipos, cada uno con sus propios campos y validación:

| Tipo          | Cómo funciona                                                 | Campos                                                   |
| ------------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| **Sencilla**  | Al juntar cierto número de compras se gana producto(s) gratis | compras requeridas, producto gratis, cantidad            |
| **Por pasos** | Beneficios al alcanzar cada meta de puntos                    | lista de niveles (puntos mínimos + beneficio)            |
| **Directas**  | Sin condición: siempre activas, o en días y horas específicos | siempre activa, o días de la semana + hora de inicio/fin |

Ejemplos de directas: "Jueves de 2×1 en hot-dogs" o "Martes de $17 el taco de barbacoa".

- Nombre, recompensa, meta de 2–12 sellos, paleta, icono y logo editables después del alta.
- Vista previa de la tarjeta.
- Promociones con imagen opcional, validación, condiciones y vigencia.
- Escaneo mediante cámara tras permiso explícito o entrada manual del código.
- Confirmación de compra antes de otorgar un sello.
- Guarda de ruta por rol: un cliente, negocio o admin solo entra a su panel correspondiente. **La autorización definitiva siempre debe realizarse en el servidor.**

> **Límites asumidos del asistente.** El análisis del menú es un **borrador a partir de las categorías**, no OCR: leer el texto de la foto del menú impreso requiere un servicio de OCR/visión que el backend debe proveer (ver [docs/API_CONTRACT.md](docs/API_CONTRACT.md)). El dueño revisa y corrige cada plato antes de publicar, así que ningún dato incorrecto llega al menú sin su confirmación. La recompensa y la meta de sellos se crean con valores por defecto (producto gratis, 8 sellos) y se ajustan en "Mi tarjeta".

El panel de administración tiene un layout y una vista propios; las operaciones de plataforma quedan pendientes de endpoints administrativos específicos en la API. Recuperación de contraseña, geolocalización, push y analítica no se presentan como funcionalidades disponibles: necesitan requisitos y contratos adicionales. El registro sí está implementado; su ruta exacta debe confirmarse con el backend (ver [docs/API_CONTRACT.md](docs/API_CONTRACT.md)). La ciudad, distancia y negocios del demo son datos ilustrativos, no resultados de geolocalización.

## Probar los flujos sin backend

Definir `VITE_DATA_MODE=demo` en `.env` y reiniciar Vite.

1. **Alta de negocio:** `/registro` → _Tengo un negocio_ → nombre, correo, teléfono y contraseña. Con la API real, una cuenta nueva entra a `/business` sin perfil y el aviso _Termina de configurar tu negocio_ la lleva al asistente. En el demo, Café Avellaneda ya viene configurado (tiene clientes, sellos e historial), así que el asistente se abre directo en `/business/onboarding`: logo → banner → nombre → categorías → menú → colores → promoción → publicar. Al publicar, `/business/negocio` muestra el editor y `/menu/<negocio>` el menú digital con su QR.
2. **Canje:** abrir Matcha & Co. → Canjear → Confirmar. Se consumen cinco sellos y se registra un evento.
3. **Compra:** Mi negocio → Registrar una compra → Probar con un QR de demostración → Confirmar. Agrega un sello a Café Avellaneda; una tarjeta completa no admite más sellos hasta canjear.
4. **Alta:** Escanear un negocio → Probar con un QR de demostración → Agregar a mis tarjetas. Incorpora Casa Botánica.
5. **Promociones:** Mi negocio → Promociones → Nueva promoción → elegir tipo (sencilla, por pasos o directa). La nueva promoción aparece en Explorar.
6. **Restablecer:** eliminar la clave `punto-plus-demo-v1` de localStorage y recargar.

Los datos demo se validan con Zod y se guardan únicamente en el navegador. Los canjes y promociones demo **no tienen valor comercial**. No son un mecanismo de autorización ni un sustituto de transacciones del backend. El demo no garantiza atomicidad entre varias pestañas.

## Arquitectura

```text
src/
├── App.tsx                    # Router: rutas públicas y los dos paneles protegidos
├── main.tsx                   # Providers, hidratación de sesión y ErrorBoundary
├── index.css                  # Tailwind v4 + estilos responsive y tokens
├── components/
│   ├── AppSplash.tsx          # Pantalla de espera de arranque y rutas diferidas
│   ├── LoyaltyCard.tsx        # Tarjeta, sello y marca
│   ├── PromotionCard.tsx
│   ├── Scanner.tsx            # Cámara lazy, limpieza y entrada manual
│   └── ui/                   # Base estilo shadcn: Button (CVA), Dialog (Radix)
├── features/
│   ├── LandingPage.tsx        # Landing pública: marca, pasos, negocios, CTA
│   ├── Guards.tsx             # PanelGate y GuestOnly: acceso por token y rol
│   ├── CustomerShell.tsx      # Layout del panel de cliente
│   ├── CustomerPages.tsx      # Tarjetas, exploración, recompensas e historial
│   ├── AdminShell.tsx         # Layout del panel de negocio
│   ├── AdminDashboard.tsx     # Resumen del negocio
│   ├── BusinessPage.tsx       # Configuración, compras y promociones (lazy)
│   ├── BusinessOnboarding.tsx # Asistente por pasos: logo, banner, menú, colores, promoción (lazy)
│   ├── MenuPage.tsx           # Menú digital público con el QR del negocio
│   ├── Dialogs.tsx            # QR, detalle, canje y promoción
│   ├── AuthLayout.tsx         # Columna de marca + formulario (login y registro)
│   ├── Login.tsx              # Inicio de sesión
│   ├── Register.tsx           # Alta de clientes y negocios (lazy)
│   └── NotFoundPage.tsx       # Ruta inexistente
├── lib/
│   ├── types.ts              # Schemas Zod y tipos inferidos
│   ├── queries.ts            # Consultas y mutaciones de datos (TanStack Query)
│   ├── colors.ts             # Paleta extraída del logo en el cliente (contraste del QR)
│   ├── image.ts              # Lectura y validación de imágenes subidas
│   ├── session.ts            # Sesión: restore, login, registro y logout (Query)
│   ├── tokenStorage.ts       # Normaliza y persiste access/refresh token de Passport
│   └── utils.ts              # Modo demo/API, paneles por rol y mensajes de error
├── services/
│   ├── api.ts                # Frontera demo/API, contrato provisional
│   ├── auth.ts               # login, register, logout y restore
│   ├── authConfig.ts         # Endpoints y modo de login (passport | json)
│   ├── http.ts               # Axios, Bearer, refresh single-flight y ApiError
│   └── demo.ts               # Fixtures, persistencia y reglas demo
├── stores/auth.ts            # Zustand: sesión hidratada desde tokenStorage
├── assets/images/            # Logo de marca (webp original + versión alfa)
└── test/                     # Tests unitarios, de interfaz y HTTP
e2e/                          # Escenarios Playwright desktop y móvil
public/                       # Iconos PWA e imágenes locales optimizadas
```

**Todas las peticiones a la API pasan por TanStack Query.** Ningún componente llama a `services/api.ts` directamente: usa los hooks de `lib/queries.ts` (tarjetas, promociones, actividad, favoritos, QR, negocio y `usePublishBusiness`, que guarda el perfil completo del asistente y crea su promoción en una sola mutación) o los de `lib/session.ts` (restore, login, registro y logout). Cada hook fija su clave de caché, cuándo se ejecuta y qué se revalida; los guards solo leen el token del store, así que la navegación no dispara peticiones de más.

Zustand contiene únicamente la sesión (usuario, access token y expiración), hidratada desde `tokenStorage` antes del primer render en `main.tsx`. Formularios con React Hook Form + Zod. No se duplican peticiones en loaders del router: Query gestiona carga, caché y revalidación. El scanner y el panel de negocio se cargan de forma diferida. Tipografías variables locales; no se depende de Google Fonts ni de imágenes remotas para el demo.

## Conectar la API real

Es el modo por defecto: sin variables, la app consume el backend y exige sesión. Leer [docs/API_CONTRACT.md](docs/API_CONTRACT.md) para confirmar rutas y envelopes.

```dotenv
VITE_API_BASE_URL=https://api.punto-plus.com.mx
VITE_DATA_MODE=api          # "demo" activa los fixtures locales y abre los paneles
```

Reiniciar Vite o recompilar después de cambiar variables. **Todo `VITE_*` es público: nunca incluir secretos.** No hay fallback silencioso a datos demo si la API falla.

Para recorrer la interfaz sin backend: `VITE_DATA_MODE=demo` (o `npm run test:e2e`, que levanta el servidor ya en ese modo).

### Autenticación con Laravel Passport

Por defecto el login usa el **password grant** de Passport:

```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=password&client_id=…&username=…&password=…&scope=
```

y guarda la respuesta tal cual llega:

```json
{
  "token_type": "Bearer",
  "expires_in": 31536000,
  "access_token": "eyJ0…",
  "refresh_token": "def502…"
}
```

`src/lib/tokenStorage.ts` normaliza esa respuesta (también acepta camelCase y
envoltorios como `{ user, authorization: { … } }`), calcula `expiresAt` desde
`expires_in` y la persiste en `localStorage` bajo `punto-plus.auth.v1` con una copia
en memoria como respaldo. Axios adjunta `Authorization: Bearer …`, renueva el token de
forma preventiva cuando está por expirar y comparte una sola petición de refresh entre
peticiones concurrentes (`grant_type=refresh_token`).

Si el backend expone su propio controlador —lo recomendable para una SPA, porque así el
`client_secret` nunca llega al navegador— solo cambian variables de entorno:

```dotenv
VITE_AUTH_LOGIN_MODE=json
VITE_AUTH_LOGIN_PATH=/api/login
VITE_AUTH_REFRESH_PATH=/api/refresh
VITE_AUTH_REGISTER_PATH=/api/register
VITE_AUTH_PROFILE_PATH=/api/me
```

**Riesgo asumido:** el `access_token` y el `refresh_token` viven en `localStorage`, que es
legible por JavaScript del mismo origen. Es el esquema habitual en SPAs sin BFF, pero
expone la sesión a XSS. Mitigar con CSP estricta y `expires_in` corto; la alternativa más
segura es guardar el refresh token en una cookie `HttpOnly` de mismo origen (BFF) y
mantener solo el access token en memoria. La autorización definitiva siempre corresponde
al servidor.

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

Las pruebas comprueban consumos de sellos, rechazo de canjes inválidos, alta idempotente en demo, favoritos, almacenamiento corrupto, configuración, login/refresh concurrente y limpieza de sesión, QR accesible y flujos completos en ambos tamaños de pantalla. A eso se agrega la cobertura del alta de negocios: registro con los cuatro datos para ambos roles, el asistente por pasos de punta a punta (logo → banner → nombre → categorías → menú → colores → promoción → publicación), la guarda que muestra el asistente o el editor según `onboarded`, los tres tipos de promoción persistidos con sus condiciones, la conversión y el contraste de la paleta, y el menú digital público (con sus estados de carga, error y menú vacío).

La cámara física y las operaciones del backend requieren pruebas de aceptación con dispositivos y el servicio real. Dos límites quedan fuera del alcance de las pruebas automatizadas: **el análisis real de la imagen del logo** (jsdom no decodifica imágenes, así que solo se prueba la ruta de respaldo y la matemática de color; la extracción sobre una imagen real se verifica en el navegador) y **la lectura del menú impreso**, que hoy no usa OCR (ver [docs/API_CONTRACT.md](docs/API_CONTRACT.md)).

## Recursos visuales

- Las fotografías de café, panadería y matcha se generaron para esta aplicación y están optimizadas a WebP. Son ilustraciones: no representan los negocios mencionados.
- Tipografías DM Sans y Manrope distribuidas mediante Fontsource con sus licencias incluidas en los paquetes.
