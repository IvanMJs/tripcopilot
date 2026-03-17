# Airport Monitor — Roadmap y tareas pendientes

## Resumen del producto

App Next.js 14 (App Router) para monitorear estado de aeropuertos en tiempo real usando la API FAA ASWS, con gestión de itinerarios personales, clima integrado, alertas por WhatsApp via n8n, exportación a calendario y soporte bilingüe ES/EN.

**Objetivo:** Convertirse en la herramienta indispensable del viajero frecuente entre LATAM y USA — la única que combina monitoreo oficial FAA + itinerario personal + alertas por WhatsApp en una sola app web, sin costo ni cuenta.

---

## ✅ Completado

### Core
- [x] Monitor FAA en tiempo real con proxy API (`/api/faa-status`) y cache CDN (60s)
- [x] 8 niveles de severidad con colores: ok → closure
- [x] Auto-refresh configurable (5/10/15/30 min) con countdown y barra de progreso
- [x] Detección de cambios con flash visual (glow azul 4s) + toast
- [x] Detección de datos obsoletos (stale warning con 2+ errores consecutivos)
- [x] 32 aeropuertos (30 USA + EZE + GCM) con lat/lng e ICAO
- [x] Búsqueda y gestión de aeropuertos con persistencia localStorage

### Vuelos y viajes
- [x] Tabs de viaje dinámicos: crear, renombrar (✏️), eliminar (×), persistencia localStorage
- [x] Formulario de vuelos: código, origen, destino, fecha, hora salida, buffer llegada aeropuerto
- [x] Countdown por vuelo: verde >7d, amarillo 1-7d, rojo HOY (pulsante), gris completado
- [x] Timeline visual cronológico de vuelos por trip
- [x] Validación de código de vuelo: IATA (2-char), ICAO (3-char), numéricos (9E)
- [x] Base de 40+ aerolíneas: US majors, regionals, LATAM, Europa, Medio Oriente

### Clima
- [x] Open-Meteo API sin key en cada tarjeta de aeropuerto
- [x] 38 códigos WMO con traducción ES/EN y emoji
- [x] Cache 10 minutos + batch requests por viaje

### Exportación y compartir
- [x] Exportar a .ics (iCalendar) con todos los vuelos del trip
- [x] Link de Google Calendar por vuelo
- [x] Compartir trip por WhatsApp (mensaje formateado + wa.me link)

### Notificaciones
- [x] Web Notifications API con permiso del usuario
- [x] Workflow n8n → WhatsApp: resumen automático cada 12h (aeropuertos + vuelos)
- [x] Lógica condicional: mensaje detallado si hay problemas, corto si todo OK

### UX / i18n
- [x] Bilingüe ES/EN con 200+ strings y LanguageContext + localStorage
- [x] Re-parse XML al cambiar idioma (sin re-fetch)
- [x] Formato de hora/fecha dinámico por locale
- [x] 50+ traducciones de razones y tendencias FAA (faaTranslations.ts)
- [x] Keys estables en listas React (flightNum-isoDate)
- [x] Toast de error de timeout internacionalizado
- [x] PWA instalable (@ducanh2912/next-pwa)

---

## Pendiente

---

### FASE 1 — Solidificar la base
> Deuda técnica, bugs y mejoras de calidad interna. Sin estas, escalar es arriesgado.

- [ ] **Vuelos editables en MyFlightsPanel** — reemplazar `MY_FLIGHTS` hardcodeado por formulario dinámico igual a TripPanel, con persistencia localStorage
  - Archivos: `components/MyFlightsPanel.tsx`, `lib/types.ts`
  - Impacto: La app se vuelve reutilizable para cualquier persona y cualquier viaje

- [ ] **Persistir vuelos rastreados en FlightSearch** — guardar array `tracked` en localStorage (`airport-monitor-tracked-flights`)
  - Archivo: `components/FlightSearch.tsx`
  - Impacto: Vuelos rastreados sobreviven recarga y cambio de tab

- [ ] **Tipar parseo XML (eliminar `any`)** — definir interfaces TypeScript para la estructura XML de FAA en `lib/faa.ts`
  - Afecta: líneas ~41, 52, 79, 103, 118, 159 con cast `as any`
  - Impacto: Autocompletado correcto, menos bugs silenciosos en parseo

