# TripCopilot — Estado de la aplicación

> Actualizar este archivo cada vez que se agrega, cambia o elimina una feature.
> Última actualización: 2026-04-24

---

## Veredicto general

**Puntaje: 9.2 / 10**

TripCopilot es la app de viajes más completa del mercado hispanohablante y una de las más completas a nivel global. Ningún competidor directo tiene la combinación de: tracking en vivo + IA integrada + tablero split-flap + red social de viajeros + modo offline + compartir viral.

### Competencia directa

| App | Tracking en vivo | IA | Tablero estilo aeropuerto | Social | Offline | Precio |
|---|---|---|---|---|---|---|
| **TripCopilot** | ✅ FlightAware | ✅ Múltiple | ✅ Split-flap | ✅ Completo | ✅ | Freemium |
| Flighty | ✅ | ❌ | ❌ | ❌ | Parcial | $50/año, iOS only |
| App in the Air | ✅ | ❌ | ❌ | Básico | ❌ | $60/año |
| TripIt | ❌ Básico | ❌ | ❌ | ❌ | ❌ | $49/año |
| FlightAware App | ✅ | ❌ | ❌ | ❌ | ❌ | Gratis/Ads |

**Diferenciadores únicos de TripCopilot:**
1. TripBoard con animaciones split-flap reales
2. IA que lee confirmaciones de vuelo desde foto o texto
3. Red social de viajeros con perfiles y seguimiento
4. Health Check 48h antes generado por IA
5. Link público en tiempo real para compartir con familia
6. Diario de viaje generado por IA post-trip
7. Travel Wrapped anual compartible
8. Funciona offline completo
9. PWA: instala en iOS y Android sin app store
10. Bilingüe (ES/EN)

---

## Rutas y páginas

| Ruta | Auth | Descripción |
|---|---|---|
| `/` | No | Landing page con hero, features, pricing, FAQ |
| `/app` | Sí | Dashboard principal de la aplicación |
| `/board` | Sí | TripBoard — tablero de salidas split-flap |
| `/board/[token]` | No | Vista pública del tablero (server component) |
| `/share/[token]` | No | Viaje compartido con reacciones |
| `/u/[username]` | No | Perfil social público del usuario |
| `/print/[tripId]` | No | Vista imprimible del itinerario |
| `/privacy` | No | Política de privacidad |
| `/invite` | No | Landing de referral/invitación |
| `/login` | No | Redirect a /#empezar |

---

## Features completas

### Gestión de viajes
- Crear, editar, eliminar viajes
- Múltiples viajes por usuario
- Colaboradores en viajes (invitar por email)
- Archivar viajes completados
- Imprimir itinerario (ruta `/print`)

### Vuelos
- Importar vuelos desde foto, screenshot o texto (IA)
- Estado en vivo via FlightAware AeroAPI
- Notificaciones push automáticas (24h antes del vuelo)
- Alertas: cambio de puerta, demora, cancelación, boarding
- Alerta de upgrade de clase (activable por vuelo)
- Alerta de riesgo de conexión entre vuelos
- Resumen de vuelo PDF (boarding pass informativo)
- Rastrear cualquier vuelo sin tenerlo en un viaje
- Predicción de delay via historial estadístico
- Detección automática de cambio de puerta

### TripBoard *(nuevo — 2026-04)*
- Tablero split-flap con animaciones reales (Web Animations API)
- Vista portrait: lista de vuelos + bottom nav 3 tabs
- Vista landscape/desktop: grilla estilo cartel aeropuerto
- Tab "MIS VUELOS": lista con estado en tiempo real
- Tab "COMPARTIR": tarjeta 9:16 descargable como imagen (html2canvas)
- Tab "PÚBLICO": link permanente para compartir con familia/amigos
- Vista pública `/board/[token]` sin necesidad de cuenta
- Datos: FlightAware (puerta, estado, demora) + Supabase

### Aeropuertos
- Estado FAA para 35+ aeropuertos de EEUU (datos XML)
- Estado internacional via AeroDataBox
- Clima y temperatura del aeropuerto
- Tiempos de espera TSA (aeropuertos EEUU)
- Datos METAR y TAF (aviación)
- Alertas SIGMET
- Guía de aeropuerto generada por IA
- Info de WiFi por aeropuerto
- Info de lounges por aeropuerto

