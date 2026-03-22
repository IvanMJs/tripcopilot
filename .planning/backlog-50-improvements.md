# TripCopilot — Backlog 50 Mejoras

**Generado:** 2026-03-21
**Estado:** Listo para asignar al equipo

---

## Prioridades

| Emoji | Nivel |
|-------|-------|
| 🔴 | Alto impacto / Bajo esfuerzo — hacer primero |
| 🟡 | Alto impacto / Esfuerzo medio |
| 🟢 | Diferenciador / Mayor esfuerzo |

---

## Categoría A — Notificaciones & Alertas (8)

**Contexto:** El cron ya maneja 15 tipos de notificaciones. Cada mejora aquí agrega un nuevo tipo de push al flujo existente usando `pushToAll()` + `notification_log`.

---

**A1 🔴 — Notificación de aterrizaje**
Cuando `arrivalTime` llega y el vuelo tiene datos de AeroDataBox con estado `landed`, mandar push: *"✅ AR1303 aterrizó en MIA"*. La familia lo espera tanto como el viajero.
Archivos: `app/api/cron/flight-notifications/route.ts`

**A2 🔴 — Alerta de apertura de boarding**
30 minutos antes del `departureTime`, push: *"🚪 Boarding abierto — AR1303, Puerta B12"*. Si hay gate en AeroDataBox, incluirlo.
Archivos: `app/api/cron/flight-notifications/route.ts`

**A3 🔴 — Update de delay con hora nueva**
Cuando el delay cambia, en lugar de solo decir "hay demora", mostrar la hora actualizada: *"AR1303 ahora sale a las 20:45 (+1h)"*. Mucho más accionable que el mensaje actual.
Archivos: `app/api/cron/flight-notifications/route.ts`, `lib/cronUtils.ts`

**A4 🟡 — Alerta de hora de salida para el aeropuerto**
Calcular `departureTime - 3h` y mandar push: *"Es hora de salir. Tu vuelo sale a las 18:30 y el aeropuerto está a X"*. Sin GPS (lo tiene la empresa); simplemente recordar salir con tiempo.
Archivos: `app/api/cron/flight-notifications/route.ts` (ya existe `preflight_3h`, mejorar el copy)

**A5 🟡 — Alerta de clima severo en destino**
Si Open-Meteo devuelve `weathercode >= 65` (lluvia fuerte, nieve, tormenta) para el día de llegada, mandar push preventivo: *"🌧 Lluvia intensa en Miami el jueves. Llevá paraguas."*
Archivos: `app/api/cron/flight-notifications/route.ts`, `hooks/useWeather.ts` (adaptar para server-side)

**A6 🟡 — Modo rescate de conexión**
Si un vuelo se retrasa y la conexión queda en riesgo (`risk = "at_risk"` o `"missed"`), mandar push urgente con instrucciones: *"⚠️ Conexión en riesgo. Avisá a la tripulación al aterrizar en EZE."*
Archivos: `app/api/cron/flight-notifications/route.ts`, `lib/connectionRisk.ts`

**A7 🟢 — Notificación de cambio de puerta**
Guardar el gate previo en `notification_log` metadata y comparar en cada cron run. Si cambió: *"🚨 Cambio de puerta — AR1303 ahora sale por A5 (antes B12)"*.
Archivos: `app/api/cron/flight-notifications/route.ts`, tabla `notification_log` (agregar campo `gate`)

**A8 🟢 — Resumen nocturno del día siguiente**
A las 21:00 del día anterior a cualquier vuelo, mandar resumen completo: clima, estado del aeropuerto, conexiones, check-in online disponible.
Archivos: `app/api/cron/flight-notifications/route.ts` (nuevo tipo `evening_briefing`)

---

## Categoría B — Datos del vuelo (7)

**Contexto:** `TripFlight` tiene los campos base pero le faltan datos enriquecidos. AeroDataBox los tiene; hay que mostrarlos.

---

**B1 🔴 — Tipo de avión en FlightCard**
AeroDataBox devuelve aircraft type (Boeing 737 MAX, Airbus A320). Mostrarlo en la FlightCard con un ícono pequeño. Los viajeros frecuentes lo aprecian para preparar equipaje de mano.
Archivos: `components/FlightCard.tsx`, `lib/types.ts` (agregar `aircraftType?: string`)