- [ ] **Tests unitarios** — setup con Vitest/Jest + tests para:
  - `parseXML` (demoras, ground stops, closures, aeropuerto ausente)
  - `parseTimeToMinutes` ("1 hour and 42 minutes" → 102)
  - `classifyDelay` (por minutos → DelayStatus)
  - `translateReason` / `translateTrend` en ES y EN
  - `parseFlightCode` (IATA, ICAO, numéricos, inválidos)
  - Impacto: Confianza en refactors, regresiones detectadas automáticamente

- [ ] **Sincronizar lógica n8n con lib/faa.ts** — el workflow n8n tiene su propio parseo XML duplicado; extraer `generateWhatsAppSummary()` a un endpoint que n8n pueda llamar o documentar el contrato
  - Archivo: `n8n-airport-monitor-workflow.json`
  - Impacto: Evitar divergencia silenciosa entre mensajes WhatsApp y UI

- [ ] **Error boundary mejorado** — mostrar botón "Reintentar" cuando hay errores de fetch en lugar de solo el mensaje de error
  - Archivo: `components/ErrorBoundary.tsx`, `hooks/useAirportStatus.ts`

---

### FASE 2 — Diferenciación crítica
> Las features que ningún competidor ofrece. Alto impacto, convierte la app en indispensable.

- [x] **Análisis de riesgo de conexión en cascada**
  - Si vuelo A tiene demora X min y la escala es Y min → calcular si la conexión es viable
  - Mostrar badge "⚠️ CONEXIÓN EN RIESGO" en el vuelo de escala cuando el buffer es insuficiente
  - Considerar: tiempo mínimo de conexión por aeropuerto (MCT), terminales diferentes (+15 min), aduana internacional (+45 min)
  - Impacto: Feature exclusivo que ninguna app web ofrece. El viajero ve el problema antes de estar en el aeropuerto

- [x] **"¿Dónde está mi avión?" — tracking del avión entrante**
  - Para cada vuelo del trip, obtener la matrícula del avión que operará el vuelo (viene del vuelo anterior)
  - Mostrar si el avión ya está en camino, cuánto tarda en llegar, de dónde viene
  - Deep link a FlightAware con tail number cuando esté disponible
  - Impacto: Permite anticipar demoras 2-3h antes de que la aerolínea las anuncie

- [x] **Cobertura internacional ampliada**
  - Integrar estado de aeropuertos argentinos (ANAC / Aeropuertos Argentina 2000 API o scraping)
  - Integrar estado de aeropuertos europeos (Eurocontrol CFMU API — gratuita para consultas básicas)
  - Integrar Cayman Islands Airport Authority para GCM
  - Expandir catálogo de aeropuertos: agregar principales LATAM (BOG, LIM, SCL, GRU, GIG, MVD, UIO, PTY)
  - Impacto: Diferenciador enorme — ninguna app cubre LATAM bien. Audiencia desatendida

- [x] **Score de riesgo por viaje**
  - Índice 0–100 calculado por: demoras actuales en aeropuertos del viaje + clima en ruta + hora pico + día de semana
  - Mostrado como "Riesgo del viaje: BAJO / MEDIO / ALTO" con color en el tab del trip
  - Impacto: Una sola mirada dice si hay que preocuparse o no

- [x] **Importar itinerario desde texto/email** — modal con parser inteligente (texto libre, AA900 EZE MIA 29MAR 20:30, confirmaciones de aerolíneas)
- [ ] **API real de vuelos (AviationStack free tier)**
  - AviationStack ofrece 100 req/mes gratis — suficiente para los vuelos personales del usuario
  - ⚠️ Free tier usa HTTP (no HTTPS) — hacer fetch server-side vía proxy `/api/flight-status/[code]` para no exponer datos
  - Integrar para obtener: gate, terminal, número de cola del avión, status oficial de la aerolínea
  - Mostrar en TripPanel como "Estado real del vuelo" separado del estado del aeropuerto
  - Impacto: Pasás de "estado del aeropuerto" a "estado de MI vuelo"

- [x] **Re-routing con 1 tap cuando conexión en riesgo**
  - Cuando `ConnectionRisk` es `at_risk` o `missed`: mostrar botón "Buscar alternativas →"
  - Construir URL: Google Flights deep link con `origin`, `destination`, `date` ya disponibles en `TripFlight`
  - También links a Kayak y Skyscanner como alternativas
  - Esfuerzo: ~30 minutos — solo construcción de URL, sin APIs
  - Impacto: Cierra el loop "problema detectado → acción tomada". La feature de re-routing que Flighty cobra.

