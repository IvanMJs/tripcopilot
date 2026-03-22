# TripCopilot — 100 Mejoras de Diseño & Intuitividad

**Generado:** 2026-03-21
**Foco:** App interna (no landing). Paleta, legibilidad, intuitividad multi-edad, AI premium.

**Sistema actual:**
- Fondo `#080810`, acento azul `#3b82f6`, glass morphism
- Fuentes: -apple-system / Inter, mínimo text-[9px]
- Nav inferior fija 60px, tabs horizontales
- Animaciones: 150ms transiciones, keyframes para shimmer/fade/slide

---

## Categoría 1 — Paleta & Sistema de Color (10)

**P1 🔴** — Reemplazar azul genérico por **violeta signature** como acento primario
`#7c3aed` (violet-600) → `#8b5cf6` (violet-500) como color de marca. El azul queda para links/info, violeta para acciones primarias. Cambia toda la identidad visual.
Archivos: `app/globals.css`, `tailwind.config.ts`

**P2 🔴** — **Tokens semánticos** en CSS variables
Definir: `--color-success`, `--color-warning`, `--color-danger`, `--color-info`, `--color-primary`. Reemplazar hardcoded `text-green-400`, `text-amber-400` etc. por clases semánticas. Una sola fuente de verdad para colores de estado.
Archivos: `app/globals.css`

**P3 🔴** — **Sistema de elevación de cards** (3 niveles)
- Nivel 0: fondo base `#080810`
- Nivel 1: `rgba(255,255,255,0.03)` — cards secundarias
- Nivel 2: `rgba(255,255,255,0.06)` — cards primarias / activas
- Nivel 3: `rgba(255,255,255,0.10)` — modales / overlays elevados
Archivos: `app/globals.css`, refactor de cards principales

**P4 🟡** — **Glow ambiental** en badges de estado
Status badges emiten un glow suave del mismo color: on-time tiene `box-shadow: 0 0 12px rgba(34,197,94,0.3)`, delayed `rgba(251,146,60,0.3)`, crítico `rgba(239,68,68,0.3)`. Rápido de implementar, impacto visual alto.
Archivos: `app/globals.css` (nuevas utility classes `.glow-success`, `.glow-warning`, `.glow-danger`)

**P5 🟡** — **Tinte dinámico de fondo** según estado del viaje activo
Si hay algún vuelo con delay: background tint `rgba(239,68,68,0.015)`. Si todo OK: neutro. Si aterrizado: `rgba(34,197,94,0.01)`. Apenas perceptible, pero crea "mood" de la app.
Archivos: `app/app/page.tsx`, `contexts/TripStatusContext.tsx` (nuevo)

**P6 🟡** — **Modo claro funcional** (el actual es placeholder)
El light mode actual solo cambia el fondo. Definir tokens completos: cards en blanco, textos en `#1a1a2e`, borders en `rgba(0,0,0,0.08)`, acentos violet ajustados para fondo claro. Crítico para usuarios en exteriores (aeropuerto, luz solar).
Archivos: `app/globals.css`, `contexts/ThemeContext.tsx`

**P7 🟡** — **Gradiente sutil en encabezados de cards**
Las cards con status positivo tienen un borde superior de 1px con gradiente `linear-gradient(90deg, transparent, rgba(var(--color-success), 0.4), transparent)`. Estado neutro: `rgba(255,255,255,0.06)`. Visual premium.
Archivos: `app/globals.css` (utility), cards principales

**P8 🟡** — **Color-coded border izquierdo** en FlightCard
Una franja vertical de 3px al lado izquierdo del FlightCard indica el estado: verde/amarillo/rojo/gris. Universal — funciona para daltónicos, legible de un vistazo incluso antes de leer texto.
Archivos: `components/FlightCard.tsx`

**P9 🟢** — **Tema "Sunrise"** (acento cálido alternativo)
Amber/coral como alternativa: `#f59e0b` primario, fondos ligeramente más cálidos. Preferencia guardada en localStorage. Para usuarios que prefieren tonos cálidos.
Archivos: `contexts/ThemeContext.tsx`, `app/globals.css`

