# Seguimiento · Sección "Cerca de mí" (cliente)

Documento de seguimiento del proceso para la sección `Cerca de mí` del perfil del
cliente (`/app/cerca-de-mi`). Sirve para dejar registrado qué se hizo, con qué
proveedor de mapas y qué falta por configurar en cada entorno.

## Objetivo

1. Menos texto y un mapa más grande.
2. No volver a solicitar el permiso de ubicación cuando el cliente ya lo dio.
3. Cargar los negocios cercanos automáticamente al abrir la página.
4. Marcadores con el logo del negocio, fondo blanco y pin redondeado.
5. Al hacer clic en un marcador, abrir un modal con la información del negocio.

## Proveedor de mapas

| Elemento   | Decisión                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------- |
| Mapa       | **Google Maps JavaScript API** (`src/lib/googleMaps.ts` + `src/components/NearbyGoogleMap.tsx`)                |
| Marcadores | `google.maps.OverlayView` con HTML propio (`src/components/nearbyPin.ts`)                                      |
| Clave      | `VITE_GOOGLE_MAPS_API_KEY` (debe tener habilitada **Maps JavaScript API**)                                     |
| Respaldo   | Si no hay clave o la API no carga, se pinta un mapa incrustado de OpenStreetMap para no dejar la sección vacía |

> El detalle importante: el proyecto usaba Google Maps con el **Embed API** dentro
> de un `iframe`. Ese embed no permite marcadores personalizados ni eventos de
> clic, así que los requisitos 4 y 5 exigen la **Maps JavaScript API**. La misma
> variable de entorno sirve, pero la clave debe tener la Maps JavaScript API
> habilitada (y el referrer del dominio permitido).

## Flujo de ubicación y permiso

1. Al abrir la sección se leen las coordenadas guardadas (`punto-plus:location`).
2. Se consulta el estado real del permiso con la Permissions API.
   - `granted` → se piden coordenadas y se cargan los negocios **sin volver a preguntar**.
   - `denied` → no se insiste; se muestra un aviso con acción para reintentar.
   - Navegador sin Permissions API (Safari) → se usan las coordenadas guardadas.
3. Una negativa se recuerda (`punto-plus:location-denied`) para no relanzar el
   prompt automáticamente en cada visita.
4. `useNearMe` conserva los resultados previos (`placeholderData`) para que el
   mapa no parpadee al refrescar la ubicación.

## Archivos

- `src/lib/geolocation.ts`: lectura/guardado de coordenadas y estado del permiso.
- `src/lib/googleMaps.ts`: cargador único del script de Google Maps.
- `src/components/NearbyGoogleMap.tsx`: mapa, encuadre y ciclo de vida.
- `src/components/nearbyPin.ts`: construcción del pin con logo y del punto del cliente.
- `src/features/CustomerPages.tsx` (`NearbyPage`): estado de la sección, avisos y tira de negocios.
- `src/features/Dialogs.tsx` (`NearbyBusinessDialog`): modal del negocio.
- `src/index.css`: bloque "Cerca de mí" (mapa, pines, modal).

## Verificación

- `npm run typecheck` ✅
- `npm run build` ✅
- `npx vitest run src/test/App.test.tsx src/test/NearbyPin.test.ts src/test/Geolocation.test.ts` ✅

## Pendientes por entorno

- [ ] Configurar `VITE_GOOGLE_MAPS_API_KEY` con **Maps JavaScript API** habilitada
      en producción, preview y local (sin ella se usa el mapa de respaldo y no
      aparecen los pines con logo).
- [ ] Restringir la clave por HTTP referrer a los dominios de la app.
- [ ] Confirmar que `/customer/near-me` devuelve `latitude`, `longitude`, `logo_url`
      y `distance_km` para que los pines se ubiquen y muestren el logo real.