---

### FASE 3 — Experiencia día-de-vuelo
> Features para el día del vuelo. Reducen el estrés y hacen la app indispensable en el aeropuerto.

- [ ] **"Salí de casa ahora" inteligente**
  - Input: dirección de origen del usuario (guardada en preferencias)
  - Cálculo: tiempo de traslado (Google Maps Platform Distance Matrix, ~$0.005/req) + tiempo de seguridad estimado por aeropuerto + buffer buffer recomendado (90 min doméstico, 2.5h internacional)
  - Output: "Para tu vuelo AA900 a las 20:30, salí de casa a las **17:45**"
  - Impacto: El feature más pedido por viajeros frecuentes según encuestas de mercado

- [ ] **Tiempos de seguridad TSA**
  - Integrar TSA Wait Times API (pública, sin key) para aeropuertos USA
  - Mostrar tiempo promedio de espera actual en el airport card
  - Distinguir PreCheck vs. línea regular
  - Impacto: Información de altísimo valor el día del vuelo

- [ ] **Guía de conexión entre terminales**
  - Para cada escala del viaje, mostrar: terminales de llegada y salida, tiempo estimado de caminata o tren inter-terminal
  - Datos: hardcodeados para los 15 aeropuertos más usados (JFK, MIA, ORD, ATL, LAX, DFW, etc.)
  - Impacto: Evita el pánico al llegar a JFK y no saber cómo ir de T4 a T1

- [ ] **Pronóstico 5 días en destino (hora de llegada)**
  - Open-Meteo ya integrado — agregar endpoint `/forecast` con `hourly=temperature_2m,weathercode`
  - Para cada vuelo del trip: mostrar clima en el destino exactamente a la hora de llegada estimada
  - "Cuando aterrices en JFK el 29 Mar a las 18:00: 2°C, nublado → llevá abrigo"
  - Esfuerzo: ~1 hora (cambio en `useWeather.ts` + UI en TripPanel)
  - Impacto: Llenar el gap entre "app de clima" y "app de viaje". Nadie hace esto gratis.

- [ ] **Tiempos de espera TSA en tiempo real**
  - API pública sin key: `https://www.tsawaittimes.com` o datos directos de TSA
  - Mostrar en AirportCard para aeropuertos USA: "Seguridad: 12 min (PreCheck: 4 min)"
  - Cache 15 minutos
  - Impacto: Altísimo el día del vuelo. Combinado con "¿A qué hora salgo?" → plan de salida completo.

- [ ] **Amenidades por aeropuerto**
  - Para cada aeropuerto del viaje: lounges disponibles, restaurantes 24h, WiFi gratuito, charging stations
  - Datos iniciales de GateGuru o fuentes abiertas; expandir progresivamente
  - Impacto: La app se convierte en guía de aeropuerto, no solo monitor de estado

- [ ] **Mapa interactivo**
  - Vista Leaflet (libre, sin costo) con todos los aeropuertos monitoreados
  - Pins coloreados según estado actual: verde / amarillo / naranja / rojo / gris
  - Click en pin → abre Airport Card flotante
  - Las coordenadas ya existen en `lib/airports.ts`
  - Impacto: Vista visual del estado nacional de un solo vistazo

- [ ] **Notificación de check-in**
  - Alerta automática 24h antes de cada vuelo doméstico y 48h para internacionales
  - Deep link directo a la web de check-in de cada aerolínea (mapeado por código IATA)
  - Impacto: Elimina el olvido de check-in, especialmente en viajes multi-escala

---

### FASE 4 — Notificaciones avanzadas
> Ampliar canales de alerta más allá de WhatsApp y browser push.

- [ ] **PWA Push Notifications completas**
  - Implementar `ServiceWorkerRegistration.showNotification()` para notificaciones en background
  - El service worker de next-pwa ya está configurado — falta conectar el Web Push API
  - Impacto: Notificaciones reales sin tener la app abierta (igual que una app nativa)