**P10 🟢** — **Textura grain sutil** en el fondo
CSS `filter: url(#noise)` con SVG inline o `background-image: url("data:image/svg+xml...")` con ruido a 3% de opacidad. Evita que el fondo sólido oscuro se vea plano en pantallas OLED. Patrón usado por Linear, Vercel, etc.
Archivos: `app/globals.css`, `app/layout.tsx`

---

## Categoría 2 — Tipografía (8)

**T1 🔴** — **Eliminar fuentes menores a 12px**
`text-[9px]` y `text-[10px]` reemplazados por `text-[11px]` mínimo (o `text-xs` = 12px). Crítico para usuarios mayores y pantallas de densidad normal. Afecta bottom nav labels, draft badge, timezone abbr.
Archivos: `components/BottomNav.tsx`, `components/TripPanel.tsx`, globales

**T2 🔴** — **Jerarquía tipográfica clara**: tamaños definidos
- Display: `text-5xl` para countdown final (<15min)
- H1: `text-2xl font-bold` para nombre del viaje
- H2: `text-lg font-semibold` para secciones
- Body: `text-sm` (14px) para contenido
- Caption: `text-xs` (12px) mínimo para metadata
Archivos: refactor sistemático en cards principales

**T3 🔴** — **Números tabulares en todos los tiempos**
`font-variant-numeric: tabular-nums` (clase `.tabular` ya existe) aplicado a: todos los horarios, countdown, delays en minutos. Evita que los números "salten" al actualizarse. Extender a FlightCard, AirportCard.
Archivos: `components/FlightCard.tsx`, `components/AirportCard.tsx`, `components/FlightCountdownBadge.tsx`

**T4 🟡** — **Fuente monospace para códigos IATA**
Los códigos de aeropuerto (`EZE`, `MIA`) usan `font-mono` para mejor legibilidad y diferenciación visual del texto normal. Hace que se vean como códigos técnicos, no texto corriente.
Archivos: `components/FlightCard.tsx`, `components/AirportCard.tsx`, `components/TripListView.tsx`

**T5 🟡** — **Letter-spacing en labels de categoría**
Labels tipo "VUELO", "ALOJAMIENTO", "ESTADO" usan `tracking-widest text-[10px] uppercase font-semibold text-gray-500`. Estilo editorial que mejora la jerarquía visual.
Archivos: cards de vuelo y alojamiento

**T6 🟡** — **text-balance en headings**
`text-wrap: balance` en nombres de aeropuerto y ciudad para evitar líneas cortas awkward. Soportado en Chrome/Safari moderno.
Archivos: `app/globals.css`

**T7 🟡** — **Modo texto grande** (+2 tamaños)
Toggle en settings que bumps todos los `text-xs → text-sm`, `text-sm → text-base`, etc. Guardado en localStorage. Accesibilidad para usuarios mayores sin necesidad de zoom del sistema.
Archivos: `app/globals.css` (clase `.text-large` en `html`), `contexts/ThemeContext.tsx`

**T8 🟢** — **Inter Variable** cargada con `font-display: swap` y subset latin
Optimizar carga de fuente. Preconnect a Google Fonts o self-host via `next/font`. Eliminar FOUT (flash of unstyled text) en primera carga.
Archivos: `app/layout.tsx`

---

## Categoría 3 — Navegación & Estructura (8)

**N1 🔴** — **Pill indicator en bottom nav**
El ítem activo tiene un pill/burbuja detrás del ícono: `bg-violet-500/20 rounded-full px-3 py-1`. Más claro que solo cambiar color. Patrón iOS/Android moderno.
Archivos: `components/BottomNav.tsx`

**N2 🔴** — **Animación direccional en cambio de tab**
Al cambiar de tab de viaje, el contenido hace slide en la dirección correcta (tab derecha → slide desde derecha). Usa `transform: translateX` con clase CSS según dirección. Hace que la navegación se sienta física y lógica.
Archivos: `components/TripPanel.tsx`, `components/TripTabBar.tsx`

**N3 🔴** — **Trip más urgente siempre primero**
Ordenar automáticamente los trips: primero el que tiene el vuelo más próximo (hoy/mañana), luego futuros cronológicamente, últimos los pasados. El usuario no tiene que buscar qué viaje está activo.
Archivos: `hooks/useUserTrips.ts`

