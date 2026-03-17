# ✈ Airport Monitor

> Monitor de estado de aeropuertos y vuelos en tiempo real — con alertas por WhatsApp, clima, timeline de viaje y gestión de itinerarios personales.

**Stack:** Next.js 14 · TypeScript · Tailwind CSS · FAA ASWS API · Open-Meteo · n8n · WhatsApp Cloud API

---

## ¿Qué es Airport Monitor?

Airport Monitor es una aplicación web (PWA instalable) que transforma el caos de monitorear vuelos en algo simple, proactivo y centralizado. En lugar de revisar cinco apps distintas el día del vuelo, Airport Monitor te dice exactamente qué está pasando en cada aeropuerto de tu viaje, cuánto tiempo tenés antes de cada vuelo, si hay demoras que puedan afectar tus conexiones, y te manda un resumen por **WhatsApp** sin que tengas que abrir ninguna app.

**Diferenciador clave vs. la competencia:** Es la única solución que combina monitoreo de aeropuertos en tiempo real (FAA oficial) + gestión de itinerarios personales + alertas por WhatsApp en una sola app web, sin costo, sin cuenta requerida, sin paywalls.

---

## Inicio rápido

```bash
npm install
npm run dev
# Abrir http://localhost:3000
```

---

## Features implementados

### Monitoreo de aeropuertos
- **Estado FAA en tiempo real** vía proxy server-side (`/api/faa-status`) — datos oficiales del gobierno USA
- **8 niveles de severidad** con colores: Normal → Demora leve → Moderada → Severa → Ground Delay → Ground Stop → Closure
- **Auto-refresh configurable** (5 / 10 / 15 / 30 min) con countdown visual y barra de progreso
- **Detección de cambios** con flash visual (glow azul 4s) y toast de notificación
- **Detección de datos obsoletos** — alerta cuando hay 2+ errores consecutivos
- **32 aeropuertos** disponibles: 30 USA + EZE (Argentina) + GCM (Cayman Islands), con lat/lng e ICAO

### Gestión de viajes
- **Tabs de viaje dinámicos** — creá múltiples viajes, renombralos, eliminá vuelos individuales
- **Formulario de vuelos** — código de vuelo (IATA/ICAO), origen, destino, fecha, hora de salida, buffer de llegada al aeropuerto
- **Countdown por vuelo** — Verde (>7 días), Amarillo (1-7 días), Rojo pulsante (HOY), Gris (completado)
- **Timeline visual** de vuelos ordenados cronológicamente
- **Validación de aerolínea** — 40+ aerolíneas (US majors, regionals, LATAM, Europa, Medio Oriente)

### Clima integrado
- **Open-Meteo API** (gratuita, sin key) en cada tarjeta de aeropuerto
- **38 códigos WMO** con traducción ES/EN y emoji representativo
- **Cache 10 minutos** por aeropuerto — batch requests para todos los aeropuertos del viaje

### Exportación y compartir
- **Exportar a calendario** — genera `.ics` descargable con todos los vuelos del viaje
- **Google Calendar** — link directo para agregar cada vuelo
- **Compartir por WhatsApp** — genera mensaje formateado con todos los vuelos del viaje + link wa.me

### Notificaciones
- **Web Notifications API** — push nativo del browser con permiso del usuario
- **WhatsApp via n8n** — resumen automático cada 12h con estado de aeropuertos + vuelos

### Experiencia de usuario
- **Bilingüe ES/EN** — 200+ strings traducidos, formato de fecha/hora por locale
- **PWA instalable** — funciona como app nativa en mobile y desktop
- **Dark mode** — tema oscuro optimizado para uso en aeropuertos
- **Búsqueda de aeropuertos** — por código IATA, nombre o ciudad

---

## Roadmap — Próximas mejoras

> Las funcionalidades marcadas con `[ ]` están pendientes de implementación. Se irán completando progresivamente.

### Fase 1 — Solidificar la base (deuda técnica + quick wins)

