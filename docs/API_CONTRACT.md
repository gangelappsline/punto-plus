# Contrato de integración propuesto — NO verificado

La API no resolvió por DNS durante el desarrollo. Ni las rutas, ni los nombres de campos, ni el mecanismo de autenticación han sido confirmados por su propietario. Este archivo describe lo que **el frontend espera actualmente**, no lo que la API existente ofrece.

La adaptación se concentra en `src/services/api.ts` y `src/services/http.ts`. Los schemas de `src/lib/types.ts` validan las respuestas; una forma de respuesta incompatible produce un estado de error en lugar de interpretar datos inválidos.

## Autenticación asumida (Laravel Passport)

La API usa **Passport**, así que el frontend trabaja con **Bearer tokens**. Dos modos,
seleccionables por variable de entorno sin tocar el código:

| Modo                                      | Endpoints                                                    | Cuándo usarlo                              |
| ----------------------------------------- | ------------------------------------------------------------ | ------------------------------------------ |
| `VITE_AUTH_LOGIN_MODE=passport` (defecto) | `POST /oauth/token` (password grant y refresh_token grant)   | La SPA habla directo con Passport          |
| `VITE_AUTH_LOGIN_MODE=json`               | `POST /api/login`, `POST /api/refresh`, `POST /api/register` | El backend tiene sus propios controladores |

| Operación | Petición (modo passport)                                                              | Respuesta esperada                                        |
| --------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Login     | `POST /oauth/token` form: `grant_type=password, client_id, username, password, scope` | `{ token_type, expires_in, access_token, refresh_token }` |
| Refresh   | `POST /oauth/token` form: `grant_type=refresh_token, refresh_token, client_id, scope` | igual que el login, con tokens rotados                    |
| Perfil    | `GET /api/me` con `Authorization: Bearer …`                                           | `User` (se acepta envuelto en `{ data: … }`)              |
| Registro  | `POST /api/register` JSON                                                             | `User` y, opcionalmente, los tokens                       |
| Logout    | `POST /api/logout`                                                                    | 2xx; el frontend limpia su sesión de todos modos          |

**Registro — payload.** Crear la cuenta pide **los mismos cuatro datos para clientes y
negocios**; el campo `role` es lo único que los distingue:

```jsonc
// Cliente
{ "role": "customer", "name": "Sofía García", "email": "sofia@example.com",
  "password": "…", "password_confirmation": "…", "phone": "55 1234 5678" }

// Negocio — idéntico, sin bloque `business`
{ "role": "business", "name": "Ana Ramírez", "email": "ana@example.com",
  "password": "…", "password_confirmation": "…", "phone": "55 8765 4321" }
```