**N4 🟡** — **FAB (botón flotante) para acción primaria**
En la vista de trip vacía o lista de trips, un botón circular `+` fijo en bottom-right: `fixed bottom-24 right-4 w-14 h-14 rounded-full bg-violet-600 shadow-lg`. Más visible que el botón en la nav inferior.
Archivos: `app/app/page.tsx`, `components/TripListView.tsx`

**N5 🟡** — **Header colapsable en TripPanel**
Al scrollear hacia abajo en el panel del viaje, el header (nombre + acciones) se comprime a una barra sticky delgada con solo el nombre. Al scrollear de vuelta, se expande. Libera espacio de contenido.
Archivos: `components/TripPanel.tsx`

**N6 🟡** — **Indicador de sección activa** en panel
Una barra lateral izquierda con puntos o línea que indica en qué sección está el usuario (Vuelos / Alojamiento / AI / Alertas). Visible en scroll largo.
Archivos: `components/TripPanel.tsx`

**N7 🟡** — **Scroll con momentum** en trip tabs
Agregar `scroll-snap-type: x mandatory` y `-webkit-overflow-scrolling: touch` para que el scroll de tabs tenga inercia en iOS.
Archivos: `components/TripTabBar.tsx`

**N8 🟢** — **Bottom sheet para acciones de viaje**
En lugar de menú contextual o botones inline, las acciones del viaje (duplicar, exportar, compartir, eliminar) aparecen en un bottom sheet con íconos grandes. Más fácil de usar con una mano.
Archivos: nuevo `components/TripActionsSheet.tsx`, `components/TripPanel.tsx`

---

## Categoría 4 — Cards & Superficies (10)

**C1 🔴** — **FlightCard: borde izquierdo de estado**
Ya mencionado en P8. Franja vertical 3px: `border-l-[3px] border-l-green-500/70` (on-time), amber (delay moderado), red (crítico), gray (sin datos). Legible instantáneamente.
Archivos: `components/FlightCard.tsx`

**C2 🔴** — **FlightCard: layout tipo boarding pass**
Dos columnas: origen (izquierda) y destino (derecha) con hora grande abajo de cada código. Arrow `→` o avión en el centro. Más intuitivo visualmente que la lista de texto actual.
Archivos: `components/FlightCard.tsx`

**C3 🔴** — **AirportCard: row de estado condensado**
Mostrar delay status + weather + METAR category en una sola fila de íconos con colores, en lugar de texto stacked. `⚡ Sin demora · 🌤 18°C · 🟢 VFR`. 60% menos espacio.
Archivos: `components/AirportCard.tsx`

**C4 🟡** — **Cards con datos live: animación "breathing"**
Cards que muestran datos en tiempo real (AirportCard, FlightCard con status activo) tienen una animación muy sutil de `opacity: 0.95 → 1` en loop de 3s. Indica que los datos están "vivos".
Archivos: `app/globals.css` (keyframe `breathing`), `components/AirportCard.tsx`

**C5 🟡** — **Inner highlight en glass cards**
Borde superior de 1px con `linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)`. Da profundidad y sensación premium al glass morphism.
Archivos: `app/globals.css` (utility `.glass-highlight`), cards principales

**C6 🟡** — **AccommodationCard rediseño**
Check-in y check-out como bloques visuales grandes con ícono de sol/luna, hora en `text-2xl`, fecha en `text-xs` abajo. Mucho más legible que texto inline.
Archivos: `components/AccommodationCard.tsx`

**C7 🟡** — **Cards vacías con borde dashed**
Cuando un trip no tiene vuelos/alojamiento, las áreas donde irían muestran un placeholder con `border-2 border-dashed border-gray-700 rounded-xl`. Affordance visual de "acá va algo".
Archivos: `components/TripPanel.tsx`

**C8 🟡** — **Vuelos del día: card prominente "Hoy"**
Los vuelos que salen hoy tienen una card visualmente diferente: fondo con gradiente violet suave, badge "HOY" en esquina superior, y el countdown integrado dentro de la card.
Archivos: `components/FlightCard.tsx`, `components/TripPanel.tsx`

**C9 🟢** — **Vuelos agrupados por fecha** con separador
Headers de fecha entre grupos de vuelos: `--- Martes 29 Mar ---` con línea decorativa. Hace mucho más claro el itinerario cronológico.
Archivos: `components/TripPanel.tsx`

