# Contrato de integración propuesto — NO verificado

La API no resolvió por DNS durante el desarrollo. Ni las rutas, ni los nombres de campos, ni el mecanismo de autenticación han sido confirmados por su propietario. Este archivo describe lo que **el frontend espera actualmente**, no lo que la API existente ofrece.

La adaptación se concentra en `src/services/api.ts` y `src/services/http.ts`. Los schemas de `src/lib/types.ts` validan las respuestas; una forma de respuesta incompatible produce un estado de error en lugar de interpretar datos inválidos.

## Autenticación asumida

| Método y ruta        | Entrada                    | Respuesta esperada                                |
| -------------------- | -------------------------- | ------------------------------------------------- |
| `POST /auth/login`   | `{ email, password }`      | `{ user, accessToken }` y cookie refresh HttpOnly |
| `POST /auth/refresh` | Cookie, sin body requerido | `{ accessToken }` y rotación de cookie            |
| `GET /me`            | Bearer token               | `User`                                            |
| `POST /auth/logout`  | Cookie y Bearer token      | 2xx; invalida refresh y limpia cookie             |

`User`: `{ id: string, name: string, email: string, role: 'customer' | 'business' | 'admin' }`.

El access token vive **solo en memoria**. Axios adjunta `Authorization: Bearer …`, usa `withCredentials`, tiene timeout de 15 s y comparte una promesa de refresh entre peticiones concurrentes. Cada petición reintenta una sola vez tras 401. Login/refresh no disparan refresh recursivos. Una sesión inválida se elimina. Los errores 403, 429 y de red se traducen sin exponer detalles sensibles.

La cookie requiere configuración apropiada de `Secure`, `HttpOnly`, `SameSite`, ámbito y expiración. Los previews `.e2b.app` son cross-site respecto al backend: las cookies de terceros pueden estar bloqueadas; un BFF de mismo origen puede ser necesario. Un fallo al revocar logout se informa aunque la sesión local se elimine.

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

`Activity`: `{ id, business, title, date, type, amount }`. `date` ISO8601; `type` es `stamp | reward | join`; `amount` es number.

Las colecciones se esperan como arrays directos. Si el backend pagina o utiliza `{ data, meta }`, adaptar el servicio y agregar paginación a las pantallas antes de producción.

## Negocio

| Método y ruta               | Entrada                                  | Respuesta                             |
| --------------------------- | ---------------------------------------- | ------------------------------------- |
| `GET /business/card`        | —                                        | `BusinessConfig`                      |
| `PUT /business/card`        | `BusinessConfig`                         | 2xx                                   |
| `GET /business/promotions`  | —                                        | `Promotion[]` del negocio autenticado |
| `POST /business/promotions` | `{ title, description, expires, image }` | 2xx                                   |
| `POST /business/purchases`  | `{ token }`                              | 2xx; un sello por compra validada     |

`BusinessConfig`: `{ name, reward, goal, theme, icon, logo? }` con los tipos anteriores.

La implementación demo acepta logo/imagen como data URL (JPG/PNG/WebP hasta 2 MB). **Confirmar el contrato de carga real:** en producción probablemente se necesite multipart, URLs firmadas o almacenamiento dedicado. Sustituir la conversión y el payload según el backend; no asumir que admite data URLs.

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
- [ ] Definir registro/recuperación de cuenta, privacidad y términos legales.
- [ ] Sustituir datos y recursos ilustrativos por contenido con licencia/consentimiento.
- [ ] Realizar E2E con sandbox oficial y pruebas de cámara en dispositivos físicos.