- [ ] **Vuelos editables en "Mis vuelos"** — reemplazar el panel hardcodeado por formulario dinámico igual a TripPanel
- [ ] **Persistir vuelos rastreados** — guardar FlightSearch tracked en localStorage para que sobrevivan recarga
- [ ] **Tipar parseo XML** — eliminar `any` en `lib/faa.ts` y definir interfaces para la estructura FAA
- [ ] **Tests unitarios** — cubrir `parseXML`, `parseFlightCode`, `classifyDelay`, `translateReason`, `translateTrend`
- [ ] **Sincronizar n8n con lib/faa.ts** — el workflow n8n tiene lógica duplicada; extraer a función compartida

### Fase 2 — Diferenciación crítica (features que nadie ofrece)

- [ ] **Análisis de riesgo de conexión en cascada** — si vuelo A tiene demora X minutos, calcular si alcanzás el vuelo B con la escala actual. Alerta visual "CONEXIÓN EN RIESGO" con tiempo restante
- [ ] **"¿Dónde está mi avión?"** — rastrear el avión entrante que operará tu vuelo (FlightAware deep link + AviationStack API)
- [ ] **Predicción de demoras por ML** — usar datos históricos FAA + condiciones climáticas actuales para predecir si habrá demoras antes de que la FAA las anuncie oficialmente
- [ ] **Cobertura internacional ampliada** — agregar APIs de aeropuertos no-USA: ANAC (Argentina), Eurocontrol (Europa), Cayman Airports Authority, para dar estado real a GCM, EZE, y otros aeropuertos LATAM
- [ ] **Score de riesgo por viaje** — índice 0-100 calculado a partir de: demoras históricas del aeropuerto, condiciones climáticas, volumen de tráfico, hora del día. Visible en el tab del viaje

### Fase 3 — Experiencia día-de-vuelo

- [ ] **"Salí ahora" inteligente** — calculadora que combina tiempo de traslado (Google Maps API) + tiempo de seguridad estimado (TSA wait API) + distancia a la puerta + buffer recomendado → "Salí de tu casa a las 14:30"
- [ ] **Integración de número de puerta y terminal** — mostrar puerta de embarque y terminal cuando esté disponible vía API (AviationStack, FlightAware AeroAPI)
- [ ] **Tracker de equipaje** — link directo a la web de la aerolínea para rastrear bolsos + explicación de política de equipaje por aerolínea
- [ ] **Amenidades del aeropuerto** — por aeropuerto: lounges, restaurantes, WiFi, tiempo estimado de seguridad TSA, acceso PreCheck/Global Entry, lockers
- [ ] **Mapa interactivo** — vista Leaflet/Mapbox con todos los aeropuertos monitoreados coloreados según su estado actual
- [ ] **Guía de conexión** — para cada escala del viaje: "Terminal A → Terminal B: 12 min a pie / 5 min tren AirTrain"

### Fase 4 — Notificaciones avanzadas

- [ ] **PWA Push Notifications** — service worker completo para notificaciones background sin tener la app abierta
- [ ] **Telegram Bot** — alternativa a WhatsApp para usuarios que prefieren Telegram
- [ ] **Alertas por email** — digest matutino con estado del día + alertas por cambios críticos
- [ ] **SMS via Twilio** — para zonas con baja conectividad o usuarios sin smartphones
- [ ] **Notificaciones personalizables** — elegir qué eventos disparan alerta: solo Ground Stop, demoras >30min, cualquier cambio, etc.
- [ ] **Horario de silencio** — no molestar entre X y Y hora (configurable)
- [ ] **Alerta temprana** — notificación 3h / 6h / 12h antes de cada vuelo con estado del aeropuerto

### Fase 5 — Datos e historial

- [ ] **Historial de demoras por aeropuerto** — persistir snapshots en IndexedDB, mostrar gráfico de tendencia últimas 24/48/72h
- [ ] **Estadísticas de puntualidad por aerolínea** — integrar datos históricos DOT (Dept. of Transportation USA) para mostrar % on-time por aerolínea y ruta
- [ ] **Ranking de aeropuertos por confiabilidad** — basado en datos históricos FAA: "EWR es el más demorado históricamente en este tipo de clima"
- [ ] **Reporte post-viaje** — al marcar viaje como completado, generar resumen: vuelos con/sin demoras, tiempo total de espera, aerolíneas usadas

### Fase 6 — Viajero frecuente

