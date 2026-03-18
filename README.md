# TripCopilot ✈

> Monitoreo de vuelos y aeropuertos en tiempo real — con IA para importar itinerarios, análisis de riesgo de conexión, alertas proactivas por WhatsApp y gestión completa de paquetes de viaje.

**Stack:** Next.js 14 · TypeScript · Tailwind CSS · Supabase · Anthropic Claude API · FAA ASWS API · Open-Meteo · n8n · WhatsApp Cloud API

---

## ¿Qué es TripCopilot?

TripCopilot es una PWA (Progressive Web App) instalable que cubre el ciclo completo del viajero frecuente: desde organizar el itinerario hasta saber en tiempo real si hay un problema en tu aeropuerto, cuánto tiempo te queda para llegar, y si vas a perder tu conexión.

**Diferencial vs. la competencia:**
- **IA multimodal**: importá tu itinerario pegando texto o una foto de la confirmación — Claude lo interpreta y arma los vuelos solo
- **Riesgo de conexión automático**: calcula si vas a llegar a tu próximo vuelo considerando demoras FAA reales y MCT (Minimum Connection Time) por aeropuerto
- **Alertas proactivas**: n8n + WhatsApp manda resumen automático cada 12h sin que abras la app
- **Todo en una sola app**: monitoreo FAA + gestión de viajes + clima + SIGMET + TSA wait times + exportar a calendario

---

## Inicio rápido

```bash
npm install
npm run dev
# Abrir http://localhost:3000/app
```

### Variables de entorno requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Anthropic (para importar itinerarios con IA)
ANTHROPIC_API_KEY=