**C10 🟢** — **Conexiones visualmente conectadas**
Cuando dos vuelos consecutivos forman una conexión, se muestran con una línea vertical izquierda que los une, con el aeropuerto de conexión en el centro. Layout vertical de itinerario.
Archivos: `components/TripPanel.tsx`

---

## Categoría 5 — Botones & CTAs (8)

**B1 🔴** — **Gradiente en botones primarios**
`bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400`. Más premium que color sólido. Todos los botones de acción principal (guardar, importar, crear).
Archivos: `app/globals.css` (clase `.btn-primary`), botones principales

**B2 🔴** — **Botón de importar vuelos: más prominente**
El CTA de "Importar con IA" debe ser el botón más visible del trip panel vacío. Full-width, gradient, ícono de Sparkles, texto grande. Es la acción de entrada al producto.
Archivos: `components/TripPanel.tsx`

**B3 🔴** — **Estado loading en botones**
Cuando un botón dispara una acción async, el texto cambia a spinner + texto reducido ("Guardando..."), el botón se desactiva visualmente. Evita doble-click y da feedback inmediato.
Archivos: todos los botones de acción principal

**B4 🟡** — **Confirmación en acciones destructivas**
Delete de vuelo/viaje: el botón se convierte en dos botones ("Cancelar" | "Confirmar eliminación") con animación expand. Evita eliminaciones accidentales sin modal.
Archivos: `components/FlightCard.tsx`, `components/TripPanel.tsx`

**B5 🟡** — **Ícono en cada botón de acción**
Todos los botones de acción tienen ícono + texto. `<Plane /> Importar vuelos`, `<Save /> Guardar viaje`, `<Share2 /> Compartir`. Más rápido de escanear visualmente.
Archivos: todos los botones sin ícono

**B6 🟡** — **Ghost buttons uniformes**
Acciones secundarias usan un estilo consistente: `border border-white/10 hover:border-white/20 hover:bg-white/5`. Actualmente el estilo varía por componente.
Archivos: `app/globals.css`, botones secundarios

**B7 🟡** — **Botones full-width en mobile** en modales
Todos los botones de confirmación en modales son full-width en pantallas < 640px. Mucho más fácil de presionar con el pulgar.
Archivos: `components/CreateTripModal.tsx`, `components/DeleteTripModal.tsx`, otros modales

**B8 🟢** — **Long-press en cards** para acciones rápidas
Long press (500ms) en un FlightCard abre un mini menú de acciones: editar, duplicar, notas, eliminar. Limpia la UI porque los botones de acción no necesitan estar siempre visibles.
Archivos: `components/FlightCard.tsx`, nuevo hook `useLongPress.ts`

---

## Categoría 6 — Status & Feedback (8)

**S1 🔴** — **Status con ícono + color + texto** (accesibilidad)
Actualmente el status depende solo del color. Agregar: ✅ verde "A tiempo", ⚠️ amber "Demora 35min", 🚫 rojo "Cancelado". Funciona para daltónicos.
Archivos: `components/FlightCard.tsx`, `components/FlightStatus.tsx`

**S2 🔴** — **Toasts desde abajo** (encima de la nav)
Los toasts actuales aparecen arriba. En mobile, deben aparecer justo encima del bottom nav (`bottom: 68px`). Más ergonómico, no tapa el contenido superior.
Archivos: `app/app/page.tsx`, `app/layout.tsx` (Toaster config)

**S3 🔴** — **Global alert bar** cuando hay delay activo
Si cualquier vuelo del trip activo tiene delay, un banner fijo aparece justo arriba de la nav: `⚠️ AR1303 tiene demora de 40min`. Tapeable para ir al vuelo. Siempre visible sin scrollear.
Archivos: nuevo `components/GlobalAlertBar.tsx`, `app/app/page.tsx`

**S4 🟡** — **Dot de notificación en trip tabs**
Cuando hay una alerta activa para un trip, el tab de ese viaje muestra un punto rojo (8px). Similar a badges de iOS. El usuario sabe de un vistazo qué viaje necesita atención.
Archivos: `components/TripTabBar.tsx`, `hooks/useUserTrips.ts`