- [ ] **Importar itinerario por email** — detectar emails de confirmación de vuelo (estilo TripIt) y poblar el trip automáticamente
- [ ] **Importar desde PDF de reserva** — subir PDF de la aerolínea y extraer vuelos automáticamente
- [ ] **Tracker de millas/puntos** — registrar kilómetros volados, programa de fidelidad usado, millas acumuladas por viaje
- [ ] **Documentos de viaje** — guardar passport number, visas, ESTA, seguro de viaje en el perfil del viaje (encriptado)
- [ ] **Sync multi-dispositivo** — opcional vía backend propio o Supabase; actualmente solo localStorage
- [ ] **Viajes compartidos** — página pública del viaje para compartir con familia ("seguí mi vuelo en tiempo real")
- [ ] **Modo tripulación** — vista simplificada para crew members con múltiples vuelos por día

### Fase 7 — Pulido y plataforma

- [ ] **Tema claro / oscuro** — toggle manual + respetar preferencia del sistema (prefers-color-scheme)
- [ ] **Intervalos de refresh personalizados** — input libre (no solo 5/10/15/30)
- [ ] **Alertas por voz** — Web Speech API para leer en voz alta el estado del aeropuerto
- [ ] **Drag-to-reorder** — reordenar vuelos dentro del trip y tabs de viaje
- [ ] **Undo para eliminación** — toast con "Deshacer" al eliminar un vuelo o trip (5 segundos)
- [ ] **Keyboard navigation** — Tab/Arrows/Enter en dropdown de búsqueda
- [ ] **Accesibilidad WCAG AA** — aria-labels, focus management, contraste, screen reader support
- [ ] **Internacionalización extendida** — Portugués (BR), Francés, soporte RTL para árabe/hebreo
- [ ] **App nativa (React Native)** — versión iOS + Android con notificaciones nativas reales

---

## Setup n8n + WhatsApp

### Prerequisitos

#### 1. Cuenta Meta Developer