- [ ] **Alertas por email**
  - Integrar con SendGrid o Resend (plan gratuito: 100 emails/día) via n8n
  - Opciones: digest matutino diario + alertas críticas inmediatas (Ground Stop, closure)
  - Template HTML con los mismos datos que el mensaje WhatsApp
  - Impacto: Canal adicional, útil para usuarios corporativos y viajeros internacionales

- [ ] **Telegram Bot**
  - Crear bot con BotFather → integrar en n8n como nodo adicional
  - Misma lógica que WhatsApp pero para usuarios que prefieren Telegram
  - Impacto: Ampliar audiencia, Telegram es dominante en LATAM y Europa del Este

- [ ] **Notificaciones configurables por tipo**
  - UI de preferencias: checkboxes para qué eventos notifican (Ground Stop, demora >30min, cualquier cambio, solo mis aeropuertos de viaje)
  - Horario de silencio (no molestar entre X y Y hora)
  - Impacto: Reduce notificaciones irrelevantes → mayor apertura de alertas reales

- [ ] **Alerta temprana pre-vuelo**
  - Notificación automática X horas antes de cada vuelo con estado del aeropuerto de salida
  - Configurable: 3h / 6h / 12h / 24h antes
  - Incluir: estado del aeropuerto, clima, si hay algún riesgo identificado
  - Impacto: La app llega al usuario antes de que el usuario vaya a la app

---

### FASE 5 — Datos e historial
> Convertir la app en fuente de inteligencia, no solo de información.

- [ ] **Historial de demoras por aeropuerto**
  - Guardar snapshots del `statusMap` en IndexedDB cada vez que hay un cambio de estado
  - Mostrar mini-chart (sparkline) de últimas 24/48/72h en cada airport card
  - Impacto: "JFK lleva 3h con Ground Delay" → visibilidad de tendencias que la FAA no muestra

- [ ] **Estadísticas de puntualidad por aerolínea**
  - Integrar datos históricos DOT (Dept. of Transportation) — disponibles vía BTS API gratuita
  - Mostrar % on-time por aerolínea en el formulario de vuelo al ingresar el código
  - Impacto: "AA tiene 78% on-time en esta ruta" → información de decisión en el momento de agendar

- [ ] **Ranking de aeropuertos por confiabilidad**
  - Basado en data histórica FAA + DOT: ranking de aeropuertos más demorados por época del año, clima típico, horas pico
  - Widget en airport card: "EWR históricamente tiene 40% más demoras en invierno"
  - Impacto: Contexto que ningún competidor da en forma gratuita

- [ ] **Reporte post-viaje**
  - Al marcar un trip como completado: generar PDF/pantalla con estadísticas del viaje
  - Contenido: vuelos con/sin demora, demoras acumuladas en minutos, aerolíneas usadas, distancia total volada
  - Compartible como imagen o PDF
  - Impacto: Feature viral — viajeros frecuentes adoran compartir estadísticas de sus viajes

---

### FASE 6 — Viajero frecuente
> Features para convertir usuarios casuales en usuarios power.

- [ ] **Importar itinerario desde email**
  - Detectar y parsear emails de confirmación de vuelo de aerolíneas principales (AA, UA, DL, B6, LA, AR)
  - Poblar el trip automáticamente (igual a TripIt pero sin depender de su plataforma)
  - Integración vía Gmail API con OAuth o lectura de texto pegado (patrón regex)
  - Impacto: Elimina la fricción de entrada manual de vuelos — el mayor bloqueador de adopción

- [ ] **Importar desde PDF de reserva**
  - Subir PDF de la aerolínea → extraer vuelos con NLP/regex
  - Funciona offline con pdf.js
  - Impacto: Alternativa a email forwarding para usuarios que guardan PDFs

- [ ] **Tracker de millas y puntos de fidelidad**
  - Registrar por vuelo: programa de fidelidad, millas acumuladas, categoría de boleto
  - Mostrar total de millas del viaje y acumulado anual
  - Impacto: Monetizable como integración con ThePointsGuy o similar

- [ ] **Documentos del viaje**
  - Guardar en el trip: número de pasaporte, fecha de vencimiento, visa, ESTA, seguro de viaje
  - Encriptado en localStorage con password derivado (PBKDF2 + AES-GCM)
  - Alerta si documentos vencen antes del viaje
  - Impacto: Todo lo del viaje en un solo lugar