**S5 🟡** — **Transiciones de estado animadas**
Cuando el status de un vuelo cambia (on-time → delayed), el badge hace una transición suave: fade-out verde, fade-in amber. No aparece de golpe.
Archivos: `components/FlightStatus.tsx`, `app/globals.css`

**S6 🟡** — **Pull-to-refresh animación custom**
Reemplazar el spinner genérico con un avión pequeño que "despega" al hacer pull y "aterriza" al soltar. Pure CSS/SVG animation.
Archivos: `components/AirportCard.tsx`

**S7 🟡** — **Severity bar** en delays
En lugar de solo mostrar los minutos, una barra de progreso horizontal indica la severidad: 0-15min (verde), 15-45min (amber), 45min+ (rojo). Visual e inmediato.
Archivos: `components/FlightStatus.tsx`

**S8 🟢** — **Notif dot con counter** en app icon (PWA badge)
Usar `navigator.setAppBadge(n)` con el número total de alertas activas. Visible en el home screen sin abrir la app. Ya parcialmente en el backlog anterior.
Archivos: `hooks/useServiceWorker.ts`

---

## Categoría 7 — IA Premium & Copilot (10)

**AI1 🔴** — **Efecto typewriter** en respuestas de IA
Las respuestas de Claude aparecen caracter por caracter (o word by word) en lugar de aparecer todas de golpe. Hace que la IA se sienta "pensando en tiempo real". Usar SSE (Server-Sent Events) en el API.
Archivos: `app/api/trip-copilot/route.ts`, `components/TripCopilot.tsx`

**AI2 🔴** — **Quick prompts como chips** en el chat
Debajo del input del chat, 3-4 chips pregenerados según contexto: `"¿Llego a la conexión?"`, `"¿Qué llevar?"`, `"¿Hay demoras?"`. Al tocar uno, se envía automáticamente. Reduce fricción de texto para cualquier edad.
Archivos: `components/TripCopilot.tsx`

**AI3 🔴** — **Packing list con checkboxes persistentes**
Los ítems del packing list tienen checkbox. Al marcar, se guarda en `localStorage` (por trip+signature). En la próxima visita, los ítems marcados están tachados. El usuario hace su checklist real.
Archivos: `components/TripAdvisor.tsx`, nuevo `hooks/usePackingChecklist.ts`

**AI4 🟡** — **Avatar del Copilot** consistente
TripCopilot tiene un avatar pequeño (ícono de avión estilizado o Sparkles) que aparece en todos los mensajes de IA. Humaniza la experiencia y da identidad al asistente.
Archivos: `components/TripCopilot.tsx`, `components/TripAdvisor.tsx`

**AI5 🟡** — **"Basado en X vuelos analizados"** como contexto
Al final de cada respuesta del Advisor, mostrar en gris: `"Análisis basado en tu itinerario de 3 vuelos · Generado por Claude"`. Da confianza en la fuente.
Archivos: `components/TripAdvisor.tsx`

**AI6 🟡** — **Packing list sortable** por prioridad
Los ítems del packing tienen un indicador de prioridad (🔴 esencial, 🟡 recomendado, ⚪ opcional). El usuario puede filtrar por prioridad. La IA ya devuelve el campo `priority`.
Archivos: `components/TripAdvisor.tsx`

**AI7 🟡** — **Shimmer en toda la card IA** mientras carga
Cuando la IA está procesando, toda la card del TripAdvisor/Copilot tiene el efecto shimmer sobre el contenido anterior (no solo un spinner). Hace que la espera se sienta activa.
Archivos: `components/TripAdvisor.tsx`, `components/TripCopilot.tsx`

**AI8 🟡** — **"Copiar lista"** en el packing list
Un botón `Copy` al lado del título del packing list copia toda la lista en formato texto para pegar en WhatsApp/Notes. Brief animation de checkmark al copiar.
Archivos: `components/TripAdvisor.tsx`

**AI9 🟢** — **Modo "en camino"**: AI briefing automático
Cuando el countdown llega a < 3h, automáticamente muestra un panel de "Resumen del viaje de hoy" generado por Claude: estado del aeropuerto, clima, puerta, conexiones, qué llevar. Se muestra solo, no hay que pedirlo.
Archivos: `components/DayOfTravelBanner.tsx`, nuevo endpoint `app/api/travel-brief/route.ts`