**B2 🔴 — Número de puerta en FlightCard**
Si AeroDataBox tiene gate, mostrarlo prominentemente. Es la info más buscada en el aeropuerto.
Archivos: `components/FlightCard.tsx`, `lib/types.ts` (agregar `departureGate?: string`)

**B3 🔴 — Hora real vs. programada**
Cuando hay delay, mostrar ambas horas: `18:30 → 19:45` con la original tachada. Más claro que solo el delay en minutos.
Archivos: `components/FlightCard.tsx`, `components/FlightStatus.tsx`

**B4 🟡 — % de puntualidad histórica del vuelo**
Mostrar en la FlightCard: *"Este vuelo llega a tiempo el 78% de las veces"*. AeroDataBox lo tiene en `/flights/codeshare/{flightNumber}`. Da contexto al viajero.
Archivos: `components/FlightCard.tsx`, nuevo hook `useFlightHistory.ts`

**B5 🟡 — Terminal + tiempo de caminata**
Para conexiones, mostrar terminal de llegada vs. salida: *"Llegás por T1, salís por T2 — ~12 min a pie"*. Datos hardcodeados por aeropuerto en `lib/airports.ts` o consultados.
Archivos: `lib/airports.ts` (agregar `terminals`), `components/ConnectionRiskBanner.tsx`

**B6 🟡 — Cinta de equipaje en llegada**
Si AeroDataBox tiene baggage claim belt, mostrarlo en la vista de vuelo al aterrizar. *"🧳 Cinta 4 — Terminal Internacional"*.
Archivos: `components/FlightCard.tsx`, `lib/types.ts`

**B7 🟢 — Mini-mapa de ruta del vuelo**
SVG simple con dos puntos (origen → destino) y una curva. No requiere librería de mapas. Visible en la vista expandida del vuelo.
Archivos: `components/FlightCard.tsx`, nuevo `components/FlightRouteMap.tsx`

---

## Categoría C — Gestión de viajes (8)

**Contexto:** Los viajes actuales son el viaje activo. Falta gestión del ciclo de vida completo.

---

**C1 🔴 — Archivo de viajes pasados**
Los viajes con todos los vuelos en el pasado se mueven a una sección "Historial" plegable en `TripListView`. El usuario puede verlos pero no los confunde con viajes activos.
Archivos: `components/TripListView.tsx`, `hooks/useUserTrips.ts`

**C2 🔴 — Notas en vuelos individuales**
El hook `useFlightNotes.ts` ya existe. Conectarlo a `FlightCard.tsx` con un botón de nota (ícono `StickyNote`). El usuario puede anotar: *"asiento 14A, ventana"* o *"check-in online hasta 4h antes"*.
Archivos: `components/FlightCard.tsx`, `hooks/useFlightNotes.ts`

**C3 🔴 — Barra de progreso del viaje**
En `TripSummaryHero.tsx`, mostrar `X/Y vuelos completados` como barra de progreso. Un vuelo está "completado" si `isoDate < today`. Da sensación de avance en viajes largos.
Archivos: `components/TripSummaryHero.tsx`

**C4 🟡 — Drag para reordenar vuelos**
Usar `@dnd-kit/core` (verificar si está instalado) o CSS drag para reordenar vuelos dentro de un viaje. Útil cuando el usuario importa en orden incorrecto.
Archivos: `components/TripPanel.tsx`, `hooks/useUserTrips.ts`

**C5 🟡 — Exportar itinerario a calendario (.ics)**
Botón en TripPanel que genera un archivo `.ics` con todos los vuelos y alojamientos como eventos. El usuario lo importa a Google Calendar / Apple Calendar.
Archivos: nuevo `lib/exportCalendar.ts`, `components/TripPanel.tsx`

**C6 🟡 — Exportar itinerario como PDF**
Un botón "Exportar PDF" que genera un resumen del viaje usando el browser print API (`window.print()`) con estilos de impresión limpios. Sin dependencias adicionales.
Archivos: nuevo `app/print/[tripId]/page.tsx`, `components/TripPanel.tsx`