1. Ir a [developers.facebook.com](https://developers.facebook.com)
2. **Create App** → tipo **Business**
3. **Add Product** → **WhatsApp**

#### 2. Obtener credenciales

En **WhatsApp > Getting Started**:

| Campo | Descripción |
|-------|-------------|
| Phone Number ID | ID del número de envío (para la URL) |
| Temporary Access Token | Token válido 24hs (para testing) |
| Recipient number | Tu número personal en formato `+54911XXXXXXXX` |

```
# Agregar tu número como destinatario de prueba:
WhatsApp > Getting Started > "To" → agregar +54911XXXXXXXX
```

#### 3. Token permanente (producción)

1. **Business Settings** → **System Users** → crear usuario de sistema
2. Asignar permiso `whatsapp_business_messaging`
3. Generar token → copiar y guardar

#### 4. Verificar número propio (producción)

1. **WhatsApp > Phone Numbers** → agregar número
2. Verificar via SMS/llamada
3. Proceso toma 1-2 días hábiles

---

### Setup n8n

#### Variables de entorno

En n8n: **Settings > n8n > Variables**

```
WHATSAPP_PHONE_NUMBER_ID   = 123456789012345
WHATSAPP_ACCESS_TOKEN      = EAAxxxxxxxxxxxxxx
WHATSAPP_RECIPIENT_NUMBER  = 5491112345678   (sin el +)
```

#### Credencial HTTP Header Auth

En n8n: **Credentials > New > Header Auth**

```
Name:  Authorization
Value: Bearer TU_ACCESS_TOKEN_AQUI
```

Nombrar la credencial: `WhatsApp Meta API`

#### Importar workflow

1. En n8n: **Workflows > Import from file**
2. Seleccionar `n8n-airport-monitor-workflow.json`
3. Asignar la credencial `WhatsApp Meta API` a los nodos HTTP de WhatsApp
4. **Activate** el workflow

#### Testear manualmente

Clic en **Execute Workflow** → verificar que llega el mensaje.

---

### Formato del mensaje WhatsApp

```
✈️ Airport Monitor — 16/03 08:00 (ARG)

⚠️ 2 aeropuerto(s) con problemas:

🔴 EWR
   Demora: 46-60 min
   Causa: WEATHER / LOW CEILINGS
   Tendencia: Increasing

🛑 JFK
   🛑 Ground Stop hasta 09:00
   Causa: WEATHER

✅ OK: MIA · EZE · GCM

─────────────────
🗓️ Mis vuelos:

🟢 29 Mar · AA 900
   EZE → MIA · Sale 20:30

🟢 31 Mar · AA 956
   MIA → GCM · Sale 12:55

_Fuente: FAA · próxima actualización en 12hs_
```

---

## Deploy

### Vercel (recomendado)

```bash
npm run build
vercel --prod
```

### Local

```bash
npm run dev   # http://localhost:3000
```

---

## Fuentes de datos

| API | Uso | Auth | Cobertura |
|-----|-----|------|-----------|
| **FAA ASWS** (`nasstatus.faa.gov`) | Estado aeropuertos USA en tiempo real | Sin key | 500+ aeropuertos USA |
| **Open-Meteo** | Clima actual + condiciones | Sin key | Global |
| **FlightAware** (links) | Deep links de tracking por vuelo | N/A | Global |

---

## Sistema de estados

| Estado | Color | Descripción |
|--------|-------|-------------|
| ✅ Normal | Verde | Sin demoras reportadas |
| 🟡 Demora leve | Amarillo | ≤15 min |
| 🟠 Demora moderada | Naranja | 16–45 min |
| 🔴 Demora severa | Rojo | >45 min |
| 🔴 Ground Delay | Rojo oscuro | Programa de demora en tierra |
| 🛑 Ground Stop | Rojo pulsante | Stop completo activo |
| ⛔ Cerrado | Gris | Aeropuerto cerrado por NOTAM |

---

## Arquitectura

```
app/
├── page.tsx                  Dashboard principal (tabs estáticos + dinámicos)
├── layout.tsx                Root layout, dark mode, LanguageProvider
├── globals.css               Tailwind base + custom animations
└── api/faa-status/route.ts   Proxy server-side → FAA XML (cache CDN 60s)

components/
├── AirportCard.tsx           Card por aeropuerto: estado, clima, flash, remove
├── AirportSearch.tsx         Dropdown búsqueda/agregar aeropuerto
├── TripPanel.tsx             Trip dinámico: form de vuelos + timeline + export
├── MyFlightsPanel.tsx        Panel vuelos estáticos (legacy, reemplazar en Fase 1)
├── FlightSearch.tsx          Búsqueda por código IATA/ICAO + link FlightAware
├── TripTimeline.tsx          Timeline visual cronológico de vuelos
├── GlobalStatusBar.tsx       Barra resumen: verde / naranja / roja
├── RefreshCountdown.tsx      Countdown + barra de progreso
├── StatusBadge.tsx           Badge emoji + color por severidad
└── ErrorBoundary.tsx         Error boundary React

hooks/
├── useAirportStatus.ts       Fetch FAA, parse XML, toasts, flash, re-parse on locale
└── useWeather.ts             Fetch Open-Meteo, cache 10min, batch requests

contexts/
└── LanguageContext.tsx       Provider i18n (ES/EN) con localStorage

lib/
├── airports.ts               32 aeropuertos con lat/lng/icao
├── faa.ts                    parseXML, classifyDelay, generateWhatsAppSummary
├── faaTranslations.ts        translateReason / translateTrend ES/EN (50+ mappings)
├── flightUtils.ts            parseFlightCode, AIRLINES (40+), subtractHours
├── calendarExport.ts         generateICS, buildGoogleCalendarURL, downloadICS
├── tripShare.ts              buildWhatsAppMessage, buildWhatsAppURL
├── i18n.ts                   200+ strings ES/EN
├── types.ts                  DelayStatus, AirportStatus, TripFlight, interfaces
└── utils.ts                  cn() (clsx + tailwind-merge)

n8n-airport-monitor-workflow.json   Workflow listo para importar en n8n
```

---

## Stack completo

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript 5
- **Estilos:** Tailwind CSS 3.4 + clsx + tailwind-merge + Radix UI (Tabs)
- **Iconos:** Lucide React
- **PWA:** @ducanh2912/next-pwa (service worker automático)
- **XML:** fast-xml-parser 4.x
- **Notificaciones UI:** react-hot-toast
- **Workflow:** n8n + Meta WhatsApp Cloud API