**AI10 🟢** — **Historial de conversaciones del Copilot**
Las últimas 3 sesiones de chat del Copilot se guardan en `localStorage`. El usuario puede verlas con un toggle "Conversaciones anteriores". Da continuidad a través de sesiones.
Archivos: `components/TripCopilot.tsx`, nuevo `hooks/useCopilotHistory.ts`

---

## Categoría 8 — Forms & Input (6)

**F1 🔴** — **Auto-uppercase en input de código de vuelo**
Al tipear el código de vuelo, se convierte automáticamente a mayúsculas y se muestra el logo/nombre de la aerolínea en tiempo real. `AA` → aparece "American Airlines" como preview.
Archivos: `components/FlightForm.tsx` o donde se ingresa el vuelo

**F2 🔴** — **Floating labels** en todos los inputs
Labels que flotan arriba cuando el input está enfocado o tiene contenido. Más limpio visualmente, nunca confuso sobre qué campo es qué.
Archivos: todos los formularios, `app/globals.css`

**F3 🔴** — **Validación inline** en tiempo real
Mostrar `✅` verde cuando el formato es correcto (código IATA de 3 letras, fecha válida) y `❌` rojo con mensaje cuando no. No esperar al submit.
Archivos: `components/FlightForm.tsx`, `components/AccommodationCard.tsx`

**F4 🟡** — **Date input mobile-friendly**
Reemplazar input `type="date"` con un selector visual de calendario compacto. En mobile, los date inputs nativos son inconsistentes entre navegadores.
Archivos: `components/FlightForm.tsx`, `components/AccommodationCard.tsx`

**F5 🟡** — **Word count en el import textarea**
El área de texto del import de vuelos muestra `"1.240 caracteres"` o una barra de progreso hacia el máximo. Da feedback sobre si hay suficiente texto para el AI.
Archivos: `components/ImportFlightsModal.tsx`

**F6 🟡** — **Autocomplete de aeropuerto** con banderas de país
La búsqueda de aeropuertos muestra: bandera del país + código IATA + nombre de ciudad. `🇦🇷 EZE · Buenos Aires`. Más visual y rápido de identificar.
Archivos: `components/AirportSearch.tsx`, `components/FlightForm.tsx`

---

## Categoría 9 — Empty States & Onboarding (8)

**O1 🔴** — **Ilustraciones SVG únicas** en empty states
Cada empty state tiene una ilustración SVG minimalista inline: avión en nubes (trips vacío), edificio aeropuerto (airports), lupa (search sin resultados). Sin librería, SVG puro.
Archivos: `components/TripEmptyState.tsx`, `components/AirportSearch.tsx`

**O2 🔴** — **Sugerencias en airport search vacío**
Mostrar los 8 aeropuertos más populares de Argentina como chips en la búsqueda vacía: EZE, AEP, COR, MDZ, BRC, IGR, SLA, ROS. Tap para agregar directamente.
Archivos: `components/AirportSearch.tsx`

**O3 🔴** — **Animación de "flecha guía"** en primer viaje
Al crear el primer viaje, una flecha animada apunta al botón de importar vuelos con efecto bounce. Desaparece después del primer uso (localStorage flag).
Archivos: `components/TripPanel.tsx`

**O4 🟡** — **Tour interactivo con spotlight**
En el primer uso, overlay semitransparente con "spotlight" (hole) sobre cada elemento explicado, secuencia de 5 pasos. Tap anywhere to continue. Mucho más efectivo que texto.
Archivos: nuevo `components/SpotlightTour.tsx`, `app/app/page.tsx`

**O5 🟡** — **Demo de notificación preview**
En la pantalla de configurar alertas, mostrar un preview visual de cómo se ve la push notification en la lock screen. "Esto es lo que vas a recibir →" con una mock notification card.
Archivos: `components/NotificationSetupSheet.tsx`

**O6 🟡** — **Success state** post-import con confetti
Cuando el import de vuelos es exitoso (3+ vuelos detectados), brief confetti burst (pure CSS: 20 divs con `animation: confetti 1s`). Celebración del primer logro del usuario.
Archivos: `components/ImportFlightsModal.tsx`, `app/globals.css`

