# TripCopilot — Revisión de Producción + Guía de Trabajo

> Autor: revisión técnica independiente (agente)
> Fecha: 2026-06-03
> Branch: `claude/app-production-review-FjqCa`
> Propósito: dejar por escrito el análisis real de la app y la guía de **qué investigar y qué hacer** antes de producción. Este documento es para retomar el trabajo mañana.

---

## 0. Cómo usar este documento

- **Sección 1–2**: foto real del estado (hechos verificados ejecutando, no marketing).
- **Sección 3**: respuestas honestas a las preguntas de producto.
- **Sección 4**: **la guía de trabajo** — tareas priorizadas con "qué investigar" + "qué hacer" + criterio de hecho. Esto es lo que se ejecuta.
- **Sección 5**: contradicciones de los docs internos a limpiar.

Regla: **no agregar features nuevas hasta cerrar los 🔴 de la Sección 4.**

---

## 1. Hechos verificados (ejecutando, no leyendo docs)

Corrido sobre el commit actual de la branch, con dependencias instaladas:

| Check | Comando | Resultado |
|---|---|---|
| TypeScript strict | `npx tsc --noEmit` | ✅ 0 errores |
| Lint | `npx next lint` | ✅ 0 warnings/errores |
| Unit tests | `npx vitest run` | ✅ 133 tests pasan (12 archivos) |
| E2E specs bajo vitest | (mismo run) | ⚠️ 2 "fallos" falsos — vitest agarra los `.spec.ts` de Playwright que debería excluir |
| Build producción | `next build` | ✅ Compila 66 páginas. Falla solo el prerender de `/app` por falta de envs Supabase locales (en Vercel con envs pasa) |
| Secretos hardcodeados | grep | ✅ Ninguno (todo `process.env`) |
| `console.log` en prod | grep | 6 (menores) |
| TODO/FIXME/HACK | grep | 1 |
| Rate limiting | grep | Presente en 34 archivos de API |

**Tamaño real**: ~81k líneas · 184 componentes · 78 API routes · 49 hooks · 13 archivos de test.

**Veredicto técnico**: el código está sano y bien tipado. No es un prototipo. Compila, lintea y tiene tests reales (incluido MCT de conexiones y gate-change detection).

---

## 2. Archivos más grandes (candidatos a refactor)

| Archivo | Líneas | Nota |
|---|---|---|
| `app/api/cron/flight-notifications/route.ts` | 2.301 | **Monolito crítico** — single point of failure |
| `app/page.tsx` | 1.863 | Landing |
| `components/TripPanel.tsx` | 1.312 | (docs decían "bajó a ~280" — falso) |
| `components/MyProfileView.tsx` | 1.231 | |
| `components/HelpPanel.tsx` | 1.181 | Panel de ayuda gigante = síntoma de UX que no se autoexplica |
| `components/ItineraryImportModal.tsx` | 949 | |
| `hooks/useUserTrips.ts` | 913 | |

---

## 3. Respuestas honestas (producto)

- **¿Lista para producción?** Para **beta cerrada (20–50 users elegidos): sí.** Para producción abierta: **no todavía** — por fragilidad operacional y sobrecarga de UX, no por bugs. Score real ≈ **7/10** (los docs internos se ponen 9.2 / 78 — inflado).
- **¿Sirve para muchas cosas?** Demasiadas. 78 endpoints, ~23 features de IA. La amplitud es real y rara, pero "hace todo" es un riesgo de foco, no un posicionamiento.
- **¿Se entiende?** Es la mayor preocupación. 7 tabs, onboarding con **5 flags de localStorage** distintos (señal de parches acumulados), componentes de 1.000+ líneas, panel de ayuda de 1.181 líneas. Sobrecarga cognitiva para el usuario nuevo.
- **¿Genera engagement?** El motor existe y es bueno: push contextual, gate-change por webhook en segundos, Wrapped anual (viral), riesgo de conexión. **El "aha moment" real es recibir la notificación útil en el aeropuerto**, no el import por IA. Depende 100% de que el cron no falle.
- **¿Compite con los grandes?** En LATAM, contra TripIt / App in the Air: **sí**. Contra Flighty: gana en features y precio, **pierde en pulido/velocidad/confianza**. Ventaja real defendible: MCT de conexión + notificaciones en español + gate-change en tiempo real.