- [ ] **Sync multi-dispositivo**
  - Backend opcional vía Supabase (PostgreSQL + Auth gratis hasta 50k rows)
  - Trips, vuelos y preferencias sincronizados entre devices
  - La app sigue funcionando 100% sin backend (localStorage fallback)
  - Impacto: Convierte la app en herramienta seria para viajeros frecuentes

- [ ] **Viaje compartido (página pública)**
  - Cada trip puede generar una URL pública: `/trip/[shareId]`
  - La familia puede ver en tiempo real el estado de cada vuelo sin instalar nada
  - Read-only, sin login requerido para el espectador
  - Impacto: Feature social viral — cada usuario comparte con 3-5 contactos por viaje

---

### FASE 7 — Pulido y plataforma
> Calidad de producto, accesibilidad y alcance de plataforma.

- [ ] **Tema claro / oscuro con toggle manual** — respetar `prefers-color-scheme` por defecto, toggle en header para override
- [ ] **Intervalo de refresh personalizado** — input libre además de las opciones fijas (5/10/15/30)
- [ ] **Alertas por voz** — Web Speech API para leer estado de aeropuertos en voz alta (útil en el auto)
- [ ] **Drag-to-reorder** — vuelos dentro del trip (react-beautiful-dnd o nativo HTML5 drag API)
- [ ] **Undo al eliminar** — toast con "Deshacer" (5s) al eliminar vuelo o trip completo
- [ ] **Keyboard navigation en search** — Tab/Arrows/Enter en el dropdown de aeropuertos
- [ ] **Accesibilidad WCAG AA** — aria-labels en todos los controles interactivos, focus management, contraste mínimo 4.5:1, screen reader testing
- [ ] **Português (BR)** — traducción completa para mercado brasileño (mayor mercado de aviación LATAM)
- [ ] **Soporte RTL** — para futuro soporte árabe / hebreo
- [ ] **App nativa iOS + Android** — React Native (Expo) usando la misma lógica de `lib/` compartida
- [ ] **Onboarding para usuarios nuevos** — tour guiado de 3 pasos al primer uso (agregar aeropuerto → crear viaje → activar notificaciones)

---

### FASE 8 — Cobertura global + datos aviation-grade
> Ampliar la app de "monitor USA" a "herramienta de aviación global". Usar APIs gratuitas que los pilotos ya usan.

#### 8a. Aviation Weather Center (AWC/NOAA) — sin key, global, oficial
- [x] **METARs aviation-grade en AirportCard**
  - Endpoint: `https://aviationweather.gov/api/data/?datatype=metar&ids={ICAO}&format=json`
  - Proxy: `/api/aviation-weather` (sin exponer AWC al browser)
  - Hook: `hooks/useMetar.ts` — mapeo IATA→ICAO, cache 5min, falla silenciosa
  - Muestra: badge VFR/MVFR/IFR/LIFR + viento (dirección/kt G kt) + vis si <5SM + techo si <3000ft
  - Impacto: Datos que usan los pilotos. Nadie más muestra esto en una app de viajero

- [x] **TAFs en TripPanel (pronóstico 24h aviation)**
  - Para cada aeropuerto del viaje: mostrar TAF vigente con hora de inicio y fin de cada período
  - Ejemplo: "Ventisca prevista entre 14:00–20:00 UTC en JFK"
  - Impacto: Anticipar condiciones antes de que la FAA emita advisory

- [x] **SIGMETs activos en ruta**
  - Endpoint: `https://aviationweather.gov/api/data/?datatype=sigmet&format=json`
  - Para cada vuelo del trip: verificar si la región de la ruta tiene SIGMET activo (convective, turbulence, icing, volcanic ash)
  - Mostrar badge "⚡ SIGMET activo en ruta" en el vuelo afectado con descripción
  - Impacto: Feature que ningún app de viajero tiene. Los pilotos lo consultan antes de cada vuelo.

- [ ] **PIREPs — reportes de pilotos en tiempo real**
  - Endpoint: `https://aviationweather.gov/api/data/?datatype=pirep`
  - Mostrar reportes de turbulencia, icing o condiciones adversas cerca de los aeropuertos del viaje
  - Impacto: Información de primera mano de pilotos que acaban de volar esa ruta