### Inteligencia Artificial
- Importar itinerario desde foto/email/texto
- Health Check 48h antes (clima, documentos, tips, score)
- Asistente de viaje (chat)
- Consejos de destino
- Guía de escala por aeropuerto
- Diario de viaje post-trip (historia en primera persona)
- Predicción de delay
- Análisis de riesgo de conexión
- Sugerencias de viaje

### Notificaciones
- Push notifications vía Service Worker
- Webhooks FlightAware → notificaciones automáticas
- Check-in abierto (24h antes del vuelo)
- Recordatorio hotel (día anterior al check-in)
- Log de notificaciones recibidas

### Social
- Perfil público con username (`/u/username`)
- Compartir viajes con link público
- Reacciones a viajes compartidos (emojis)
- Seguir usuarios
- Sistema de amigos
- Feed de viajes de personas que seguís
- Travel persona (tipo de viajero)
- Configuración de privacidad granular

### Gamificación y estadísticas
- Estadísticas all-time (km, vuelos, países, aeropuertos)
- Mapa mundial de aeropuertos visitados
- Travel Wrapped anual compartible
- Sistema de logros/badges
- Racha de viajes

### Finanzas y presupuesto
- Presupuesto por viaje
- Registro de gastos
- Conversor de moneda (USD/ARS y otras)
- Estimador de costos de destino
- Alertas de precio de vuelos (framework)

### Planificación
- Checklist de viaje inteligente
- Lista de empacar personalizada por IA
- Exportar a Google Calendar
- Tips de destino
- Info de visa requerida
- Huella de carbono del vuelo
- Dream trip planner

### UX y técnico
- PWA: instala en iOS y Android
- Modo offline completo con sync
- Soporte multidispositivo
- Bilingüe ES/EN
- Tema oscuro/claro
- Búsqueda global (Ctrl+K)
- Atajos de teclado
- Analytics (Vercel)
- Error tracking (Sentry)

### Monetización
- Plan gratuito (sin fecha de vencimiento)
- Plan Explorer (~$5 USD/mes)
- Plan Pilot (~$12 USD/mes)
- Pagos via Mercado Pago
- Sistema de referrals

---

## Features parciales / en progreso

| Feature | Estado | Notas |
|---|---|---|
| Google Calendar sync | Parcial | Botón existe, exportación funciona pero sync bidireccional no |
| Price alerts | Framework | Estructura lista, sin fuente de datos de precios activa |
| Chat con aerolíneas | No implementado | — |

---

## APIs externas integradas

| Proveedor | Uso | Plan |
|---|---|---|
| FlightAware AeroAPI | Estado en vivo, gate, delay, webhooks | Personal (500 free/mes, $0.002/call) |
| FAA NASSTATUS XML | Estado de aeropuertos EEUU | Gratis |
| AeroDataBox | Estado aeropuertos internacionales | — |
| OpenWeather | Clima del aeropuerto | — |
| Supabase | DB, auth, storage, realtime | — |
| Vercel | Deploy, analytics, speed insights | — |
| Sentry | Error tracking | — |
| Mercado Pago | Pagos suscripción | — |

---

## Stack técnico

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, Tailwind CSS 4, inline styles (tripboard)
- **Lenguaje**: TypeScript
- **DB**: Supabase (PostgreSQL + RLS)
- **Auth**: Supabase Auth (Google OAuth + Magic Link)
- **Storage**: Supabase Storage (boarding passes)
- **Fuente**: Inter + JetBrains Mono
- **Animaciones**: Framer Motion + Web Animations API (tripboard)
- **PDF**: html2canvas, jsPDF
- **IA**: Claude (Anthropic) via Vercel AI SDK

---

## Pendientes y mejoras detectadas

1. **Entry point al TripBoard desde /app** — no hay botón en el dashboard principal que lleve a `/board`. Agregar en la sección de vuelos próximos o en el nav.
2. **Onboarding tour** — con 30+ features, un usuario nuevo no sabe por dónde empezar. Un tour guiado de 3 pasos haría la retención mucho mejor.
3. **Supabase migration pendiente en producción** — `shared_trips` aplicada manualmente via SQL Editor el 2026-04-24.
4. **Imagen TripBoard en landing** — `/public/tripboard-preview.png` necesita agregarse con el screenshot del tablero.

---

*Este documento es la fuente de verdad del estado de la app. Actualizarlo en cada PR que modifique features.*