**O7 🟡** — **Skeleton exacto** al layout cargado
Los skeletons actuales son genéricos. Cada skeleton debe tener exactamente la forma del contenido que reemplaza. FlightCard skeleton = misma altura/columnas que FlightCard real.
Archivos: `components/FlightCardSkeleton.tsx`, `components/TripListSkeleton.tsx`

**O8 🟢** — **Progress de onboarding** persistente
Un indicador de "completitud" del perfil: `3/5 pasos completos`. Pasos: crear viaje ✅, importar vuelo ✅, activar alertas ⬜, compartir viaje ⬜, explorar AI ⬜. Gamification suave.
Archivos: nuevo `components/OnboardingProgress.tsx`, `hooks/useOnboardingProgress.ts`

---

## Categoría 10 — Arquitectura de Información (8)

**I1 🔴** — **Sección "Hoy"** fija en trip panel
Si hay vuelos hoy, aparecen en una sección pinneada al top del TripPanel con fondo violet oscuro. El resto del itinerario está debajo. El usuario ve lo urgente primero.
Archivos: `components/TripPanel.tsx`

**I2 🔴** — **FlightCard colapsable**
Por defecto, la FlightCard muestra solo: código + ruta + hora + status. Al expandir (tap en chevron): METAR, gate, tipo avión, visa, tipo de cambio. Reduce la densidad de información por defecto.
Archivos: `components/FlightCard.tsx`

**I3 🟡** — **Separadores de fecha** entre vuelos
Entre cada grupo de vuelos de distinta fecha: `─── Martes 29 de Marzo ───` centrado en gris. Hace el itinerario mucho más legible como un documento.
Archivos: `components/TripPanel.tsx`

**I4 🟡** — **Risk score badge explicable**
Al tocar el `TripRiskBadge`, aparece un popover: "Riesgo: Medio · Conexión ajustada en EZE (45min) · Demora moderada esperada". No solo un número.
Archivos: `components/TripRiskBadge.tsx`

**I5 🟡** — **Toggle lista ↔ timeline** en TripPanel
Un botón pequeño para cambiar entre vista de lista (actual) y vista timeline (TripTimeline.tsx ya existe). Cada usuario prefiere una vista diferente.
Archivos: `components/TripPanel.tsx`

**I6 🟡** — **Airport card con disclosure progresivo**
La AirportCard muestra por defecto: status + temperatura + viento. Al expandir: METAR completo, TAF, SIGMET. Menos abrumador por defecto.
Archivos: `components/AirportCard.tsx`

**I7 🟡** — **Búsqueda global** dentro de la app
Un input de búsqueda en el header que permite encontrar vuelos, aeropuertos o viajes por nombre/código. Esencial para usuarios con muchos viajes.
Archivos: `app/app/page.tsx`, nuevo `components/GlobalSearch.tsx`

**I8 🟢** — **Resumen del viaje sticky** en la parte superior del TripPanel
Una barra compacta fija: `EZE → MIA → GCM · 3 vuelos · 29 Mar`. Al scrollear, se transforma en header ultra-compacto con solo el nombre. Da contexto sin ocupar espacio.
Archivos: `components/TripPanel.tsx`

---

## Categoría 11 — Accesibilidad Universal (7)

**A1 🔴** — **aria-labels en todos los botones** de ícono
Botones que solo tienen ícono (X, +, chevron, trash) necesitan `aria-label="Eliminar vuelo"` etc. Sin esto, los screen readers dicen "botón sin nombre".
Archivos: todos los componentes con icon-only buttons

**A2 🔴** — **Contraste WCAG AA** en todos los textos
Auditar que `text-gray-500` sobre fondo `#080810` pase 4.5:1. Los grises actuales (gray-500, gray-600) probablemente no pasan. Subir a gray-400 como mínimo para textos informativos.
Archivos: `app/globals.css`, cards principales

**A3 🔴** — **`prefers-reduced-motion`** respetar
En `app/globals.css`, agregar `@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`. Ya requerido por WCAG.
Archivos: `app/globals.css`

**A4 🟡** — **Focus visible** en todos los elementos interactivos
El ring de focus actual (`ring-blue-500`) debe ser consistente en TODO lo interactivo: botones, inputs, cards clicables, tabs. Algunos elementos no lo tienen.
Archivos: `app/globals.css`, componentes que lo estén perdiendo