#### 8b. OpenSky Network — gratis con registro, global ADS-B
- [ ] **"¿Dónde está mi avión?" con posición real**
  - API: `https://opensky-network.org/api/states/all?icao24={hex}`
  - Dado el número de cola del avión inbound → mostrar posición actual, altitud, velocidad, ETA
  - Proxy server-side para no exponer credenciales
  - Impacto: Anticipar demoras 2-3h antes de que la aerolínea las anuncie oficialmente

- [ ] **Board de salidas/llegadas por aeropuerto**
  - API: `https://opensky-network.org/api/flights/arrival?airport={ICAO}&begin=...&end=...`
  - Para cada aeropuerto vigilado: mostrar próximos 10 vuelos con callsign, origen/destino, hora estimada
  - Impacto: Vista de "board de aeropuerto" virtual. Feature pedidísimo por usuarios

- [ ] **Mapa interactivo con rutas y posiciones**
  - Leaflet (libre) + coordenadas ya en `lib/airports.ts` + posiciones OpenSky
  - Pins coloreados por estado FAA: verde/amarillo/naranja/rojo
  - Líneas de ruta del viaje dibujadas como arcos sobre el mapa
  - Click en pin → AirportCard flotante
  - Impacto: Una imagen que lo dice todo — el estado de todos los aeropuertos de un vistazo

#### 8c. Cobertura global de aeropuertos
- [ ] **Catálogo expandido con OurAirports (75k aeropuertos)**
  - Fuente: `ourairports.com/data/airports.csv` (descarga estática, actualización periódica)
  - Parsear y incluir en `lib/airports.ts` los principales 500 aeropuertos mundiales con IATA/ICAO/lat/lng/country
  - Impacto: Permite agregar cualquier aeropuerto del mundo a la watch list

- [ ] **Estado de aeropuertos europeos via Eurocontrol SWIM**
  - URL: `https://swim.eurocontrol.int` (registro gratuito)
  - NM B2B web services: REGULATIONS activas (equivalente europeo al Ground Delay Program de FAA)
  - Aeropuertos cubiertos: los 50+ aeropuertos europeos con restricciones de flujo
  - Impacto: Primera app de viajero en combinar FAA (USA) + Eurocontrol (Europa) en una sola vista

- [ ] **REDEMET para aeropuertos brasileños**
  - API: `https://api.redemet.aer.mil.br/aerodromos/status/{ICAO}` (registro gratuito)
  - Cobertura: SBGR (GRU), SBKP, SBBR, SBGL (GIG), SBSV, SBCF y 200+ más
  - Impacto: Brasil es el mercado de aviación más grande de LATAM — 220M de habitantes sin cobertura actualmente

- [ ] **Ampliar LATAM a 50+ aeropuertos**
  - Agregar aeropuertos principales de cada país LATAM usando OurAirports
  - BOG/SKBO, LIM/SPJC, SCL/SCEL, GRU/SBGR, MVD/SUAA, CCS/SVMI, GYE/SEGU, ASU/SGAS
  - Estado: mostrar METAR vía AWC (disponible para todos) + badge "datos FAA no disponibles"
  - Impacto: La única app de vuelos que cubre bien LATAM

#### 8d. Features de viajero global
- [ ] **Zonas horarias en TripPanel**
  - Para cada vuelo: mostrar hora de salida en zona horaria del aeropuerto origen + hora de llegada en zona del destino
  - Usar `Intl.DateTimeFormat` con timezone IANA (ej: `America/New_York`, `America/Argentina/Buenos_Aires`)
  - Impacto: El error de timezone es el más común en viajes internacionales

- [ ] **Requisitos de entrada por país**
  - Para cada vuelo internacional: mostrar visa, ESTA, ETA, vacunas requeridas
  - Fuente inicial: tabla hardcodeada para los 20 países más volados (USA, Argentina, Brasil, etc.) — actualizable
  - Impacto: "Vas a USA y te acordaste de renovar el ESTA" — información que salva viajes

- [ ] **Página pública del viaje (share link)**
  - Cada trip genera `/trip/[shareId]` — página read-only sin login
  - La familia ve en tiempo real el estado de cada vuelo y countdown
  - Impacto: Feature viral — cada usuario lo comparte con 3-5 personas por viaje. Tracción orgánica gratuita

---

### FASE 9 — Features "día del vuelo" avanzados
> La app que abrís en el aeropuerto. Reduce el estrés cuando más importa.