# n8n + WhatsApp (opcional, para alertas automáticas)
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_RECIPIENT_NUMBER=   # sin +, ej: 5491112345678
```

---

## Arquitectura

```
app/
├── page.tsx              → Landing page + login
├── app/
│   └── page.tsx          → Dashboard principal (toda la lógica de estado)
│
api/
├── faa-status/           → Proxy server-side a FAA (evita CORS)
├── parse-flight/         → Claude API — parseo IA de texto/imagen
├── metar/                → Datos METAR meteorológicos
│
components/
├── TripPanel.tsx         → Panel de paquete de viaje (cards, form, validación)
├── TripListView.tsx      → Lista de viajes con risk score
├── ImportFlightsModal.tsx → Modal de importación con IA
├── AirportCard.tsx       → Card de aeropuerto con estado FAA
├── MyFlightsPanel.tsx    → Panel de vuelos estáticos (legacy)
├── TripRiskBadge.tsx     → Score 0-100 visual
├── TripTimeline.tsx      → Timeline visual del itinerario
├── FlightStatusBadge.tsx → Badge de estado de vuelo en vivo
│
hooks/
├── useAirportStatus.ts   → Polling FAA + detección de cambios + notificaciones
├── useUserTrips.ts       → CRUD trips/flights con Supabase
├── useWeather.ts         → Open-Meteo API con cache 10min
├── useTaf.ts             → TAF meteorológico por aeropuerto
├── useSigmet.ts          → SIGMETs activos en ruta
├── useTsaWait.ts         → Tiempos de espera TSA
│
lib/
├── connectionRisk.ts     → Análisis de conexión con MCT database
├── tripRiskScore.ts      → Score 0-100 por viaje
├── faa.ts                → Parseo XML FAA
├── airports.ts           → 32 aeropuertos (30 USA + EZE + GCM)
├── flightUtils.ts        → AIRLINES dict, parseFlightCode, subtractHours
├── importFlights.ts      → Tipos para vuelos importados via IA
│
n8n-airport-monitor-workflow.json  → Workflow listo para importar
```

---

## Features implementados

### Gestión de paquetes de viaje

- **Múltiples paquetes de viaje** — cada usuario puede tener N viajes simultáneos, persistidos en Supabase
- **Draft flow** — el viaje no se guarda en DB hasta que el usuario presiona "Guardar viaje", permitiendo agregar/editar vuelos libremente primero
- **Rename inline** — desde el header del panel o desde el picker mobile
- **Delete con confirmación** — modal que muestra nombre del viaje y cantidad de vuelos antes de eliminar
- **Mobile picker popup** — si hay 1 viaje: navegación directa; si hay 2+: abre picker con lista y gestión (renombrar, eliminar)
- **Desktop tabs** — tabs dinámicos por viaje con rename inline y botón de eliminar
- **Nav bottom mobile (4 items)**: Mi viaje/Mis viajes · Aeropuertos · Vuelos · + Nuevo

### Importación de vuelos con IA

- **Claude Haiku con visión** — acepta texto libre o imagen (JPG/PNG/WEBP hasta 5MB)
- **Interpreta confirmaciones** de email, boarding passes, screenshots de itinerario
- **Extrae automáticamente**: código de vuelo, aerolínea, origen, destino, fecha, hora
- **Endpoint**: `POST /api/parse-flight` con `{ text?, imageBase64?, mimeType? }`

### Validación al agregar vuelos

- **Hard block**: mismo código de vuelo + misma fecha → error inline, no se puede agregar
- **Soft warning popup**: < 90 min de diferencia entre vuelos en el mismo día → modal de confirmación con opción de forzar
- **Validaciones de formulario**: código IATA/ICAO válido, aerolínea reconocida (40+), aeropuerto IATA válido, fechas, mismo origen/destino

### Monitoreo FAA en tiempo real

- **FAA ASWS API** — datos oficiales gobierno USA, sin key requerida
- **8 niveles de severidad**: Normal · Demora leve (≤15min) · Moderada (16-45min) · Severa (>45min) · Ground Delay · Ground Stop · Closure · Desconocido
- **Auto-refresh configurable** (5/10/15/30 min) con countdown visual
- **Detección de cambios** con flash visual (4s) + toast + push notification
- **Proxy server-side** `/api/faa-status` para evitar CORS del browser
- **32 aeropuertos** disponibles: JFK, LAX, MIA, ORD, DFW, ATL, SEA, SFO, DEN, BOS, EWR, LGA, IAD, IAH, PHX, MCO, MSP, DTW, PHL, CLT, FLL, BWI, SAN, TPA, MDW, PDX, HNL, ANC, SLC, STL + EZE + GCM

### Riesgo de conexión automático

- **MCT database** — Minimum Connection Time para 30+ aeropuertos USA (doméstico vs. internacional)
- **Calcula buffer efectivo** = tiempo entre vuelos − demora FAA actual
- **4 niveles de riesgo**: safe · tight · at\_risk · missed
- **Banner visual** en cada tarjeta cuando hay riesgo, con links a vuelos alternativos (Google Flights, Kayak)
- **Score 0-100 por viaje** combinando: estado de aeropuertos + riesgo de conexión + día de la semana + urgencia temporal

### Clima e información meteorológica

- **Open-Meteo API** (gratuita, sin key) — temperatura, descripción, emoji por aeropuerto
- **TAF** (Terminal Aerodrome Forecast) — pronóstico meteorológico de aviación por aeropuerto de salida
- **SIGMET** — alertas meteorológicas severas activas en la ruta del vuelo
- **Cache 10 minutos** — batch requests para todos los aeropuertos del viaje

### Información operacional por vuelo

- **TSA wait times** — tiempo promedio de espera en seguridad por aeropuerto
- **Check-in reminder** — banner el día anterior al vuelo con link directo a la app de la aerolínea
- **Live tracking** — deep links a FlightAware para rastrear el vuelo y el avión entrante
- **Puerta/Terminal** — información de gate con guía de cuándo se asigna
- **FlightStatusBadge** — estado del vuelo en tiempo real

### Exportación y compartir

- **Exportar `.ics`** — archivo de calendario con todos los vuelos del viaje
- **Google Calendar** — link directo por vuelo para agregar al calendario
- **Compartir por WhatsApp** — genera mensaje formateado completo con todos los vuelos + horarios
- **Copiar link** — URL compartible del itinerario

### Notificaciones y alertas

- **Web Notifications API** — push nativo del browser con permiso del usuario
- **Service Worker (PWA)** — notificaciones en lock screen cuando la app está en background (Android)
- **n8n + WhatsApp** — resumen automático cada 12h con estado FAA + impacto en vuelos

### Experiencia de usuario

- **Bilingüe ES/EN** — 200+ strings traducidos, selector de idioma persistido
- **PWA instalable** — funciona como app nativa en mobile y desktop sin app store
- **Dark mode nativo** — tema oscuro optimizado para uso en aeropuertos
- **Mobile-first** — nav bottom fija, cards optimizadas para pantallas pequeñas
- **Autenticación** — login/signup con Supabase Auth, datos persistidos por usuario

---

## Base de datos (Supabase)

```sql
-- Trips: paquetes de viaje por usuario
trips (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
)