---

## 4. GUÍA DE TRABAJO — qué investigar y qué hacer

Prioridad: 🔴 bloqueante para prod abierta · 🟠 alto · 🟡 medio · 🟢 calidad.

### 🔴 A. Endurecer el cron de notificaciones (lo más importante)
**Por qué**: `app/api/cron/flight-notifications/route.ts` (2.301 líneas, una sola función `GET`) es el corazón del producto. Si falla, se cae el 80% del valor. Tiene buen manejo de errores (96 try-catch, dedup, Sentry) **pero no tiene retry ni backoff**: un hipo transitorio de Supabase/FlightAware pierde la notificación en silencio. Sin tests.

**Investigar**:
- Mapear las sub-rutinas internas (`processFlightRow`, `processWeatherAlert`, `processCountdown`, etc.) y sus dependencias.
- Identificar qué fallos son "transitorios" (timeouts, 5xx, quota) vs "permanentes".
- Ver cómo se invoca (Vercel cron schedule en `vercel.json`) y el timeout máximo.

**Hacer**:
1. Extraer las sub-rutinas a módulos en `lib/cron/` (sin cambiar comportamiento) → testeable.
2. Agregar retry con backoff exponencial en las llamadas externas (FlightAware, AeroDataBox, Supabase reads).
3. Persistir fallos para reintento en la próxima corrida (cola simple en DB).
4. Tests unitarios de las sub-rutinas críticas (dedup, ventanas de tiempo, selección de destinatarios).

**Hecho cuando**: el cron está modularizado, las sub-rutinas críticas tienen tests, y un fallo transitorio reintenta en vez de perderse.

---

### 🔴 B. Rate limiting + circuit breaker en APIs externas
**Por qué**: el cron dispara ~1 request por vuelo activo sin throttle. Con 1.000 vuelos → 1.000 calls a FlightAware (quota 500 free/mes, $0.002/call). AeroDataBox falla en silencio → muestra aeropuerto "Normal" cuando no lo es (engaña al usuario).

**Investigar**:
- Dónde se llaman FlightAware / AeroDataBox / FAA y si hay batching.
- Confirmar el comportamiento de fallo silencioso de AeroDataBox (`lib/` proveedores).

**Hacer**:
1. Throttle/concurrency-limit a las llamadas externas en el cron.
2. Circuit breaker para AeroDataBox/FAA (si falla N veces, cortar y marcar "datos no disponibles").
3. **UX**: mostrar "Datos internacionales temporalmente no disponibles" en vez de estado "Normal" falso.

**Hecho cuando**: no hay forma de quemar quota en una sola corrida y el fallo de proveedor se ve en la UI.

---

### 🟠 C. Optimizar costos de IA (Anthropic)
**Por qué**: 23 features de Claude (17 Haiku, 6 Sonnet), **sin prompt caching**. El "airplane brief" corre en el cron repitiendo el mismo system prompt miles de veces. Sin límite por usuario → alguien puede spammear `dream-planner`/`trip-*` y quemar plata.

**Investigar**:
- Listar todas las rutas que llaman Claude (`app/api/parse-*`, `app/api/trip-*`, `airplane-brief`, etc.) y sus system prompts.
- Ver cuáles repiten prompt (candidatos a cache) y cuáles no tienen rate limit por usuario.

**Hacer**:
1. Agregar **prompt caching** (`cache_control`) a los system prompts repetidos, sobre todo el del cron. Usar el skill `claude-api` como referencia.
2. Rate limit por usuario en rutas de IA caras (`dream-planner`, `trip-advice`, `airport-guide`, etc.).
3. Confirmar modelos: hoy Haiku `claude-haiku-4-5-20251001`, Sonnet `claude-sonnet-4-6`. Validar que son la mejor relación costo/calidad por feature.

**Hecho cuando**: caching activo en prompts repetidos (cache hit visible) y ninguna ruta de IA es ilimitada por usuario.