**C7 🟡 — Templates de viaje**
Guardar un viaje como template (ej: "BUE-MIA-GCM mensual"). Al crear viaje nuevo, ofrecer "Usar template" y clonar vuelos con nuevas fechas.
Archivos: `components/CreateTripModal.tsx`, `hooks/useUserTrips.ts`, nueva tabla `trip_templates`

**C8 🟢 — Tracker de costo del viaje**
Campo opcional de precio en cada vuelo y alojamiento. Total automático en `TripSummaryHero`. Simple suma, sin integración de pagos.
Archivos: `components/FlightCard.tsx`, `components/AccommodationCard.tsx`, `lib/types.ts`

---

## Categoría D — Inteligencia Artificial (7)

**Contexto:** Claude API ya integrada. `TripAdvisor.tsx` y `TripCopilot.tsx` existen. Hay que profundizar la IA en puntos de alta tensión del viaje.

---

**D1 🔴 — AI responde preguntas del viaje (chat)**
En `TripCopilot.tsx` (ya existe), habilitar modo conversacional: *"¿Qué pasa si pierdo la conexión en EZE?"* → Claude responde con contexto del viaje específico (aeropuerto, tiempos, aerolínea).
Archivos: `components/TripCopilot.tsx`, `app/api/trip-copilot/route.ts` (verificar si existe)

**D2 🔴 — AI sugiere vuelo alternativo al cancelarse**
Cuando el cron detecta cancelación, incluir en la notificación y en el panel: *"Hay vuelo alternativo AA902 a las 22:00 — ¿lo agrego a tu viaje?"*. Claude genera la sugerencia con contexto de la ruta.
Archivos: `app/api/cron/flight-notifications/route.ts`, `components/FlightCard.tsx`

**D3 🟡 — AI packing con contexto de actividades**
En `ImportFlightsModal.tsx`, después de importar, preguntar: *"¿Qué vas a hacer en destino? (playa, trabajo, ski)"* y personalizar el packing list. Claude ya genera el packing — solo agregar contexto.
Archivos: `components/TripAdvisor.tsx`, `app/api/trip-advice/route.ts`

**D4 🟡 — Predicción de delay por IA**
Antes de la notificación de delay oficial, si el historial del aeropuerto muestra problemas repetidos, agregar en el morning briefing: *"EZE tiene delays frecuentes los lunes por la mañana — considerá llegar antes"*.
Archivos: `app/api/cron/flight-notifications/route.ts`

**D5 🟡 — Brief de aeropuerto de conexión**
Si el usuario tiene escala de 1-3h en un aeropuerto que no conoce, Claude genera: *"En tu escala de 2h en MIA Terminal D: cambio de terminal NO necesario, hay lounge, los baños están a 200m de la puerta"*.
Archivos: `components/TripAdvisor.tsx`, nuevo endpoint `app/api/layover-brief/route.ts`

**D6 🟢 — AI detecta inconsistencias en el itinerario**
Verificar automáticamente que los tiempos sean lógicos: llegás a las 14:00, el siguiente vuelo sale a las 14:30 — imposible. Alertar al usuario con sugerencia de corrección.
Archivos: `hooks/useUserTrips.ts` (validación al guardar), `components/TripPanel.tsx`

**D7 🟢 — AI resume historial de alertas**
En `HelpPanel.tsx` o nueva sección, Claude genera un resumen de todas las alertas del viaje: *"Tu viaje tuvo 3 delays, 1 cambio de puerta, total 2h de retraso acumulado"*.
Archivos: `components/HelpPanel.tsx`, `hooks/useNotificationLog.ts`

---

## Categoría E — UX & Interacciones (8)

**Contexto:** La app es funcional pero las interacciones móviles pueden ser más fluidas.

---

**E1 🔴 — Swipe para eliminar vuelo (móvil)**
En `FlightCard.tsx`, detectar swipe horizontal con `TouchEvent`. Al deslizar izquierda, revelar botón rojo "Eliminar". Patrón estándar de iOS/Android.
Archivos: `components/FlightCard.tsx`, nuevo hook `useSwipeToDelete.ts`

