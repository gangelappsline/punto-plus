# Migración a Tailwind v4 · seguimiento

Objetivo: **todo el proyecto se estiliza con utilidades de Tailwind v4**. No se
añaden clases CSS propias nuevas y las existentes se van retirando por áreas,
sustituyéndolas por utilidades (o componentes con `cva`) en el JSX.

## Punto de partida (auditoría)

- `src/index.css`: **7.484 líneas**, **457 clases propias**, 1.344 selectores y 24
  bloques `@media`.
- 26 archivos `.tsx` con **347 clases propias en uso** y 1.191 `className`.

El CSS está acoplado por áreas: varias clases (`.sidebar`, `.topbar`,
`.section-title`, `.button`…) se comparten entre el panel de cliente, el de
negocio y el de administración, y hay un bloque de 1.682 líneas de ajustes
responsive que reescribe esos mismos selectores. Por eso la migración va **por
áreas completas**: una clase se elimina solo cuando ya no la usa ningún archivo.

## Convenciones

- Tokens en `@theme` (`src/index.css`): colores de marca (`brand`, `navy`,
  `body`, `muted`, `line`, `steel`, `slate`, `mist`, `haze`, `cloud`…), radios
  (`rounded-card`, `rounded-panel`), sombras (`shadow-card`, `shadow-float`,
  `shadow-dialog`) y animaciones (`animate-fade-in`, `animate-dialog-in`).
- Utilidades directamente en el JSX; patrones repetidos como componente con
  `cva` (`components/ui/button.tsx`).
- `cn()` (clsx + tailwind-merge) para permitir que `className` sobrescriba.
- Responsive: variantes `max-md:`/`max-lg:`/`min-[1600px]:` que reproducen los
  `@media` existentes.
- Los `@font-face`, `:root` (variables aún consumidas por CSS pendiente) y la
  capa base con estilos de elementos (tipografía, focos, reset) se mantienen:
  no son clases.

## Estado por fase

| Fase | Alcance                                                                                                                                                    | Estado       |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 1    | Base Tailwind v4 (`@theme` + capa base)                                                                                                                    | ✅ hecho     |
| 1    | `Button` con `cva` · `.button*`, `.icon-button`, `.text-link`, `.muted`, `.full-width`, `.sr-only`                                                         | ✅ hecho     |
| 2    | Shells: `CustomerShell`, `BusinessShell`, `AdminShell` (`.app-shell`, `.sidebar`, `.nav-item`, `.topbar`, `.breadcrumb`, `.avatar`, `.main-footer`…)       | ✅ hecho     |
| 3    | Tarjetas: `LoyaltyCard`, `PromotionCard`, `Dialogs` (`.card-*`, `.stamp*`, `.promotion-*`, `.dialog-*`)                                                    | ✅ hecho     |
| 4    | Páginas de cliente: `CustomerPages`, `NearbyGoogleMap`, `nearbyPin`, `Scanner` (`.section*`, `.loyalty-grid`, `.promotion-grid`, `.nearby-*`, `.pp-map-*`) | ⏳ siguiente |
| 5    | Panel de negocio: `BusinessPage`, `BusinessDashboard`, `BusinessOnboarding`, `BusinessMenuWizard`, `BusinessQRSettings`                                    | ⏳           |
| 6    | Administración: `AdminDashboard`, `AdminBusinessesPage`, `AdminCategoriesPage`                                                                             | ⏳           |
| 7    | Público: `LandingPage`, `MenuPage`, `Login`, `Register`, `AuthLayout`, `NotFoundPage`, `AppSplash`                                                         | ⏳           |
| 8    | Limpieza final: borrar `src/index.css` salvo `@theme` + capa base, y el bloque responsive residual                                                         | ⏳           |

## Progreso

| Métrica                   | Inicio | Tras fase 1 | Tras fase 2 | Tras fase 3 |
| ------------------------- | ------ | ----------- | ----------- | ----------- |
| Líneas en `src/index.css` | 7.484  | 7.332       | 6.585       | 5.484       |
| Clases propias definidas  | 457    | 445         | 405         | 341         |
| Clases propias en uso     | 347    | 340         | 302         | 244         |

### Fase 3 · decisiones

- **Los 40 bloques de tema (`.forest`, `.terracotta`…) salieron del CSS**: los
  colores del tema se escriben ahora como variables en el propio elemento
  (`cardThemeStyle`), con los tonos derivados (`--card-muted`, `--stamp-border`)
  calculados con `color-mix`. Un fondo personalizado ya no necesita una regla.
- **Las variantes de tamaño son props, no descendientes**: `LoyaltyCard`
  recibe `variant="grid" | "dialog" | "preview"` en lugar de depender de
  `.dialog-content .card-*` ni de `.card-preview-panel .card-*`. Las escalas
  responsive se movieron a variantes (`max-[1200px]:`, `min-[769px]:max-[1000px]:`,
  `max-[768px]:`, `max-[540px]:`), respetando el orden de cascada original.
- La tarjeta expone `data-loyalty-card`, `data-variant` y `data-stamp-grid`, y la
  promoción `data-promotion-card`: son el punto de apoyo de las pruebas y de las
  reglas de rejilla que quedan para la fase 4.
- Las clases de detalle de los diálogos (`.card-detail-location`,
  `.detail-reward`, `.fine-print`, `.promotion-*`, `.qr-steps`) se movieron a
  utilidades dentro de `Dialogs.tsx`.

Nota: los tests no deben depender de clases CSS. `MobilePanelNavigation` y
`App.test` ahora comprueban `data-*` y `aria-current`, que son la fuente de
verdad del estado.

## Reglas para no romper la interfaz

1. Una clase se borra del CSS **solo** cuando ya no aparece en ningún `.tsx`.
2. Los ajustes responsive de la clase se convierten en variantes en el mismo
   commit (no se dejan para después).
3. Cada fase termina con `npm run typecheck`, `npm run build`,
   `npx vitest run` y `npx prettier --check`.
4. Si una clase lleva lógica de layout en contenedores (p. ej.
   `.section-title > .button` con ancho completo en móvil), esa lógica se mueve
   al contenedor como utilidad antes de borrar la regla.