---

### 🟠 D. Offline mode: cerrar o ser honestos
**Por qué**: `VALORACION-BETA` dice "offline completo ✅" pero el código solo cachea para **ver**; no hay background sync. Editar un viaje sin conexión = se pierden los cambios. `PRIORIDAD.md` ya lo admite (ítem 21 sin marcar). Para una app de aeropuerto (WiFi malo) duele.

**Investigar**:
- `hooks/useOfflineSync.ts`, `lib/offlineCache.ts`, config PWA en `next.config.mjs` (`@ducanh2912/next-pwa`), `public/push-sw.js`.
- Qué se cachea hoy y qué estrategia de Workbox está activa.

**Hacer** (elegir uno):
- **Opción mínima honesta**: hacer la UI read-only cuando está offline + banner claro. Corregir los docs.
- **Opción completa**: implementar background sync (cola de cambios + reintento al volver online).

**Hecho cuando**: el comportamiento offline es predecible y los docs dicen la verdad.

---

### 🟡 E. Reducir sobrecarga de UX / foco de onboarding
**Por qué**: 7 tabs + 5 flags de localStorage de onboarding + panel de ayuda de 1.181 líneas. El usuario nuevo no sabe por dónde empezar.

**Investigar**:
- `app/app/page.tsx` (flags: `tripcopilot-onboarded`, `tc-onboarded`, `tripcopilot_onboarding_completed`, `tc-tour-${id}`, `tc-onboarded-${id}`).
- `components/onboarding/OnboardingFlow.tsx` y `HelpPanel.tsx`.

**Hacer**:
1. Unificar los flags de onboarding en uno solo.
2. Definir UNA killer feature para el primer momento (recomendado: **riesgo de conexión + alerta de gate**) y diferir el resto detrás de progresión.
3. Achicar `HelpPanel` (si la UI necesita 1.181 líneas de ayuda, simplificar la UI).

**Hecho cuando**: un usuario nuevo entiende qué hacer en <60s sin abrir la ayuda.

---

### 🟢 F. Calidad / deuda técnica
- **Fix `vitest.config.ts`**: agregar `test.exclude` para `e2e/**` (hoy vitest corre los specs de Playwright y "falla"). Tarea chica, alto orden.
- Sacar los 6 `console.log` de producción (`NotifCarousel.tsx` principalmente).
- Refactor de los componentes >1.000 líneas (`TripPanel`, `MyProfileView`, `HelpPanel`) — paralelo al roadmap.
- Setear `metadataBase` en metadata (warning del build sobre OG/Twitter images).

---

## 5. Limpiar docs internos (fuente de verdad única)
Hoy hay **3 documentos de estado que se contradicen**:

| Doc | Problema |
|---|---|
| `APP-STATE.md` | Dice "Next.js 15 / React 19 / Tailwind 4" → es **Next 14.2 / React 18 / Tailwind 3.4**. Dice "TripPanel ~280 líneas" → tiene **1.312**. Se auto-puntúa 9.2. |
| `VALORACION-BETA.md` | Score 78/100, lista bugs que ya no existen, dice "offline completo" (falso). |
| `PRIORIDAD.MD` | El más honesto, pero desactualizado (dice "cero tests" → hay 133). |

**Hacer**: consolidar en **un solo** `APP-STATE.md` veraz (stack real, tamaños reales, sin auto-puntajes inflados) y borrar/archivar los otros dos. Que los próximos agentes actualicen ese y solo ese.

---

## 6. Orden sugerido para mañana

1. **F** (fix `vitest.config` + console.logs) — calentamiento, 30 min.
2. **A** (endurecer cron) — el de mayor impacto, el grueso del día.
3. **B** (throttle + circuit breaker) — encadena con A.
4. **C** (prompt caching + rate limit IA) — costos.
5. **D / E / Sección 5** — según tiempo.

Cada tarea sigue el flujo del CLAUDE.md: planner → researcher → coder → reviewer → qa → commit. No saltear reviewer/qa.

---

*Documento vivo. Actualizar a medida que se cierran ítems.*