**E2 🔴 — Pull to refresh en estado del aeropuerto**
En `AirportCard.tsx`, detectar pull-down gesture y llamar el refetch del hook de estado. Patrón estándar esperado en móvil.
Archivos: `components/AirportCard.tsx`, nuevo hook `usePullToRefresh.ts`

**E3 🔴 — Modo "Estoy viajando ahora" en pantalla principal**
Si hay un vuelo en las próximas 4h, la pantalla principal muestra un banner prominente con el countdown, puerta, y status. `DayOfTravelBanner.tsx` ya existe — mejorarlo con esta lógica.
Archivos: `components/DayOfTravelBanner.tsx`, `app/app/page.tsx`

**E4 🟡 — Dark/Light mode toggle**
Agregar toggle en la app (no solo seguir el sistema). Guardar preferencia en `localStorage`. Tailwind tiene soporte nativo con `dark:` classes.
Archivos: `app/layout.tsx`, nuevo `components/ThemeToggle.tsx`, `contexts/ThemeContext.tsx`

**E5 🟡 — Onboarding mejorado con tour interactivo**
El `OnboardingModal.tsx` existe. Mejorar con 4 pasos: (1) crear viaje, (2) importar vuelos con IA, (3) activar alertas, (4) invitar a familia. Con animaciones entre pasos.
Archivos: `components/OnboardingModal.tsx`

**E6 🟡 — Haptic feedback en acciones clave**
`navigator.vibrate()` en: eliminar vuelo (patrón largo), confirmar guardar (patrón corto), recibir alerta (patrón de alerta). Ya usado en BottomNav, extender al resto.
Archivos: `components/FlightCard.tsx`, `components/TripPanel.tsx`

**E7 🟡 — Vista de boarding pass animada**
Al expandir un vuelo activo, mostrar una tarjeta estilo boarding pass con fondo degradado, código de vuelo grande, y animación de entrada slide-up. Solo CSS/Tailwind.
Archivos: `components/FlightCard.tsx`, nuevo `components/BoardingPassView.tsx`

**E8 🟢 — Atajos de teclado para escritorio**
`N` → nuevo viaje, `I` → importar vuelos, `←/→` → navegar entre trips, `Esc` → cerrar modal. Agregar con `useEffect` + `keydown` listener.
Archivos: `app/app/page.tsx`, nuevo hook `useKeyboardShortcuts.ts`

---

## Categoría F — Compartir & Familia (5)

**Contexto:** `lib/tripShare.ts` ya genera URLs y mensajes de WhatsApp. Hay que mejorar la experiencia de compartir.

---

**F1 🔴 — Tarjeta visual del viaje para compartir**
Usar `html2canvas` o Canvas API para generar una imagen del itinerario: fondo oscuro, logos de aerolíneas, horarios. El usuario la comparte por WhatsApp/Instagram. No requiere servidor.
Archivos: nuevo `lib/shareCard.ts`, `components/TripPanel.tsx`

**F2 🔴 — Link de tracking en tiempo real para familia**
El link compartido actual es estático. Convertirlo en página que se actualiza automáticamente (polling cada 2min) con el estado real del vuelo. La familia ve si hay delay sin que el viajero mande mensajes.
Archivos: nuevo `app/share/[token]/page.tsx`, nueva tabla `trip_share_tokens`

**F3 🟡 — Exportar a Google Calendar**
Un click para agregar todos los vuelos y alojamientos como eventos en Google Calendar usando la URL de creación de eventos de Google (`calendar.google.com/calendar/r/eventedit?...`). Sin OAuth, solo deep link.
Archivos: nuevo `lib/exportGoogleCalendar.ts`, `components/TripPanel.tsx`

**F4 🟡 — WhatsApp one-tap mejorado**
El mensaje de WhatsApp actual existe en `lib/tripShare.ts`. Mejorarlo para incluir: emoji por aerolínea, estado de delay si lo hay, link de tracking de F2.
Archivos: `lib/tripShare.ts`

