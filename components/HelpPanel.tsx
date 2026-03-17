"use client";

import { useState } from "react";
import {
  ChevronDown, ChevronRight, Plane, MapPin, AlertTriangle,
  BarChart2, Zap, Wind, Clock, Calendar, Share2, Search,
  Globe, Database, HelpCircle, CheckCircle2, Radio, DoorOpen,
  CloudLightning, TrendingDown, TrendingUp, Bell,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SectionDef {
  id:      string;
  icon:    React.ReactNode;
  titleEs: string;
  titleEn: string;
  content: (locale: "es" | "en") => React.ReactNode;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${color}`}>
      {children}
    </span>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-gray-500 text-sm w-40 shrink-0">{label}</span>
      <div>
        <span className="text-gray-200 text-sm font-medium">{value}</span>
        {sub && <p className="text-gray-500 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex gap-2 rounded-lg bg-blue-950/40 border border-blue-800/30 px-3 py-2.5 text-xs text-blue-300">
      <span className="shrink-0 mt-0.5">💡</span>
      <span>{children}</span>
    </div>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-bold text-white mt-5 mb-2 first:mt-0">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-400 leading-relaxed mb-2">{children}</p>;
}

// ── Content ───────────────────────────────────────────────────────────────────

const SECTIONS: SectionDef[] = [

  // ── 1. Introducción ─────────────────────────────────────────────────────────
  {
    id: "intro", icon: <Plane className="h-4 w-4" />,
    titleEs: "¿Qué es Airport Monitor?",
    titleEn: "What is Airport Monitor?",
    content: (locale) => locale === "es" ? (
      <div>
        <P>
          Airport Monitor es una herramienta gratuita para viajeros frecuentes que combina en una sola pantalla
          el estado en tiempo real de aeropuertos, datos meteorológicos de aviación oficial y la gestión de tu itinerario personal.
        </P>
        <P>
          Está pensada especialmente para viajes entre <strong className="text-white">Latinoamérica y Estados Unidos</strong>,
          pero funciona con cualquier aeropuerto del mundo para clima y datos meteorológicos.
        </P>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {[
            { icon: "📡", title: "Datos oficiales FAA", desc: "Estado real de aeropuertos de EE.UU. en tiempo real" },
            { icon: "🌤", title: "Meteorología aviation-grade", desc: "METAR, TAF y SIGMET de la NOAA — los mismos datos que usan los pilotos" },
            { icon: "✈️", title: "Gestión de itinerario", desc: "Organizá tus vuelos, analizá conexiones y exportá al calendario" },
            { icon: "🔒", title: "Sin cuenta, sin costo", desc: "Todo se guarda en tu navegador. Cero registro requerido." },
          ].map((item) => (
            <div key={item.title} className="rounded-lg bg-white/[0.03] border border-white/6 p-3">
              <p className="text-base mb-1">{item.icon}</p>
              <p className="text-sm font-semibold text-white">{item.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
        <Tip>Podés instalar Airport Monitor en tu celular como app: en el navegador tocá "Agregar a pantalla de inicio". Funciona como una app nativa, sin tienda de apps.</Tip>
      </div>
    ) : (
      <div>
        <P>
          Airport Monitor is a free tool for frequent travelers that combines real-time airport status,
          official aviation weather data and personal itinerary management in a single screen.
        </P>
        <P>
          It&apos;s designed especially for travel between <strong className="text-white">Latin America and the United States</strong>,
          but works with any airport in the world for weather and meteorological data.
        </P>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {[
            { icon: "📡", title: "Official FAA data", desc: "Real-time status of all US airports" },
            { icon: "🌤", title: "Aviation-grade weather", desc: "METAR, TAF and SIGMET from NOAA — the same data pilots use" },
            { icon: "✈️", title: "Itinerary management", desc: "Organize your flights, analyze connections, export to calendar" },
            { icon: "🔒", title: "No account, no cost", desc: "Everything saved in your browser. Zero registration required." },
          ].map((item) => (
            <div key={item.title} className="rounded-lg bg-white/[0.03] border border-white/6 p-3">
              <p className="text-base mb-1">{item.icon}</p>
              <p className="text-sm font-semibold text-white">{item.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
        <Tip>You can install Airport Monitor on your phone as an app: in the browser tap &quot;Add to Home Screen&quot;. It works like a native app, no app store needed.</Tip>
      </div>
    ),
  },

  // ── 2. Mis Aeropuertos ───────────────────────────────────────────────────────
  {
    id: "airports", icon: <MapPin className="h-4 w-4" />,
    titleEs: "Panel de Aeropuertos",
    titleEn: "Airport Dashboard",
    content: (locale) => locale === "es" ? (
      <div>
        <P>La pestaña <strong className="text-white">✈ Mis aeropuertos</strong> es tu panel de monitoreo en tiempo real. Cada tarjeta muestra el estado actual de un aeropuerto.</P>

        <H3>Agregar y quitar aeropuertos</H3>
        <P>Hacé click en el cuadro con el <strong className="text-white">ícono +</strong> para buscar un aeropuerto por código IATA, nombre o ciudad. Podés filtrar por país usando las pastillas de banderas. Para quitar un aeropuerto, hacé click en la <strong className="text-white">X</strong> de su tarjeta.</P>
        <Tip>Los aeropuertos se ordenan automáticamente: los que tienen problemas aparecen primero.</Tip>

        <H3>¿Qué muestra cada tarjeta?</H3>
        <div className="space-y-2 mt-2">
          {[
            ["Código y nombre", "El código IATA (ej: MIA) con el nombre completo del aeropuerto y ciudad"],
            ["Badge de estado", "El nivel de demora actual según la FAA"],
            ["Clima", "Temperatura y condición meteorológica actual"],
            ["METAR", "Datos de aviación: condición de vuelo (VFR/IFR), viento, visibilidad"],
            ["Detalle de demora", "Si hay problemas: minutos de demora, causa y si afecta salidas, llegadas o ambas"],
            ["Tendencia", "Si la situación está mejorando o empeorando"],
            ["Hora de actualización", "Cuándo se obtuvieron los datos por última vez"],
          ].map(([label, desc]) => (
            <div key={label as string} className="flex gap-3">
              <span className="text-blue-400 text-sm font-semibold w-36 shrink-0">{label}</span>
              <span className="text-sm text-gray-400">{desc}</span>
            </div>
          ))}
        </div>

        <H3>Barra lateral de color</H3>
        <P>La barra vertical de color a la izquierda de cada tarjeta indica el nivel de severidad de un vistazo — verde para normal, rojo para crítico.</P>

        <H3>Auto-refresh</H3>
        <P>Los datos se actualizan automáticamente cada 5, 10, 15 o 30 minutos (configurable en el encabezado). También podés hacer click en <strong className="text-white">Actualizar</strong> para forzar una actualización inmediata.</P>
      </div>
    ) : (
      <div>
        <P>The <strong className="text-white">✈ My Airports</strong> tab is your real-time monitoring panel. Each card shows the current status of an airport.</P>

        <H3>Adding and removing airports</H3>
        <P>Click the <strong className="text-white">+ icon</strong> to search for an airport by IATA code, name or city. You can filter by country using the flag pills. To remove an airport, click the <strong className="text-white">X</strong> on its card.</P>
        <Tip>Airports are sorted automatically — those with issues appear first.</Tip>

        <H3>What does each card show?</H3>
        <div className="space-y-2 mt-2">
          {[
            ["Code & name", "The IATA code (e.g. MIA) with the full airport name and city"],
            ["Status badge", "The current delay level according to the FAA"],
            ["Weather", "Current temperature and weather condition"],
            ["METAR", "Aviation data: flight conditions (VFR/IFR), wind, visibility"],
            ["Delay detail", "If there are issues: delay minutes, cause, and whether it affects departures, arrivals, or both"],
            ["Trend", "Whether the situation is improving or worsening"],
            ["Update time", "When the data was last retrieved"],
          ].map(([label, desc]) => (
            <div key={label as string} className="flex gap-3">
              <span className="text-blue-400 text-sm font-semibold w-36 shrink-0">{label}</span>
              <span className="text-sm text-gray-400">{desc}</span>
            </div>
          ))}
        </div>

        <H3>Color side bar</H3>
        <P>The vertical colored bar on the left of each card shows the severity level at a glance — green for normal, red for critical.</P>

        <H3>Auto-refresh</H3>
        <P>Data refreshes automatically every 5, 10, 15 or 30 minutes (configurable in the header). You can also click <strong className="text-white">Refresh</strong> to force an immediate update.</P>
      </div>
    ),
  },

  // ── 3. Niveles de Estado ─────────────────────────────────────────────────────
  {
    id: "status", icon: <AlertTriangle className="h-4 w-4" />,
    titleEs: "Niveles de Estado",
    titleEn: "Status Levels",
    content: (locale) => locale === "es" ? (
      <div>
        <P>La FAA reporta 7 niveles de estado para los aeropuertos de EE.UU. Acá explicamos qué significa cada uno para vos como pasajero:</P>
        <div className="space-y-3 mt-3">
          {[
            { badge: <Badge color="bg-emerald-950/60 text-emerald-300 border-emerald-500/20"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block mr-0.5"/>Normal</Badge>, title: "Todo en orden", desc: "El aeropuerto opera con normalidad. No hay demoras reportadas por la FAA." },
            { badge: <Badge color="bg-yellow-950/60 text-yellow-300 border-yellow-500/20"><span className="h-1.5 w-1.5 rounded-full bg-yellow-400 inline-block mr-0.5"/>Demora leve</Badge>, title: "15–44 minutos de demora", desc: "Demoras menores por tráfico, clima leve o problemas técnicos puntuales." },
            { badge: <Badge color="bg-orange-950/60 text-orange-300 border-orange-500/20"><span className="h-1.5 w-1.5 rounded-full bg-orange-400 inline-block mr-0.5"/>Demora moderada</Badge>, title: "45–59 minutos de demora", desc: "Situación que puede afectar tu conexión. Monitoreá la situación de cerca." },
            { badge: <Badge color="bg-red-950/60 text-red-300 border-red-500/25"><span className="h-1.5 w-1.5 rounded-full bg-red-400 inline-block mr-0.5"/>Demora severa</Badge>, title: "60+ minutos de demora", desc: "Demoras importantes. Considerá avisar a quien te espera y contactar la aerolínea si tenés conexiones ajustadas." },
            { badge: <Badge color="bg-red-950/70 text-red-200 border-red-600/30"><span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse inline-block mr-0.5"/>Demora en Tierra</Badge>, title: "Ground Delay Program (GDP)", desc: "La FAA está regulando el flujo de vuelos hacia ese aeropuerto. Los aviones despegan tarde desde su origen para llegar espaciados. Puede haber demoras en destino incluso si el aeropuerto de salida está normal." },
            { badge: <Badge color="bg-red-950/80 text-red-200 border-red-600/40"><span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse inline-block mr-0.5"/>Parada en Tierra</Badge>, title: "Ground Stop", desc: "Ningún vuelo puede despegar hacia ese aeropuerto hasta nuevo aviso. Causa típica: tormenta eléctrica, baja visibilidad o saturación. Generalmente dura 30 minutos a 2 horas." },
            { badge: <Badge color="bg-zinc-900/60 text-zinc-300 border-zinc-600/30"><span className="h-1.5 w-1.5 rounded-full bg-zinc-400 inline-block mr-0.5"/>Cerrado</Badge>, title: "Aeropuerto cerrado", desc: "El aeropuerto no está operativo. Causa típica: emergencia, condiciones climáticas extremas o mantenimiento de pista." },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border border-white/6 p-3 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {item.badge}
                <span className="text-sm font-semibold text-white">{item.title}</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <Tip>Los aeropuertos sin problemas NO aparecen en la API de la FAA — su ausencia significa que todo está bien, no que no hay datos.</Tip>
      </div>
    ) : (
      <div>
        <P>The FAA reports 7 status levels for US airports. Here&apos;s what each means for you as a passenger:</P>
        <div className="space-y-3 mt-3">
          {[
            { badge: <Badge color="bg-emerald-950/60 text-emerald-300 border-emerald-500/20"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block mr-0.5"/>Normal</Badge>, title: "All clear", desc: "The airport is operating normally. No delays reported by the FAA." },
            { badge: <Badge color="bg-yellow-950/60 text-yellow-300 border-yellow-500/20"><span className="h-1.5 w-1.5 rounded-full bg-yellow-400 inline-block mr-0.5"/>Minor delay</Badge>, title: "15–44 minutes delay", desc: "Minor delays due to traffic, mild weather or isolated technical issues." },
            { badge: <Badge color="bg-orange-950/60 text-orange-300 border-orange-500/20"><span className="h-1.5 w-1.5 rounded-full bg-orange-400 inline-block mr-0.5"/>Moderate delay</Badge>, title: "45–59 minutes delay", desc: "Could impact your connection. Monitor the situation closely." },
            { badge: <Badge color="bg-red-950/60 text-red-300 border-red-500/25"><span className="h-1.5 w-1.5 rounded-full bg-red-400 inline-block mr-0.5"/>Severe delay</Badge>, title: "60+ minutes delay", desc: "Significant delays. Consider contacting your airline if you have tight connections." },
            { badge: <Badge color="bg-red-950/70 text-red-200 border-red-600/30"><span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse inline-block mr-0.5"/>Ground Delay</Badge>, title: "Ground Delay Program (GDP)", desc: "The FAA is regulating the flow of flights to that airport. Planes depart late from their origin to arrive spaced out. There may be delays at the destination even if your departure airport is normal." },
            { badge: <Badge color="bg-red-950/80 text-red-200 border-red-600/40"><span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse inline-block mr-0.5"/>Ground Stop</Badge>, title: "Ground Stop", desc: "No flights can depart to that airport until further notice. Typical cause: thunderstorm, low visibility or congestion. Usually lasts 30 minutes to 2 hours." },
            { badge: <Badge color="bg-zinc-900/60 text-zinc-300 border-zinc-600/30"><span className="h-1.5 w-1.5 rounded-full bg-zinc-400 inline-block mr-0.5"/>Closed</Badge>, title: "Airport closed", desc: "The airport is not operational. Typical cause: emergency, extreme weather or runway maintenance." },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border border-white/6 p-3 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {item.badge}
                <span className="text-sm font-semibold text-white">{item.title}</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <Tip>Airports without issues do NOT appear in the FAA API — their absence means everything is fine, not that there&apos;s no data.</Tip>
      </div>
    ),
  },

  // ── 4. METAR ─────────────────────────────────────────────────────────────────
  {
    id: "metar", icon: <Wind className="h-4 w-4" />,
    titleEs: "Datos Meteorológicos de Aviación (METAR)",
    titleEn: "Aviation Weather Data (METAR)",
    content: (locale) => locale === "es" ? (
      <div>
        <P>Cada tarjeta de aeropuerto muestra un METAR — el reporte meteorológico oficial que usan los pilotos para decidir si pueden volar. Se actualiza cada 5 minutos desde la NOAA.</P>

        <H3>Condición de vuelo (badge)</H3>
        <div className="space-y-2 mt-2">
          {[
            { badge: <Badge color="bg-emerald-950/70 text-emerald-300 border-emerald-700/30">VFR</Badge>, label: "Visual Flight Rules — Condiciones visuales", desc: "Cielo despejado o nubes altas. Visibilidad excelente. Vuelo normal." },
            { badge: <Badge color="bg-blue-950/70 text-blue-300 border-blue-700/30">MVFR</Badge>, label: "Marginal VFR — Condiciones marginales", desc: "Algo de nebulosidad baja o reducción de visibilidad. Posibles demoras leves." },
            { badge: <Badge color="bg-orange-950/70 text-orange-300 border-orange-700/30">IFR</Badge>, label: "Instrument Flight Rules — Solo instrumentos", desc: "Visibilidad menor a 3 millas o techo menor a 1000ft. Alta probabilidad de demoras." },
            { badge: <Badge color="bg-red-950/70 text-red-300 border-red-700/30">LIFR</Badge>, label: "Low IFR — Condiciones muy severas", desc: "Visibilidad menor a 1 milla o techo menor a 500ft. Riesgo alto de cancelaciones." },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
              <div className="shrink-0 mt-0.5">{item.badge}</div>
              <div>
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <H3>Cómo leer el viento</H3>
        <P>El viento se muestra como <code className="bg-white/8 px-1.5 py-0.5 rounded text-xs text-gray-200">270°/15kt G25kt</code></P>
        <div className="space-y-1 text-sm">
          <div className="flex gap-2"><span className="text-blue-400 w-16 shrink-0">270°</span><span className="text-gray-400">Dirección de la que viene el viento (270° = del Oeste)</span></div>
          <div className="flex gap-2"><span className="text-blue-400 w-16 shrink-0">15kt</span><span className="text-gray-400">Velocidad en nudos (1 nudo ≈ 1.85 km/h)</span></div>
          <div className="flex gap-2"><span className="text-blue-400 w-16 shrink-0">G25kt</span><span className="text-gray-400">Ráfagas de hasta 25 nudos</span></div>
          <div className="flex gap-2"><span className="text-blue-400 w-16 shrink-0">CALM</span><span className="text-gray-400">Viento calmo, sin viento</span></div>
          <div className="flex gap-2"><span className="text-blue-400 w-16 shrink-0">VRB/5kt</span><span className="text-gray-400">Viento variable en dirección, 5 nudos</span></div>
        </div>

        <H3>Visibilidad y techo</H3>
        <P>Solo se muestran cuando son relevantes (reducidos):</P>
        <div className="space-y-1 text-sm">
          <div className="flex gap-2"><span className="text-blue-400 w-20 shrink-0">vis 2SM</span><span className="text-gray-400">Visibilidad de 2 millas (importante, confirma condición IFR)</span></div>
          <div className="flex gap-2"><span className="text-blue-400 w-20 shrink-0">ceil 800ft</span><span className="text-gray-400">Techo de nubes a 800 pies — muy bajo, afecta las operaciones</span></div>
        </div>

        <Tip>Si ves IFR o LIFR en tu aeropuerto de salida el día del vuelo, contactá tu aerolínea o verificá FlightAware con anticipación.</Tip>
      </div>
    ) : (
      <div>
        <P>Each airport card shows a METAR — the official weather report pilots use to decide if they can fly. Updated every 5 minutes from NOAA.</P>

        <H3>Flight condition (badge)</H3>
        <div className="space-y-2 mt-2">
          {[
            { badge: <Badge color="bg-emerald-950/70 text-emerald-300 border-emerald-700/30">VFR</Badge>, label: "Visual Flight Rules — Visual conditions", desc: "Clear sky or high clouds. Excellent visibility. Normal operations." },
            { badge: <Badge color="bg-blue-950/70 text-blue-300 border-blue-700/30">MVFR</Badge>, label: "Marginal VFR — Marginal conditions", desc: "Some low clouds or reduced visibility. Possible minor delays." },
            { badge: <Badge color="bg-orange-950/70 text-orange-300 border-orange-700/30">IFR</Badge>, label: "Instrument Flight Rules — Instruments only", desc: "Visibility below 3 miles or ceiling below 1000ft. High probability of delays." },
            { badge: <Badge color="bg-red-950/70 text-red-300 border-red-700/30">LIFR</Badge>, label: "Low IFR — Very severe conditions", desc: "Visibility below 1 mile or ceiling below 500ft. High risk of cancellations." },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
              <div className="shrink-0 mt-0.5">{item.badge}</div>
              <div>
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <H3>How to read the wind</H3>
        <P>Wind is shown as <code className="bg-white/8 px-1.5 py-0.5 rounded text-xs text-gray-200">270°/15kt G25kt</code></P>
        <div className="space-y-1 text-sm">
          <div className="flex gap-2"><span className="text-blue-400 w-16 shrink-0">270°</span><span className="text-gray-400">Direction the wind is coming FROM (270° = from the West)</span></div>
          <div className="flex gap-2"><span className="text-blue-400 w-16 shrink-0">15kt</span><span className="text-gray-400">Speed in knots (1 knot ≈ 1.15 mph / 1.85 km/h)</span></div>
          <div className="flex gap-2"><span className="text-blue-400 w-16 shrink-0">G25kt</span><span className="text-gray-400">Gusts up to 25 knots</span></div>
          <div className="flex gap-2"><span className="text-blue-400 w-16 shrink-0">CALM</span><span className="text-gray-400">No wind</span></div>
          <div className="flex gap-2"><span className="text-blue-400 w-16 shrink-0">VRB/5kt</span><span className="text-gray-400">Variable wind direction, 5 knots</span></div>
        </div>

        <H3>Visibility and ceiling</H3>
        <P>Only shown when relevant (reduced):</P>
        <div className="space-y-1 text-sm">
          <div className="flex gap-2"><span className="text-blue-400 w-20 shrink-0">vis 2SM</span><span className="text-gray-400">Visibility of 2 miles (important — confirms IFR conditions)</span></div>
          <div className="flex gap-2"><span className="text-blue-400 w-20 shrink-0">ceil 800ft</span><span className="text-gray-400">Cloud ceiling at 800 feet — very low, affects operations</span></div>
        </div>

        <Tip>If you see IFR or LIFR at your departure airport on travel day, contact your airline or check FlightAware early.</Tip>
      </div>
    ),
  },

  // ── 5. Mis Viajes ────────────────────────────────────────────────────────────
  {
    id: "trips", icon: <Calendar className="h-4 w-4" />,
    titleEs: "Mis Viajes",
    titleEn: "My Trips",
    content: (locale) => locale === "es" ? (
      <div>
        <P>La app te permite gestionar tu itinerario personal. Cada &quot;viaje&quot; es una pestaña con todos sus vuelos.</P>

        <H3>Crear y gestionar viajes</H3>
        <div className="space-y-2 text-sm">
          {[
            ["Crear viaje", "Hacé click en el botón ＋ al final de la barra de pestañas"],
            ["Renombrar", "Click en el ícono ✏️ junto al nombre de la pestaña"],
            ["Eliminar", "Click en la × de la pestaña (pide confirmación si tiene vuelos)"],
          ].map(([a, b]) => (
            <div key={a as string} className="flex gap-3">
              <span className="text-blue-400 w-24 shrink-0 font-semibold">{a}</span>
              <span className="text-gray-400">{b}</span>
            </div>
          ))}
        </div>

        <H3>Agregar vuelos</H3>
        <P>Completá el formulario con:</P>
        <div className="space-y-1 text-sm mt-1">
          {[
            ["Código de vuelo", "Ej: AA900, B6766, LA800 (código IATA de 2 letras + número)"],
            ["Origen / Destino", "Código IATA del aeropuerto (3 letras, ej: EZE, MIA, JFK)"],
            ["Fecha", "La fecha del vuelo"],
            ["Hora de salida", "La hora programada del despegue"],
            ["Llegar al aeropuerto", "Con cuánta anticipación querés llegar (1h, 2h, etc.)"],
          ].map(([a, b]) => (
            <div key={a as string} className="flex gap-3">
              <span className="text-emerald-400 w-36 shrink-0 font-semibold text-xs">{a}</span>
              <span className="text-gray-400 text-xs">{b}</span>
            </div>
          ))}
        </div>

        <H3>Importar desde email de confirmación</H3>
        <P>Hacé click en <strong className="text-white">Importar</strong> en el formulario. Pegá el texto de tu email de confirmación de la aerolínea — la app detecta automáticamente el código de vuelo, aeropuertos, fecha y hora. Funciona con la mayoría de los formatos de confirmación (American Airlines, LATAM, United, JetBlue, etc.)</P>
        <Tip>Podés pegar el texto completo del email. La app ignora lo que no reconoce y extrae solo los datos de vuelo.</Tip>

        <H3>Exportar y compartir</H3>
        <div className="space-y-2 text-sm mt-2">
          {[
            ["📅 Exportar .ics", "Descarga un archivo que agrega todos los vuelos a tu calendario (funciona con Google Calendar, Outlook, Apple Calendar)"],
            ["📅 Google Calendar", "Link directo para agregar cada vuelo individualmente a Google Calendar"],
            ["💬 WhatsApp", "Genera un mensaje formateado con el itinerario completo, listo para compartir"],
            ["🔗 Compartir link", "Copia una URL con el resumen del viaje para enviar a quien quieras"],
          ].map(([a, b]) => (
            <div key={a as string} className="flex gap-2 py-1.5 border-b border-white/5 last:border-0">
              <span className="text-sm font-semibold text-white w-36 shrink-0">{a}</span>
              <span className="text-xs text-gray-400">{b}</span>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div>
        <P>The app lets you manage your personal itinerary. Each &quot;trip&quot; is a tab with all its flights.</P>

        <H3>Creating and managing trips</H3>
        <div className="space-y-2 text-sm">
          {[
            ["Create trip", "Click the ＋ button at the end of the tab bar"],
            ["Rename", "Click the ✏️ icon next to the tab name"],
            ["Delete", "Click the × on the tab (asks for confirmation if it has flights)"],
          ].map(([a, b]) => (
            <div key={a as string} className="flex gap-3">
              <span className="text-blue-400 w-24 shrink-0 font-semibold">{a}</span>
              <span className="text-gray-400">{b}</span>
            </div>
          ))}
        </div>

        <H3>Adding flights</H3>
        <P>Fill in the form with:</P>
        <div className="space-y-1 text-sm mt-1">
          {[
            ["Flight code", "E.g.: AA900, B6766, LA800 (2-letter IATA code + number)"],
            ["Origin / Dest.", "Airport IATA code (3 letters, e.g.: EZE, MIA, JFK)"],
            ["Date", "The flight date"],
            ["Departure time", "The scheduled takeoff time"],
            ["Arrive at airport", "How early you want to arrive at the airport (1h, 2h, etc.)"],
          ].map(([a, b]) => (
            <div key={a as string} className="flex gap-3">
              <span className="text-emerald-400 w-36 shrink-0 font-semibold text-xs">{a}</span>
              <span className="text-gray-400 text-xs">{b}</span>
            </div>
          ))}
        </div>

        <H3>Import from confirmation email</H3>
        <P>Click <strong className="text-white">Import</strong> in the form. Paste the text of your airline confirmation email — the app automatically detects the flight code, airports, date and time. Works with most confirmation formats (American Airlines, LATAM, United, JetBlue, etc.)</P>
        <Tip>You can paste the full email text. The app ignores what it doesn&apos;t recognize and extracts only the flight data.</Tip>

        <H3>Export and share</H3>
        <div className="space-y-2 text-sm mt-2">
          {[
            ["📅 Export .ics", "Downloads a file that adds all flights to your calendar (works with Google Calendar, Outlook, Apple Calendar)"],
            ["📅 Google Calendar", "Direct link to add each flight individually to Google Calendar"],
            ["💬 WhatsApp", "Generates a formatted message with the complete itinerary, ready to share"],
            ["🔗 Share link", "Copies a URL with the trip summary to send to anyone"],
          ].map(([a, b]) => (
            <div key={a as string} className="flex gap-2 py-1.5 border-b border-white/5 last:border-0">
              <span className="text-sm font-semibold text-white w-36 shrink-0">{a}</span>
              <span className="text-xs text-gray-400">{b}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── 6. Tarjeta de Vuelo ──────────────────────────────────────────────────────
  {
    id: "flightcard", icon: <Plane className="h-4 w-4" />,
    titleEs: "¿Qué muestra cada tarjeta de vuelo?",
    titleEn: "What does each flight card show?",
    content: (locale) => locale === "es" ? (
      <div>
        <P>Cada vuelo del viaje tiene su propia tarjeta con múltiples secciones de información en tiempo real:</P>

        <div className="space-y-3 mt-3">
          {[
            {
              icon: <MapPin className="h-4 w-4 text-orange-400" />,
              title: "Aeropuerto de Salida",
              desc: "Muestra el estado FAA del aeropuerto donde sale tu vuelo, el clima actual y el METAR. Si hay alertas activas (demora, ground stop, cierre), aparece destacado en naranja o rojo.",
            },
            {
              icon: <Plane className="h-4 w-4 text-gray-400" />,
              title: "Ruta",
              desc: "Origen → Destino con los nombres de las ciudades. Incluye un link a Google Flights para buscar vuelos alternativos en esa ruta.",
            },
            {
              icon: <Clock className="h-4 w-4 text-blue-400" />,
              title: "Mi Vuelo",
              desc: "Código del vuelo, aerolínea, fecha, countdown de días (verde →🟡→ rojo→ HOY pulsante), hora de salida y la hora recomendada de llegada al aeropuerto según el buffer que configuraste.",
            },
            {
              icon: <DoorOpen className="h-4 w-4 text-purple-400" />,
              title: "Puerta / Terminal",
              desc: "Guía sobre cuándo se asigna la puerta: más de 3 días antes muestra que aún no está asignada; 1-3 días antes indica que se suele confirmar el día anterior; el día del vuelo muestra el link en vivo a FlightAware y app de la aerolínea.",
            },
            {
              icon: <Wind className="h-4 w-4 text-blue-400" />,
              title: "Pronóstico en la Salida (TAF)",
              desc: "Predicción meteorológica oficial de la NOAA para la hora programada del despegue. Muestra VFR/MVFR/IFR/LIFR + viento + visibilidad. Solo aparece cuando hay datos TAF disponibles.",
            },
            {
              icon: <CloudLightning className="h-4 w-4 text-purple-400" />,
              title: "SIGMET en Ruta",
              desc: "Si hay avisos meteorológicos significativos (tormentas, turbulencia severa, hielo, ceniza volcánica) activos a lo largo de la ruta del vuelo, aparece un banner púrpura de advertencia.",
            },
            {
              icon: <Radio className="h-4 w-4 text-blue-400" />,
              title: "Seguimiento en Vivo",
              desc: "Links a FlightAware para rastrear el vuelo en tiempo real y ver el avión entrante (útil para saber si el avión que va a operar tu vuelo está llegando a tiempo).",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border border-white/6 bg-white/[0.015] p-3 flex gap-3">
              <div className="shrink-0 mt-0.5">{item.icon}</div>
              <div>
                <p className="text-sm font-semibold text-white mb-0.5">{item.title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Tip>Para aeropuertos fuera de EE.UU. (como EZE, GCM, GRU), no hay cobertura FAA. La tarjeta mostrará los datos meteorológicos METAR pero no el estado de demoras oficial.</Tip>
      </div>
    ) : (
      <div>
        <P>Each flight in the trip has its own card with multiple real-time information sections:</P>

        <div className="space-y-3 mt-3">
          {[
            {
              icon: <MapPin className="h-4 w-4 text-orange-400" />,
              title: "Departure Airport",
              desc: "Shows the FAA status of the airport your flight departs from, current weather and METAR. If there are active alerts (delay, ground stop, closure), it appears highlighted in orange or red.",
            },
            {
              icon: <Plane className="h-4 w-4 text-gray-400" />,
              title: "Route",
              desc: "Origin → Destination with city names. Includes a link to Google Flights to search for alternative flights on that route.",
            },
            {
              icon: <Clock className="h-4 w-4 text-blue-400" />,
              title: "My Flight",
              desc: "Flight code, airline, date, days countdown (green →🟡→ red→ TODAY pulsing), departure time and recommended airport arrival time based on your configured buffer.",
            },
            {
              icon: <DoorOpen className="h-4 w-4 text-purple-400" />,
              title: "Gate / Terminal",
              desc: "Guide on when the gate is assigned: more than 3 days before shows it&apos;s not yet assigned; 1-3 days before indicates it&apos;s usually confirmed the day before; on travel day shows a live link to FlightAware and airline app.",
            },
            {
              icon: <Wind className="h-4 w-4 text-blue-400" />,
              title: "Forecast at Departure (TAF)",
              desc: "Official NOAA weather forecast for the scheduled departure time. Shows VFR/MVFR/IFR/LIFR + wind + visibility. Only appears when TAF data is available.",
            },
            {
              icon: <CloudLightning className="h-4 w-4 text-purple-400" />,
              title: "SIGMET on Route",
              desc: "If there are significant meteorological advisories (thunderstorms, severe turbulence, icing, volcanic ash) active along the flight route, a purple warning banner appears.",
            },
            {
              icon: <Radio className="h-4 w-4 text-blue-400" />,
              title: "Live Tracking",
              desc: "Links to FlightAware to track the flight in real time and see the inbound aircraft (useful for knowing if the plane that will operate your flight is arriving on time).",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border border-white/6 bg-white/[0.015] p-3 flex gap-3">
              <div className="shrink-0 mt-0.5">{item.icon}</div>
              <div>
                <p className="text-sm font-semibold text-white mb-0.5">{item.title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Tip>For airports outside the US (like EZE, GCM, GRU), there is no FAA coverage. The card will show METAR weather data but not official delay status.</Tip>
      </div>
    ),
  },

  // ── 7. Score de Riesgo ────────────────────────────────────────────────────────
  {
    id: "risk", icon: <BarChart2 className="h-4 w-4" />,
    titleEs: "Score de Riesgo del Viaje (0–100)",
    titleEn: "Trip Risk Score (0–100)",
    content: (locale) => locale === "es" ? (
      <div>
        <P>El score de riesgo es un número del 0 al 100 que resume en un solo vistazo qué tan problemático puede ser tu viaje. Aparece en la parte superior de cada pestaña de viaje.</P>

        <H3>Niveles de riesgo</H3>
        <div className="space-y-2 mt-2">
          {[
            { range: "0–15", level: "BAJO", color: "text-emerald-300 bg-emerald-950/60 border-emerald-700/40", desc: "Todo bien. Volar sin preocupaciones." },
            { range: "16–40", level: "MEDIO", color: "text-yellow-300 bg-yellow-950/60 border-yellow-700/40", desc: "Hay algo que monitorear. Posibles inconvenientes menores." },
            { range: "41–70", level: "ALTO", color: "text-orange-300 bg-orange-950/60 border-orange-700/40", desc: "Problemas activos en el viaje. Prepararse para cambios y tener plan B." },
            { range: "71–100", level: "CRÍTICO", color: "text-red-300 bg-red-950/60 border-red-700/40", desc: "Situación severa. Contactar aerolínea, considerar rebooking." },
          ].map((item) => (
            <div key={item.level} className={`rounded-lg border px-3 py-2.5 flex items-start gap-3 ${item.color}`}>
              <span className="font-black text-lg leading-none w-12 shrink-0">{item.range}</span>
              <div>
                <p className="font-bold text-sm">{item.level}</p>
                <p className="text-xs opacity-80 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <H3>Factores que componen el score</H3>
        <div className="space-y-2 mt-2 text-sm">
          {[
            ["+4 a +40 pts", "Estado de los aeropuertos del viaje", "Cierre = +40, Ground Stop = +35, Demora severa = +18"],
            ["+8 a +30 pts", "Riesgo de conexión", "Conexión perdida = +30, En riesgo = +20, Ajustada = +8"],
            ["+15 pts", "Vuelo HOY", "El vuelo más próximo es hoy"],
            ["+8 pts", "Vuelo MAÑANA", "El vuelo más próximo es mañana"],
            ["+5 pts", "Día pico", "El vuelo es en viernes, sábado o domingo (mayor tráfico)"],
          ].map(([pts, factor, detail]) => (
            <div key={factor as string} className="flex gap-3 py-2 border-b border-white/5 last:border-0">
              <span className="text-orange-400 font-bold w-24 shrink-0 text-xs">{pts}</span>
              <div>
                <p className="text-gray-200 font-semibold">{factor}</p>
                <p className="text-gray-500 text-xs">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div>
        <P>The risk score is a number from 0 to 100 that summarizes at a glance how problematic your trip may be. It appears at the top of each trip tab.</P>

        <H3>Risk levels</H3>
        <div className="space-y-2 mt-2">
          {[
            { range: "0–15", level: "LOW", color: "text-emerald-300 bg-emerald-950/60 border-emerald-700/40", desc: "All good. Fly without worry." },
            { range: "16–40", level: "MEDIUM", color: "text-yellow-300 bg-yellow-950/60 border-yellow-700/40", desc: "Something to monitor. Possible minor inconveniences." },
            { range: "41–70", level: "HIGH", color: "text-orange-300 bg-orange-950/60 border-orange-700/40", desc: "Active issues in the trip. Prepare for changes and have a Plan B." },
            { range: "71–100", level: "CRITICAL", color: "text-red-300 bg-red-950/60 border-red-700/40", desc: "Severe situation. Contact airline, consider rebooking." },
          ].map((item) => (
            <div key={item.level} className={`rounded-lg border px-3 py-2.5 flex items-start gap-3 ${item.color}`}>
              <span className="font-black text-lg leading-none w-12 shrink-0">{item.range}</span>
              <div>
                <p className="font-bold text-sm">{item.level}</p>
                <p className="text-xs opacity-80 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <H3>Factors that make up the score</H3>
        <div className="space-y-2 mt-2 text-sm">
          {[
            ["+4 to +40 pts", "Airport status on the trip", "Closed = +40, Ground Stop = +35, Severe delay = +18"],
            ["+8 to +30 pts", "Connection risk", "Missed connection = +30, At risk = +20, Tight = +8"],
            ["+15 pts", "Flight TODAY", "The nearest upcoming flight is today"],
            ["+8 pts", "Flight TOMORROW", "The nearest upcoming flight is tomorrow"],
            ["+5 pts", "Peak day", "The flight is on Friday, Saturday or Sunday (higher traffic)"],
          ].map(([pts, factor, detail]) => (
            <div key={factor as string} className="flex gap-3 py-2 border-b border-white/5 last:border-0">
              <span className="text-orange-400 font-bold w-24 shrink-0 text-xs">{pts}</span>
              <div>
                <p className="text-gray-200 font-semibold">{factor}</p>
                <p className="text-gray-500 text-xs">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── 8. Conexiones ────────────────────────────────────────────────────────────
  {
    id: "connections", icon: <TrendingUp className="h-4 w-4" />,
    titleEs: "Análisis de Conexiones",
    titleEn: "Connection Analysis",
    content: (locale) => locale === "es" ? (
      <div>
        <P>Si tu viaje tiene escalas, la app analiza automáticamente si vas a llegar a tiempo a cada conexión, considerando las demoras actuales de la FAA.</P>

        <H3>¿Cómo funciona?</H3>
        <P>Para cada par de vuelos consecutivos, se calcula:</P>
        <div className="space-y-1.5 text-sm">
          {[
            ["Tiempo de vuelo estimado", "Duración estimada del primer vuelo (doméstico ~2h45m, internacional ~4h)"],
            ["Hora de llegada estimada", "Hora de salida + duración estimada del vuelo"],
            ["Margen disponible", "Tiempo entre esa llegada estimada y la salida del siguiente vuelo"],
            ["Impacto de demoras FAA", "Si hay demora en el aeropuerto de escala, se resta del margen"],
            ["MCT (Minimum Connection Time)", "Tiempo mínimo oficial de conexión para ese aeropuerto (varía: JFK = 90 min, MIA = 45 min doméstico/90 min internacional)"],
          ].map(([a, b]) => (
            <div key={a as string} className="flex gap-3 py-1.5 border-b border-white/5 last:border-0">
              <span className="text-blue-400 w-44 shrink-0 text-xs">{a}</span>
              <span className="text-gray-400 text-xs">{b}</span>
            </div>
          ))}
        </div>

        <H3>Niveles de riesgo de conexión</H3>
        <div className="space-y-2 mt-2">
          {[
            { color: "border-emerald-700/50 bg-emerald-950/30 text-emerald-300", level: "SEGURA", desc: "Tenés más del 60% del MCT como margen adicional. Podés ir tranquilo." },
            { color: "border-yellow-700/50 bg-yellow-950/30 text-yellow-300", level: "AJUSTADA", desc: "Margen suficiente pero sin holgura. Caminá rápido al próximo gate, no te demorés." },
            { color: "border-orange-700/50 bg-orange-950/40 text-orange-300", level: "EN RIESGO", desc: "El margen actual es menor al MCT. Considerá avisar a la aerolínea y tener los vuelos alternativos a mano. Aparece botón 'Buscar alternativas'." },
            { color: "border-red-700/60 bg-red-950/50 text-red-300", level: "PERDIDA", desc: "El buffer es negativo: con las demoras actuales, ya no alcanzarías el vuelo. Contactá la aerolínea inmediatamente. Aparece botón 'Buscar alternativas'." },
          ].map((item) => (
            <div key={item.level} className={`rounded-lg border px-3 py-2 ${item.color}`}>
              <p className="text-xs font-bold mb-0.5">{item.level}</p>
              <p className="text-xs opacity-80">{item.desc}</p>
            </div>
          ))}
        </div>
        <Tip>Cuando la conexión está "En riesgo" o "Perdida", aparecen botones directos a Google Flights y Kayak para buscar vuelos alternativos con esa misma ruta y fecha.</Tip>
      </div>
    ) : (
      <div>
        <P>If your trip has layovers, the app automatically analyzes whether you&apos;ll make each connection, taking into account current FAA delays.</P>

        <H3>How it works</H3>
        <P>For each pair of consecutive flights, it calculates:</P>
        <div className="space-y-1.5 text-sm">
          {[
            ["Estimated flight time", "Estimated duration of the first flight (domestic ~2h45m, international ~4h)"],
            ["Estimated arrival", "Departure time + estimated flight duration"],
            ["Available buffer", "Time between that estimated arrival and the next flight's departure"],
            ["FAA delay impact", "If there's a delay at the connection airport, it's subtracted from the buffer"],
            ["MCT (Minimum Connection Time)", "Official minimum connection time for that airport (varies: JFK = 90 min, MIA = 45 min domestic / 90 min international)"],
          ].map(([a, b]) => (
            <div key={a as string} className="flex gap-3 py-1.5 border-b border-white/5 last:border-0">
              <span className="text-blue-400 w-44 shrink-0 text-xs">{a}</span>
              <span className="text-gray-400 text-xs">{b}</span>
            </div>
          ))}
        </div>

        <H3>Connection risk levels</H3>
        <div className="space-y-2 mt-2">
          {[
            { color: "border-emerald-700/50 bg-emerald-950/30 text-emerald-300", level: "SAFE", desc: "You have more than 60% of the MCT as extra margin. You can relax." },
            { color: "border-yellow-700/50 bg-yellow-950/30 text-yellow-300", level: "TIGHT", desc: "Enough margin but no slack. Walk quickly to the next gate, don't dawdle." },
            { color: "border-orange-700/50 bg-orange-950/40 text-orange-300", level: "AT RISK", desc: "Current margin is less than MCT. Consider notifying the airline and have alternative flights ready. 'Find alternatives' button appears." },
            { color: "border-red-700/60 bg-red-950/50 text-red-300", level: "MISSED", desc: "Buffer is negative: with current delays, you wouldn't make the flight. Contact the airline immediately. 'Find alternatives' button appears." },
          ].map((item) => (
            <div key={item.level} className={`rounded-lg border px-3 py-2 ${item.color}`}>
              <p className="text-xs font-bold mb-0.5">{item.level}</p>
              <p className="text-xs opacity-80">{item.desc}</p>
            </div>
          ))}
        </div>
        <Tip>When a connection is &quot;At Risk&quot; or &quot;Missed&quot;, direct buttons to Google Flights and Kayak appear to find alternative flights for that same route and date.</Tip>
      </div>
    ),
  },

  // ── 9. SIGMETs ────────────────────────────────────────────────────────────────
  {
    id: "sigmet", icon: <CloudLightning className="h-4 w-4" />,
    titleEs: "SIGMETs — Avisos Meteorológicos en Ruta",
    titleEn: "SIGMETs — Weather Advisories on Route",
    content: (locale) => locale === "es" ? (
      <div>
        <P>Los SIGMETs (Significant Meteorological Information) son avisos oficiales de la NOAA sobre condiciones meteorológicas peligrosas en el espacio aéreo. Se verifican automáticamente para cada ruta de tu viaje.</P>

        <H3>¿Qué tipos de SIGMET existen?</H3>
        <div className="space-y-2 mt-2">
          {[
            ["CONVECTIVE", "⛈️", "Tormentas eléctricas severas — el tipo más común y peligroso"],
            ["TURB", "💨", "Turbulencia severa o extrema — puede causar lesiones"],
            ["ICE", "🧊", "Engelamiento severo — acumulación de hielo en las alas"],
            ["ASH", "🌋", "Ceniza volcánica — extremadamente peligrosa para los motores"],
            ["IFR", "🌫️", "Condiciones IFR extendidas sobre un área amplia"],
            ["MTW", "⛰️", "Ondas de montaña — turbulencia por flujo sobre montañas"],
          ].map(([type, emoji, desc]) => (
            <div key={type as string} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
              <span className="text-base w-6 shrink-0">{emoji}</span>
              <div>
                <span className="text-xs font-bold text-purple-300 font-mono">{type}</span>
                <span className="text-xs text-gray-400 ml-2">{desc}</span>
              </div>
            </div>
          ))}
        </div>

        <H3>Severidad</H3>
        <div className="flex gap-3 flex-wrap mt-2">
          {[
            ["MOD", "Moderado — causa turbulencia pero el vuelo continúa", "bg-yellow-950/50 text-yellow-300 border-yellow-700/40"],
            ["SEV", "Severo — puede causar daños al avión", "bg-orange-950/50 text-orange-300 border-orange-700/40"],
            ["EXTM", "Extremo — peligro inmediato", "bg-red-950/50 text-red-300 border-red-700/40"],
          ].map(([level, desc, color]) => (
            <div key={level as string} className={`rounded-lg border px-3 py-2 text-xs flex-1 min-w-[140px] ${color}`}>
              <p className="font-bold font-mono mb-0.5">{level}</p>
              <p className="opacity-70">{desc}</p>
            </div>
          ))}
        </div>

        <Tip>Un SIGMET en tu ruta no significa cancelación automática — los pilotos rutean alrededor de ellos cuando es posible. Pero sí indica que puede haber turbulencia o desvíos que afecten los tiempos de vuelo.</Tip>
      </div>
    ) : (
      <div>
        <P>SIGMETs (Significant Meteorological Information) are official NOAA advisories about dangerous weather conditions in the airspace. They are automatically checked for each route in your trip.</P>

        <H3>What types of SIGMET exist?</H3>
        <div className="space-y-2 mt-2">
          {[
            ["CONVECTIVE", "⛈️", "Severe thunderstorms — the most common and dangerous type"],
            ["TURB", "💨", "Severe or extreme turbulence — can cause injuries"],
            ["ICE", "🧊", "Severe icing — ice accumulation on the wings"],
            ["ASH", "🌋", "Volcanic ash — extremely dangerous for engines"],
            ["IFR", "🌫️", "Extended IFR conditions over a wide area"],
            ["MTW", "⛰️", "Mountain waves — turbulence from airflow over mountains"],
          ].map(([type, emoji, desc]) => (
            <div key={type as string} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
              <span className="text-base w-6 shrink-0">{emoji}</span>
              <div>
                <span className="text-xs font-bold text-purple-300 font-mono">{type}</span>
                <span className="text-xs text-gray-400 ml-2">{desc}</span>
              </div>
            </div>
          ))}
        </div>

        <H3>Severity</H3>
        <div className="flex gap-3 flex-wrap mt-2">
          {[
            ["MOD", "Moderate — causes turbulence but the flight continues", "bg-yellow-950/50 text-yellow-300 border-yellow-700/40"],
            ["SEV", "Severe — can cause damage to the aircraft", "bg-orange-950/50 text-orange-300 border-orange-700/40"],
            ["EXTM", "Extreme — immediate danger", "bg-red-950/50 text-red-300 border-red-700/40"],
          ].map(([level, desc, color]) => (
            <div key={level as string} className={`rounded-lg border px-3 py-2 text-xs flex-1 min-w-[140px] ${color}`}>
              <p className="font-bold font-mono mb-0.5">{level}</p>
              <p className="opacity-70">{desc}</p>
            </div>
          ))}
        </div>

        <Tip>A SIGMET on your route doesn&apos;t automatically mean cancellation — pilots route around them when possible. But it does indicate there may be turbulence or detours that affect flight times.</Tip>
      </div>
    ),
  },

  // ── 10. Buscar Vuelo ─────────────────────────────────────────────────────────
  {
    id: "search", icon: <Search className="h-4 w-4" />,
    titleEs: "Buscar Vuelo",
    titleEn: "Flight Search",
    content: (locale) => locale === "es" ? (
      <div>
        <P>La pestaña <strong className="text-white">🔍 Buscar vuelo</strong> te permite rastrear vuelos específicos y ver el estado del aeropuerto de salida.</P>

        <H3>Cómo buscar</H3>
        <div className="space-y-2 text-sm">
          {[
            ["Selector de aerolínea", "Elegí la aerolínea del dropdown — pre-rellena el prefijo en el campo de código (ej: seleccionar American Airlines → escribe AA en el campo)"],
            ["Código de vuelo", "Escribí el número completo: AA900, B6766, LA800, EDV5068"],
            ["Aeropuerto (opcional)", "Código IATA del aeropuerto de salida para ver las demoras FAA activas"],
          ].map(([a, b]) => (
            <div key={a as string} className="flex gap-3 py-2 border-b border-white/5 last:border-0">
              <span className="text-blue-400 w-44 shrink-0 text-xs font-semibold">{a}</span>
              <span className="text-gray-400 text-xs">{b}</span>
            </div>
          ))}
        </div>

        <H3>¿Qué muestra el vuelo rastreado?</H3>
        <P>Cada vuelo guardado muestra el estado actual del aeropuerto de salida (con detalle de demoras si las hay) y un link directo a FlightAware para rastreo en tiempo real. Los vuelos rastreados se guardan automáticamente y sobreviven recargas del navegador.</P>

        <H3>Formatos de código aceptados</H3>
        <div className="flex flex-wrap gap-2 mt-2">
          {["AA900", "B6766", "UA123", "LA800", "AR1301", "DL404", "NK123", "EDV5068"].map((code) => (
            <code key={code} className="bg-white/6 border border-white/8 rounded px-2 py-0.5 text-xs text-gray-300">{code}</code>
          ))}
        </div>
        <Tip>El estado de un vuelo individual (gate, terminal, estado real) requiere APIs pagas. Por eso, la app muestra el estado del aeropuerto de salida como indicador más confiable y gratuito.</Tip>
      </div>
    ) : (
      <div>
        <P>The <strong className="text-white">🔍 Flight Search</strong> tab lets you track specific flights and see the departure airport status.</P>

        <H3>How to search</H3>
        <div className="space-y-2 text-sm">
          {[
            ["Airline selector", "Choose the airline from the dropdown — it pre-fills the code prefix (e.g.: select American Airlines → writes AA in the field)"],
            ["Flight code", "Type the full number: AA900, B6766, LA800, EDV5068"],
            ["Airport (optional)", "IATA code of the departure airport to see active FAA delays"],
          ].map(([a, b]) => (
            <div key={a as string} className="flex gap-3 py-2 border-b border-white/5 last:border-0">
              <span className="text-blue-400 w-44 shrink-0 text-xs font-semibold">{a}</span>
              <span className="text-gray-400 text-xs">{b}</span>
            </div>
          ))}
        </div>

        <H3>What does a tracked flight show?</H3>
        <P>Each saved flight shows the current departure airport status (with delay details if any) and a direct link to FlightAware for real-time tracking. Tracked flights are saved automatically and survive browser reloads.</P>

        <H3>Accepted code formats</H3>
        <div className="flex flex-wrap gap-2 mt-2">
          {["AA900", "B6766", "UA123", "LA800", "AR1301", "DL404", "NK123", "EDV5068"].map((code) => (
            <code key={code} className="bg-white/6 border border-white/8 rounded px-2 py-0.5 text-xs text-gray-300">{code}</code>
          ))}
        </div>
        <Tip>Individual flight status (gate, terminal, real-time state) requires paid APIs. That&apos;s why the app shows the departure airport status as a more reliable and free indicator.</Tip>
      </div>
    ),
  },

  // ── 11. Fuentes de Datos ─────────────────────────────────────────────────────
  {
    id: "sources", icon: <Database className="h-4 w-4" />,
    titleEs: "Fuentes de Datos",
    titleEn: "Data Sources",
    content: (locale) => locale === "es" ? (
      <div>
        <P>Airport Monitor usa exclusivamente fuentes de datos oficiales y gratuitas. No hay APIs pagas ni datos de terceros privados.</P>
        <div className="space-y-3 mt-3">
          {[
            {
              name: "FAA ASWS", flag: "🇺🇸",
              what: "Estado de aeropuertos USA",
              detail: "API oficial de la Administración Federal de Aviación. Reporta demoras, Ground Delays, Ground Stops y cierres en tiempo real. Solo cubre aeropuertos de EE.UU.",
              update: "Continuo",
            },
            {
              name: "AWC / NOAA", flag: "🌐",
              what: "METAR, TAF y SIGMET global",
              detail: "Aviation Weather Center de la NOAA. Cubre aeropuertos de todo el mundo. Los mismos datos que usan los pilotos para hacer briefing antes de volar.",
              update: "METAR: 5 min · TAF: 30 min · SIGMET: 10 min",
            },
            {
              name: "Open-Meteo", flag: "🌍",
              what: "Clima general",
              detail: "API de clima global gratuita y open-source. Datos de temperatura, descripción del tiempo y código WMO. Complementa los datos de aviación con una vista más general.",
              update: "Cada 10 minutos",
            },
            {
              name: "FlightAware", flag: "🌐",
              what: "Links de seguimiento",
              detail: "Los links de rastreo de vuelos y aeropuertos apuntan a FlightAware, que tiene la base de datos de tracking de aviación más completa del mundo.",
              update: "Links externos (no integrado directamente)",
            },
          ].map((src) => (
            <div key={src.name} className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{src.flag}</span>
                <span className="text-sm font-bold text-white">{src.name}</span>
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs text-blue-400">{src.what}</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{src.detail}</p>
              <p className="text-[11px] text-gray-600 mt-1.5">Actualización: {src.update}</p>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div>
        <P>Airport Monitor uses exclusively official and free data sources. No paid APIs or private third-party data.</P>
        <div className="space-y-3 mt-3">
          {[
            {
              name: "FAA ASWS", flag: "🇺🇸",
              what: "US airport status",
              detail: "Official API from the Federal Aviation Administration. Reports delays, Ground Delays, Ground Stops and closures in real time. Only covers US airports.",
              update: "Continuous",
            },
            {
              name: "AWC / NOAA", flag: "🌐",
              what: "METAR, TAF and SIGMET global",
              detail: "NOAA's Aviation Weather Center. Covers airports worldwide. The same data pilots use for briefings before flying.",
              update: "METAR: 5 min · TAF: 30 min · SIGMET: 10 min",
            },
            {
              name: "Open-Meteo", flag: "🌍",
              what: "General weather",
              detail: "Free and open-source global weather API. Temperature, weather description and WMO code data. Complements aviation data with a more general view.",
              update: "Every 10 minutes",
            },
            {
              name: "FlightAware", flag: "🌐",
              what: "Tracking links",
              detail: "Flight and airport tracking links point to FlightAware, which has the world's most complete aviation tracking database.",
              update: "External links (not directly integrated)",
            },
          ].map((src) => (
            <div key={src.name} className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{src.flag}</span>
                <span className="text-sm font-bold text-white">{src.name}</span>
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs text-blue-400">{src.what}</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{src.detail}</p>
              <p className="text-[11px] text-gray-600 mt-1.5">Update frequency: {src.update}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── 12. FAQ ───────────────────────────────────────────────────────────────────
  {
    id: "faq", icon: <HelpCircle className="h-4 w-4" />,
    titleEs: "Preguntas Frecuentes",
    titleEn: "Frequently Asked Questions",
    content: (locale) => locale === "es" ? (
      <div className="space-y-3">
        {[
          {
            q: "¿Por qué mi aeropuerto de LATAM no muestra demoras?",
            a: "La API de la FAA solo cubre aeropuertos de Estados Unidos. Para EZE, GRU, SCL, BOG y otros aeropuertos de LATAM, mostramos clima METAR oficial pero no tenemos acceso al estado de demoras de esas autoridades de aviación.",
          },
          {
            q: "¿Por qué un aeropuerto de EE.UU. aparece como 'Normal' si hay problemas?",
            a: "La FAA solo reporta aeropuertos que TIENEN problemas. Si un aeropuerto no aparece en la API, significa que está operando normalmente. Eso es una buena noticia, no un error.",
          },
          {
            q: "¿Necesito crear una cuenta?",
            a: "No. La app funciona completamente sin registro. Tus aeropuertos, viajes y vuelos se guardan en el navegador (localStorage). Nunca se envían a ningún servidor.",
          },
          {
            q: "¿Con qué frecuencia se actualizan los datos?",
            a: "El estado FAA se actualiza según el intervalo configurado (5-30 min). Los datos METAR se actualizan cada 5 minutos, los TAFs cada 30 minutos, los SIGMETs cada 10 minutos. El clima general de Open-Meteo cada 10 minutos.",
          },
          {
            q: "¿Puedo usarla en el celular?",
            a: "Sí. Es una PWA (Progressive Web App). En tu teléfono, abrí la app en el navegador y elegí 'Agregar a pantalla de inicio' para instalarla como app nativa. Funciona en iOS y Android.",
          },
          {
            q: "¿Es gratis? ¿Hay publicidad?",
            a: "Sí, completamente gratis. Sin anuncios, sin planes de pago, sin datos personales recopilados.",
          },
          {
            q: "¿Funciona sin internet?",
            a: "La app requiere conexión para obtener datos en tiempo real. Si perdés la señal, muestra los últimos datos con una advertencia de que pueden estar desactualizados.",
          },
          {
            q: "El análisis de conexión dice que la perdería, ¿qué hago?",
            a: "Contactá a la aerolínea inmediatamente — muchas veces pueden re-acomodarte en un vuelo posterior sin costo si hay demoras reconocidas por la FAA. Usá el botón 'Buscar alternativas' para ver opciones en Google Flights o Kayak.",
          },
          {
            q: "¿Cómo activo las notificaciones?",
            a: "Hacé click en el ícono de campana 🔔 en el encabezado. El navegador pedirá permiso. Con notificaciones activas, la app te avisa cuando hay un cambio de estado en alguno de tus aeropuertos monitoreados.",
          },
        ].map((item) => (
          <div key={item.q} className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
            <p className="text-sm font-semibold text-white mb-1.5 flex gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              {item.q}
            </p>
            <p className="text-xs text-gray-400 leading-relaxed pl-6">{item.a}</p>
          </div>
        ))}
      </div>
    ) : (
      <div className="space-y-3">
        {[
          {
            q: "Why doesn't my LATAM airport show delays?",
            a: "The FAA API only covers US airports. For EZE, GRU, SCL, BOG and other LATAM airports, we show official METAR weather but don't have access to delay status from those aviation authorities.",
          },
          {
            q: "Why does a US airport show 'Normal' if there are issues?",
            a: "The FAA only reports airports that HAVE problems. If an airport doesn't appear in the API, it means it's operating normally. That's good news, not an error.",
          },
          {
            q: "Do I need to create an account?",
            a: "No. The app works completely without registration. Your airports, trips and flights are saved in the browser (localStorage). They are never sent to any server.",
          },
          {
            q: "How often is data updated?",
            a: "FAA status updates according to the configured interval (5-30 min). METAR data updates every 5 minutes, TAFs every 30 minutes, SIGMETs every 10 minutes. Open-Meteo general weather every 10 minutes.",
          },
          {
            q: "Can I use it on my phone?",
            a: "Yes. It's a PWA (Progressive Web App). On your phone, open the app in the browser and choose 'Add to Home Screen' to install it as a native app. Works on iOS and Android.",
          },
          {
            q: "Is it free? Is there advertising?",
            a: "Yes, completely free. No ads, no paid plans, no personal data collected.",
          },
          {
            q: "Does it work without internet?",
            a: "The app requires a connection to get real-time data. If you lose signal, it shows the last data with a warning that it may be outdated.",
          },
          {
            q: "The connection analysis says I'd miss it — what do I do?",
            a: "Contact the airline immediately — many times they can rebook you on a later flight at no cost if there are FAA-acknowledged delays. Use the 'Find alternatives' button to see options on Google Flights or Kayak.",
          },
          {
            q: "How do I enable notifications?",
            a: "Click the bell icon 🔔 in the header. The browser will ask for permission. With notifications enabled, the app alerts you when there's a status change at any of your monitored airports.",
          },
        ].map((item) => (
          <div key={item.q} className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
            <p className="text-sm font-semibold text-white mb-1.5 flex gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              {item.q}
            </p>
            <p className="text-xs text-gray-400 leading-relaxed pl-6">{item.a}</p>
          </div>
        ))}
      </div>
    ),
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function HelpPanel() {
  const { locale } = useLanguage();
  const [open, setOpen] = useState<Set<string>>(new Set(["intro", "status"]));

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3 pb-8">
      {/* Header */}
      <div className="rounded-xl border border-blue-700/30 bg-blue-950/20 px-5 py-4">
        <div className="flex items-center gap-3 mb-2">
          <HelpCircle className="h-5 w-5 text-blue-400" />
          <h2 className="text-lg font-bold text-white">
            {locale === "es" ? "Guía de uso — Airport Monitor" : "User Guide — Airport Monitor"}
          </h2>
        </div>
        <p className="text-sm text-gray-400">
          {locale === "es"
            ? "Todo lo que necesitás saber para sacarle el máximo provecho a la app. Hacé click en cada sección para expandirla."
            : "Everything you need to know to get the most out of the app. Click each section to expand it."}
        </p>
      </div>

      {/* Accordion sections */}
      {SECTIONS.map((section) => {
        const isOpen = open.has(section.id);
        const title  = locale === "es" ? section.titleEs : section.titleEn;

        return (
          <div
            key={section.id}
            className={cn(
              "rounded-xl border overflow-hidden transition-colors",
              isOpen
                ? "border-white/10 bg-white/[0.025]"
                : "border-white/6 bg-white/[0.015] hover:border-white/10",
            )}
          >
            <button
              onClick={() => toggle(section.id)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-blue-400">{section.icon}</span>
                <span className="text-sm font-semibold text-white">{title}</span>
              </div>
              {isOpen
                ? <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
                : <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />}
            </button>

            {isOpen && (
              <div className="px-5 pb-5 border-t border-white/6">
                <div className="pt-4">
                  {section.content(locale)}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Footer */}
      <div className="rounded-xl border border-white/6 bg-white/[0.015] px-5 py-4 text-center">
        <p className="text-xs text-gray-600">
          {locale === "es"
            ? "Airport Monitor · Datos oficiales FAA + NOAA · Sin cuenta · Sin costo"
            : "Airport Monitor · Official FAA + NOAA data · No account · No cost"}
        </p>
      </div>
    </div>
  );
}