Los datos del negocio (logo, banner, nombre comercial, categorías de comida, menú y colores)
**no se piden en el registro**: se capturan después de iniciar sesión, en el asistente por
pasos que persiste con `PUT /business/card` y `POST /business/promotions` (ver
[Negocio](#negocio)). El registro ya no envía `business.name`, `category`, `address`, `city`
ni `rfc`; si el backend los exige como obligatorios, deben volverse opcionales o aceptar una
cuenta de negocio sin perfil y completarlo en el alta.

Si la respuesta de registro no trae tokens, el frontend inicia sesión de inmediato con
las credenciales recién creadas. **Pendiente de confirmar con el backend:** la ruta real,
los nombres de campo, si el negocio es una entidad separada con su propia tabla/relación,
si `role` se llama de otra forma, si se exige verificación de correo o teléfono, y cómo se
marca un negocio con el perfil incompleto (el frontend usa `onboarded`).

`User`: `{ id: string, name: string, email: string, role: 'customer' | 'business' | 'admin' }`.
El frontend tolera `id` numérico y roles del backend como `negocio`, `merchant`, `admin`
o `administrador`, y los traduce a su vocabulario (`normalizeRole`).

**Almacenamiento de los tokens.** `src/lib/tokenStorage.ts` acepta la respuesta de
Passport en snake_case, en camelCase y envuelta (`{ user, authorization: { … } }`), calcula
`expiresAt = ahora + expires_in` y guarda todo en `localStorage` bajo `punto-plus.auth.v1`
(con respaldo en memoria si el almacenamiento está bloqueado). El access token viaja como
`Authorization: Bearer …`; el refresh token se usa una sola vez por ciclo y se comparte
entre peticiones concurrentes (single-flight). Errores: 400 `invalid_credentials` y 401 se
traducen a "Correo o contraseña incorrectos"; un 422 expone `errors` por campo para
pintarlos junto a cada input.

> **Riesgo:** `localStorage` es legible por JavaScript del mismo origen, así que un XSS
> robaría la sesión. Mitigar con CSP estricta y `expires_in` corto. La alternativa más
> segura es un BFF con el refresh token en cookie `HttpOnly` y el access token solo en
> memoria. **Confirmar** CORS con orígenes explícitos, preflight de `Authorization` y
> `Content-Type`, y la revocación real de tokens en logout (`DELETE /oauth/tokens/{id}`).

**Paneles protegidos.** El access token guardado es lo que abre los paneles: `/app` exige
rol `customer`, `/business` exige `business` y `/admin` exige `admin`. La
comprobación del frontend es de conveniencia (evita mostrar un panel vacío); cada endpoint privado debe validar el token y
el rol en el servidor. Un 401 definitivo cierra la sesión y devuelve a `/login`.

## Cliente

| Método y ruta                   | Entrada | Respuesta                                                            |
| ------------------------------- | ------- | -------------------------------------------------------------------- |
| `GET /cards`                    | —       | `LoyaltyCard[]`, incluyendo negocios no afiliados con `joined:false` |
| `GET /promotions`               | —       | `Promotion[]`                                                        |
| `GET /me/activity`              | —       | `Activity[]`, más reciente primero                                   |
| `GET /me/favorites`             | —       | `string[]` de IDs de promoción                                       |
| `POST /me/favorites/:id/toggle` | —       | 2xx                                                                  |
| `POST /cards/:id/join`          | —       | 2xx; alta idempotente                                                |
| `POST /cards/:id/redeem`        | `{}`    | 2xx; transacción validada por servidor                               |
| `POST /me/qr`                   | —       | `{ token: string, expiresAt: ISO8601 }`                              |

`LoyaltyCard`:

```ts
{
  id: string;
  businessId: string;
  name: string;
  category: string;
  tagline: string;
  reward: string;
  stamps: number;        // entero >= 0
  goal: number;          // entero 2–12
  theme: 'forest' | 'terracotta' | 'lavender';
  icon: 'coffee' | 'bread' | 'leaf';
  location: string;
  distance: string;      // texto, no calculado con GPS por este frontend
  joined: boolean;
  logo?: string;
}
```

`Promotion`: `{ id, businessId, business, title, description, category, image, badge, expires }`, todos strings; `expires` usa `YYYY-MM-DD`.

A eso se agrega el **tipo de promoción** y sus condiciones, opcionales para no romper
promociones existentes:

```jsonc
{
  "type": "simple" | "steps" | "direct",

  // simple: al juntar N compras se gana producto(s) gratis
  "purchasesRequired": 5,
  "freeProduct": "Café americano",
  "freeQuantity": 1,

  // steps: beneficios por cada meta de puntos
  "tiers": [{ "points": 10, "benefit": "Postre gratis" }],

  // direct: sin condición, siempre o en días y horas específicos
  "appliesAlways": false,
  "weekdays": [2, 4],          // 0 = domingo … 6 = sábado
  "startTime": "09:00",
  "endTime": "12:00"
}
```

**Confirmar con el backend:** si estas condiciones viven en la misma tabla o en una entidad
`promotion_rules`, si `weekdays` usa 0–6 o nombres, y si la vigencia horaria se evalúa en el
servidor con la zona horaria del negocio (el frontend solo las muestra; **no** decide si una
promoción aplica).

`Activity`: `{ id, business, title, date, type, amount }`. `date` ISO8601; `type` es `stamp | reward | join`; `amount` es number.

Las colecciones se esperan como arrays directos. Si el backend pagina o utiliza `{ data, meta }`, adaptar el servicio y agregar paginación a las pantallas antes de producción.

## Negocio

| Método y ruta               | Entrada                                                    | Respuesta                             |
| --------------------------- | ---------------------------------------------------------- | ------------------------------------- |
| `GET /business/card`        | —                                                          | `BusinessConfig`                      |
| `PUT /business/card`        | `BusinessConfig`                                           | 2xx                                   |
| `GET /business/promotions`  | —                                                          | `Promotion[]` del negocio autenticado |
| `POST /business/promotions` | `{ title, description, expires, image }` + campos del tipo | 2xx                                   |
| `POST /business/purchases`  | `{ token }`                                                | 2xx; un sello por compra validada     |

`BusinessConfig` creció con los datos que captura el asistente de alta:

```jsonc
{
  "name": "Café Avellaneda",
  "reward": "Un café de especialidad gratis",
  "goal": 8,
  "theme": "forest",
  "icon": "coffee",
  "logo": "…", // data URL en demo; ver carga real abajo
  "banner": "…", // portada del menú digital
  "categories": ["Cafetería", "Repostería"], // categorías de comida que vende
  "menuImage": "…", // foto del menú impreso que subió el dueño
  "menuItems": [
    { "id": "m1", "name": "Capuchino", "price": "55", "description": "…", "category": "Cafetería" },
  ],
  "primaryColor": "#2399A0", // extraído del logo, ajustable
  "secondaryColor": "#F5BE8B",
  "onboarded": true, // el perfil ya está completo
}
```

El asistente publica con **dos peticiones encadenadas** en una sola mutación
(`usePublishBusiness`): `PUT /business/card` y luego `POST /business/promotions` con la
promoción de bienvenida. **Confirmar:** si el backend prefiere un endpoint único de alta
(`POST /business/onboarding`) para que el perfil y su primera promoción sean atómicos; hoy,
si la segunda petición falla, el negocio queda guardado sin promoción.

`onboarded` es lo que usa el frontend para decidir si muestra el asistente
(`/business/negocio` lo incrusta mientras sea falso) o el editor de la tarjeta. **Confirmar**
si el backend expone ese estado o debe derivarse de qué campos están completos.

**Análisis de imágenes.** La paleta del logo se calcula **en el navegador**
(`src/lib/colors.ts`): no viaja nada al servidor y, si la imagen no se decodifica, se usa la
paleta de marca como respaldo. El menú **no** se extrae con OCR: el borrador de platos se
genera a partir de las categorías elegidas y el dueño lo edita antes de publicar. Leer el
texto de `menuImage` requiere un servicio de OCR/visión del backend — **pendiente de
contrato** (endpoint, límites de tamaño, costo, idiomas y cómo devolver platos con precio).

La implementación demo acepta logo/banner/menú como data URL (JPG/PNG/WebP hasta 2 MB cada
uno). **Confirmar el contrato de carga real:** en producción probablemente se necesite
multipart, URLs firmadas o almacenamiento dedicado, y un límite distinto por imagen.
Sustituir la conversión y el payload según el backend; no asumir que admite data URLs.
Tres imágenes por negocio en data URL pueden superar la cuota de `localStorage` en el demo.

**Menú digital público.** El frontend sirve `/:business_slug` sin sesión y espera el endpoint
público `GET /public/business/:slug/menu`, que puede responder el objeto del negocio o un
recurso envuelto en `{ data: … }`, `{ business: … }` o `{ menu: … }`. Debe incluir `name`,
`banner`, `logo`, `categories`, `menuItems` (con `id`, `name`, `description`, `price`,
`category`, `image` e indicador de popularidad/cantidad de pedidos opcionales) y, si están
disponibles, `primaryColor`, `secondaryColor`, `location` y `openingHours`. **Este endpoint es
una propuesta pendiente de confirmación**; no debe reutilizar `GET /business/card`, que es
privado y devuelve la configuración del negocio autenticado. En modo demo la vista usa el
restaurante de prueba. El carrito/orden actual es un borrador local; falta acordar un endpoint
de órdenes antes de poder enviar pedidos al negocio.

## QR y operaciones sensibles

- QR de cliente demo: `punto-plus:demo:sofia`. Es solo un fixture público, nunca un token válido de producción.
- QR de negocio propuesto: `punto-plus:business:<businessId>`. El frontend lo busca entre los negocios disponibles y solicita confirmación para unirse. No navega a URLs arbitrarias escaneadas.
- QR de cliente real: opaco, firmado/aleatorio, con expiración desde el backend. El frontend oculta un QR expirado y permite regenerarlo; no lo persiste.
- Registro de compra: escaneo → confirmación del personal → validación en servidor → invalidación de caché.
- Canje: detalle → advertencia → confirmación → validación en servidor → invalidación de caché.
- El frontend envía `Idempotency-Key` UUID en canjes y compras. El backend debe implementar deduplicación y transacciones. Reintentar manualmente tras una respuesta perdida genera una clave nueva; **el token debe ser de un solo uso y estar vinculado a la operación**, y el backend debe tener un mecanismo para consultar el estado de una transacción ambigua antes de permitir reintentos de producción.
- El frontend no debe ser autoridad sobre sellos, identidad, negocio o elegibilidad. Validar siempre la relación usuario/negocio, el rol, la compra y la recompensa en el backend.
- Confirmar el proceso real de autorización del canje en tienda. La pantalla de confirmación no prueba que un empleado estuvo presente.

## Checklist para producción

- [ ] Obtener OpenAPI/Swagger o ejemplos reales y alinear rutas, campos, errores y paginación.
- [ ] Probar DNS, certificado HTTPS y disponibilidad.
- [ ] Implementar CORS con orígenes explícitos y `Access-Control-Allow-Credentials: true` (no `*`).
- [ ] Permitir preflight de `Authorization`, `Content-Type`, `Idempotency-Key` y métodos utilizados.
- [ ] Acordar cookie refresh, rotación, revocación y protección CSRF para peticiones con cookie.
- [ ] Verificar autorización por negocio y rol en todos los endpoints.
- [ ] Acordar formato, firma, expiración y un solo uso de QR.
- [ ] Resolver compras/canjes atómicos, concurrencia e idempotencia, incluyendo timeouts ambiguos.
- [ ] Definir carga segura, límites y almacenamiento de imágenes.
- [ ] Confirmar ruta, campos y respuesta del registro (cliente y negocio), y si el negocio requiere aprobación.
- [ ] Definir verificación de correo/teléfono, recuperación de contraseña, privacidad y términos legales.
- [ ] Decidir el almacenamiento de tokens: `localStorage` actual o BFF con cookie `HttpOnly`.
- [ ] Sustituir datos y recursos ilustrativos por contenido con licencia/consentimiento.
- [ ] Realizar E2E con sandbox oficial y pruebas de cámara en dispositivos físicos.