**A5 🟡** — **Modo texto grande** (ya en T7)
Combo con T7: el modo texto grande también aumenta el tamaño de ícones (`w-4 → w-5`) y espaciado interno de cards (`p-3 → p-4`).
Archivos: `app/globals.css`

**A6 🟡** — **Alt text semántico** en íconos informativos
Íconos que transmiten información (AlertTriangle, CheckCircle) deben tener `role="img" aria-label="Alerta"`. Íconos decorativos: `aria-hidden="true"`.
Archivos: sistemático en todos los componentes

**A7 🟢** — **Soporte completo de teclado**
Modales atrapan foco (focus trap), Escape cierra todo, Tab navega en orden lógico. Especialmente importante para usuarios con movilidad reducida.
Archivos: `components/CreateTripModal.tsx`, modales principales

---

## Categoría 12 — Delight & Polish (7)

**D1 🔴** — **Countdown a 0: flash de éxito**
Cuando `FlightCountdownBadge` llega a 0, hace un flash verde durante 2s: `animation: success-flash 2s`. Momento de satisfacción visual.
Archivos: `components/FlightCountdownBadge.tsx`, `app/globals.css`

**D2 🔴** — **"Hoy" y "Mañana"** en lugar de fechas
En lugar de "29 Mar", mostrar "Hoy" / "Mañana" / "Pasado mañana" cuando aplica. Más natural, menos cognitivo. Fecha completa solo para días más lejanos.
Archivos: util `lib/formatDate.ts`, `components/FlightCard.tsx`, `components/TripListView.tsx`

**D3 🟡** — **Copy animation**: checkmark donde estaba el ícono
Al copiar cualquier cosa (link, packing list, itinerario), el ícono de copy se convierte en un `✓` por 1.5s antes de volver. Sin toast, sin interrupción.
Archivos: `lib/tripShare.ts`, botones de copy en toda la app

**D4 🟡** — **Trip card "pulse aura"** el día del viaje
La card del trip activo (con vuelo hoy) tiene un sutil glow violet pulsante alrededor: `box-shadow: 0 0 0 2px rgba(124,58,237,0.4)` con animación pulse de 2s.
Archivos: `components/TripListView.tsx`, `app/globals.css`

**D5 🟡** — **Animación de eliminación de card**
Al eliminar un vuelo o viaje, la card hace slide-out hacia la izquierda con fade-out (300ms) antes de que React lo remueva del DOM. Más suave que desaparecer de golpe.
Archivos: `components/FlightCard.tsx`, `components/TripListView.tsx`

**D6 🟡** — **Transición entre secciones** de BottomNav
Al cambiar de sección (Trips → Airports), el contenido hace un crossfade suave (opacity 0→1, 200ms). Evita el flash de contenido vacío entre navegaciones.
Archivos: `app/app/page.tsx`, `components/BottomNav.tsx`

**D7 🟢** — **Fondo del boarding pass con estrellas**
El `BoardingPassView.tsx` (ya creado) tiene un fondo con pattern de estrellas/constelaciones en CSS (pure box-shadow trick). Sensación premium de "viaje nocturno".
Archivos: `components/BoardingPassView.tsx`, `app/globals.css`

---

## Resumen de prioridades

| Prioridad | Cantidad |
|-----------|----------|
| 🔴 Implementar primero | 38 |
| 🟡 Segunda ronda | 47 |
| 🟢 Diferenciador final | 15 |

## Orden de batches sugerido

| Batch | Mejoras | Impacto |
|-------|---------|---------|
| 1 | P1+P2+P3+P8, T1+T3+T4 | Sistema de color + tipografía base |
| 2 | N1+N2+N3, S1+S2+S3 | Nav moderna + feedback claro |
| 3 | C1+C2+C3+C8+C9 | Cards rediseñadas |
| 4 | B1+B2+B3+B4+B5 | Botones + CTAs |
| 5 | AI1+AI2+AI3+AI6+AI7 | IA premium |
| 6 | F1+F2+F3+F6, O1+O2+O3 | Forms + onboarding |
| 7 | I1+I2+I3+I4+I5 | Info architecture |
| 8 | A1+A2+A3+D1+D2+D3 | Accesibilidad + delight |
| 9 | Resto de 🟡 | Polish general |
| 10 | Todo 🟢 | Diferenciadores finales |