**F5 🟢 — Viaje colaborativo (co-viajero)**
Agregar a otro usuario al viaje (por email). Ambos ven y editan el mismo viaje en tiempo real usando Supabase Realtime. Requiere tabla `trip_collaborators`.
Archivos: `hooks/useUserTrips.ts`, nueva tabla `trip_collaborators`, `components/TripPanel.tsx`

---

## Categoría G — Performance & PWA (5)

**Contexto:** El SW actual (Workbox) cachea solo assets. Los datos del viaje no están disponibles offline.

---

**G1 🔴 — Cache offline de datos del viaje (IndexedDB)**
Cuando el usuario carga los viajes, guardarlos en IndexedDB con `idb` o similar. Si pierde conexión, la app muestra los datos cacheados con banner "sin conexión — datos de hace X min".
Archivos: nuevo `lib/tripsCache.ts`, `hooks/useUserTrips.ts`

**G2 🔴 — Skeleton screens completos**
`TripPanelSkeleton.tsx` existe. Agregar skeletons a: `TripListView`, `AirportCard`, `FlightCard`. Eliminar el flash de contenido vacío.
Archivos: `components/TripListView.tsx`, `components/AirportCard.tsx`, `components/FlightCard.tsx`

**G3 🟡 — PWA install prompt contextual**
Mostrar banner de instalación después de que el usuario crea su primer viaje (no en onboarding — es muy pronto). Banner minimal en la parte inferior con `beforeinstallprompt`.
Archivos: nuevo `components/PwaInstallBanner.tsx`, `app/app/page.tsx`

**G4 🟡 — Background sync para actualizaciones**
Cuando la app está en background (SW activo), sincronizar el estado del vuelo cada 10 minutos y actualizar el badge del ícono de la app con el número de alertas activas. Usar `navigator.setAppBadge()`.
Archivos: `public/push-sw.js`, `hooks/useServiceWorker.ts`

**G5 🟢 — Lazy loading de componentes pesados**
`TripAdvisor`, `TripCopilot`, `TripTimeline` cargan siempre aunque no se usen. Convertirlos a `dynamic(() => import(...))` de Next.js para reducir bundle inicial.
Archivos: `app/app/page.tsx`, `components/TripPanel.tsx`

---

## Categoría H — Datos & Información adicional (2)

---

**H1 🟡 — Requisitos de visa / entrada**
Al agregar un vuelo internacional, mostrar en `FlightCard` un indicador: *"Para viajar a USA desde Argentina necesitás: pasaporte + ESTA"*. Datos hardcodeados para los 20 destinos más comunes; no requiere API externa.
Archivos: nuevo `lib/visaRequirements.ts`, `components/FlightCard.tsx`

**H2 🟡 — Tipo de cambio en destino**
En `AccommodationCard.tsx` o `TripAdvisor`, mostrar el tipo de cambio del país de destino usando la API gratuita de exchangerate-api.com o frankfurter.app.
Archivos: nuevo hook `useExchangeRate.ts`, `components/AccommodationCard.tsx`

---

## Resumen por prioridad

| Prioridad | Cantidad | Categorías principales |
|-----------|----------|----------------------|
| 🔴 Alta | 19 | A1-3, B1-3, C1-3, D1, E1-3, F1-2, G1-2 |
| 🟡 Media | 22 | A4-6, B4-6, C4-7, D3-5, E4-7, F3-4, G3-4, H1-2 |
| 🟢 Diferenciador | 9 | A7-8, B7, C8, D6-7, E8, F5, G5 |

---

## Orden sugerido de implementación (primeras 10)

1. **A1** — Notificación de aterrizaje (rápido, muy satisfactorio para familia)
2. **A2** — Alerta de boarding abierto (quick win en cron)
3. **A3** — Update de delay con hora nueva (mejora notificación existente)
4. **B1** — Tipo de avión en FlightCard (solo mostrar dato que ya viene)
5. **B2** — Número de puerta en FlightCard (idem)
6. **B3** — Hora real vs. programada (visual improvement)
7. **C1** — Archivo de viajes pasados (alta demanda de usuarios)
8. **C2** — Notas en vuelos (hook existe, solo conectar)
9. **C3** — Barra de progreso del viaje (una línea de código)
10. **F2** — Link de tracking en tiempo real para familia (diferenciador fuerte)