-- Flights: vuelos dentro de cada trip
flights (
  id uuid PRIMARY KEY,
  trip_id uuid REFERENCES trips ON DELETE CASCADE,
  flight_code text,       -- "AA900"
  airline_code text,      -- "AA"
  airline_name text,      -- "American Airlines"
  airline_icao text,      -- "AAL"
  flight_number text,     -- "900"
  origin_code text,       -- "EZE"
  destination_code text,  -- "MIA"
  iso_date text,          -- "2026-03-29"
  departure_time text,    -- "20:30"
  arrival_buffer numeric, -- horas: 1, 1.5, 2, 2.5, 3
  sort_order integer
)

-- Watched airports: aeropuertos monitoreados por usuario
watched_airports (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  iata text NOT NULL
)
```

---

## n8n — Alertas automáticas por WhatsApp

Importar `n8n-airport-monitor-workflow.json` en n8n self-hosted o cloud.

**Credenciales requeridas en n8n:**

| Variable | Descripción |
|----------|-------------|
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número en Meta Business |
| Header Auth "WhatsApp Meta API" | Bearer token de la API de Meta |
| `WHATSAPP_RECIPIENT_NUMBER` | Número destino sin + (ej: 5491112345678) |

**Flujo del workflow:**
1. Trigger cada 12 horas
2. Fetch a FAA ASWS API
3. Parseo XML — detecta demoras, ground stops, closures
4. Filtra por aeropuertos del itinerario
5. Si `hasProblems === true` → envía mensaje formateado por WhatsApp

> **Pendiente**: el workflow tiene aeropuertos hardcodeados. Conectar con DB para que se actualice automáticamente según los viajes de cada usuario.

---

## Próximas mejoras

### Prioridad alta
- [ ] **Sincronizar n8n con viajes dinámicos** — webhook app → n8n cuando el usuario agrega/elimina un aeropuerto o viaje
- [ ] **Web Push con VAPID** — push desde servidor cuando la app está completamente cerrada
- [ ] **Cobertura internacional** — APIs de aeropuertos no-USA (ANAC Argentina, Eurocontrol Europa)

### Prioridad media
- [ ] **"Salí ahora" inteligente** — combina traslado (Maps API) + TSA wait + buffer → "Salí de tu casa a las 14:30"
- [ ] **Historial y patrones** — "este vuelo llega tarde el 60% de las veces los lunes"
- [ ] **Compartir viaje con acompañantes** — múltiples usuarios en el mismo paquete de viaje
- [ ] **Telegram Bot** — alternativa a WhatsApp para usuarios que prefieren Telegram

### Prioridad baja
- [ ] **Tests unitarios** — cubrir `parseFlightCode`, `classifyDelay`, `connectionRisk`, `tripRiskScore`
- [ ] **Mapa interactivo** — aeropuertos coloreados según estado FAA en Leaflet/Mapbox
- [ ] **Amenidades del aeropuerto** — lounges, WiFi, PreCheck/Global Entry por aeropuerto