- [ ] **Modo offline completo con IndexedDB**
  - Guardar últimos datos conocidos de statusMap + clima + trips en IndexedDB
  - Cuando no hay internet: mostrar último estado con badge "datos de hace X min"
  - Especialmente útil en tránsito aeroportuario y vuelos
  - Impacto: La app sigue siendo útil exactamente cuando más la necesitás

- [ ] **Alerta de check-in automática**
  - Push notification 24h antes (doméstico) / 48h antes (internacional) con deep link directo
  - Tabla de URLs de check-in por código IATA: AA→aa.com/checkin, LA→latamairlines.com, DL→delta.com/check-in, etc.
  - Impacto: El olvido de check-in pierde asientos de ventana. Esto lo elimina.

- [ ] **"¿A qué hora salgo?" — calculador inteligente**
  - Input: tipo de aeropuerto (doméstico / internacional) + distancia aproximada en minutos desde casa
  - Cálculo: hora de vuelo − tiempo en carretera − tiempo check-in estimado − buffer seguridad (45min dom / 90min int'l)
  - Output: "Para AA900 a las 20:30, salí de casa a las **17:15** → llegás con 1h 45min de margen"
  - Sin APIs externas: todo lógica local
  - Impacto: El feature más pedido por viajeros frecuentes. Elimina el estrés del "¿estoy llegando tarde?"

- [ ] **Reporte post-viaje compartible**
  - Al marcar trip como completado → generar pantalla tipo "Wrapped" con estadísticas del viaje
  - Contenido: vuelos completados, demoras totales en minutos, kilómetros volados, aerolíneas, países visitados
  - Botón: "Compartir como imagen" (html2canvas → PNG)
  - Impacto: Feature viral máximo. Los viajeros frecuentes adoran compartir estadísticas. Tracción orgánica en RRSS.

---

## Arquitectura actual (referencia)

```
app/
├── page.tsx                  Dashboard principal: tabs estáticos + dinámicos, estado global
├── layout.tsx                Root layout, dark mode, LanguageProvider, ToastProvider
├── globals.css               Tailwind base + animaciones custom
└── api/faa-status/route.ts   Proxy server-side → FAA XML (cache CDN 60s, edge runtime)

components/
├── AirportCard.tsx           Card por aeropuerto: estado, clima, flash, remove
├── AirportSearch.tsx         Dropdown búsqueda/agregar aeropuerto con validación IATA
├── TripPanel.tsx             Trip dinámico: form vuelos + timeline + export calendario/WhatsApp
├── MyFlightsPanel.tsx        ⚠️ Legacy: vuelos hardcodeados — reemplazar en Fase 1
├── FlightSearch.tsx          Búsqueda por código IATA/ICAO + link FlightAware
├── TripTimeline.tsx          Timeline visual cronológico de vuelos
├── GlobalStatusBar.tsx       Barra resumen: verde / naranja / roja
├── RefreshCountdown.tsx      Countdown + barra de progreso
├── StatusBadge.tsx           Badge emoji + color por severidad
└── ErrorBoundary.tsx         Error boundary React

hooks/
├── useAirportStatus.ts       Fetch FAA, parse XML, toasts, flash, notifs, re-parse on locale
└── useWeather.ts             Fetch Open-Meteo, WMO mapping, cache 10min, batch

contexts/
└── LanguageContext.tsx       Provider i18n (ES/EN) con localStorage

lib/
├── airports.ts               32 aeropuertos con lat/lng/icao
├── faa.ts                    ⚠️ any-casts — parseXML, classifyDelay, generateWhatsAppSummary
├── faaTranslations.ts        translateReason / translateTrend ES/EN (50+ mappings)
├── flightUtils.ts            parseFlightCode, AIRLINES (40+), subtractHours, buildArrivalNote
├── calendarExport.ts         generateICS, buildGoogleCalendarURL, downloadICS
├── tripShare.ts              buildWhatsAppMessage, buildWhatsAppURL, buildShareURL
├── i18n.ts                   200+ strings ES/EN, tipo Translations
├── types.ts                  DelayStatus, AirportStatus, TripFlight, AirportStatusMap
└── utils.ts                  cn() (clsx + tailwind-merge)

n8n-airport-monitor-workflow.json   Workflow listo para importar → WhatsApp cada 12h
```

## APIs utilizadas y disponibles

### Integradas
| API | Uso | Auth | Límites |
|-----|-----|------|---------|
| FAA ASWS (`nasstatus.faa.gov`) | Estado aeropuertos USA | Sin key | Solo USA, solo aeropuertos con problemas |
| Open-Meteo (`open-meteo.com`) | Clima general | Sin key | ~10k req/día |
| FlightAware | Deep links de tracking | N/A (solo links) | N/A |

### Disponibles — integración pendiente
| API | Endpoint base | Auth | Cobertura | Límites | Notas |
|-----|---------------|------|-----------|---------|-------|
| **AWC/NOAA** METAR+TAF+SIGMET+PIREP | `api.aviationweather.gov/api/data` | **Sin key** | 🌐 Global 8000+ aeropuertos | Sin límite documentado | ⭐ MEJOR fuente global gratuita |
| **OpenSky Network** | `opensky-network.org/api` | Registro gratis | 🌐 Global ADS-B | 10 req/10s anónimo; actualización 5s con cuenta free | `/flights/arrival?airport=ICAO` da llegadas |
| **AviationStack** | `api.aviationstack.com/v1` | API key gratis | 🌐 Global real-time | 100 req/mes | ⚠️ HTTP only en free (no HTTPS) |
| **FlightAware AeroAPI** | `aeroapi.flightaware.com` | API key gratis | 🌐 Global + histórico | $5 crédito/mes (~100-1000 queries) | No 100% gratuito — crédito mensual |
| **CheckWX** | `api.checkwx.com` | API key gratis | 🌐 Global METARs decodificados | 100 req/mes | Alternativa a AWC para METARs decodificados |
| **REDEMET** (Brasil) | `api.redemet.aer.mil.br` | Registro gratis | 🇧🇷 200+ aerop. Brasil | Sin límite documentado | Requerido para cobertura brasileña |
| **OurAirports** | `ourairports.com/data` | **Sin key** (CSV estático) | 🌐 74k aeropuertos global | Sin límite | CC0 public domain, actualizado regularmente |
| **FAA NOTAM API** | `api.faa.gov/notams` | API key gratis | 🇺🇸 USA + algunos internacionales | ~1000+ req/día | Cubre MWCR (GCM) y aeropuertos del Caribe |
| **Eurocontrol SWIM/B2B** | `swim.eurocontrol.int` | Acuerdo formal requerido | 🇪🇺 Europa restricciones flujo | Fair use | ⚠️ Requiere acuerdo institucional — no acceso libre general |
| **ADS-B Exchange** | `adsbexchange.com` | RapidAPI key | 🌐 Global ADS-B | ~10 req/mes free tier | ⚠️ Adquirido por JETNET — tier gratuito prácticamente eliminado |

### Cobertura por región (resumen investigación)
| Región | Estado FAA-equivalente | Mejor fuente gratuita disponible |
|--------|----------------------|----------------------------------|
| 🇺🇸 USA | ✅ FAA ASWS (integrado) | FAA ASWS |
| 🇦🇷 Argentina / LATAM | ❌ Sin API pública de ANAC | AWC METARs (SAEZ, SCEL, SBGR, SKBO) + OpenSky posiciones |
| 🇧🇷 Brasil | ❌ Sin API de DECEA para delays | REDEMET (weather) + AWC + OpenSky |
| 🇨🇦 Canadá | ❌ Sin API pública de Nav Canada | AWC METARs |
| 🇪🇺 Europa | ❌ Eurocontrol requiere acuerdo formal | AWC METARs + OpenSky posiciones |
| 🇦🇺 Australia | ❌ Sin API pública de Airservices | AWC METARs + OpenSky |
| 🌏 Asia-Pacífico | ❌ Sin APIs nacionales públicas | AWC METARs + OpenSky (cobertura varía) |
| 🌐 Global (vuelos) | — | OpenSky (posiciones) + AviationStack (status, 100 req/mes) |

## Stack

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript 5
- **Estilos:** Tailwind CSS 3.4 + clsx + tailwind-merge + Radix UI (Tabs, Slot)
- **Iconos:** Lucide React
- **PWA:** @ducanh2912/next-pwa
- **XML:** fast-xml-parser 4.x
- **Notificaciones UI:** react-hot-toast
- **Workflow:** n8n + Meta WhatsApp Cloud API
